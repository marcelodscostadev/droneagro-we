import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Mail, Lock, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

const signInSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type SignInFormData = z.infer<typeof signInSchema>

export function SignIn() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  async function handleSignIn(data: SignInFormData) {
    setIsLoading(true)
    try {
      if (data.email === 'admin@droneagro.com' && data.password === '123456') {
        localStorage.setItem('@droneagro:user', JSON.stringify({ id: '1', name: 'Administrador', role: 'admin', email: 'admin@droneagro.com' }))
        queryClient.invalidateQueries({ queryKey: ['auth-user'] })
        navigate('/')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error('Credenciais inválidas. Verifique e-mail e senha.')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      navigate('/')
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-8 bg-card/50 backdrop-blur-sm p-8 sm:p-10 rounded-3xl border border-border/50 shadow-2xl shadow-primary/5">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-primary/15 rounded-2xl border border-primary/20">
            <Cpu className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesse sua conta</h1>
        <p className="text-muted-foreground text-sm">Insira suas credenciais para continuar</p>
      </div>

      <form onSubmit={handleSubmit(handleSignIn)} className="space-y-6">
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
          className="w-full h-12 text-base font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 group"
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          )}
          Entrar no Painel
        </Button>
      </form>
    </div>
  )
}
