import { Receipt, Plus, CheckCircle, FileText, Download, X, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { generateFinancialReport, openPdfInTab } from '@/lib/pdf-report'
import type { Transaction } from '@/types/entities'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 20


export function ContasPagarPage() {
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [editingTransId, setEditingTransId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [transToDelete, setTransToDelete] = useState<any>(null)
  
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [transToMarkPaid, setTransToMarkPaid] = useState<any>(null)
  
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [tabFilter, setTabFilter] = useState<'ALL'|'OVERDUE'|'TODAY'|'FUTURE'|'PAID'>('ALL')
  const [descFilter, setDescFilter] = useState('')
  
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset, watch } = useForm<any>({ defaultValues: { type: 'expense', status: 'pending' } })
  const formStatus = watch('status')

  const { data: transactions = [], isError: isTransError } = useQuery({
    queryKey: ['transactions_expense', monthFilter],
    queryFn: async () => {
      let query = supabase.from('transactions')
        .select('*, category:financial_categories(name), cost_center:cost_centers(name)')
        .eq('type', 'expense')
        .order('due_date', { ascending: true })

      // Filtro de mês direto no servidor
      if (monthFilter) {
        const [year, month] = monthFilter.split('-')
        const start = `${year}-${month}-01`
        const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
        query = query.gte('due_date', start).lte('due_date', end)
      }

      const { data, error } = await query.limit(1000)
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

  const updateTrans = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...rest } = data
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Despesa atualizada!')
      queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
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
      toast.success('Despesa excluída!')
      queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
      setDeleteOpen(false)
      setTransToDelete(null)
    }
  })

  const onSubmit = (d: any) => {
    const payload = { ...d }
    if (payload.created_at_date) {
      payload.emission_date = payload.created_at_date
      delete payload.created_at_date
    }

    if (payload.status === 'paid' && payload.paid_at_date) {
      payload.paid_at = new Date(payload.paid_at_date + 'T12:00:00').toISOString()
    } else if (payload.status === 'pending') {
      payload.paid_at = null
    }
    delete payload.paid_at_date
    
    if (editingTransId) {
      const { created_at, ...updatePayload } = payload
      updateTrans.mutate({ id: editingTransId, ...updatePayload })
    } else {
      payload.type = 'expense'
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
      cost_center_id: t.cost_center_id,
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
      toast.success('Conta marcada como paga com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
      setMarkPaidOpen(false)
      setTransToMarkPaid(null)
    }
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

  const todayStr = new Date().toLocaleDateString('en-CA')

  // Mês já filtrado no servidor; aqui apenas filtramos por texto de descrição
  const filteredTransactions = transactions.filter((t: Transaction) => {
    if (!descFilter) return true
    return (t.description || '').toLowerCase().includes(descFilter.toLowerCase())
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

  const totalPages = Math.max(1, Math.ceil(filteredAndTabbedTransactions.length / PAGE_SIZE))
  const paginatedTransactions = filteredAndTabbedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

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

    openPdfInTab(doc)
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
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Emitir Relatório
          </Button>
          <Button onClick={() => {
            setEditingTransId(null)
            reset({ type: 'expense', status: 'pending', created_at_date: new Date().toLocaleDateString('en-CA') })
            setOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />Nova Despesa
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
          placeholder="Buscar lançamento..." 
          value={descFilter}
          onChange={e => setDescFilter(e.target.value)}
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
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${tabFilter === 'PAID' ? 'border-green-500 ring-1 ring-green-500' : ''}`}
          onClick={() => setTabFilter(tabFilter === 'PAID' ? 'ALL' : 'PAID')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagos</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(pagos)}</p>
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
                    checked={selectedRows.length === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead>Prazos</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((t: any) => (
                <TableRow key={t.id} className={selectedRows.includes(t.id) ? "bg-primary/5 hover:bg-primary/10 transition-colors" : "hover:bg-muted/30 transition-colors"}>
                  <TableCell className="text-center align-middle">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                      checked={selectedRows.includes(t.id)}
                      onChange={() => toggleSelectRow(t.id)} 
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="font-semibold text-sm max-w-[250px] truncate" title={t.description}>{t.description}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        {t.category?.name || 'Sem categoria'}
                      </div>
                      {t.cost_center?.name && (
                        <>
                          <span className="text-muted-foreground/30">•</span>
                          <span>{t.cost_center.name}</span>
                        </>
                      )}
                    </div>
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
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right align-middle font-bold text-red-600 text-sm">
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" title="Marcar como Pago" onClick={() => {
                          setTransToMarkPaid(t)
                          setMarkPaidOpen(true)
                        }}>
                          <CheckCircle className="h-4 w-4"/>
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
          <div className="px-4 pb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndTabbedTransactions.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
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
          <DialogHeader><DialogTitle>{editingTransId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input {...register('description', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" {...register('amount', { required: true })} /></div>
              <div className="space-y-2"><Label>Categoria</Label>
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
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {formStatus === 'paid' && (
                <div className="space-y-2">
                  <Label>Data de Pagamento</Label>
                  <Input type="date" {...register('paid_at_date', { required: true })} />
                </div>
              )}
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
            <DialogTitle>Excluir Conta a Pagar</DialogTitle>
            <DialogDescription>
              {transToDelete ? (
                <>
                  Você está prestes a excluir a conta <strong>"{transToDelete.description}"</strong> no valor de <strong>{formatCurrency(transToDelete.amount)}</strong>.
                  <br /><br />
                  Tem certeza? Esta ação <strong>não pode ser desfeita</strong> e apagará permanentemente este registro.
                </>
              ) : (
                'Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.'
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
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              {transToMarkPaid && (
                <>
                  Você está prestes a marcar a conta <strong>"{transToMarkPaid.description}"</strong> no valor de <strong>{formatCurrency(transToMarkPaid.amount)}</strong> como paga.
                  <br /><br />
                  Esta ação irá atualizar o status para <strong>Pago</strong> e definirá a data de pagamento para hoje. Confirma?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancelar</Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              if (transToMarkPaid) markPaid.mutate(transToMarkPaid.id)
            }}>
              Sim, Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
