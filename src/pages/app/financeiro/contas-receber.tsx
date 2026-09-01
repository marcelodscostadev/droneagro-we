import { TrendingUp, Plus, CheckCircle, FileText, Download, X, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { generateFinancialReport, previewPdf, downloadPdf } from '@/lib/pdf-report'

export function ContasReceberPage() {
  const [open, setOpen] = useState(false)
  const [openPdf, setOpenPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [clientFilter, setClientFilter] = useState('')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [editingTransId, setEditingTransId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [transToDelete, setTransToDelete] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset } = useForm<any>({ defaultValues: { type: 'income', status: 'pending' } })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, category:financial_categories(name), cost_center:cost_centers(name), bulletin:measurement_bulletins(invoice_number, service_orders(clients(name)))')
        .eq('type', 'income')
        .order('due_date', { ascending: false })
      if (error) throw error; return data
    }
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['financial_categories_income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_categories').select('*').eq('type', 'income')
      if (error) throw error; return data
    }
  })

  const createTrans = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('transactions').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Receita adicionada!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setOpen(false)
      reset()
    }
  })

  const updateTrans = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...rest } = data
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Receita atualizada!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setOpen(false)
      setEditingTransId(null)
      reset()
    }
  })

  const deleteTrans = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Receita excluída!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setDeleteOpen(false)
      setTransToDelete(null)
    }
  })

  const onSubmit = (d: any) => {
    const payload = { ...d }
    if (payload.created_at_date) {
      payload.created_at = new Date(payload.created_at_date + 'T12:00:00Z').toISOString()
      delete payload.created_at_date
    }
    
    if (editingTransId) {
      updateTrans.mutate({ id: editingTransId, ...payload })
    } else {
      payload.type = 'income'
      payload.status = 'pending'
      createTrans.mutate(payload)
    }
  }

  const handleEdit = (t: any) => {
    setEditingTransId(t.id)
    reset({
      description: t.description,
      amount: t.amount,
      due_date: t.due_date ? t.due_date.split('T')[0] : '',
      created_at_date: t.created_at ? t.created_at.split('T')[0] : '',
      category_id: t.category_id,
      status: t.status,
      type: t.type
    })
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    setTransToDelete(id)
    setDeleteOpen(true)
  }

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
  })

  const filteredTransactions = transactions.filter((t: any) => {
    if (!clientFilter) return true
    const clientName = t.bulletin?.service_orders?.clients?.name || ''
    // Handle standalone transactions via description if they mention a client
    const desc = t.description || ''
    return clientName.toLowerCase().includes(clientFilter.toLowerCase()) || 
           desc.toLowerCase().includes(clientFilter.toLowerCase())
  })

  const totalRecebido = filteredTransactions.filter((t: any) => t.status === 'paid').reduce((acc: number, t: any) => acc + t.amount, 0)
  const totalPendente = filteredTransactions.filter((t: any) => t.status === 'pending').reduce((acc: number, t: any) => acc + t.amount, 0)
  const totalGeral = filteredTransactions.reduce((acc: number, t: any) => acc + t.amount, 0)

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredTransactions.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredTransactions.map((t: any) => t.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const selectedTotal = filteredTransactions
    .filter((t: any) => selectedRows.includes(t.id))
    .reduce((acc: number, t: any) => acc + t.amount, 0)

  function handleGeneratePdf() {
    const data = filteredTransactions.map((t: any) => ({
      descricao: t.description,
      nf: t.bulletin?.invoice_number || '—',
      cliente: t.bulletin?.service_orders?.clients?.name || '—',
      emissao: t.created_at ? formatDate(t.created_at) : '—',
      vencimento: t.due_date ? formatDate(t.due_date) : '—',
      pagamento: t.paid_at ? formatDate(t.paid_at) : '—',
      categoria: t.category?.name || '—',
      valor: formatCurrency(t.amount),
      status: t.status === 'paid' ? 'Recebido' : 'Pendente',
    }))

    const doc = generateFinancialReport({
      title: 'Relatório de Contas a Receber',
      subtitle: `Emitido com ${data.length} lançamento(s) | Pendente: ${formatCurrency(totalPendente)} | Recebido: ${formatCurrency(totalRecebido)} | Total: ${formatCurrency(totalGeral)}`,
      columns: [
        { header: 'Descrição', dataKey: 'descricao' },
        { header: 'NF', dataKey: 'nf', width: 12, align: 'center' },
        { header: 'Cliente', dataKey: 'cliente' },
        { header: 'Emissão', dataKey: 'emissao', width: 22, align: 'center' },
        { header: 'Vencimento', dataKey: 'vencimento', width: 24, align: 'center' },
        { header: 'Pagamento', dataKey: 'pagamento', width: 24, align: 'center' },
        { header: 'Categoria', dataKey: 'categoria' },
        { header: 'Valor (R$)', dataKey: 'valor', width: 28, align: 'right' },
        { header: 'Status', dataKey: 'status', width: 18, align: 'center' },
      ],
      rows: data,
      summaryRows: [
        { label: 'A Receber:', value: formatCurrency(totalPendente), color: [245, 158, 11] },
        { label: 'Recebido:', value: formatCurrency(totalRecebido), color: [16, 185, 129] },
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
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
            <p className="text-sm text-muted-foreground">Controle de receitas e cobranças</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Buscar por cliente..." 
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="w-[250px]"
          />
          <Button variant="outline" onClick={handleGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Emitir Relatório
          </Button>
          <Button onClick={() => {
            setEditingTransId(null)
            reset({ type: 'income', status: 'pending', created_at_date: new Date().toISOString().split('T')[0] })
            setOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />Nova Receita
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">A Receber</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{formatCurrency(totalPendente)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Recebido</p>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRecebido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Geral</p>
              <div className="p-1 rounded-full bg-primary/10">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalGeral)}</div>
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
                    checked={selectedRows.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((t: any) => (
                <TableRow key={t.id} className={selectedRows.includes(t.id) ? "bg-primary/5 hover:bg-primary/10" : ""}>
                  <TableCell className="text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                      checked={selectedRows.includes(t.id)}
                      onChange={() => toggleSelectRow(t.id)} 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>{t.bulletin?.invoice_number || '—'}</TableCell>
                  <TableCell>{t.bulletin?.service_orders?.clients?.name || '—'}</TableCell>
                  <TableCell>{formatDate(t.created_at)}</TableCell>
                  <TableCell className="font-semibold">{formatDate(t.due_date)}</TableCell>
                  <TableCell>{t.paid_at ? formatDate(t.paid_at) : '—'}</TableCell>
                  <TableCell>{t.category?.name || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(t.amount)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Recebido' : 'Pendente'}</Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    {t.status === 'pending' && <Button variant="outline" size="sm" onClick={() => markPaid.mutate(t.id)}><CheckCircle className="h-4 w-4 mr-1"/> Recebido</Button>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setEditingTransId(null)
          reset()
        }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTransId ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input {...register('description', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" {...register('amount', { required: true })} /></div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Controller name="category_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Emissão</Label><Input type="date" {...register('created_at_date', { required: true })} /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" {...register('due_date', { required: true })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingTransId ? 'Atualizar' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={() => transToDelete && deleteTrans.mutate(transToDelete)}>
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* PDF Preview Dialog */}
      <Dialog open={openPdf} onOpenChange={(v) => { setOpenPdf(v); if (!v && pdfUrl) URL.revokeObjectURL(pdfUrl) }}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Pré-visualização — Contas a Receber</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => pdfDoc && downloadPdf(pdfDoc, `contas-receber-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)}>
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
