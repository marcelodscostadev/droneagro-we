import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileText, Search, ChevronLeft, ChevronRight, Truck, MapPin, Plus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const shiftSchema = z.object({
  shift_date: z.string().min(1, 'Selecione a data'),
  technician_id: z.string().min(1, 'Selecione o técnico'),
  km_start: z.coerce.number().min(0, 'Inválido'),
  km_end: z.coerce.number().min(0, 'Inválido'),
}).refine(data => data.km_end >= data.km_start, {
  message: 'KM Final deve ser maior ou igual ao Inicial',
  path: ['km_end']
})

type ShiftFormData = z.infer<typeof shiftSchema>

export function ItinerariosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [openForm, setOpenForm] = useState(false)

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

  // Queries
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name').eq('role', 'technician').order('name')
      if (error) throw error; return data
    }
  })

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['itinerarios', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_shifts')
        .select(`
          id,
          shift_date,
          km_start,
          km_end,
          status,
          technician:profiles(name)
        `)
        .gte('shift_date', startOfMonth)
        .lte('shift_date', endOfMonth)
        .order('shift_date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    placeholderData: keepPreviousData
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shift_date: new Date().toISOString().split('T')[0],
      km_start: 0,
      km_end: 0
    }
  })

  const createShift = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      // ajusta o timezone para gravar correto no banco
      const d = new Date(data.shift_date + 'T12:00:00')
      
      const { error } = await supabase.from('daily_shifts').insert([{
        shift_date: d.toISOString(),
        technician_id: data.technician_id,
        km_start: data.km_start,
        km_end: data.km_end,
        status: 'completed', // Manually added shifts are automatically completed
      }])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Itinerário lançado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['itinerarios'] })
      setOpenForm(false)
      reset()
    },
    onError: (error: any) => {
      toast.error('Erro ao lançar itinerário: ' + error.message)
    }
  })

  const kpis = useMemo(() => {
    let totalKm = 0
    let shiftCount = shifts.length

    shifts.forEach((s: any) => {
      if (s.km_start != null && s.km_end != null && s.km_end >= s.km_start) {
        totalKm += (s.km_end - s.km_start)
      }
    })

    return { totalKm, shiftCount }
  }, [shifts])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Itinerários e Quilometragem</h1>
            <p className="text-sm text-muted-foreground">Relatório e controle de quilometragem da frota</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => setOpenForm(true)} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
          </Button>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold capitalize min-w-[120px] text-center">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
            }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-muted/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Total Rodado no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{kpis.totalKm.toLocaleString('pt-BR')} <span className="text-lg">KM</span></div>
          </CardContent>
        </Card>
        <Card className="border-muted/50 bg-secondary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-secondary-foreground" /> Turnos / Deslocamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.shiftCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center justify-between">
            <div className="flex items-center gap-2"><Search className="h-4 w-4" /> Histórico do Mês Selecionado</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Data do Turno</TableHead>
                <TableHead>Técnico / Motorista</TableHead>
                <TableHead className="text-center">KM Inicial</TableHead>
                <TableHead className="text-center">KM Final</TableHead>
                <TableHead className="text-center">Rodado (KM)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell>
                </TableRow>
              ) : shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum deslocamento registrado neste mês.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s: any) => {
                  const kmStart = s.km_start || 0;
                  const kmEnd = s.km_end || 0;
                  const kmRodado = kmEnd > 0 ? (kmEnd - kmStart) : 0;
                  
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">
                        {new Date(s.shift_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </TableCell>
                      <TableCell>{s.technician?.name || 'Desconhecido'}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{kmStart.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{kmEnd ? kmEnd.toLocaleString('pt-BR') : '--'}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{kmRodado > 0 ? kmRodado.toLocaleString('pt-BR') : '--'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/relatorios/itinerarios/${s.id}/pdf`)}
                          className="h-8"
                        >
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          Gerar PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Novo Lançamento Manual */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançamento Manual de Itinerário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createShift.mutate(d))} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Data do Turno</Label>
              <Input type="date" {...register('shift_date')} />
              {errors.shift_date && <span className="text-xs text-destructive">{errors.shift_date.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Técnico / Motorista</Label>
              <Controller
                name="technician_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.technician_id && <span className="text-xs text-destructive">{errors.technician_id.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>KM Inicial</Label>
                <Input type="number" {...register('km_start')} />
                {errors.km_start && <span className="text-xs text-destructive">{errors.km_start.message}</span>}
              </div>
              <div className="space-y-2">
                <Label>KM Final</Label>
                <Input type="number" {...register('km_end')} />
                {errors.km_end && <span className="text-xs text-destructive">{errors.km_end.message}</span>}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => { setOpenForm(false); reset() }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createShift.isPending}>
                {(isSubmitting || createShift.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
