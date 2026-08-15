import { UserCog, Percent, DollarSign, Loader2, RefreshCcw, Info } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'

export function UsuariosPage() {
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading, isFetching } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { commission_type: 'percent', commission_value: 0, role: 'technician', phone: '' }
  })

  const openEdit = (user: any) => {
    setEditingUser(user)
    reset({
      commission_type: user.commission_type || 'percent',
      commission_value: user.commission_value || 0,
      role: user.role || 'technician',
      phone: user.phone || ''
    })
    setOpen(true)
  }

  const updateUser = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', editingUser.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setOpen(false)
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message)
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><UserCog className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Usuários e Equipe {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie comissões e acessos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['profiles'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 text-muted-foreground p-4 rounded-md text-sm flex gap-3 border border-border">
        <Info className="h-5 w-5 shrink-0 text-primary" />
        <p>Para adicionar novos técnicos, crie o acesso através da tela <b>Authentication</b> no painel do Supabase. Após criar a conta lá, o usuário aparecerá aqui automaticamente para você configurar a comissão.</p>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Comissão (Tipo)</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Administrador' : 'Técnico'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.commission_type === 'percent' ? (
                        <span className="flex items-center gap-1 text-muted-foreground"><Percent className="h-3 w-3" /> Porcentagem</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3 w-3" /> Fixo por Hectare</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {u.commission_value > 0 ? (
                        u.commission_type === 'percent' ? `${u.commission_value}%` : `R$ ${u.commission_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ha`
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Configurar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Configurar Técnico</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => updateUser.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editingUser?.name || ''} disabled />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="technician">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input {...register('phone')} placeholder="(65) 99999-0000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <Controller
                  name="commission_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Fixo por Hectare (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da Comissão</Label>
                <Input {...register('commission_value', { valueAsNumber: true })} type="number" step="0.01" />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || updateUser.isPending}>
                {isSubmitting || updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Configuração
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
