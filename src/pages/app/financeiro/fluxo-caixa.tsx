import { BarChart3, FileText, Download, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generateFinancialReport, downloadPdf } from '@/lib/pdf-report'

export function FluxoCaixaPage() {
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

  const [openPdf, setOpenPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)

  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('initial_balance').eq('id', 1).single()
      if (error && error.code !== 'PGRST116') throw error; return data || { initial_balance: 0 }
    }
  })

  // Query 1: all transactions BEFORE the selected month to compute opening balance
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
      if (error) throw error; return data
    }
  })

  // Query 2: transactions WITHIN the selected month
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_paid', monthFilter],
    queryFn: async () => {
      let query = supabase.from('transactions')
        .select('*')
        .eq('status', 'paid')
        .order('paid_at', { ascending: true })

      if (monthFilter) {
        const [year, month] = monthFilter.split('-')
        const start = `${year}-${month}-01`
        const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0] + 'T23:59:59.999Z'
        query = query.gte('paid_at', start).lte('paid_at', end)
      }

      const { data, error } = await query
      if (error) throw error; return data
    }
  })

  // Opening balance = initial_balance + all income before this month - all expenses before this month
  const priorIncome = priorTransactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const priorExpense = priorTransactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const openingBalance = Number(settings?.initial_balance || 0) + priorIncome - priorExpense

  let runningBalance = openingBalance

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0)

  function handleGeneratePdf() {
    const rows: any[] = []
    let balance = openingBalance

    transactions.forEach((t: any) => {
      const amount = Number(t.amount)
      if (t.type === 'income') balance += amount
      if (t.type === 'expense') balance -= amount
      
      rows.push({
        data: t.paid_at ? formatDate(t.paid_at) : '—',
        descricao: t.description || '—',
        tipo: t.type === 'income' ? 'Entrada' : 'Saída',
        entradas: t.type === 'income' ? formatCurrency(t.amount) : '—',
        saidas: t.type === 'expense' ? formatCurrency(t.amount) : '—',
        saldo_acumulado: formatCurrency(balance),
      })
    })

    const finalBalance = openingBalance + totalIncome - totalExpense
    const [year, month] = monthFilter.split('-')
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const monthName = monthNames[Number(month) - 1]

    const doc = generateFinancialReport({
      title: `Fluxo de Caixa Mensal — ${monthName}/${year}`,
      subtitle: `Entradas: ${formatCurrency(totalIncome)} | Saídas: ${formatCurrency(totalExpense)} | Saldo Final: ${formatCurrency(finalBalance)}`,
      columns: [
        { header: 'Data', dataKey: 'data', width: 28 },
        { header: 'Descrição', dataKey: 'descricao' },
        { header: 'Tipo', dataKey: 'tipo', width: 22, align: 'center' },
        { header: 'Entradas (R$)', dataKey: 'entradas', width: 35, align: 'right' },
        { header: 'Saídas (R$)', dataKey: 'saidas', width: 35, align: 'right' },
        { header: 'Saldo Acumulado', dataKey: 'saldo_acumulado', width: 40, align: 'right' },
      ],
      rows,
      summaryRows: [
        { label: 'Total de Entradas:', value: formatCurrency(totalIncome), color: [16, 185, 129] },
        { label: 'Total de Saídas:', value: formatCurrency(totalExpense), color: [239, 68, 68] },
        { label: 'Saldo Final do Período:', value: formatCurrency(finalBalance) },
      ],
    })

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
    setPdfDoc(doc)
    setOpenPdf(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

      {/* Summary cards */}
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

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right text-emerald-600">Entradas (R$)</TableHead>
                <TableHead className="text-right text-red-600">Saídas (R$)</TableHead>
                <TableHead className="text-right font-bold text-primary">Saldo Acumulado (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening Balance Row */}
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium italic text-muted-foreground whitespace-nowrap">—</TableCell>
                <TableCell className="font-medium italic text-muted-foreground">Saldo Anterior ao Período (Carry-over)</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className={`text-right font-bold ${openingBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatCurrency(openingBalance)}</TableCell>
              </TableRow>

              {transactions.map((item: any) => {
                const amount = Number(item.amount)
                if (item.type === 'income') runningBalance += amount
                if (item.type === 'expense') runningBalance -= amount
                
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {item.paid_at ? formatDate(item.paid_at) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === 'income' ? 'success' : 'destructive'} className="text-xs shrink-0">
                          {item.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                        <span className="font-medium">{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {item.type === 'income' ? formatCurrency(amount) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {item.type === 'expense' ? formatCurrency(amount) : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${runningBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                      {formatCurrency(runningBalance)}
                    </TableCell>
                  </TableRow>
                )
              })}

              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma transação recebida/paga registrada neste período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      <Dialog open={openPdf} onOpenChange={(v) => { setOpenPdf(v); if (!v && pdfUrl) URL.revokeObjectURL(pdfUrl) }}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />Pré-visualização — Fluxo de Caixa
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => pdfDoc && downloadPdf(pdfDoc, `fluxo-caixa-${monthFilter}.pdf`)}>
                <Download className="h-4 w-4 mr-2" />Baixar PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenPdf(false)}><X className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfUrl && <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
