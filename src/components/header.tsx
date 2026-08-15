import { ModeToggle } from '@/components/mode-toggle'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleLogout() {
    localStorage.removeItem('@droneagro:user')
    await supabase.auth.signOut()
    queryClient.clear()
    navigate('/auth/sign-in')
  }

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:block">
          Bem-vindo,{' '}
          <span className="font-semibold text-foreground">{user?.name || 'Usuário'}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ModeToggle />

        <div className="flex items-center gap-2 pl-2 border-l border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user?.name || '-'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role || '-'}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
