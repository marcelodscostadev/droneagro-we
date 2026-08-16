import { Users, Plus, Search, Phone, MapPin, CreditCard, Clock, Loader2, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const PAYMENT_LABELS: Record<string, string> = { pix: 'PIX', boleto: 'Boleto', dinheiro: 'Dinheiro', outros: 'Outros' }

const clientSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  area_ha: z.coerce.number().min(0, 'Área inválida'),
  default_price_per_ha: z.coerce.number().min(0, 'Valor inválido'),
  payment_method: z.string().optional(),
  payment_term_days: z.coerce.number().min(0, 'Prazo inválido'),
  notes: z.string().optional(),
  lat: z.any().transform(v => {
    if (v === '' || v === undefined || v === null) return undefined;
    const str = String(v).replace(',', '.');
    return Number(str);
  }),
  lng: z.any().transform(v => {
    if (v === '' || v === undefined || v === null) return undefined;
    const str = String(v).replace(',', '.');
    return Number(str);
  }),
  person_type: z.enum(['PF', 'PJ']).optional().or(z.literal('')),
  document_number: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const { data: clients = [], isLoading, isFetching } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { payment_method: 'pix', payment_term_days: 0, area_ha: 0, default_price_per_ha: 0, person_type: 'PF' }
  })

  const personType = watch('person_type')

  const createClient = useMutation({
    mutationFn: async (data: ClientFormData) => {
      let logo_url = null
      
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(`logos/${fileName}`, logoFile)
        if (uploadError) throw uploadError
        
        logo_url = supabase.storage.from('attachments').getPublicUrl(`logos/${fileName}`).data.publicUrl
      }

      const { error } = await supabase.from('clients').insert([{ ...data, logo_url }])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cliente cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setOpen(false)
      setLogoFile(null)
      reset()
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar cliente: ' + error.message)
    }
  })

  const updateClient = useMutation({
    mutationFn: async (data: ClientFormData) => {
      let logo_url = editingClient.logo_url
      
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(`logos/${fileName}`, logoFile)
        if (uploadError) throw uploadError
        
        logo_url = supabase.storage.from('attachments').getPublicUrl(`logos/${fileName}`).data.publicUrl
      }

      const { error } = await supabase.from('clients').update({ ...data, logo_url }).eq('id', editingClient.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cliente atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setOpen(false)
      setEditingClient(null)
      setLogoFile(null)
      reset()
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar cliente: ' + error.message)
    }
  })

  const handleEdit = (c: any) => {
    setEditingClient(c)
    reset({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      area_ha: c.area_ha || 0,
      default_price_per_ha: c.default_price_per_ha || 0,
      payment_method: c.payment_method || 'pix',
      payment_term_days: c.payment_term_days || 0,
      notes: c.notes || '',
      lat: c.lat || '',
      lng: c.lng || '',
      person_type: c.person_type || 'PF',
      document_number: c.document_number || ''
    })
    setOpen(true)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingClient(null)
      setLogoFile(null)
      reset({ payment_method: 'pix', payment_term_days: 0, area_ha: 0, default_price_per_ha: 0, person_type: 'PF' })
    }
  }

  const filtered = clients.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Clientes {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie seus clientes e propriedades</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenChange(true)}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit((d) => editingClient ? updateClient.mutate(d) : createClient.mutate(d))} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome / Razão Social *</Label>
                    <Input {...register('name')} placeholder="Ex: Fazenda Boa Vista" />
                    {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Cliente</Label>
                    <Controller
                      name="person_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                            <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{personType === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
                    <Input {...register('document_number')} placeholder={personType === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"} />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input {...register('phone')} placeholder="(65) 99999-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input {...register('email')} type="email" placeholder="contato@email.com" />
                    {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Endereço / Propriedade</Label>
                    <Input {...register('address')} placeholder="Rod. MT-130, Km 45..." />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Logomarca (Opcional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    {logoFile && <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {logoFile.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Área Total (ha)</Label>
                    <Input {...register('area_ha')} type="number" step="0.1" placeholder="0.0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Padrão por Hectare (R$)</Label>
                    <Input {...register('default_price_per_ha')} type="number" step="0.01" placeholder="0.00" />
                  </div>
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />Dados de Pagamento
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Forma de Pagamento</Label>
                      <Controller
                        name="payment_method"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="boleto">Boleto</SelectItem>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo de Pagamento (dias)</Label>
                      <Input {...register('payment_term_days')} type="number" placeholder="Ex: 30" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude (Opcional)</Label>
                    <Input {...register('lat')} type="text" placeholder="-12.345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude (Opcional)</Label>
                    <Input {...register('lng')} type="text" placeholder="-55.678901" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea {...register('notes')} placeholder="Informações adicionais..." />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || createClient.isPending || updateClient.isPending}>
                    {isSubmitting || createClient.isPending || updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Salvar Cliente
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead><Phone className="h-3 w-3 inline mr-1" />Contato</TableHead>
                <TableHead><MapPin className="h-3 w-3 inline mr-1" />Localização</TableHead>
                <TableHead className="text-center">Área (ha)</TableHead>
                <TableHead><CreditCard className="h-3 w-3 inline mr-1" />Pagamento</TableHead>
                <TableHead><Clock className="h-3 w-3 inline mr-1" />Prazo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.address || '—'}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{c.area_ha?.toLocaleString('pt-BR')} ha</TableCell>
                    <TableCell><Badge variant="outline">{PAYMENT_LABELS[c.payment_method] || c.payment_method}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.payment_term_days > 0 ? `${c.payment_term_days} dias` : 'À vista'}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>Editar</Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
