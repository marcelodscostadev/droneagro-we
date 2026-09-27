import { ModeToggle } from '@/components/mode-toggle'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { 
  LogOut, User, LayoutDashboard, Users, CalendarDays, 
  ClipboardList, FileBarChart, Wallet, BarChart3, Settings, 
  ChevronDown, Cpu, TrendingUp, Receipt, BadgeDollarSign, 
  UserCog, MapPin 
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  to?: string
  icon: any
  items?: Array<{ label: string; to: string; icon: any }>
  allowedRoles?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', to: '/', icon: LayoutDashboard },
  {
    label: 'Cadastros',
    icon: UserCog,
    items: [
      { label: 'Clientes', to: '/clientes', icon: Users },
      { label: 'Usuários / Técnicos', to: '/usuarios', icon: Users },
    ],
  },
  {
    label: 'Operacional',
    icon: Cpu,
    items: [
      { label: 'Agendamentos', to: '/agendamentos', icon: CalendarDays },
      { label: 'Ordens de Serviço', to: '/ordens-de-servico', icon: ClipboardList },
    ],
  },
  {
    label: 'Medições',
    icon: FileBarChart,
    items: [
      { label: 'Boletins de Medição', to: '/boletins', icon: FileBarChart },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    allowedRoles: ['admin'],
    items: [
      { label: 'Contas a Receber', to: '/financeiro/receber', icon: TrendingUp },
      { label: 'Contas a Pagar', to: '/financeiro/pagar', icon: Receipt },
      { label: 'Comissões', to: '/financeiro/comissoes', icon: BadgeDollarSign },
      { label: 'Apuração (DRE)', to: '/financeiro/apuracao', icon: BarChart3 },
      { label: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa', icon: BarChart3 },
      { label: 'Config. Financeiras', to: '/financeiro/cadastros', icon: UserCog },
    ],
  },
  {
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { label: 'Operacional', to: '/relatorios/operacional', icon: TrendingUp },
      { label: 'Itinerários', to: '/relatorios/itinerarios', icon: MapPin },
    ],
  },
  { label: 'Mapa', to: '/mapa', icon: MapPin },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, allowedRoles: ['admin'] },
]

export function Header() {
  const { data: user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    localStorage.removeItem('@droneagro:user')
    await supabase.auth.signOut()
    queryClient.clear()
    navigate('/auth/sign-in')
  }

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(user?.role || '')
  })

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group hover:opacity-90 transition-opacity">
          <div className="bg-primary/15 p-1.5 rounded-lg group-hover:bg-primary/25 transition-colors">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg tracking-tight text-foreground leading-none">DroneAgro</span>
          </div>
        </Link>
        
        {/* Separator */}
        <div className="h-6 w-px bg-border/50 hidden md:block" />

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {filteredNavItems.map((item) => {
            const isActive = item.items
              ? item.items.some(i => location.pathname.startsWith(i.to))
              : location.pathname === item.to

            if (item.items) {
              return (
                <div key={item.label} className="relative group">
                  <button
                    className={cn(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-default',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                    <ChevronDown className="h-3 w-3 ml-1.5 opacity-50 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="w-56 bg-card border border-border shadow-xl rounded-lg p-1.5 z-50">
                      {item.items.map(subItem => (
                        <Link
                          key={subItem.to}
                          to={subItem.to}
                          className={cn(
                            'flex items-center px-3 py-2.5 text-sm rounded-md transition-colors',
                            location.pathname === subItem.to 
                              ? 'bg-primary/5 text-primary font-medium' 
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          )}
                        >
                          <subItem.icon className="h-4 w-4 mr-2.5 shrink-0" />
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.to}
                to={item.to!}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <ModeToggle />

        <div className="flex items-center gap-2 pl-2 border-l border-border/40 ml-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user?.name || '-'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role || '-'}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
