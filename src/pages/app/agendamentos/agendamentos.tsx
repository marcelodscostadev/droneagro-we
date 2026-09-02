import { CalendarDays, Plus, Filter, Loader2, RefreshCcw, DollarSign, CheckCircle, CalendarClock, Bell, XCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendClientEmail } from '@/lib/send-email'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }> = {
  pending_client: { label: '⏳ Aguard. Aprovação', variant: 'warning' },
  scheduled: { label: 'Agendado', variant: 'secondary' },
  rescheduled: { label: 'Reagendado', variant: 'outline' },
  traveling: { label: 'Em Deslocamento', variant: 'outline' },
  in_activity: { label: 'Em Atividade', variant: 'warning' },
  in_progress: { label: 'Em Atividade', variant: 'warning' },
  finished: { label: 'Finalizado', variant: 'success' },
  completed: { label: 'Finalizado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

const agendamentoSchema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  technician_id: z.string().min(1, 'Selecione um técnico'),
  type: z.string().min(1, 'Selecione o tipo'),
  scheduled_at: z.string().min(1, 'Informe a data e hora'),
  area_ha: z.coerce.number().min(0.1, 'A área deve ser maior que 0'),
  price_per_ha: z.coerce.number().min(0, 'Valor inválido'),
  notes: z.string().optional(),
})

type AgendamentoFormData = z.infer<typeof agendamentoSchema>

const reagendamentoSchema = z.object({
  new_date: z.string().min(1, 'Informe a nova data'),
  reason: z.string().optional(),
})
type ReagendamentoForm = z.infer<typeof reagendamentoSchema>

