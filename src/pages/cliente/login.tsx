import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Mail, Lock, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
type LoginFormData = z.infer<typeof loginSchema>

export function ClientLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function handleLogin(data: LoginFormData) {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error('E-mail ou senha incorretos. Verifique e tente novamente.')
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      navigate('/cliente/dashboard')
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-950 via-emerald-900 to-background">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/video-login.mp4')] bg-cover bg-center opacity-10" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-emerald-300/15 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-8 text-center max-w-md">
          <div className="flex items-center justify-center">
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
              <Leaf className="h-14 w-14 text-emerald-300" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
              Top Locações Ltda
            </h1>
            <p className="text-lg text-emerald-200 font-medium">
              Portal do Agricultor
            </p>
            <p className="text-sm text-emerald-300/70 max-w-xs mx-auto leading-relaxed">
              Acompanhe seus agendamentos, histórico de pulverizações e documentos fiscais em um só lugar.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Agendamentos', value: 'Online' },
              { label: 'Histórico', value: 'Completo' },
              { label: 'Documentos', value: 'Seguros' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-emerald-300/70 font-medium">{item.label}</p>
                <p className="text-sm font-bold text-white mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
              <Leaf className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <span className="font-bold text-xl">Top Locações</span>
              <div className="text-xs text-emerald-500 font-medium">Portal do Cliente</div>
            </div>
          </div>

          <div className="w-full space-y-8 bg-card/50 backdrop-blur-sm p-8 sm:p-10 rounded-3xl border border-border/50 shadow-2xl shadow-emerald-500/5">
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center mb-4 lg:hidden">
                <div className="p-3 bg-emerald-500/15 rounded-2xl border border-emerald-500/20">
                  <Leaf className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal do Cliente</h1>
              <p className="text-muted-foreground text-sm">Insira suas credenciais para acessar</p>
            </div>

            <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      {...register('email')}
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 pl-11 text-base rounded-xl"
                    />
                  </div>
                  {errors.email && <p className="text-destructive text-xs font-medium">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      {...register('password')}
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 pl-11 text-base rounded-xl"
                    />
                  </div>
                  {errors.password && <p className="text-destructive text-xs font-medium">{errors.password.message}</p>}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all group"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                )}
                Acessar Meu Portal
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Problemas para acessar?{' '}
              <a href="mailto:topconstrucoes79@gmail.com" className="text-emerald-600 hover:underline font-medium">
                Entre em contato
              </a>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Área administrativa?{' '}
            <a href="/auth/sign-in" className="hover:underline">Acesso do painel</a>
          </p>
        </div>
      </div>
    </div>
  )
}
