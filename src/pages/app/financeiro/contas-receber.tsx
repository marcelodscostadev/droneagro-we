import { TrendingUp, Plus, CheckCircle, FileText, Download, X, Edit, Trash2, ExternalLink, Eye, Receipt, FileCheck, Upload, Loader2 } from 'lucide-react'
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
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [tabFilter, setTabFilter] = useState<'ALL'|'OVERDUE'|'TODAY'|'FUTURE'|'PAID'>('ALL')
  const [clientFilter, setClientFilter] = useState('')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [editingTransId, setEditingTransId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [transToDelete, setTransToDelete] = useState<any>(null)
  
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [transToMarkPaid, setTransToMarkPaid] = useState<any>(null)
  
  const [docPreview, setDocPreview] = useState<{ url: string; label: string } | null>(null)
  const [uploadDocOpen, setUploadDocOpen] = useState(false)
  const [transToUpload, setTransToUpload] = useState<any>(null)
  const [uploadDocData, setUploadDocData] = useState({
    invoice_number: '',
    invoice_file: null as File | null,
    boleto_file: null as File | null,
    remove_invoice: false,
    remove_boleto: false,
  })
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset, watch } = useForm<any>({ defaultValues: { type: 'income', status: 'pending' } })
  const formStatus = watch('status')

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, category:financial_categories(name), cost_center:cost_centers(name), bulletin:measurement_bulletins(invoice_number, invoice_url, boleto_url, service_orders(clients(name)))')
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
    // created_at_date é um campo auxiliar do form — mapear para coluna emission_date do banco
    if (payload.created_at_date) {
      payload.emission_date = payload.created_at_date
      delete payload.created_at_date
    }

    if (payload.status === 'paid' && payload.paid_at_date) {
      // Usa meio-dia local para evitar erro de timezone
      payload.paid_at = new Date(payload.paid_at_date + 'T12:00:00').toISOString()
    } else if (payload.status === 'pending') {
      payload.paid_at = null
    }
    delete payload.paid_at_date

    if (editingTransId) {
      // created_at não pode ser atualizado via PostgREST — remover do payload
      const { created_at, ...updatePayload } = payload
      updateTrans.mutate({ id: editingTransId, ...updatePayload })
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
      created_at_date: t.emission_date ? t.emission_date : (t.created_at ? t.created_at.split('T')[0] : ''),
      paid_at_date: t.paid_at ? t.paid_at.split('T')[0] : (new Date().toLocaleDateString('en-CA')),
      category_id: t.category_id,
      status: t.status,
      type: t.type
    })
    setOpen(true)
  }

  const handleDelete = (t: any) => {
    setTransToDelete(t)
    setDeleteOpen(true)
  }

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Conta marcada como recebida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setMarkPaidOpen(false)
      setTransToMarkPaid(null)
    }
  })

  const updateBulletinDocs = useMutation({
    mutationFn: async () => {
      if (!transToUpload?.bulletin_id) return
      const bulletinId = transToUpload.bulletin_id
      const existing = transToUpload.bulletin

      let invoiceUrl = uploadDocData.remove_invoice ? null : (existing?.invoice_url ?? null)
      let boletoUrl  = uploadDocData.remove_boleto  ? null : (existing?.boleto_url  ?? null)

      if (uploadDocData.invoice_file && !uploadDocData.remove_invoice) {
        const ext = uploadDocData.invoice_file.name.split('.').pop()
        const fileName = `nf-${bulletinId}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('attachments').upload(fileName, uploadDocData.invoice_file)
        if (upErr) throw upErr
        invoiceUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
      }

      if (uploadDocData.boleto_file && !uploadDocData.remove_boleto) {
        const ext = uploadDocData.boleto_file.name.split('.').pop()
        const fileName = `boleto-${bulletinId}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('attachments').upload(fileName, uploadDocData.boleto_file)
        if (upErr) throw upErr
        boletoUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
      }

      const updatePayload: any = { invoice_url: invoiceUrl, boleto_url: boletoUrl }
      if (uploadDocData.invoice_number) updatePayload.invoice_number = uploadDocData.invoice_number

      const { error } = await supabase.from('measurement_bulletins').update(updatePayload).eq('id', bulletinId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Documentos atualizados!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setUploadDocOpen(false)
      setTransToUpload(null)
      setUploadDocData({ invoice_number: '', invoice_file: null, boleto_file: null, remove_invoice: false, remove_boleto: false })
    },
    onError: (e: any) => toast.error('Erro ao salvar: ' + e.message)
  })

  const todayStr = new Date().toLocaleDateString('en-CA')

  const filteredTransactions = transactions.filter((t: any) => {
    let match = true
    if (monthFilter) {
      match = !!(t.due_date && t.due_date.startsWith(monthFilter))
    }
    if (match && clientFilter) {
      const clientName = t.bulletin?.service_orders?.clients?.name || ''
      const desc = t.description || ''
      match = clientName.toLowerCase().includes(clientFilter.toLowerCase()) || 
              desc.toLowerCase().includes(clientFilter.toLowerCase())
    }
    return match
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

  const totalRecebido = pagos
  const totalPendente = vencidos + vencemHoje + aVencer
  const totalGeral = totalPeriodo

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredAndTabbedTransactions.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredAndTabbedTransactions.map((t: any) => t.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const selectedTotal = filteredAndTabbedTransactions
    .filter((t: any) => selectedRows.includes(t.id))
    .reduce((acc: number, t: any) => acc + t.amount, 0)

  function handleGeneratePdf() {
    const data = filteredAndTabbedTransactions.map((t: any) => ({
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
          <Button variant="outline" onClick={handleGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Emitir Relatório
          </Button>
          <Button onClick={() => {
            setEditingTransId(null)
            reset({ type: 'income', status: 'pending', created_at_date: new Date().toLocaleDateString('en-CA') })
            setOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />Nova Receita
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground">Mês:</label>
        <input 
          type="month" 
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value)
            setTabFilter('ALL')
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {monthFilter && (
          <Button variant="ghost" size="sm" onClick={() => setMonthFilter('')} className="text-muted-foreground h-9 px-3">
            Histórico Completo
          </Button>
        )}
        <Input 
          placeholder="Buscar cliente..." 
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="w-[200px] h-9 ml-auto"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'OVERDUE' ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Atrasados</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(vencidos)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'TODAY' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'TODAY' ? 'ALL' : 'TODAY')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Vencem Hoje</p>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(vencemHoje)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'FUTURE' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'FUTURE' ? 'ALL' : 'FUTURE')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">A Vencer</p>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(aVencer)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'PAID' ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'PAID' ? 'ALL' : 'PAID')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Recebidos</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(pagos)}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'ALL' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setTabFilter('ALL')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total (Período)</p>
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
                    checked={selectedRows.length === filteredAndTabbedTransactions.length && filteredAndTabbedTransactions.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead>Cliente / NF</TableHead>
                <TableHead>Prazos</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndTabbedTransactions.map((t: any) => (
                <TableRow key={t.id} className={selectedRows.includes(t.id) ? "bg-primary/5 hover:bg-primary/10 transition-colors" : "hover:bg-muted/30 transition-colors"}>
                  <TableCell className="text-center align-middle">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                      checked={selectedRows.includes(t.id)}
                      onChange={() => toggleSelectRow(t.id)} 
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="font-semibold text-sm max-w-[250px] truncate" title={t.description}>{t.description}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      {t.category?.name || 'Sem categoria'}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="font-medium text-sm max-w-[200px] truncate" title={t.bulletin?.service_orders?.clients?.name || '—'}>
                      {t.bulletin?.service_orders?.clients?.name || '—'}
                    </div>
                    {t.bulletin?.invoice_number ? (
                      <div className="text-xs text-muted-foreground mt-1 font-medium">NF: {t.bulletin.invoice_number}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground/50 mt-1">Sem NF</div>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="text-sm flex items-center gap-1">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Venc:</span>
                      <span className="font-medium">{formatDate(t.due_date)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.status === 'paid' ? (
                        <span className="text-emerald-600 font-medium">Pgto: {t.paid_at ? formatDate(t.paid_at) : '—'}</span>
                      ) : (
                        <span>Emissão: {t.emission_date ? formatDate(t.emission_date) : formatDate(t.created_at)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <Badge variant={t.status === 'paid' ? 'success' : 'warning'} className="text-[11px] px-2.5 py-0.5 shadow-sm">
                      {t.status === 'paid' ? 'Recebido' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right align-middle font-bold text-emerald-600 text-sm">
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" title="Marcar como Recebido" onClick={() => {
                          setTransToMarkPaid(t)
                          setMarkPaidOpen(true)
                        }}>
                          <CheckCircle className="h-4 w-4"/>
                        </Button>
                      )}
                      {t.bulletin?.invoice_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30" title="Ver Nota Fiscal" onClick={() => setDocPreview({ url: t.bulletin.invoice_url, label: `NF ${t.bulletin?.invoice_number || ''}` })}>
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {t.bulletin?.boleto_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30" title="Ver Boleto" onClick={() => setDocPreview({ url: t.bulletin.boleto_url, label: 'Boleto' })}>
                          <Receipt className="h-4 w-4" />
                        </Button>
                      )}
                      {t.bulletin_id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50/50" title="Anexar Docs" onClick={() => {
                          setTransToUpload(t)
                          setUploadDocData({ invoice_number: t.bulletin?.invoice_number || '', invoice_file: null, boleto_file: null, remove_invoice: false, remove_boleto: false })
                          setUploadDocOpen(true)
                        }}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" title="Editar" onClick={() => handleEdit(t)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Excluir" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {formStatus === 'paid' && (
                <div className="space-y-2">
                  <Label>Data de Recebimento</Label>
                  <Input type="date" {...register('paid_at_date', { required: true })} />
                </div>
              )}
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
            <DialogTitle>Excluir Conta a Receber</DialogTitle>
            <DialogDescription>
              {transToDelete ? (
                <>
                  Você está prestes a excluir a conta <strong>"{transToDelete.description}"</strong> no valor de <strong>{formatCurrency(transToDelete.amount)}</strong>.
                  <br /><br />
                  Tem certeza? Esta ação <strong>não pode ser desfeita</strong> e apagará permanentemente este registro.
                </>
              ) : (
                'Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={() => transToDelete && deleteTrans.mutate(transToDelete.id)}>
              Sim, Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
            <DialogDescription>
              {transToMarkPaid && (
                <>
                  Você está prestes a marcar a conta <strong>"{transToMarkPaid.description}"</strong> no valor de <strong>{formatCurrency(transToMarkPaid.amount)}</strong> como recebida.
                  <br /><br />
                  Esta ação irá atualizar o status para <strong>Recebido</strong> e definirá a data de pagamento para hoje. Confirma?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancelar</Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              if (transToMarkPaid) markPaid.mutate(transToMarkPaid.id)
            }}>
              Sim, Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* PDF Preview Dialog — Relatório */}
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

      {/* Modal de pré-visualização de NF / Boleto */}
      <Dialog open={!!docPreview} onOpenChange={(v) => { if (!v) setDocPreview(null) }}>
        <DialogContent className="flex flex-col p-0" style={{ width: '95vw', maxWidth: '95vw', height: '95vh' }}>
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {docPreview?.label?.startsWith('Boleto') ? (
                <Receipt className="h-5 w-5 text-amber-500" />
              ) : (
                <FileCheck className="h-5 w-5 text-blue-500" />
              )}
              {docPreview?.label || 'Documento'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => docPreview && window.open(docPreview.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />Abrir em nova aba
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDocPreview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {docPreview && (
              docPreview.url.toLowerCase().endsWith('.pdf') || docPreview.url.includes('application/pdf') || docPreview.url.includes('/pdf') ? (
                <iframe
                  src={`${docPreview.url}#zoom=page-width`}
                  className="w-full h-full"
                  title={docPreview.label}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <Eye className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Pré-visualização não disponível para este tipo de arquivo.</p>
                  <Button variant="outline" onClick={() => docPreview && window.open(docPreview.url, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Abrir documento
                  </Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de NF / Boleto */}
      <Dialog open={uploadDocOpen} onOpenChange={(v) => {
        setUploadDocOpen(v)
        if (!v) {
          setTransToUpload(null)
          setUploadDocData({ invoice_number: '', invoice_file: null, boleto_file: null, remove_invoice: false, remove_boleto: false })
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Anexar Documentos
            </DialogTitle>
            <DialogDescription>
              {transToUpload?.bulletin?.service_orders?.clients?.name && (
                <span className="font-medium">{transToUpload.bulletin.service_orders.clients.name}</span>
              )}
              {transToUpload?.bulletin?.invoice_number && (
                <span className="text-muted-foreground"> · NF {transToUpload.bulletin.invoice_number}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Número da NF */}
            <div className="space-y-2">
              <Label>Número da Nota Fiscal</Label>
              <Input
                placeholder="Ex: 12345"
                value={uploadDocData.invoice_number}
                onChange={e => setUploadDocData(prev => ({ ...prev, invoice_number: e.target.value }))}
              />
            </div>

            {/* Nota Fiscal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-500" /> Nota Fiscal (PDF / Imagem)
              </Label>
              {transToUpload?.bulletin?.invoice_url && !uploadDocData.remove_invoice && (
                <div className="flex items-center justify-between p-2 rounded-md bg-blue-500/5 border border-blue-500/20 text-xs">
                  <span className="text-blue-600 flex items-center gap-1">
                    <FileCheck className="h-3 w-3" /> Arquivo atual anexado
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-blue-500 hover:underline"
                      onClick={() => window.open(transToUpload.bulletin.invoice_url, '_blank')}
                    >Ver</button>
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => setUploadDocData(prev => ({ ...prev, remove_invoice: true }))}
                    >Remover</button>
                  </div>
                </div>
              )}
              {uploadDocData.remove_invoice && (
                <p className="text-xs text-destructive font-semibold">Arquivo atual será removido ao salvar.</p>
              )}
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => setUploadDocData(prev => ({ ...prev, invoice_file: e.target.files?.[0] || null, remove_invoice: false }))}
              />
            </div>

            {/* Boleto */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" /> Boleto (PDF / Imagem)
              </Label>
              {transToUpload?.bulletin?.boleto_url && !uploadDocData.remove_boleto && (
                <div className="flex items-center justify-between p-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs">
                  <span className="text-amber-600 flex items-center gap-1">
                    <Receipt className="h-3 w-3" /> Arquivo atual anexado
  	              </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-amber-500 hover:underline"
                      onClick={() => window.open(transToUpload.bulletin.boleto_url, '_blank')}
                    >Ver</button>
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => setUploadDocData(prev => ({ ...prev, remove_boleto: true }))}
                    >Remover</button>
                  </div>
                </div>
              )}
              {uploadDocData.remove_boleto && (
                <p className="text-xs text-destructive font-semibold">Arquivo atual será removido ao salvar.</p>
              )}
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => setUploadDocData(prev => ({ ...prev, boleto_file: e.target.files?.[0] || null, remove_boleto: false }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadDocOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => updateBulletinDocs.mutate()}
              disabled={updateBulletinDocs.isPending}
            >
              {updateBulletinDocs.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Upload className="h-4 w-4 mr-2" />}
              Salvar Documentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  )
}