export function AgendamentosPage() {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reagendando, setReagendando] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, default_price_per_ha').order('name')
      if (error) throw error
      return data
    }
  })

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name').eq('role', 'technician').order('name')
      if (error) throw error
      return data
    }
  })

  const { data: agendamentos = [], isLoading, isFetching } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*, client:clients(name), technician:profiles(name)')
        .order('scheduled_at', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, control, reset, setValue, formState: { errors, isSubmitting } } = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: { type: 'paid', area_ha: 0, price_per_ha: 0 }
  })

  const saveOrder = useMutation({
    mutationFn: async (data: AgendamentoFormData) => {
      const isoDate = new Date(data.scheduled_at).toISOString()
      const payload = { ...data, scheduled_at: isoDate }
      
      if (editingId) {
        const { error } = await supabase.from('service_orders').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('service_orders').insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['service_orders'] })
      setOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar agendamento: ' + error.message)
    }
  })

  // ── Aprovar solicitação do cliente ───────────────────────────────
  const aprovarOS = useMutation({
    mutationFn: async (ag: any) => {
      const { error } = await supabase
        .from('service_orders')
        .update({ status: 'scheduled' })
        .eq('id', ag.id)
      if (error) throw error
    },
    onSuccess: async (_, ag) => {
      toast.success('Solicitação aprovada! Cliente será notificado por e-mail.')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      // Buscar e-mail do cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('client_id', ag.client_id)
        .eq('role', 'client')
        .maybeSingle()
      if (profile) {
        await sendClientEmail('aprovacao', {
          client_email: profile.email,
          client_name: profile.name || ag.client?.name,
          scheduled_at: ag.scheduled_at,
          technician_name: ag.technician?.name,
          area_ha: ag.area_ha,
        })
      }
    },
    onError: () => toast.error('Erro ao aprovar agendamento.'),
  })

  // ── Reagendar solicitação do cliente ─────────────────────────────
  const { register: regReag, handleSubmit: subReag, reset: resetReag, formState: { errors: errReag, isSubmitting: isReagSubmitting } } = useForm<ReagendamentoForm>({
    resolver: zodResolver(reagendamentoSchema),
  })

  const reagendarOS = useMutation({
    mutationFn: async ({ ag, formData }: { ag: any; formData: ReagendamentoForm }) => {
      const { error } = await supabase
        .from('service_orders')
        .update({
          status: 'rescheduled',
          rescheduled_at: new Date(formData.new_date).toISOString(),
          reschedule_reason: formData.reason || null,
        })
        .eq('id', ag.id)
      if (error) throw error
    },
    onSuccess: async (_, { ag, formData }) => {
      toast.success('Nova data proposta! Cliente será notificado por e-mail.')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setReagendando(null)
      resetReag()
      // Buscar e-mail do cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('client_id', ag.client_id)
        .eq('role', 'client')
        .maybeSingle()
      if (profile) {
        await sendClientEmail('reagendamento', {
          client_email: profile.email,
          client_name: profile.name || ag.client?.name,
          original_date: ag.scheduled_at,
          new_date: new Date(formData.new_date).toISOString(),
          reason: formData.reason,
        })
      }
    },
    onError: () => toast.error('Erro ao propor reagendamento.'),
  })

  // ── Cancelar agendamento ───────────────────────────────────────
  const cancelarOS = useMutation({
    mutationFn: async (ag: any) => {
      const { error } = await supabase
        .from('service_orders')
        .update({ status: 'cancelled' })
        .eq('id', ag.id)
      if (error) throw error
    },
    onSuccess: async (_, ag) => {
      toast.success('Agendamento cancelado.')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      // Buscar e-mail do cliente
      if (ag.client_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('client_id', ag.client_id)
          .eq('role', 'client')
          .maybeSingle()
        if (profile) {
          await sendClientEmail('cancelamento', {
            client_email: profile.email,
            client_name: profile.name || ag.client?.name,
            scheduled_at: ag.scheduled_at,
          })
        }
      }
    },
    onError: () => toast.error('Erro ao cancelar agendamento.'),
  })

  // ── Excluir agendamento (Permanente) ───────────────────────────
  const excluirOS = useMutation({
    mutationFn: async (agId: string) => {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', agId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Agendamento excluído do sistema.')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
    },
    onError: () => toast.error('Erro ao excluir agendamento.'),
  })

  const handleClientChange = (clientId: string) => {
    if (editingId) return // Não altera o valor automaticamente se estiver editando
    const client = clients.find(c => c.id === clientId)
    if (client && client.default_price_per_ha) {
      setValue('price_per_ha', client.default_price_per_ha)
    }
  }

  const openNew = () => {
    setEditingId(null)
    reset({ type: 'paid', area_ha: 0, price_per_ha: 0, scheduled_at: '', client_id: '', technician_id: '', notes: '' })
    setOpen(true)
  }

  const openEdit = (ag: any) => {
    setEditingId(ag.id)
    // Para o input datetime-local o formato deve ser YYYY-MM-DDThh:mm
    let localDate = ''
    if (ag.scheduled_at) {
      // ajusta timezone local
      const d = new Date(ag.scheduled_at)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      localDate = d.toISOString().slice(0, 16)
    }

    reset({
      client_id: ag.client_id || '',
      technician_id: ag.technician_id || '',
      type: ag.type || 'paid',
      scheduled_at: localDate,
      area_ha: ag.area_ha || 0,
      price_per_ha: ag.price_per_ha || 0,
      notes: ag.notes || '',
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Agendamentos {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">Controle de visitas e serviços agendados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['agendamentos'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Agendamento</Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? 'Editar Agendamento' : 'Criar Agendamento'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit((d) => saveOrder.mutate(d))} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Cliente *</Label>
                    <Controller
                      name="client_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={(val) => { field.onChange(val); handleClientChange(val); }} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                          <SelectContent>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.client_id && <p className="text-destructive text-xs">{errors.client_id.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Técnico (Piloto) *</Label>
                    <Controller
                      name="technician_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                          <SelectContent>
                            {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.technician_id && <p className="text-destructive text-xs">{errors.technician_id.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Data e Hora *</Label>
                    <Input {...register('scheduled_at')} type="datetime-local" />
                    {errors.scheduled_at && <p className="text-destructive text-xs">{errors.scheduled_at.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Tipo de Serviço *</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Serviço Contratado</SelectItem>
                            <SelectItem value="demo">Demonstração</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Área Prevista (Hectares) *</Label>
                    <Input {...register('area_ha')} type="number" step="0.1" />
                    {errors.area_ha && <p className="text-destructive text-xs">{errors.area_ha.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Valor por Hectare (R$) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...register('price_per_ha')} type="number" step="0.01" className="pl-9" />
                    </div>
                    {errors.price_per_ha && <p className="text-destructive text-xs">{errors.price_per_ha.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações / Localização</Label>
                  <Textarea {...register('notes')} placeholder="Ex: Cuidar com as árvores perto da sede..." />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || saveOrder.isPending}>
                    {isSubmitting || saveOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingId ? 'Salvar Alterações' : 'Agendar Serviço'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Banner de solicitações pendentes */}
      {agendamentos.filter((ag: any) => ag.status === 'pending_client').length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in fade-in">
          <Bell className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            <strong>{agendamentos.filter((ag: any) => ag.status === 'pending_client').length}</strong> solicitação(ões) de clientes aguardando sua aprovação
          </p>
        </div>
      )}

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Exibindo {agendamentos.length} agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº OS</TableHead>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Ha Previsto</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : agendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhum agendamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                agendamentos.map((ag: any) => {
                  const s = STATUS_MAP[ag.status] || STATUS_MAP['scheduled']
                  return (
                    <TableRow key={ag.id}>
                      <TableCell className="font-bold text-muted-foreground text-xs">
                        {ag.os_number ? `OS-${ag.os_number.toString().padStart(4, '0')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary">{formatDate(ag.scheduled_at)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(ag.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </TableCell>
                      <TableCell className="font-medium">{ag.client?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{ag.technician?.name || 'Não atribuído'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={ag.type === 'paid' ? 'default' : 'outline'}>
                          {ag.type === 'paid' ? 'Contratado' : 'Demo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {ag.area_ha ? `${ag.area_ha.toLocaleString('pt-BR')} ha` : '—'}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {ag.status === 'pending_client' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 h-8 px-2 text-xs font-semibold"
                                onClick={() => aprovarOS.mutate(ag)}
                                disabled={aprovarOS.isPending}
                                title="Aprovar solicitação"
                              >
                                {aprovarOS.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                                Aprovar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 h-8 px-2 text-xs font-semibold"
                                onClick={() => { setReagendando(ag); resetReag() }}
                                title="Propor nova data"
                              >
                                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                                Reagendar
                              </Button>
                            </>
                          )}
                          {ag.status !== 'cancelled' && ag.status !== 'completed' && ag.status !== 'finished' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-8 px-2 text-xs font-semibold"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar este agendamento? O cliente será notificado por e-mail.')) {
                                  cancelarOS.mutate(ag)
                                }
                              }}
                              disabled={cancelarOS.isPending}
                              title="Cancelar agendamento"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1 hidden sm:block" />
                              <span className="hidden sm:inline">Cancelar</span>
                              <XCircle className="h-4 w-4 sm:hidden" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => openEdit(ag)}>Editar</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-8 px-2"
                            onClick={() => {
                              if (confirm('Atenção: Tem certeza que deseja EXCLUIR PERMANENTEMENTE este agendamento do banco de dados? (O cliente NÃO será notificado)')) {
                                excluirOS.mutate(ag.id)
                              }
                            }}
                            disabled={excluirOS.isPending}
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Reagendamento */}
      <Dialog open={!!reagendando} onOpenChange={(v) => { if (!v) { setReagendando(null); resetReag() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-orange-500" />
              Propor Reagendamento
            </DialogTitle>
          </DialogHeader>
          {reagendando && (
            <div className="bg-muted/50 rounded-xl p-3 text-sm mb-2 space-y-1">
              <p><span className="text-muted-foreground">Cliente:</span> <strong>{reagendando.client?.name}</strong></p>
              <p><span className="text-muted-foreground">Data solicitada:</span> {formatDate(reagendando.scheduled_at)}</p>
            </div>
          )}
          <form
            onSubmit={subReag((formData) => reagendarOS.mutate({ ag: reagendando, formData }))}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="new_date">Nova data proposta *</Label>
              <Input
                {...regReag('new_date')}
                id="new_date"
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errReag.new_date && <p className="text-destructive text-xs">{errReag.new_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do reagendamento</Label>
              <Textarea
                {...regReag('reason')}
                id="reason"
                placeholder="Ex: Condições climáticas desfavoráveis, agenda lotada..."
                rows={3}
              />
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
              ℹ️ O cliente receberá um e-mail com a nova data proposta e poderá aceitar ou cancelar pelo portal.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setReagendando(null); resetReag() }}>Cancelar</Button>
              <Button
                type="submit"
                disabled={isReagSubmitting || reagendarOS.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isReagSubmitting || reagendarOS.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarClock className="h-4 w-4 mr-2" />}
                Propor nova data
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
