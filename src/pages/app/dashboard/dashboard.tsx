import { Cpu, CalendarDays, CheckCircle, Clock, TrendingUp, FileBarChart, Sprout, Gauge, Loader2, ChevronLeft, ChevronRight, Users, Wallet, Scale, PiggyBank, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { monthCashFilter, fetchAllRows } from '@/lib/finance'

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }> = {
  'finished': { label: 'Concluído', variant: 'success' },
  'completed': { label: 'Concluído', variant: 'success' }, // Retrocompatibilidade
  'in_activity': { label: 'Em Atividade', variant: 'warning' },
  'in_progress': { label: 'Em Atividade', variant: 'warning' }, // Retrocompatibilidade
  'traveling': { label: 'Em Deslocamento', variant: 'outline' },
  'scheduled': { label: 'Agendado', variant: 'secondary' },
}

export function Dashboard() {
  const { data: user, isLoading: isAuthLoading, isError } = useAuth()
  const [agendaDate, setAgendaDate] = useState(new Date())
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(agendaDate.getFullYear(), agendaDate.getMonth(), 1))
  const [showCalendar, setShowCalendar] = useState(false)

  const handleSetAgendaDate = (d: Date) => {
    setAgendaDate(d)
    if (d.getMonth() !== currentMonthDate.getMonth() || d.getFullYear() !== currentMonthDate.getFullYear()) {
      setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  // Calendar logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth())
  const firstDay = getFirstDayOfMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth())

  const calendarDays: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i))

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard_stats', agendaDate.toISOString().split('T')[0], currentMonthDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const now = new Date()
      const startOfDay = new Date(agendaDate.getFullYear(), agendaDate.getMonth(), agendaDate.getDate()).toISOString()
      const endOfDay = new Date(agendaDate.getFullYear(), agendaDate.getMonth(), agendaDate.getDate(), 23, 59, 59, 999).toISOString()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfCalendarMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).toISOString()
      const endOfCalendarMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      // 0. Agendamentos e OS (Últimos registros gerais)
      const { data: ultimosAgendamentosRaw } = await supabase
        .from('service_orders')
        .select('id, scheduled_at, status, type, area_ha, os_number, client:clients(name), technician:profiles(name)')
        .order('scheduled_at', { ascending: false })
        .limit(15)
        
      const STATUS_ORDER: Record<string, number> = {
        'pending_client': 1,
        'scheduled': 2,
        'rescheduled': 2,
        'traveling': 3,
        'in_activity': 3,
        'in_progress': 3,
        'finished': 4,
        'completed': 4,
        'cancelled': 5
      }

      // Agendamentos: ordenado por status (pendente primeiro) e depois data (mais recente)
      const ultimosAgendamentos = [...(ultimosAgendamentosRaw || [])].sort((a: any, b: any) => {
        const orderA = STATUS_ORDER[a.status] || 99
        const orderB = STATUS_ORDER[b.status] || 99
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      })

      // OS: ordenado apenas por data (mais recente no topo)
      const ultimasOs = ultimosAgendamentosRaw || []

      // Boletins Recentes
      const { data: ultimosBoletins = [] } = await supabase
        .from('measurement_bulletins')
        .select('id, created_at, status, hectares_sprayed, total_value, service_order:service_orders(os_number), client:clients(name)')
        .order('created_at', { ascending: false })
        .limit(10)

      // 0.5 Agendamentos do Calendário (para os pontos no calendário)
      const { data: agendamentosCalendario = [] } = await supabase
        .from('service_orders')
        .select('scheduled_at')
        .gte('scheduled_at', startOfCalendarMonth)
        .lte('scheduled_at', endOfCalendarMonth)

      // 1. Agenda de Hoje (service orders scheduled for today)
      const { data: agendamentosHoje = [] } = await supabase
        .from('service_orders')
        .select('id, scheduled_at, status, type, area_ha, os_number, client:clients(name)')
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true })

      const osHojeTotal = agendamentosHoje?.length || 0
      const osHojeConcluidas = agendamentosHoje?.filter(os => os.status === 'finished' || os.status === 'completed').length || 0

      // 2. Boletins Pendentes
      const { count: boletinsPendentes } = await supabase
        .from('measurement_bulletins')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 3. A Receber (Mês)
      const contasReceber = await fetchAllRows<{ amount: number }>(() => supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .eq('status', 'pending')
        .order('id'))
      const aReceberMes = contasReceber?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

      // 4. Comissões Pendentes
      const comissoes = await fetchAllRows<{ amount: number }>(() => supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .eq('status', 'pending')
        .not('technician_id', 'is', null)
        .order('id'))
      const comissoesPendentes = comissoes?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

      // 5. Resumo do Mês (OS Concluídas, Hectares)
      const { data: osMes } = await supabase
        .from('service_orders')
        .select('id, status, type, client_id, area_ha')
        .gte('scheduled_at', startOfMonth)
        
      const osConcluidasArr = osMes?.filter(os => os.status === 'finished' || os.status === 'completed') || []
      const osConcluidasMes = osConcluidasArr.length
      const demosMes = osMes?.filter(os => os.type === 'demo').length || 0
      
      const uniqueClients = new Set(osConcluidasArr.map(os => os.client_id))
      const clientesAtendidosMes = uniqueClients.size

      // 6. Hectares / Mês
      const { data: boletinsMes } = await supabase
        .from('measurement_bulletins')
        .select('hectares_sprayed')
        .neq('status', 'rejected')
        .gte('created_at', startOfMonth)
      const hectaresMes = boletinsMes?.reduce((acc, curr) => acc + Number(curr.hectares_sprayed), 0) || 0

      // 7. Financeiro do Mês (pendentes por vencimento, pagas por baixa) + Despesas por tipo
      const pad = (n: number) => String(n).padStart(2, '0')
      const startOfMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
      const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const endOfMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDayMonth)}`
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

      // Pendentes no mês do vencimento; pagas no mês da baixa (mesma regra de Contas a Pagar/Receber)
      const transMes = await fetchAllRows(() => supabase
        .from('transactions')
        .select('type, amount, status, due_date, description, category:financial_categories(name), bulletin:measurement_bulletins(service_orders(clients(name)))')
        .or(monthCashFilter(now.getFullYear(), now.getMonth() + 1))
        .order('id'))

      let prevReceitaMes = 0, prevDespesaMes = 0, recebidoMes = 0, pagoMes = 0
      const despPorTipoMap = new Map<string, { total: number; items: { desc: string; date: string; value: number; paid: boolean }[] }>()
      ;(transMes as any[]).forEach((t) => {
        const v = Number(t.amount) || 0
        if (t.type === 'income') {
          if (t.status === 'paid') recebidoMes += v
          else prevReceitaMes += v
        } else {
          if (t.status === 'paid') pagoMes += v
          else prevDespesaMes += v
          const cat = t.category?.name || 'Sem categoria'
          const g = despPorTipoMap.get(cat) || { total: 0, items: [] }
          g.total += v
          g.items.push({ desc: t.description, date: t.due_date, value: v, paid: t.status === 'paid' })
          despPorTipoMap.set(cat, g)
        }
      })
      const despesasPorTipo = [...despPorTipoMap.entries()]
        .map(([name, g]) => ({ name, total: g.total, items: g.items.sort((a, b) => b.value - a.value) }))
        .sort((a, b) => b.total - a.total)

      const receitaTotalMes = recebidoMes + prevReceitaMes
      const despesaTotalMes = pagoMes + prevDespesaMes
      const saldoProjetadoMes = receitaTotalMes - despesaTotalMes
      const pontoEquilibrioPct = despesaTotalMes > 0 ? Math.min((receitaTotalMes / despesaTotalMes) * 100, 999) : 0

      // 8. Atrasos (receitas vencidas) + clientes em atraso
      const atrasadas = await fetchAllRows(() => supabase
        .from('transactions')
        .select('amount, description, due_date, bulletin:measurement_bulletins(service_orders(clients(name)))')
        .eq('type', 'income')
        .eq('status', 'pending')
        .lt('due_date', todayStr)
        .order('id'))

      const totalAtrasado = (atrasadas as any[]).reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
      const clientesAtrasoSet = new Set<string>()
      ;(atrasadas as any[]).forEach((t) => {
        const name = t.bulletin?.service_orders?.clients?.name
        if (name) clientesAtrasoSet.add(name)
      })
      const faturasAtraso = (atrasadas as any[])
        .map((t) => ({
          desc: t.bulletin?.service_orders?.clients?.name || t.description,
          date: t.due_date,
          value: Number(t.amount) || 0
        }))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

      // 9. Saldo de caixa atual (tudo que entrou - tudo que saiu)
      const saldos = await fetchAllRows(() => supabase
        .from('transactions')
        .select('type, amount')
        .eq('status', 'paid')
        .order('id'))
      const saldoCaixaAtual = (saldos as any[]).reduce(
        (acc, t) => acc + (t.type === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
        0
      )

      return {
        ultimosAgendamentos,
        ultimasOs,
        ultimosBoletins: ultimosBoletins || [],
        agendamentosCalendario: agendamentosCalendario || [],
        agendamentosHoje: agendamentosHoje || [],
        osHoje: { total: osHojeTotal, concluidas: osHojeConcluidas },
        hectaresMes,
        boletinsPendentes: boletinsPendentes || 0,
        aReceberMes,
        comissoesPendentes,
        osConcluidasMes,
        demosMes,
        clientesAtendidosMes,
        prevReceitaMes,
        prevDespesaMes,
        recebidoMes,
        pagoMes,
        saldoProjetadoMes,
        pontoEquilibrioPct,
        despesasPorTipo,
        totalAtrasado,
        faturasAtrasadas: (atrasadas as any[]).length,
        clientesEmAtraso: clientesAtrasoSet.size,
        faturasAtraso,
        saldoCaixaAtual
      }
    },
    refetchInterval: 60000, // Refetch every minute to keep dashboard live
    placeholderData: keepPreviousData
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
    ultimosAgendamentos: [],
    ultimasOs: [],
    ultimosBoletins: [],
    agendamentosCalendario: [],
    agendamentosHoje: [],
    osHoje: { total: 0, concluidas: 0 },
    hectaresMes: 0,
    boletinsPendentes: 0,
    aReceberMes: 0,
    comissoesPendentes: 0,
    osConcluidasMes: 0,
    demosMes: 0,
    clientesAtendidosMes: 0,
    prevReceitaMes: 0,
    prevDespesaMes: 0,
    recebidoMes: 0,
    pagoMes: 0,
    saldoProjetadoMes: 0,
    pontoEquilibrioPct: 0,
    despesasPorTipo: [] as { name: string; total: number; items: { desc: string; date: string; value: number; paid: boolean }[] }[],
    totalAtrasado: 0,
    faturasAtrasadas: 0,
    clientesEmAtraso: 0,
    faturasAtraso: [] as { desc: string; date: string; value: number }[],
    saldoCaixaAtual: 0
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

        <Card className="relative border-red-500/20 bg-red-500/5 group/atraso">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-red-600 transition-colors">Clientes em Atraso</CardTitle>
            <div className="p-2 bg-red-500/10 rounded-xl group-hover:scale-110 transition-all duration-300">
              <Users className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold tracking-tight text-red-600">{data.clientesEmAtraso}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.totalAtrasado)} em {data.faturasAtrasadas} fatura(s) vencida(s)
            </p>

            {/* Tooltip com as faturas em atraso */}
            {data.faturasAtraso.length > 0 && (
              <div className="hidden group-hover/atraso:block absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3">
                <p className="text-xs font-semibold mb-2">
                  Faturas em atraso · {formatCurrency(data.totalAtrasado)}
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {data.faturasAtraso.map((f, idx) => {
                    const dias = f.date ? Math.floor((Date.now() - new Date(`${f.date}T00:00:00`).getTime()) / 86400000) : 0
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">
                          <span className="text-red-600 font-medium">{dias}d</span>
                          {' · '}{f.date ? new Date(`${f.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                          {' · '}{f.desc}
                        </span>
                        <span className="whitespace-nowrap font-medium text-foreground">{formatCurrency(f.value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financeiro do Mês - Consolidado */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <Card className="xl:col-span-2 border-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base capitalize">
              <Scale className="h-4 w-4 text-primary" />
              Financeiro · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-5">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Saldo em Caixa</p>
                <p className={`text-xl font-bold tracking-tight ${data.saldoCaixaAtual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(data.saldoCaixaAtual)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">entradas − saídas realizadas</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Receita do Mês</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600">{formatCurrency(data.recebidoMes + data.prevReceitaMes)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Recebido: {formatCurrency(data.recebidoMes)}<br />A receber: {formatCurrency(data.prevReceitaMes)}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-red-600" /> Despesa do Mês</p>
                <p className="text-xl font-bold tracking-tight text-red-600">{formatCurrency(data.pagoMes + data.prevDespesaMes)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Pago: {formatCurrency(data.pagoMes)}<br />A pagar: {formatCurrency(data.prevDespesaMes)}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><PiggyBank className="h-3.5 w-3.5" /> Saldo Projetado</p>
                <p className={`text-xl font-bold tracking-tight ${data.saldoProjetadoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(data.saldoProjetadoMes)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">fim do mês · receitas − despesas</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Scale className="h-3.5 w-3.5" /> Ponto de Equilíbrio</p>
                <p className="text-xl font-bold tracking-tight text-foreground">{formatCurrency(data.pagoMes + data.prevDespesaMes)}</p>
                <p className={`text-[11px] font-medium leading-snug ${data.pontoEquilibrioPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {data.pontoEquilibrioPct >= 100
                    ? 'atingido ✓'
                    : `faltam ${formatCurrency((data.pagoMes + data.prevDespesaMes) - (data.recebidoMes + data.prevReceitaMes))}`}
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="border-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Despesas por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.despesasPorTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa lançada neste mês.</p>
            ) : (
              (() => {
                const maxTotal = data.despesasPorTipo[0]?.total || 1
                const CORES = ['bg-primary', 'bg-amber-500', 'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']
                return data.despesasPorTipo.slice(0, 8).map((d, i) => (
                  <div key={d.name} className="relative space-y-1 group/row">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[70%] cursor-default" title={d.name}>{d.name}</span>
                      <span className="font-semibold">{formatCurrency(d.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CORES[i % CORES.length]}`}
                        style={{ width: `${Math.max((d.total / maxTotal) * 100, 2)}%` }}
                      />
                    </div>

                    {/* Tooltip com os lançamentos da categoria */}
                    <div className="hidden group-hover/row:block absolute right-0 top-7 z-30 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3">
                      <p className="text-xs font-semibold mb-2">
                        {d.name} · {formatCurrency(d.total)}
                      </p>
                      <div className="max-h-52 overflow-y-auto space-y-1.5">
                        {d.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-muted-foreground">
                              <span className="text-foreground/70">{it.date ? new Date(`${it.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</span>
                              {' · '}{it.desc}
                            </span>
                            <span className={`whitespace-nowrap font-medium ${it.paid ? 'text-muted-foreground' : 'text-amber-600'}`}>
                              {formatCurrency(it.value)}{!it.paid && ' (a pagar)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-200">

        {/* Today's schedule */}
        <Card className="xl:col-span-2 border-muted/50 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/60 rounded-t-xl" />
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                {agendaDate.toDateString() === new Date().toDateString() ? 'Agenda de Hoje' : 'Agenda do Dia'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                  const d = new Date(agendaDate); d.setDate(d.getDate() - 1); handleSetAgendaDate(d);
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="relative flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors">
                    {agendaDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Badge>
                  <input
                    type="date"
                    value={agendaDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-')
                        handleSetAgendaDate(new Date(Number(y), Number(m) - 1, Number(d)))
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                  const d = new Date(agendaDate); d.setDate(d.getDate() + 1); handleSetAgendaDate(d);
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleSetAgendaDate(new Date())}>
                  Hoje
                </Button>
                <Button
                  variant={showCalendar ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowCalendar(s => !s)}
                  title={showCalendar ? 'Ocultar calendário' : 'Mostrar calendário'}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Calendário
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.agendamentosHoje.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nenhum serviço agendado para {agendaDate.toDateString() === new Date().toDateString() ? 'hoje' : 'esta data'}.</p>
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
          {showCalendar && (
          <Card className="border-muted/50 shadow-sm">
            <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold capitalize text-foreground">
                {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => (
                  <div key={idx} className="text-[10px] font-medium text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="h-8 w-8" />
                  
                  const isSelected = date.toDateString() === agendaDate.toDateString()
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  const hasAgendamento = data.agendamentosCalendario?.some((os: any) => {
                    const osDate = new Date(os.scheduled_at)
                    return osDate.getDate() === date.getDate() && osDate.getMonth() === date.getMonth()
                  })
                  
                  return (
                    <div key={date.toISOString()} className="relative flex justify-center">
                      <Button
                        variant={isSelected ? 'default' : isToday ? 'outline' : 'ghost'}
                        className={`h-8 w-8 p-0 font-normal text-xs ${isSelected ? '' : isToday ? 'text-primary font-bold border-primary/50' : 'text-foreground hover:bg-muted'}`}
                        onClick={() => handleSetAgendaDate(date)}
                      >
                        {date.getDate()}
                      </Button>
                      {hasAgendamento && (
                        <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          )}

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
                { label: 'Comissões Pendentes', value: formatCurrency(data.comissoesPendentes), icon: Wallet, color: 'text-amber-600' },
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
        </div>
      </div>

      {/* Últimos Registros - Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-300">
        
        {/* Agendamentos */}
        <Card className="border-muted/50 flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Últimos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {data.ultimosAgendamentos.map((ag: any) => {
              const statusCfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG['scheduled']
              return (
                <div key={ag.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{ag.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ag.scheduled_at).toLocaleDateString('pt-BR')} • {ag.type}</p>
                  </div>
                  <Badge variant={statusCfg.variant} className="ml-2 whitespace-nowrap">{statusCfg.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Ordens de Serviço */}
        <Card className="border-muted/50 flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Últimas Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {data.ultimasOs.map((os: any) => {
              const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG['scheduled']
              return (
                <div key={os.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{os.os_number ? `OS-${String(os.os_number).padStart(4, '0')}` : 'OS-...'} • {os.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(os.scheduled_at).toLocaleDateString('pt-BR')} • {os.technician?.name || 'Sem técnico'}</p>
                  </div>
                  <Badge variant={statusCfg.variant} className="ml-2 whitespace-nowrap">{statusCfg.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Boletins */}
        <Card className="border-muted/50 flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-amber-600" />
              Últimos Boletins
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {data.ultimosBoletins.map((bol: any) => {
              const statusColors: any = {
                'pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                'approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                'rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
                'invoiced': 'bg-blue-500/10 text-blue-600 border-blue-500/20'
              }
              const statusLabels: any = {
                'pending': 'Pendente',
                'approved': 'Aprovado',
                'rejected': 'Rejeitado',
                'invoiced': 'Faturado'
              }
              return (
                <div key={bol.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">OS-{String(bol.service_order?.os_number).padStart(4, '0')} • {bol.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(bol.total_value)} • {bol.hectares_sprayed} ha</p>
                  </div>
                  <Badge variant="outline" className={`ml-2 whitespace-nowrap border ${statusColors[bol.status] || ''}`}>{statusLabels[bol.status]}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
