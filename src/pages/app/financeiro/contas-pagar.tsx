import { Receipt, Plus, CheckCircle, FileText, Download, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { generateFinancialReport, downloadPdf } from '@/lib/pdf-report'

export function ContasPagarPage() {
  const [open, setOpen] = useState(false)
  const [openPdf, setOpenPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [tabFilter, setTabFilter] = useState<'ALL'|'OVERDUE'|'TODAY'|'FUTURE'|'PAID'>('ALL')
  
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset } = useForm<any>({ defaultValues: { type: 'expense', status: 'pending' } })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_expense'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, category:financial_categories(name), cost_center:cost_centers(name)')
        .eq('type', 'expense')
        // Hide auto commissions from here if they have a specific format, but the user didn't request that exactly. 
        // We will show all expenses here.
        .order('due_date', { ascending: true })
      if (error) throw error; return data
    }
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['financial_categories_expense'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_categories').select('*').eq('type', 'expense')
      if (error) throw error; return data
    }
  })
  
  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost_centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cost_centers').select('*')
      if (error) throw error; return data
    }
  })

  const createTrans = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('transactions').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Despesa adicionada!')
      queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
      setOpen(false)
      reset()
    }
  })

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
  })

  const toggleSelectAll = () => {
    if (selectedRows.length === transactions.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(transactions.map((t: any) => t.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const selectedTotal = transactions
    .filter((t: any) => selectedRows.includes(t.id))
    .reduce((acc: number, t: any) => acc + t.amount, 0)

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredTransactions = transactions.filter((t: any) => {
    if (!monthFilter) return true
    // monthFilter is YYYY-MM
    // match either due_date or created_at being in that month? Usually we filter by due_date for Contas a Pagar
    return t.due_date && t.due_date.startsWith(monthFilter)
  })

  let vencidos = 0
  let vencemHoje = 0
  let aVencer = 0
  let pagos = 0
  let totalPeriodo = 0

  filteredTransactions.forEach((t: any) => {
    const val = Number(t.amount) || 0
    totalPeriodo += val
    
    if (t.status === 'paid') {
      pagos += val
    } else {
      if (t.due_date < todayStr) {
        vencidos += val
      } else if (t.due_date === todayStr) {
        vencemHoje += val
      } else {
        aVencer += val
      }
    }
  })

  const filteredAndTabbedTransactions = filteredTransactions.filter((t: any) => {
    if (tabFilter === 'ALL') return true
    if (tabFilter === 'PAID') return t.status === 'paid'
    
    if (t.status === 'paid') return false // from here on, only pending
    
    if (tabFilter === 'OVERDUE') return t.due_date < todayStr
    if (tabFilter === 'TODAY') return t.due_date === todayStr
    if (tabFilter === 'FUTURE') return t.due_date > todayStr
    
    return true
  })

  function handleGeneratePdf() {
    const data = filteredAndTabbedTransactions.map((t: any) => ({
      descricao: t.description,
      emissao: t.created_at ? formatDate(t.created_at) : '—',
      vencimento: t.due_date ? formatDate(t.due_date) : '—',
      pagamento: t.paid_at ? formatDate(t.paid_at) : '—',
      categoria: t.category?.name || '—',
      centro: t.cost_center?.name || '—',
      valor: formatCurrency(t.amount),
      status: t.status === 'paid' ? 'Pago' : 'Pendente',
    }))

    const totalPago = filteredAndTabbedTransactions.filter((t: any) => t.status === 'paid').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
    const totalPendente = filteredAndTabbedTransactions.filter((t: any) => t.status === 'pending').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
    const totalGeral = filteredAndTabbedTransactions.reduce((acc: number, t: any) => acc + Number(t.amount), 0)

    const doc = generateFinancialReport({
      title: 'Relatório de Contas a Pagar',
      subtitle: `Emitido com ${data.length} lançamento(s) | Pendente: ${formatCurrency(totalPendente)} | Pago: ${formatCurrency(totalPago)} | Total: ${formatCurrency(totalGeral)}`,
      columns: [
        { header: 'Descrição', dataKey: 'descricao' },
        { header: 'Emissão', dataKey: 'emissao', width: 22, align: 'center' },
        { header: 'Vencimento', dataKey: 'vencimento', width: 24, align: 'center' },
        { header: 'Pagamento', dataKey: 'pagamento', width: 24, align: 'center' },
        { header: 'Categoria', dataKey: 'categoria' },
        { header: 'Centro de Custo', dataKey: 'centro' },
        { header: 'Valor (R$)', dataKey: 'valor', width: 30, align: 'right' },
        { header: 'Status', dataKey: 'status', width: 18, align: 'center' },
      ],
      rows: data,
      summaryRows: [
        { label: 'Pendente:', value: formatCurrency(totalPendente), color: [245, 158, 11] },
        { label: 'Pago:', value: formatCurrency(totalPago), color: [16, 185, 129] },
        { label: 'Total Geral:', value: formatCurrency(totalGeral) },
      ],
    })

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
    setPdfDoc(doc)
    setOpenPdf(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
            <p className="text-sm text-muted-foreground">Controle de despesas e pagamentos</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Emitir Relatório
          </Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Despesa</Button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground">Filtrar por Mês:</label>
        <input 
          type="month" 
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value)
            setTabFilter('ALL') // reset tab on month change
          }}
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {monthFilter && (
          <Button variant="ghost" size="sm" onClick={() => setMonthFilter('')} className="text-muted-foreground">
            Ver Todo o Histórico
          </Button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'OVERDUE' ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Vencidos (R$)</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(vencidos)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'TODAY' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'TODAY' ? 'ALL' : 'TODAY')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Vencem hoje (R$)</p>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(vencemHoje)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'FUTURE' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'FUTURE' ? 'ALL' : 'FUTURE')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">A vencer (R$)</p>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(aVencer)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'PAID' ? 'border-green-500 ring-1 ring-green-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'PAID' ? 'ALL' : 'PAID')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagos (R$)</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(pagos)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'ALL' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setTabFilter('ALL')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total do período (R$)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalPeriodo)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                    checked={selectedRows.length === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndTabbedTransactions.map((t: any) => (
                <TableRow key={t.id} className={selectedRows.includes(t.id) ? "bg-primary/5 hover:bg-primary/10" : ""}>
                  <TableCell className="text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                      checked={selectedRows.includes(t.id)}
                      onChange={() => toggleSelectRow(t.id)} 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>{formatDate(t.created_at)}</TableCell>
                  <TableCell className="font-semibold">{formatDate(t.due_date)}</TableCell>
                  <TableCell>{t.paid_at ? formatDate(t.paid_at) : '—'}</TableCell>
                  <TableCell>{t.category?.name || '—'}</TableCell>
                  <TableCell>{t.cost_center?.name || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(t.amount)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'pending' && <Button variant="outline" size="sm" onClick={() => markPaid.mutate(t.id)}><CheckCircle className="h-4 w-4 mr-1"/> Marcar Pago</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="font-medium text-sm">{selectedRows.length} selecionado(s)</span>
          <div className="w-px h-4 bg-primary-foreground/30" />
          <span className="font-bold">Total: {formatCurrency(selectedTotal)}</span>
          <Button size="sm" variant="secondary" className="ml-2 h-7 px-3 text-xs" onClick={() => setSelectedRows([])}>Limpar</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createTrans.mutate(d))} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input {...register('description', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" {...register('amount', { required: true })} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" {...register('due_date', { required: true })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Controller name="category_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Controller name="cost_center_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{costCenters.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={openPdf} onOpenChange={(v) => { setOpenPdf(v); if (!v && pdfUrl) URL.revokeObjectURL(pdfUrl) }}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Pré-visualização — Contas a Pagar</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => pdfDoc && downloadPdf(pdfDoc, `contas-pagar-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)}>
                <Download className="h-4 w-4 mr-2" />Baixar PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenPdf(false)}><X className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfUrl && (
              <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
