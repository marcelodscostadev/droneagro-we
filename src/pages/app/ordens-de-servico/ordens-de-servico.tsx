import { ClipboardList, Loader2, RefreshCcw, MapPin, Truck, Play, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
  traveling: { label: 'Em Deslocamento', variant: 'outline' },
  in_activity: { label: 'Em Atividade', variant: 'warning' },
  finished: { label: 'Finalizada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

const updateSchema = z.object({
  km_start: z.coerce.number().optional().nullable(),
  km_end: z.coerce.number().optional().nullable(),
})

type UpdateFormData = z.infer<typeof updateSchema>

export function OrdensDeServico() {
  const [open, setOpen] = useState(false)
  const [selectedOs, setSelectedOs] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: ordens = [], isLoading, isFetching } = useQuery({
    queryKey: ['service_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*, client:clients(name), technician:profiles(name)')
        .order('scheduled_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema)
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, data, os }: { id: string, status: string, data?: UpdateFormData, os?: any }) => {
      let updatePayload: any = { status }
      if (data) {
        updatePayload = { ...updatePayload, ...data }
      }
      const { error } = await supabase.from('service_orders').update(updatePayload).eq('id', id)
      if (error) throw error

      if (status === 'finished' && os) {
        const hectares = os.area_ha || 0
        const price = os.price_per_ha || 0
        const subtotal = hectares * price
        
        const { data: existing } = await supabase.from('measurement_bulletins').select('id').eq('service_order_id', id)
        if (!existing || existing.length === 0) {
          const km_total = (data?.km_end && data?.km_start) ? data.km_end - data.km_start : 0
          await supabase.from('measurement_bulletins').insert([{
            service_order_id: id,
            client_id: os.client_id,
            technician_id: os.technician_id,
            status: 'pending',
            hectares_sprayed: hectares,
            price_per_ha: price,
            subtotal: subtotal,
            total_value: subtotal,
            commission_pct: 10,
            commission_value: subtotal * 0.1,
            km_total: km_total
          }])
        }
      }
    },
    onSuccess: () => {
      toast.success('OS atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['service_orders'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] }) // Update other views
      setOpen(false)
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar OS: ' + error.message)
    }
  })

  const openDetails = (os: any) => {
    setSelectedOs(os)
    reset({
      km_start: os.km_start || '',
      km_end: os.km_end || ''
    })
    setOpen(true)
  }

  const handleAdvanceStatus = (newStatus: string) => {
    if (!selectedOs) return
    handleSubmit((data) => {
      if (newStatus === 'finished' && (!data.km_start || !data.km_end)) {
        toast.error('Preencha o KM Inicial e Final para finalizar a OS.')
        return
      }
      updateStatus.mutate({ id: selectedOs.id, status: newStatus, data, os: selectedOs })
    })()
  }

  const formatOsNumber = (num?: number) => {
    if (!num) return 'OS-...'
    return `OS-${num.toString().padStart(4, '0')}`
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ClipboardList className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Ordens de Serviço {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">Acompanhe e gerencie a execução dos serviços</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['service_orders'] })}>
          <RefreshCcw className="h-4 w-4 mr-2" />Atualizar
        </Button>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Exibindo {ordens.length} ordens de serviço
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº OS</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">KM Total</TableHead>
                <TableHead className="text-center">Hectares</TableHead>
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
              ) : ordens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhuma ordem de serviço encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                ordens.map((os: any) => {
                  const s = STATUS_MAP[os.status] || STATUS_MAP['scheduled']
                  const kmTotal = (os.km_start && os.km_end) ? (os.km_end - os.km_start) : null
                  
                  return (
                    <TableRow key={os.id}>
                      <TableCell className="font-bold text-primary">{formatOsNumber(os.os_number)}</TableCell>
                      <TableCell>{formatDate(os.scheduled_at)}</TableCell>
                      <TableCell className="font-medium">{os.client?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{os.technician?.name || '—'}</TableCell>
                      <TableCell className="text-center font-medium">
                        {kmTotal !== null ? `${kmTotal} km` : '—'}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {os.area_ha ? `${os.area_ha} ha` : '—'}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(os)}>Detalhes / Executar</Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          
          {selectedOs && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
                <div>
                  <div className="text-sm text-muted-foreground">OS Número</div>
                  <div className="text-xl font-bold text-primary">{formatOsNumber(selectedOs.os_number)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Status Atual</div>
                  <Badge variant={STATUS_MAP[selectedOs.status]?.variant || 'secondary'}>
                    {STATUS_MAP[selectedOs.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> {selectedOs.client?.name}</div>
                <div><span className="text-muted-foreground">Técnico:</span> {selectedOs.technician?.name || '—'}</div>
                <div><span className="text-muted-foreground">Data Agendada:</span> {formatDate(selectedOs.scheduled_at)}</div>
                <div><span className="text-muted-foreground">Área Prevista:</span> {selectedOs.area_ha ? `${selectedOs.area_ha} ha` : '—'}</div>
              </div>

              <form className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>KM Inicial do Veículo</Label>
                    <Input {...register('km_start')} type="number" placeholder="Ex: 125000" disabled={selectedOs.status === 'finished'} />
                  </div>
                  <div className="space-y-2">
                    <Label>KM Final (Retorno)</Label>
                    <Input {...register('km_end')} type="number" placeholder="Ex: 125050" disabled={selectedOs.status === 'finished'} />
                  </div>
                </div>
                
                {selectedOs.status !== 'finished' && selectedOs.status !== 'cancelled' && (
                  <div className="flex flex-col gap-2 pt-4">
                    <Label className="mb-2">Avançar Fluxo da OS</Label>
                    {selectedOs.status === 'scheduled' && (
                      <Button type="button" onClick={() => handleAdvanceStatus('traveling')} disabled={updateStatus.isPending}>
                        <Truck className="w-4 h-4 mr-2" /> Iniciar Deslocamento
                      </Button>
                    )}
                    {selectedOs.status === 'traveling' && (
                      <Button type="button" onClick={() => handleAdvanceStatus('in_activity')} disabled={updateStatus.isPending} variant="secondary">
                        <MapPin className="w-4 h-4 mr-2" /> Cheguei no Local
                      </Button>
                    )}
                    {selectedOs.status === 'in_activity' && (
                      <Button type="button" onClick={() => handleAdvanceStatus('finished')} disabled={updateStatus.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Serviço
                      </Button>
                    )}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="mt-2" 
                      onClick={() => handleSubmit((data) => updateStatus.mutate({ id: selectedOs.id, status: selectedOs.status, data, os: selectedOs }))()} 
                      disabled={updateStatus.isPending}
                    >
                      Apenas Salvar Dados
                    </Button>
                  </div>
                )}
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
