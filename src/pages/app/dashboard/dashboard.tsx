import { Cpu, CalendarDays, CheckCircle, Clock, TrendingUp, FileBarChart, Sprout, Gauge, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }> = {
  'finished': { label: 'Concluído', variant: 'success' },
  'in-activity': { label: 'Em Atividade', variant: 'warning' },
  'traveling': { label: 'Em Deslocamento', variant: 'outline' },
  'scheduled': { label: 'Agendado', variant: 'secondary' },
}

export function Dashboard() {
  const { data: user, isLoading: isAuthLoading, isError } = useAuth()

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // 1. Agenda de Hoje (service orders scheduled for today)
      const { data: agendamentosHoje = [] } = await supabase
        .from('service_orders')
        .select('id, scheduled_at, status, type, area_ha, os_number, client:clients(name)')
        .gte('scheduled_at', `${today}T00:00:00Z`)
        .lte('scheduled_at', `${today}T23:59:59Z`)
        .order('scheduled_at', { ascending: true })

      const osHojeTotal = agendamentosHoje?.length || 0
      const osHojeConcluidas = agendamentosHoje?.filter(os => os.status === 'finished').length || 0

      // 2. Boletins Pendentes
      const { count: boletinsPendentes } = await supabase
        .from('measurement_bulletins')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 3. A Receber (Mês)
      const { data: contasReceber } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .eq('status', 'pending')
        .gte('date', startOfMonth)
      const aReceberMes = contasReceber?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

      // 4. Comissões Pendentes
      const { data: comissoes } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .eq('status', 'pending')
        .not('technician_id', 'is', null)
      const comissoesPendentes = comissoes?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

      // 5. Resumo do Mês (OS Concluídas, Hectares)
      const { data: osMes } = await supabase
        .from('service_orders')
        .select('id, status, type, client_id, area_ha')
        .gte('scheduled_at', startOfMonth)
        
      const osConcluidasMes = osMes?.filter(os => os.status === 'finished').length || 0
      const demosMes = osMes?.filter(os => os.type === 'Demonstração').length || 0
      
      const uniqueClients = new Set(osMes?.map(os => os.client_id))
      const clientesAtendidosMes = uniqueClients.size

      // 6. Hectares / Mês
      const { data: boletinsMes } = await supabase
        .from('measurement_bulletins')
        .select('hectares_sprayed')
        .neq('status', 'rejected')
        .gte('created_at', startOfMonth)
      const hectaresMes = boletinsMes?.reduce((acc, curr) => acc + Number(curr.hectares_sprayed), 0) || 0

      return {
        agendamentosHoje: agendamentosHoje || [],
        osHoje: { total: osHojeTotal, concluidas: osHojeConcluidas },
        hectaresMes,
        boletinsPendentes: boletinsPendentes || 0,
        aReceberMes,
        comissoesPendentes,
        osConcluidasMes,
        demosMes,
        clientesAtendidosMes
      }
    },
    refetchInterval: 60000 // Refetch every minute to keep dashboard live
  })

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !user) return <Navigate to="/auth/sign-in" replace />

  const data = stats || {
    agendamentosHoje: [],
    osHoje: { total: 0, concluidas: 0 },
    hectaresMes: 0,
    boletinsPendentes: 0,
    aReceberMes: 0,
    comissoesPendentes: 0,
    osConcluidasMes: 0,
    demosMes: 0,
    clientesAtendidosMes: 0
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-xl">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          Dashboard
          {isStatsLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />}
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
            <p className="text-3xl font-bold tracking-tight">{data.osHoje.concluidas}<span className="text-lg text-muted-foreground">/{data.osHoje.total}</span></p>
            <p className="text-xs text-muted-foreground mt-1">concluídas de {data.osHoje.total} agendadas</p>
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
            <p className="text-3xl font-bold tracking-tight">{data.hectaresMes.toLocaleString('pt-BR')}</p>
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
            <p className="text-3xl font-bold tracking-tight text-amber-600">{data.boletinsPendentes}</p>
            <p className="text-xs text-muted-foreground mt-1">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-emerald-600 transition-colors">A Receber Pendente</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight text-emerald-600">{formatCurrency(data.aReceberMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">em aberto (todas as contas)</p>
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
            {data.agendamentosHoje.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nenhum serviço agendado para hoje.</p>
              </div>
            ) : data.agendamentosHoje.map((ag: any) => {
              const statusCfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG['scheduled']
              const hora = new Date(ag.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-primary">{hora}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{ag.client?.name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{ag.type}</p>
                  </div>
                  {ag.area_ha && (
                    <div className="text-right min-w-[60px] hidden sm:block">
                      <p className="text-sm font-bold text-primary">{ag.area_ha} ha</p>
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
                { label: 'OS Concluídas', value: data.osConcluidasMes, icon: CheckCircle, color: 'text-primary' },
                { label: 'Demonstrações', value: data.demosMes, icon: Clock, color: 'text-muted-foreground' },
                { label: 'Clientes Atendidos', value: data.clientesAtendidosMes, icon: CalendarDays, color: 'text-primary' },
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
              <p className="text-3xl font-bold text-amber-600">{data.boletinsPendentes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Comissões pendentes: {formatCurrency(data.comissoesPendentes)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
