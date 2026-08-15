import { Cpu, CalendarDays, CheckCircle, Clock, TrendingUp, FileBarChart, Sprout, Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

// Mock stats - will be replaced by real Supabase queries
const mockStats = {
  osHoje: { total: 8, concluidas: 5 },
  hectaresMes: 1240,
  boletinsPendentes: 3,
  aReceberMes: 18500,
  comissoesPendentes: 2100,
}

const mockAgendamentosHoje = [
  { id: '1', hora: '07:30', cliente: 'Fazenda Boa Vista', tipo: 'Serviço Pago', status: 'concluido', hectares: 45 },
  { id: '2', hora: '09:00', cliente: 'Agro Santa Fé', tipo: 'Demonstração', status: 'em-atividade', hectares: null },
  { id: '3', hora: '11:30', cliente: 'Rancho das Flores', tipo: 'Serviço Pago', status: 'agendado', hectares: null },
  { id: '4', hora: '14:00', cliente: 'Fazenda Progresso', tipo: 'Serviço Pago', status: 'agendado', hectares: null },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }> = {
  'concluido': { label: 'Concluído', variant: 'success' },
  'em-atividade': { label: 'Em Atividade', variant: 'warning' },
  'em-deslocamento': { label: 'Em Deslocamento', variant: 'outline' },
  'agendado': { label: 'Agendado', variant: 'secondary' },
}

export function Dashboard() {
  const { data: user, isLoading, isError } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !user) return <Navigate to="/auth/sign-in" replace />

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-xl">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm ml-14">Visão geral das operações de hoje</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">

        <Card className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">OS de Hoje</CardTitle>
            <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight">{mockStats.osHoje.concluidas}<span className="text-lg text-muted-foreground">/{mockStats.osHoje.total}</span></p>
            <p className="text-xs text-muted-foreground mt-1">concluídas de {mockStats.osHoje.total} agendadas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">Hectares / Mês</CardTitle>
            <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <Sprout className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight">{mockStats.hectaresMes.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground mt-1">hectares pulverizados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-amber-600 transition-colors">Boletins Pendentes</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-xl group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
              <FileBarChart className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight text-amber-600">{mockStats.boletinsPendentes}</p>
            <p className="text-xs text-muted-foreground mt-1">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-emerald-600 transition-colors">A Receber (Mês)</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight text-emerald-600">{formatCurrency(mockStats.aReceberMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">em aberto este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-200">

        {/* Today's schedule */}
        <Card className="xl:col-span-2 border-muted/50 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/60 rounded-t-xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                Agenda de Hoje
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockAgendamentosHoje.map((ag) => {
              const statusCfg = STATUS_CONFIG[ag.status]
              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-primary">{ag.hora}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{ag.cliente}</p>
                    <p className="text-xs text-muted-foreground">{ag.tipo}</p>
                  </div>
                  {ag.hectares && (
                    <div className="text-right min-w-[60px] hidden sm:block">
                      <p className="text-sm font-bold text-primary">{ag.hectares} ha</p>
                    </div>
                  )}
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Quick stats panel */}
        <div className="space-y-4">
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4 text-primary" />
                Resumo do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'OS Concluídas', value: '47', icon: CheckCircle, color: 'text-primary' },
                { label: 'Demonstrações', value: '8', icon: Clock, color: 'text-muted-foreground' },
                { label: 'Clientes Atendidos', value: '23', icon: CalendarDays, color: 'text-primary' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <FileBarChart className="h-4 w-4" />
                Boletins Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{mockStats.boletinsPendentes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Comissões pendentes: {formatCurrency(mockStats.comissoesPendentes)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
