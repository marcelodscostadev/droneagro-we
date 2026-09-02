import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendClientEmail } from '@/lib/send-email'
import { toast } from 'sonner'
import { CalendarDays, Plus, AlertCircle, CheckCircle, Clock, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending_client: { label: 'Aguardando Aprovação', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', icon: Clock, desc: 'Nossa equipe irá analisar sua solicitação em breve.' },
  scheduled:      { label: 'Confirmado ✓', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle, desc: 'Agendamento confirmado pela equipe.' },
  rescheduled:    { label: 'Nova data proposta', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20', icon: AlertCircle, desc: 'A equipe propôs uma nova data. Aceite ou cancele.' },
  in_activity:    { label: 'Em Andamento', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: CheckCircle, desc: 'Serviço em execução.' },
  in_progress:    { label: 'Em Andamento', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: CheckCircle, desc: 'Serviço em execução.' },
  completed:      { label: 'Concluído', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle, desc: 'Serviço finalizado com sucesso.' },
  finished:       { label: 'Concluído', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle, desc: 'Serviço finalizado com sucesso.' },
  cancelled:      { label: 'Cancelado', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: XCircle, desc: 'Agendamento cancelado.' },
}

const solicitacaoSchema = z.object({
  scheduled_at: z.string().min(1, 'Informe a data desejada'),
  notes: z.string().optional(),
})
type SolicitacaoForm = z.infer<typeof solicitacaoSchema>

export function ClientAgendamentos() {
  const { data: user } = useAuth()
  const clientId = user?.client_id
  const queryClient = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['client-agendamentos', clientId],
    queryFn: async () => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('service_orders')
        .select('*, technician:profiles(name)')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!clientId,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SolicitacaoForm>({
    resolver: zodResolver(solicitacaoSchema),
  })

  const criarSolicitacao = useMutation({
    mutationFn: async (formData: SolicitacaoForm) => {
      const { error } = await supabase.from('service_orders').insert([{
        client_id: clientId,
        status: 'pending_client',
        type: 'paid',
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        notes: formData.notes || null,
      }])
      if (error) throw error
    },
    onSuccess: async (_, formData) => {
      toast.success('Solicitação enviada! Você receberá um e-mail de confirmação.')
      await sendClientEmail('solicitacao', {
        client_email: user?.email || '',
        client_name: user?.client?.name || user?.name || 'Cliente',
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        notes: formData.notes,
      })
      queryClient.invalidateQueries({ queryKey: ['client-agendamentos'] })
      setOpenNew(false)
      reset()
    },
    onError: (e: any) => toast.error('Erro ao enviar solicitação: ' + e.message),
  })

  const aceitarReagendamento = useMutation({
    mutationFn: async (os: any) => {
      const { error } = await supabase.from('service_orders')
        .update({ status: 'scheduled', scheduled_at: os.rescheduled_at })
        .eq('id', os.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Nova data aceita! Agendamento confirmado.')
      queryClient.invalidateQueries({ queryKey: ['client-agendamentos'] })
    },
  })

  const cancelarAgendamento = useMutation({
    mutationFn: async (osId: string) => {
      const { error } = await supabase.from('service_orders')
        .update({ status: 'cancelled' })
        .eq('id', osId)
      if (error) throw error
    },
    onSuccess: async (_, osId) => {
      toast.success('Agendamento cancelado.')
      const os = agendamentos.find((a: any) => a.id === osId)
      if (os) {
        await sendClientEmail('cancelamento', {
          client_email: user?.email || '',
          client_name: user?.client?.name || user?.name || 'Cliente',
          scheduled_at: os.scheduled_at,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['client-agendamentos'] })
    },
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <CalendarDays className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Solicite e acompanhe seus serviços</p>
          </div>
        </div>
        <Button
          onClick={() => setOpenNew(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
        >
          <Plus className="h-4 w-4 mr-2" /> Solicitar Agendamento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : agendamentos.length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="py-16 text-center text-muted-foreground space-y-4">
            <CalendarDays className="h-12 w-12 mx-auto opacity-20" />
            <div>
              <p className="font-semibold">Nenhum agendamento ainda</p>
              <p className="text-sm">Clique em "Solicitar Agendamento" para começar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agendamentos.map((os: any) => {
            const cfg = STATUS_MAP[os.status] || STATUS_MAP['scheduled']
            const Icon = cfg.icon
            const isExpanded = expandedId === os.id
            const isRescheduled = os.status === 'rescheduled'
            const canCancel = ['pending_client', 'rescheduled'].includes(os.status)

            return (
              <Card key={os.id} className="border-muted/50 overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : os.id)}
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">
                        {new Date(os.scheduled_at).toLocaleDateString('pt-BR', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </p>
                      {os.os_number && (
                        <span className="text-xs text-muted-foreground">OS-{String(os.os_number).padStart(4, '0')}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {os.area_ha ? `${os.area_ha} ha estimados` : 'Área a confirmar'}
                      {os.technician?.name ? ` · ${os.technician.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border hidden sm:inline ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3 bg-muted/10">
                    <p className="text-sm text-muted-foreground">{cfg.desc}</p>

                    {isRescheduled && os.rescheduled_at && (
                      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Nova data proposta pela equipe:</p>
                        <p className="text-base font-bold">
                          {new Date(os.rescheduled_at).toLocaleDateString('pt-BR', {
                            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                          })}
                        </p>
                        {os.reschedule_reason && (
                          <p className="text-xs text-muted-foreground">Motivo: {os.reschedule_reason}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => aceitarReagendamento.mutate(os)}
                            disabled={aceitarReagendamento.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Aceitar nova data
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => cancelarAgendamento.mutate(os.id)}
                            disabled={cancelarAgendamento.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {os.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Observações: </span>
                        <span>{os.notes}</span>
                      </div>
                    )}

                    {canCancel && !isRescheduled && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => cancelarAgendamento.mutate(os.id)}
                        disabled={cancelarAgendamento.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancelar solicitação
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal nova solicitação */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-500" />
              Solicitar Agendamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => criarSolicitacao.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Data desejada *</Label>
              <Input
                {...register('scheduled_at')}
                id="scheduled_at"
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.scheduled_at && <p className="text-destructive text-xs">{errors.scheduled_at.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações / Cultura / Localização</Label>
              <Textarea
                {...register('notes')}
                id="notes"
                placeholder="Ex: Soja - Talhão próximo ao rio. Melhor horário: manhã."
                rows={3}
              />
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
              ℹ️ Após enviar, nossa equipe analisará a disponibilidade e você receberá um e-mail com a confirmação.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={isSubmitting || criarSolicitacao.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting || criarSolicitacao.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
