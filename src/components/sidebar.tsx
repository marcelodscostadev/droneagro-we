import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Wallet,
  BarChart3,
  Settings,
  ChevronDown,
  Cpu,
  TrendingUp,
  Receipt,
  BadgeDollarSign,
  UserCog,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

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
      { label: 'Apuração de Resultado', to: '/financeiro/apuracao', icon: BarChart3 },
    ],
  },
  {
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { label: 'Operacional', to: '/relatorios/operacional', icon: TrendingUp },
    ],
  },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, allowedRoles: ['admin'] },
]

export function Sidebar() {
  const location = useLocation()
  const { data: user } = useAuth()

  const [expandedMenus, setExpandedMenus] = useState<string[]>(
    NAV_ITEMS.filter(item => item.items && item.items.length > 0).map(item => item.label)
  )

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(user?.role || '')
  })

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  return (
    <aside className="hidden lg:flex w-64 flex-col h-screen border-r border-border/40 bg-card/80 backdrop-blur-md shadow-2xl shadow-black/5 flex-shrink-0 z-10">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border/40 shrink-0">
        <Link to="/" className="flex items-center gap-3 group hover:opacity-90 transition-opacity">
          <div className="bg-primary/15 p-2 rounded-lg group-hover:bg-primary/25 transition-colors">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-foreground">DroneAgro</span>
            <div className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">Gestão de Drones</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = item.items
            ? item.items.some(i => location.pathname.startsWith(i.to))
            : location.pathname === item.to

          const isExpanded = expandedMenus.includes(item.label) || isActive

          if (item.items) {
            return (
              <div key={item.label} className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-5 h-auto rounded-lg hover:bg-accent/50 transition-all',
                    isActive ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn('h-4 w-4', isActive ? 'text-primary' : '')} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isExpanded ? 'rotate-180' : '')} />
                </Button>

                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out pl-3',
                  isExpanded ? 'max-h-[400px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                )}>
                  <div className="space-y-1 border-l border-border/40 ml-3 py-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.to}
                        to={subItem.to}
                        className={cn(
                          'flex items-center gap-3 w-full py-2 px-4 text-[13px] rounded-r-lg transition-all relative -left-[1px] border-l-2',
                          location.pathname === subItem.to
                            ? 'text-primary bg-primary/5 font-semibold border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 font-medium border-transparent hover:border-border/50'
                        )}
                      >
                        <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{subItem.label}</span>
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
                'w-full flex items-center gap-3 px-3 py-3 h-auto rounded-lg transition-all border border-transparent',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm border-primary/20'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground font-medium'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] text-muted-foreground font-medium">Sistema Online</span>
          <span className="text-[10px] text-muted-foreground/50 ml-auto">v1.0</span>
        </div>
      </div>
    </aside>
  )
}
