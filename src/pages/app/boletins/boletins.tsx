import { FileBarChart, ChevronDown, ChevronUp, FileDown, CheckCircle, XCircle, Plus, Trash2, Edit, Receipt, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Fragment, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowDown, ArrowUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' | 'destructive' | 'outline' | 'secondary' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  invoiced: { label: 'Faturado', variant: 'outline' },
}

const editSchema = z.object({
  hectares_sprayed: z.coerce.number().min(0),
  price_per_ha: z.coerce.number().min(0),
  commission_pct: z.coerce.number().min(0).max(100),
})

type EditFormData = z.infer<typeof editSchema>

export function BoletinsPage() {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [clientFilter, setClientFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedBoletim, setSelectedBoletim] = useState<any>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Expense Form state
  const [expDesc, setExpDesc] = useState('')
  const [expQty, setExpQty] = useState('1')
  const [expVal, setExpVal] = useState('')

  // Invoice Form state
  const [openInvoice, setOpenInvoice] = useState(false)
  const [boletimToInvoice, setBoletimToInvoice] = useState<any>(null)
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    due_date: '',
    invoice_file: null as File | null,
    boleto_file: null as File | null,
  })

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: boletins = [], isLoading, isFetching } = useQuery({
    queryKey: ['boletins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurement_bulletins')
        .select(`
          *,
          client:clients(name, payment_term_days),
          technician:profiles(name),
          service_order:service_orders(os_number, scheduled_at),
          expenses:bulletin_expenses(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema)
  })

  const wHectares = watch('hectares_sprayed')
  const wPrice = watch('price_per_ha')
  const wPct = watch('commission_pct')
  
  const currentSubtotal = (wHectares || 0) * (wPrice || 0)
  const currentCommission = currentSubtotal * ((wPct || 0) / 100)

  const updateBoletim = useMutation({
    mutationFn: async (data: any) => {
      const subtotal = data.hectares_sprayed * data.price_per_ha
      const tot = subtotal + (selectedBoletim?.expenses?.reduce((acc: number, curr: any) => acc + Number(curr.total_value), 0) || 0)
      const comm = subtotal * (data.commission_pct / 100)

      const { error } = await supabase.from('measurement_bulletins').update({
        hectares_sprayed: data.hectares_sprayed,
        price_per_ha: data.price_per_ha,
        subtotal: subtotal,
        total_value: tot,
        commission_pct: data.commission_pct,
        commission_value: comm
      }).eq('id', selectedBoletim.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Boletim atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['boletins'] })
      setOpenEdit(false)
    }
  })

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from('measurement_bulletins').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      toast.success(`Boletim marcado como ${STATUS_MAP[variables.status].label}!`)
      queryClient.invalidateQueries({ queryKey: ['boletins'] })
    }
  })

  const invoiceBoletim = useMutation({
    mutationFn: async () => {
      if (!boletimToInvoice) return
      
      let invoiceUrl = null
      let boletoUrl = null

      if (invoiceData.invoice_file) {
        const fileExt = invoiceData.invoice_file.name.split('.').pop()
        const fileName = `nf-${boletimToInvoice.id}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, invoiceData.invoice_file)
        if (uploadError) throw uploadError
        invoiceUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
      }

      if (invoiceData.boleto_file) {
        const fileExt = invoiceData.boleto_file.name.split('.').pop()
        const fileName = `boleto-${boletimToInvoice.id}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, invoiceData.boleto_file)
        if (uploadError) throw uploadError
        boletoUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
      }

      const { error } = await supabase.from('measurement_bulletins').update({
        status: 'invoiced',
        invoice_number: invoiceData.invoice_number,
        invoice_url: invoiceUrl,
        boleto_url: boletoUrl
      }).eq('id', boletimToInvoice.id)
      
      if (error) throw error

      const dueDate = invoiceData.due_date || new Date().toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      // Income transaction
      const { error: incomeError } = await supabase.from('transactions').insert([{
        type: 'income',
        description: `Serviço Prestado - NF ${invoiceData.invoice_number || 'S/N'} - ${boletimToInvoice.client?.name}`,
        amount: boletimToInvoice.total_value,
        due_date: dueDate,
        status: 'pending',
        bulletin_id: boletimToInvoice.id
      }])
      if (incomeError) throw incomeError

      // Expense transaction
      if (boletimToInvoice.commission_value > 0 && boletimToInvoice.technician_id) {
        const { error: expError } = await supabase.from('transactions').insert([{
          type: 'expense',
          description: `Comissão - Boletim BM-${boletimToInvoice.id.substring(0,4)}`,
          amount: boletimToInvoice.commission_value,
          due_date: today,
          status: 'pending',
          bulletin_id: boletimToInvoice.id,
          technician_id: boletimToInvoice.technician_id
        }])
        if (expError) throw expError
      }
    },
    onSuccess: () => {
      toast.success('Boletim faturado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['boletins'] })
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
      queryClient.invalidateQueries({ queryKey: ['transactions_commissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      setOpenInvoice(false)
      setInvoiceData({ invoice_number: '', due_date: '', invoice_file: null, boleto_file: null })
      setBoletimToInvoice(null)
    },
    onError: (e: any) => toast.error('Erro ao faturar: ' + e.message)
  })

  function handleOpenInvoice(b: any) {
    const termDays = b.client?.payment_term_days || 0
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + termDays)
    
    setBoletimToInvoice(b)
    setInvoiceData({
      invoice_number: '',
      due_date: dueDate.toISOString().split('T')[0],
      invoice_file: null,
      boleto_file: null
    })
    setOpenInvoice(true)
  }

  const addExpense = useMutation({
    mutationFn: async (boletimId: string) => {
      const qty = Number(expQty)
      const val = Number(expVal)
      const tot = qty * val
      const { error } = await supabase.from('bulletin_expenses').insert([{
        bulletin_id: boletimId,
        description: expDesc,
        quantity: qty,
        unit_value: val,
        total_value: tot
      }])
      if (error) throw error

      const b = boletins.find((x: any) => x.id === boletimId)
      if (b) {
        await supabase.from('measurement_bulletins').update({
          total_value: Number(b.total_value) + tot
        }).eq('id', boletimId)
      }
    },
    onSuccess: () => {
      toast.success('Despesa adicionada!')
      queryClient.invalidateQueries({ queryKey: ['boletins'] })
      setExpDesc('')
      setExpQty('1')
      setExpVal('')
    }
  })

  const deleteExpense = useMutation({
    mutationFn: async ({ expId, boletimId, totVal }: { expId: string, boletimId: string, totVal: number }) => {
      const { error } = await supabase.from('bulletin_expenses').delete().eq('id', expId)
      if (error) throw error

      const b = boletins.find((x: any) => x.id === boletimId)
      if (b) {
        await supabase.from('measurement_bulletins').update({
          total_value: Number(b.total_value) - totVal
        }).eq('id', boletimId)
      }
    },
    onSuccess: () => {
      toast.success('Despesa removida!')
      queryClient.invalidateQueries({ queryKey: ['boletins'] })
    }
  })

  const filtered = boletins.filter((b: any) => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
    const matchClient = clientFilter === '' || b.client?.name?.toLowerCase().includes(clientFilter.toLowerCase())
    return matchStatus && matchClient
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.service_order?.scheduled_at || a.created_at).getTime()
    const dateB = new Date(b.service_order?.scheduled_at || b.created_at).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  const toggleSelectAll = () => {
    if (selectedRows.length === filtered.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filtered.map((b: any) => b.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const selectedTotal = filtered
    .filter((b: any) => selectedRows.includes(b.id))
    .reduce((acc: number, b: any) => acc + (Number(b.total_value) || 0), 0)

  function toggleRow(id: string) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleOpenEdit(b: any) {
    setSelectedBoletim(b)
    reset({
      hectares_sprayed: b.hectares_sprayed || 0,
      price_per_ha: b.price_per_ha || 0,
      commission_pct: b.commission_pct || 10
    })
    setOpenEdit(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileBarChart className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Boletins de Medição {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">Aprovação de medições e faturamento</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Buscar por cliente..." 
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="w-[200px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="invoiced">Faturado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                    checked={selectedRows.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="w-[50px]" />
                <TableHead>Boletim</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/20 select-none group" 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1">
                    Data OS
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center">Hectares</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    Nenhum boletim encontrado.
                  </TableCell>
                </TableRow>
              ) : filtered.map((b: any) => {
                const isExpanded = expandedRows[b.id]
                const s = STATUS_MAP[b.status] || STATUS_MAP['pending']
                const isPending = b.status === 'pending'
                const osNumber = b.service_order?.os_number ? `OS-${b.service_order.os_number.toString().padStart(4, '0')}` : 'OS-...'

                return (
                  <Fragment key={b.id}>
                    <TableRow className={cn('group', isExpanded && 'bg-muted/30', selectedRows.includes(b.id) && 'bg-primary/5 hover:bg-primary/10')}>
                      <TableCell className="text-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                          checked={selectedRows.includes(b.id)}
                          onChange={() => toggleSelectRow(b.id)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRow(b.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-primary" title={b.id}>BM-{b.id.substring(0, 4)}</div>
                        <div className="text-xs text-muted-foreground">{osNumber}</div>
                      </TableCell>
                      <TableCell className="font-medium">{b.client?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.technician?.name || '—'}</TableCell>
                      <TableCell>{b.service_order?.scheduled_at ? formatDate(b.service_order.scheduled_at) : '—'}</TableCell>
                      <TableCell className="text-center font-bold">{b.hectares_sprayed || 0} ha</TableCell>
                      <TableCell className="text-right font-bold text-lg">{formatCurrency(b.total_value)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(b.commission_value)}</TableCell>
                      <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === 'approved' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenInvoice(b)} title="Faturar (Gerar NF/Boleto)">
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                          {isPending && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(b)} title="Editar Valores">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => changeStatus.mutate({ id: b.id, status: 'approved' })} title="Aprovar (Validar Valores)">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => changeStatus.mutate({ id: b.id, status: 'rejected' })} title="Rejeitar">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {b.status === 'approved' || b.status === 'invoiced' ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/boletins/${b.id}/pdf`)} title="Gerar PDF do Boletim">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={11} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                Detalhamento do Serviço
                              </h3>
                              <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
                                {[
                                  ['Hectares Pulverizados', `${b.hectares_sprayed || 0} ha`],
                                  ['Preço por Hectare', formatCurrency(b.price_per_ha)],
                                  ['Subtotal do Serviço', formatCurrency(b.subtotal)],
                                ].map(([k, v]) => (
                                  <div key={k as string} className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{k}:</span>
                                    <span className="font-medium">{v}</span>
                                  </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-base bg-primary/5 p-2 rounded-lg">
                                  <span>Total do Boletim:</span>
                                  <span className="text-primary">{formatCurrency(b.total_value)}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                  <span>Comissão do Técnico ({b.commission_pct || 0}%):</span>
                                  <span className="font-semibold">{formatCurrency(b.commission_value)}</span>
                                </div>
                              </div>
                              
                              {b.status === 'invoiced' && (
                                <div className="mt-4 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-3">
                                  <h4 className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                                    <Receipt className="h-4 w-4" /> Dados de Faturamento
                                  </h4>
                                  <p className="text-sm"><span className="text-muted-foreground">Nº da Nota:</span> {b.invoice_number || 'Não informado'}</p>
                                  <div className="flex gap-4">
                                    {b.invoice_url && (
                                      <a href={b.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                        <FileText className="h-3 w-3" /> Ver Nota Fiscal
                                      </a>
                                    )}
                                    {b.boleto_url && (
                                      <a href={b.boleto_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                        <FileText className="h-3 w-3" /> Ver Boleto
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm">Despesas e Adicionais</h3>
                              <div className="rounded-lg border bg-card">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Descrição</TableHead>
                                      <TableHead className="text-right">Qtd</TableHead>
                                      <TableHead className="text-right">V. Unit.</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                      <TableHead className="w-[40px]" />
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {b.expenses && b.expenses.length > 0 ? b.expenses.map((exp: any) => (
                                      <TableRow key={exp.id}>
                                        <TableCell className="py-2">{exp.description}</TableCell>
                                        <TableCell className="text-right py-2">{exp.quantity}</TableCell>
                                        <TableCell className="text-right py-2">{formatCurrency(exp.unit_value)}</TableCell>
                                        <TableCell className="text-right py-2 font-medium">{formatCurrency(exp.total_value)}</TableCell>
                                        <TableCell className="py-2">
                                          {isPending && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteExpense.mutate({ expId: exp.id, boletimId: b.id, totVal: Number(exp.total_value) })}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                                          Nenhuma despesa lançada
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>

                              {isPending && (
                                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                  <Label className="text-xs font-semibold">Adicionar Despesa / Adicional</Label>
                                  <div className="flex gap-2">
                                    <Input placeholder="Ex: Deslocamento" className="h-8 text-xs flex-1" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
                                    <Input placeholder="Qtd" type="number" className="h-8 text-xs w-16 text-right" value={expQty} onChange={e => setExpQty(e.target.value)} />
                                    <Input placeholder="Valor (R$)" type="number" className="h-8 text-xs w-24 text-right" value={expVal} onChange={e => setExpVal(e.target.value)} />
                                    <Button size="sm" className="h-8" disabled={!expDesc || !expVal || addExpense.isPending} onClick={() => addExpense.mutate(b.id)}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5 z-50">
          <span className="font-medium text-sm">{selectedRows.length} selecionado(s)</span>
          <div className="w-px h-4 bg-primary-foreground/30" />
          <span className="font-bold">Total: {formatCurrency(selectedTotal)}</span>
          <Button size="sm" variant="secondary" className="ml-2 h-7 px-3 text-xs" onClick={() => setSelectedRows([])}>Limpar</Button>
        </div>
      )}

      {/* Edit Values Modal */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Valores da Medição</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => updateBoletim.mutate(d))} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hectares Pulverizados</Label>
                <Input type="number" step="0.01" {...register('hectares_sprayed')} />
              </div>
              <div className="space-y-2">
                <Label>Preço por Hectare (R$)</Label>
                <Input type="number" step="0.01" {...register('price_per_ha')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comissão do Piloto/Técnico (%)</Label>
              <Input type="number" step="0.1" {...register('commission_pct')} />
            </div>

            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Novo Subtotal:</span>
                <span className="font-semibold">{formatCurrency(currentSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nova Comissão:</span>
                <span className="font-semibold text-primary">{formatCurrency(currentCommission)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || updateBoletim.isPending}>Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <Dialog open={openInvoice} onOpenChange={setOpenInvoice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faturar Boletim BM-{boletimToInvoice?.id?.substring(0, 4)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm mb-2">
              <p><strong>Cliente:</strong> {boletimToInvoice?.client?.name}</p>
              <p><strong>Valor Total:</strong> {formatCurrency(boletimToInvoice?.total_value)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo cadastrado: {boletimToInvoice?.client?.payment_term_days || 0} dias
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Número da Nota Fiscal</Label>
              <Input 
                value={invoiceData.invoice_number} 
                onChange={e => setInvoiceData(prev => ({ ...prev, invoice_number: e.target.value }))} 
                placeholder="Ex: 12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input 
                type="date" 
                value={invoiceData.due_date} 
                onChange={e => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))} 
              />
            </div>

            <div className="space-y-2">
              <Label>Anexar Nota Fiscal (PDF/Img)</Label>
              <Input 
                type="file" 
                onChange={e => setInvoiceData(prev => ({ ...prev, invoice_file: e.target.files?.[0] || null }))} 
              />
            </div>

            <div className="space-y-2">
              <Label>Anexar Boleto (PDF/Img)</Label>
              <Input 
                type="file" 
                onChange={e => setInvoiceData(prev => ({ ...prev, boleto_file: e.target.files?.[0] || null }))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenInvoice(false)}>Cancelar</Button>
            <Button onClick={() => invoiceBoletim.mutate()} disabled={invoiceBoletim.isPending}>
              {invoiceBoletim.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
              Gerar Faturamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
