import { CalendarDays, Plus, Filter, Loader2, RefreshCcw, DollarSign } from 'lucide-react'
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

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
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

export function AgendamentosPage() {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
                            <SelectItem value="paid">Serviço Pago</SelectItem>
                            <SelectItem value="demo">Demonstração (Grátis)</SelectItem>
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
                          {ag.type === 'paid' ? 'Pago' : 'Demo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {ag.area_ha ? `${ag.area_ha.toLocaleString('pt-BR')} ha` : '—'}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ag)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
