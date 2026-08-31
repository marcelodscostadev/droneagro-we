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
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_paid', monthFilter],
    queryFn: async () => {
      let query = supabase.from('transactions')
        .select('*')
        .eq('status', 'paid')
        .order('due_date', { ascending: true })

      if (monthFilter) {
        const [year, month] = monthFilter.split('-')
        const start = `${year}-${month}-01`
        const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
        query = query.gte('due_date', start).lte('due_date', end)
      }

      const { data, error } = await query
      if (error) throw error; return data
    }
  })

  // Group by date with individual items
  const flowByDate: Record<string, { income: number; expense: number; items: any[] }> = {}
  transactions.forEach((t: any) => {
    if (!t.due_date) return
    if (!flowByDate[t.due_date]) flowByDate[t.due_date] = { income: 0, expense: 0, items: [] }
    if (t.type === 'income') flowByDate[t.due_date].income += Number(t.amount)
    if (t.type === 'expense') flowByDate[t.due_date].expense += Number(t.amount)
    flowByDate[t.due_date].items.push(t)
  })

  const dates = Object.keys(flowByDate).sort()
  let runningBalance = Number(settings?.initial_balance || 0)

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0)

  function toggleDate(date: string) {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))
  }

  function handleGeneratePdf() {
    const rows: any[] = []
    let balance = Number(settings?.initial_balance || 0)

    dates.forEach((date) => {
      const d = flowByDate[date]
      const dailyBalance = d.income - d.expense
      balance += dailyBalance

      // Add each transaction of the day
      d.items.forEach((t: any, idx: number) => {
        rows.push({
          data: idx === 0 ? formatDate(date) : '',
          descricao: t.description || '—',
          tipo: t.type === 'income' ? 'Entrada' : 'Saída',
          entradas: t.type === 'income' ? formatCurrency(t.amount) : '—',
          saidas: t.type === 'expense' ? formatCurrency(t.amount) : '—',
          saldo_dia: idx === d.items.length - 1 ? formatCurrency(dailyBalance) : '',
          saldo_acumulado: idx === d.items.length - 1 ? formatCurrency(balance) : '',
        })
      })
    })

    const finalBalance = Number(settings?.initial_balance || 0) + totalIncome - totalExpense
    const [year, month] = monthFilter.split('-')
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const monthName = monthNames[Number(month) - 1]

    const doc = generateFinancialReport({
      title: `Fluxo de Caixa Mensal — ${monthName}/${year}`,
      subtitle: `Entradas: ${formatCurrency(totalIncome)} | Saídas: ${formatCurrency(totalExpense)} | Saldo Final: ${formatCurrency(finalBalance)}`,
      columns: [
        { header: 'Data', dataKey: 'data', width: 22 },
        { header: 'Descrição', dataKey: 'descricao' },
        { header: 'Tipo', dataKey: 'tipo', width: 18, align: 'center' },
        { header: 'Entradas (R$)', dataKey: 'entradas', width: 30, align: 'right' },
        { header: 'Saídas (R$)', dataKey: 'saidas', width: 28, align: 'right' },
        { header: 'Saldo do Dia', dataKey: 'saldo_dia', width: 28, align: 'right' },
        { header: 'Saldo Acumulado', dataKey: 'saldo_acumulado', width: 34, align: 'right' },
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
            <p className="text-sm font-medium text-muted-foreground mb-1">Saldo do Período</p>
            <p className={`text-2xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {formatCurrency(Number(settings?.initial_balance || 0) + totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right text-emerald-600">Entradas (R$)</TableHead>
                <TableHead className="text-right text-red-600">Saídas (R$)</TableHead>
                <TableHead className="text-right">Saldo do Dia (R$)</TableHead>
                <TableHead className="text-right font-bold text-primary">Saldo Acumulado (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Saldo Inicial Row */}
              <TableRow className="bg-muted/30">
                <TableCell />
                <TableCell className="font-medium italic">Saldo Inicial</TableCell>
                <TableCell />
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right font-bold text-primary">{formatCurrency(runningBalance)}</TableCell>
              </TableRow>

              {dates.map((date) => {
                const data = flowByDate[date]
                const dailyBalance = data.income - data.expense
                runningBalance += dailyBalance
                const isExpanded = expandedDates[date]

                return (
                  <>
                    {/* Group row for the day */}
                    <TableRow
                      key={date}
                      className="cursor-pointer hover:bg-muted/30 bg-muted/10 font-medium"
                      onClick={() => toggleDate(date)}
                    >
                      <TableCell className="text-center text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                      </TableCell>
                      <TableCell className="font-semibold">{formatDate(date)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{data.items.length} lançamento(s)</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">{data.income > 0 ? formatCurrency(data.income) : '—'}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{data.expense > 0 ? formatCurrency(data.expense) : '—'}</TableCell>
                      <TableCell className={`text-right font-bold ${dailyBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(dailyBalance)}</TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">{formatCurrency(runningBalance)}</TableCell>
                    </TableRow>

                    {/* Expanded: individual transactions */}
                    {isExpanded && data.items.map((item: any) => (
                      <TableRow key={item.id} className="bg-muted/5 text-sm">
                        <TableCell />
                        <TableCell className="pl-8 text-muted-foreground text-xs">{formatDate(item.due_date)}</TableCell>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.type === 'income' ? 'success' : 'destructive'} className="text-xs shrink-0">
                              {item.type === 'income' ? 'Entrada' : 'Saída'}
                            </Badge>
                            <span>{item.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">{item.type === 'income' ? formatCurrency(item.amount) : '—'}</TableCell>
                        <TableCell className="text-right text-red-600">{item.type === 'expense' ? formatCurrency(item.amount) : '—'}</TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    ))}
                  </>
                )
              })}

              {dates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhuma transação recebida/paga registrada neste período.</TableCell>
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
