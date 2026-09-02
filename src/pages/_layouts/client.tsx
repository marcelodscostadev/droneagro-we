import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarDays, History, FileText, Map, User, LogOut, Leaf, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { label: 'Início', to: '/cliente/dashboard', icon: LayoutDashboard },
  { label: 'Agendamentos', to: '/cliente/agendamentos', icon: CalendarDays },
  { label: 'Histórico', to: '/cliente/historico', icon: History },
  { label: 'Documentos', to: '/cliente/documentos', icon: FileText },
  { label: 'Minha Fazenda', to: '/cliente/mapa', icon: Map },
  { label: 'Meu Perfil', to: '/cliente/perfil', icon: User },
]

export function ClientLayout() {
  const { data: user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    localStorage.removeItem('@droneagro:user')
    await supabase.auth.signOut()
    queryClient.clear()
    navigate('/cliente/login')
  }

  const clientName = user?.client?.name || user?.name || 'Cliente'
  const initials = clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-background to-background flex">

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col h-screen border-r border-border/40 bg-card/80 backdrop-blur-md shadow-2xl flex-shrink-0 sticky top-0">

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/20">
              <Leaf className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">Top Locações</span>
              <div className="text-[10px] text-emerald-500 font-semibold leading-none mt-0.5">Portal do Cliente</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-border/40">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{clientName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-emerald-500' : '')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-border/40">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair do Portal
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/90 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-500" />
          <span className="font-bold text-sm">Portal do Cliente</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute top-14 left-0 bottom-0 w-64 bg-card border-r border-border/40 p-4 space-y-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all mt-4"
            >
              <LogOut className="h-4 w-4" />
              Sair do Portal
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 p-4 lg:p-8 mt-14 lg:mt-0 overflow-y-auto min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
