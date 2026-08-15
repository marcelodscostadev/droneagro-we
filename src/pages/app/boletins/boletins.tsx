import { FileBarChart, ChevronDown, ChevronUp, FileDown, CheckCircle, XCircle, Plus, Trash2, Edit } from 'lucide-react'
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
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

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
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedBoletim, setSelectedBoletim] = useState<any>(null)
  
  // Expense Form state
  const [expDesc, setExpDesc] = useState('')
  const [expQty, setExpQty] = useState('1')
  const [expVal, setExpVal] = useState('')

  const queryClient = useQueryClient()

  const { data: boletins = [], isLoading, isFetching } = useQuery({
    queryKey: ['boletins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurement_bulletins')
        .select(`
          *,
          client:clients(name),
          technician:profiles(name),
          service_order:service_orders(os_number, scheduled_at),
          expenses:bulletin_expenses(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema)
  })

  // Watch for dynamic calculation
  const wHectares = watch('hectares_sprayed')
  const wPrice = watch('price_per_ha')
  const wPct = watch('commission_pct')
  
  const currentSubtotal = (wHectares || 0) * (wPrice || 0)
  const currentCommission = currentSubtotal * ((wPct || 0) / 100)

  const updateBoletim = useMutation({
    mutationFn: async (data: EditFormData) => {
      const subtotal = data.hectares_sprayed * data.price_per_ha
      const comissao = subtotal * (data.commission_pct / 100)
      
      // Recalculate total_value based on expenses
      const expensesTotal = selectedBoletim.expenses?.reduce((acc: number, curr: any) => acc + Number(curr.total_value), 0) || 0
      const total_value = subtotal + expensesTotal

      const { error } = await supabase.from('measurement_bulletins')
        .update({
          hectares_sprayed: data.hectares_sprayed,
          price_per_ha: data.price_per_ha,
          commission_pct: data.commission_pct,
          subtotal: subtotal,
          commission_value: comissao,
          total_value: total_value
        })
        .eq('id', selectedBoletim.id)
      
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

      // Also update boletim total_value
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

  const filtered = statusFilter === 'ALL' ? boletins : boletins.filter((b: any) => b.status === statusFilter)

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
    <div className="space-y-6 animate-in fade-in duration-500">
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
                <TableHead className="w-[50px]" />
                <TableHead>Boletim</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Data OS</TableHead>
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
                  <TableCell colSpan={10} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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
                    <TableRow className={cn('group', isExpanded && 'bg-muted/30')}>
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
                          {isPending && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(b)} title="Editar Valores">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => changeStatus.mutate({ id: b.id, status: 'approved' })} title="Aprovar">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => changeStatus.mutate({ id: b.id, status: 'rejected' })} title="Rejeitar">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerar PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: details */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                Detalhamento do Serviço
                              </h3>
                              <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
                                {[
                                  ['KM Rodado', `${b.km_total || 0} km`],
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
                            </div>

                            {/* Right: expenses */}
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

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Valores da Medição</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => updateBoletim.mutate(d))} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hectares Efetivamente Pulverizados</Label>
              <Input {...register('hectares_sprayed')} type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Preço por Hectare (R$)</Label>
              <Input {...register('price_per_ha')} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Comissão do Técnico (%)</Label>
              <Input {...register('commission_pct')} type="number" step="0.1" />
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
    </div>
  )
}
