import { BarChart3, FileText, Download, X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generateFinancialReport, openPdfInTab, downloadPdf } from '@/lib/pdf-report'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Tx = Record<string, any>

// Identifica se uma transação é uma comissão (tem technician_id OU categoria 'Comissões')
function isCommission(t: Tx) {
  return t.technician_id != null || t.category?.name === 'Comissões'
}

// Chave de agrupamento para comissões:
// batch_id quando existe; caso contrário, usa "SEM-LOTE-{date}" para agrupar pelo dia
function groupKey(t: Tx): string {
  if (!isCommission(t)) return t.id // não-comissão: nunca agrupa
  if (t.batch_id) return t.batch_id
  const date = t.paid_at ? t.paid_at.split('T')[0] : 'sem-data'
  return `SEM-LOTE-${date}`
}

interface GroupedRow {
  id: string           // chave do grupo (ou id da tx para linhas simples)
  isGroup: boolean     // true = linha agrupada de comissões
  type: 'income' | 'expense'
  date: string
  description: string
  amount: number
  items?: Tx[]         // sub-linhas para expansão
  batchId?: string
}

// ─── Componente sub-linha (detalhe da comissão) ────────────────────────────────
function CommissionDetailRow({ item }: { item: Tx }) {
  return (
    <TableRow className="bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-300/50">
      <TableCell className="pl-10 text-xs text-muted-foreground whitespace-nowrap">
        {item.paid_at ? formatDate(item.paid_at) : '—'}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-400 h-4">
          Comissão
        </Badge>
      </TableCell>
      <TableCell className="pl-10">
        <span className="text-xs text-muted-foreground">{item.description}</span>
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
      <TableCell className="text-right text-xs text-red-500 font-medium">
        {formatCurrency(Number(item.amount))}
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground/50">—</TableCell>
    </TableRow>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function FluxoCaixaPage() {
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // ── Saldo inicial ──────────────────────────────────────────────────────────
  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('initial_balance').eq('id', 1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || { initial_balance: 0 }
    },
  })

  const { data: priorTransactions = [] } = useQuery({
    queryKey: ['transactions_prior', monthFilter],
    queryFn: async () => {
      if (!monthFilter) return []
      const [year, month] = monthFilter.split('-')
      const start = `${year}-${month}-01`
      const { data, error } = await supabase.from('transactions')
        .select('type, amount')
        .eq('status', 'paid')
        .lt('paid_at', start)
      if (error) throw error
      return data
    },
  })

  // ── Transações do mês (com categoria e técnico) ────────────────────────────
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_paid', monthFilter],
    queryFn: async () => {
      let query = supabase.from('transactions')
        .select('*, category:financial_categories(name), technician:profiles(name)')
        .eq('status', 'paid')
        .order('paid_at', { ascending: true })

      if (monthFilter) {
        const [year, month] = monthFilter.split('-')
        const start = `${year}-${month}-01`
        const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0] + 'T23:59:59.999Z'
        query = query.gte('paid_at', start).lte('paid_at', end)
      }
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const priorIncome = priorTransactions.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
  const priorExpense = priorTransactions.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0)
  const openingBalance = Number(settings?.initial_balance || 0) + priorIncome - priorExpense

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0)

  // ── Agrupamento de comissões ────────────────────────────────────────────────
  const rows = useMemo((): GroupedRow[] => {
    const groups: Map<string, Tx[]> = new Map()
    const order: string[] = []

    transactions.forEach((t: Tx) => {
      const key = groupKey(t)
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      groups.get(key)!.push(t)
    })

    return order.map((key) => {
      const items = groups.get(key)!
      const first = items[0]

      // Linha simples (não-comissão ou grupo de 1)
      if (!isCommission(first) || items.length === 1) {
        return {
          id: key,
          isGroup: false,
          type: first.type,
          date: first.paid_at || '',
          description: first.description,
          amount: Number(first.amount),
          items,
        }
      }

      // Linha agrupada de comissões
      const totalAmount = items.reduce((a, t) => a + Number(t.amount), 0)
      const techNames = [...new Set(items.map((t) => t.technician?.name).filter(Boolean))]
      const hasBatch = !!first.batch_id
      const label = hasBatch
        ? `Comissões — ${items.length} boletim(ns) — Lote ${first.batch_id}`
        : `Comissões — ${items.length} boletim(ns) — ${formatDate(first.paid_at)}`

      return {
        id: key,
        isGroup: true,
        type: 'expense',
        date: first.paid_at || '',
        description: label,
        amount: totalAmount,
        items,
        batchId: first.batch_id,
      }
    })
  }, [transactions])

  // ── Toggle expansão ─────────────────────────────────────────────────────────
  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Saldo acumulado por linha ────────────────────────────────────────────────
  let runningBalance = openingBalance

  // ── PDF ────────────────────────────────────────────────────────────────────
  function handleGeneratePdf() {
    const pdfRows: any[] = []
    let balance = openingBalance

    rows.forEach((row) => {
      if (row.type === 'income') balance += row.amount
      if (row.type === 'expense') balance -= row.amount

      pdfRows.push({
        data: row.date ? formatDate(row.date) : '—',
        descricao: row.description,
        tipo: row.type === 'income' ? 'Entrada' : 'Saída',
        entradas: row.type === 'income' ? formatCurrency(row.amount) : '—',
        saidas: row.type === 'expense' ? formatCurrency(row.amount) : '—',
        saldo_acumulado: formatCurrency(balance),
      })
    })

    const finalBalance = openingBalance + totalIncome - totalExpense
    const [year, month] = monthFilter.split('-')
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

    const doc = generateFinancialReport({
      title: `Fluxo de Caixa Mensal — ${monthNames[Number(month) - 1]}/${year}`,
      subtitle: `Entradas: ${formatCurrency(totalIncome)} | Saídas: ${formatCurrency(totalExpense)} | Saldo Final: ${formatCurrency(finalBalance)}`,
      columns: [
        { header: 'Data', dataKey: 'data', width: 28 },
        { header: 'Descrição', dataKey: 'descricao' },
        { header: 'Tipo', dataKey: 'tipo', width: 22, align: 'center' },
        { header: 'Entradas (R$)', dataKey: 'entradas', width: 35, align: 'right' },
        { header: 'Saídas (R$)', dataKey: 'saidas', width: 35, align: 'right' },
        { header: 'Saldo Acumulado', dataKey: 'saldo_acumulado', width: 40, align: 'right' },
      ],
      rows: pdfRows,
      summaryRows: [
        { label: 'Total de Entradas:', value: formatCurrency(totalIncome), color: [16, 185, 129] },
        { label: 'Total de Saídas:', value: formatCurrency(totalExpense), color: [239, 68, 68] },
        { label: 'Saldo Final do Período:', value: formatCurrency(finalBalance) },
      ],
    })

    openPdfInTab(doc)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa Mensal</h1>
            <p className="text-sm text-muted-foreground">Entradas, saídas e saldo acumulado por período</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button variant="outline" onClick={handleGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Emitir Relatório
          </Button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total de Entradas</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total de Saídas</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Saldo Final do Período</p>
            <p className={`text-2xl font-bold ${(openingBalance + totalIncome - totalExpense) >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {formatCurrency(openingBalance + totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabela ── */}
      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right text-emerald-600">Entradas (R$)</TableHead>
                <TableHead className="text-right text-red-600">Saídas (R$)</TableHead>
                <TableHead className="text-right font-bold text-primary">Saldo Acumulado (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>

              {/* Saldo Anterior */}
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium italic text-muted-foreground whitespace-nowrap">—</TableCell>
                <TableCell className="font-medium italic text-muted-foreground text-center">—</TableCell>
                <TableCell className="font-medium italic text-muted-foreground">Carry-over do período anterior</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className={`text-right font-bold ${openingBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {formatCurrency(openingBalance)}
                </TableCell>
              </TableRow>

              {rows.map((row) => {
                // atualiza saldo
                if (row.type === 'income') runningBalance += row.amount
                if (row.type === 'expense') runningBalance -= row.amount
                const snap = runningBalance
                const isExpanded = expandedGroups.has(row.id)

                return row.isGroup ? (
                  // ── Linha agrupada de comissões ──
                  <>
                    <TableRow
                      key={row.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isExpanded ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-amber-500/5',
                      )}
                      onClick={() => toggleGroup(row.id)}
                    >
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {row.date ? formatDate(row.date) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="text-xs">Saída</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Ícone de grupo */}
                          <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/40 shrink-0">
                            <Users className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="font-medium text-sm">{row.description}</span>
                          <div className="ml-auto flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                            </span>
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">—</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${snap >= 0 ? 'text-primary' : 'text-red-500'}`}>
                        {formatCurrency(snap)}
                      </TableCell>
                    </TableRow>

                    {/* Sub-linhas de detalhe */}
                    {isExpanded && row.items?.map((item) => (
                      <CommissionDetailRow key={item.id} item={item} />
                    ))}
                  </>
                ) : (
                  // ── Linha simples ──
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {row.date ? formatDate(row.date) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.type === 'income' ? 'success' : 'destructive'} className="text-xs">
                        {row.type === 'income' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.description}</span>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {row.type === 'income' ? formatCurrency(row.amount) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {row.type === 'expense' ? formatCurrency(row.amount) : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${snap >= 0 ? 'text-primary' : 'text-red-500'}`}>
                      {formatCurrency(snap)}
                    </TableCell>
                  </TableRow>
                )
              })}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhuma transação recebida/paga registrada neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
