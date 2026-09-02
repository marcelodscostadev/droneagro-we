import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { User, Phone, Mail, MapPin, Sprout, Lock, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const telefoneSchema = z.object({
  phone: z.string().min(8, 'Telefone inválido'),
})
const senhaSchema = z.object({
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'As senhas não conferem', path: ['confirm'] })

type TelefoneForm = z.infer<typeof telefoneSchema>
type SenhaForm = z.infer<typeof senhaSchema>

export function ClientPerfil() {
  const { data: user } = useAuth()
  const queryClient = useQueryClient()
  const client = user?.client
  const [showSenha, setShowSenha] = useState(false)

  const { register: regTel, handleSubmit: subTel, formState: { errors: errTel } } = useForm<TelefoneForm>({
    resolver: zodResolver(telefoneSchema),
    defaultValues: { phone: user?.phone || '' },
  })

  const { register: regSen, handleSubmit: subSen, reset: resetSen, formState: { errors: errSen } } = useForm<SenhaForm>({
    resolver: zodResolver(senhaSchema),
  })

  const salvarTelefone = useMutation({
    mutationFn: async (data: TelefoneForm) => {
      const { error } = await supabase.from('profiles').update({ phone: data.phone }).eq('id', user?.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Telefone atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['auth-user'] })
    },
    onError: () => toast.error('Erro ao atualizar telefone.'),
  })

  const salvarSenha = useMutation({
    mutationFn: async (data: SenhaForm) => {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
      resetSen()
      setShowSenha(false)
    },
    onError: () => toast.error('Erro ao alterar senha.'),
  })

  const infoItems = [
    { label: 'Nome', value: client?.name || user?.name, icon: User, locked: true },
    { label: 'E-mail', value: user?.email, icon: Mail, locked: true },
    { label: 'Endereço', value: client?.address, icon: MapPin, locked: true },
    { label: 'Área da Propriedade', value: client?.area_ha ? `${client.area_ha} ha` : null, icon: Sprout, locked: true },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
          <User className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Seus dados cadastrais</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {(client?.name || user?.name || 'C').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg">{client?.name || user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="text-xs bg-emerald-500/15 text-emerald-600 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1 inline-block">
            Portal do Cliente
          </span>
        </div>
      </div>

      {/* Dados somente leitura */}
      <Card className="border-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">Dados da Propriedade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value || '—'}</p>
              </div>
              {item.locked && (
                <div title="Somente leitura">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Editar telefone */}
      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-emerald-500" />
            Telefone de Contato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={subTel((d) => salvarTelefone.mutate(d))} className="flex gap-3">
            <div className="flex-1">
              <Input
                {...regTel('phone')}
                placeholder="(99) 99999-9999"
                className="rounded-xl"
              />
              {errTel.phone && <p className="text-destructive text-xs mt-1">{errTel.phone.message}</p>}
            </div>
            <Button
              type="submit"
              disabled={salvarTelefone.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              {salvarTelefone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card className="border-muted/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-emerald-500" />
            Alterar Senha
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowSenha(v => !v)}>
            {showSenha ? 'Cancelar' : 'Alterar'}
          </Button>
        </CardHeader>
        {showSenha && (
          <CardContent>
            <form onSubmit={subSen((d) => salvarSenha.mutate(d))} className="space-y-3">
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input {...regSen('password')} type="password" placeholder="••••••••" className="rounded-xl" />
                {errSen.password && <p className="text-destructive text-xs">{errSen.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input {...regSen('confirm')} type="password" placeholder="••••••••" className="rounded-xl" />
                {errSen.confirm && <p className="text-destructive text-xs">{errSen.confirm.message}</p>}
              </div>
              <Button
                type="submit"
                disabled={salvarSenha.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {salvarSenha.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar nova senha
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
