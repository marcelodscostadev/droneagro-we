import { Cpu, CalendarDays, CheckCircle, Clock, TrendingUp, FileBarChart, Sprout, Gauge, Loader2, ChevronLeft, ChevronRight, Users, Wallet, Scale, PiggyBank, Banknote, CalendarRange, TrendingDown, ArrowUp, ArrowUpRight, ArrowDown, ArrowDownRight, Droplets, Coins, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Navigate, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthCashFilter, fetchAllRows } from '@/lib/finance'

const pad2 = (n: number) => String(n).padStart(2, '0')
const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

interface PeriodMonth {
  key: string
  label: string
  year: number
  month: number
  hectares: number
  faturamento: number
  despesa: number
  resultado: number
  entradas: number
  saidas: number
  saldoCaixa: number
}

/** Gera a lista de meses (chave + rótulo) entre dois meses "AAAA-MM" (inclusive). */
function buildMonths(startKey: string, endKey: string) {
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  if (!sy || !sm || !ey || !em) return []
  const out: { key: string; label: string; year: number; month: number }[] = []
  let cur = new Date(sy, sm - 1, 1)
  const last = new Date(ey, em - 1, 1)
  while (cur <= last && out.length < 36) {
    out.push({
      key: `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}`,
      label: `${MONTH_ABBR[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
      year: cur.getFullYear(),
      month: cur.getMonth() + 1,
    })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return out
}

const formatHa = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

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
  const [histTab, setHistTab] = useState<'mensal' | 'clientes'>('mensal')
  const navigate = useNavigate()

  // ── Filtro de período da análise (padrão: últimos 12 meses) ──────────────────
  const nowRef = new Date()
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(nowRef.getFullYear(), nowRef.getMonth() - 11, 1)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
  })
  const [periodEnd, setPeriodEnd] = useState(`${nowRef.getFullYear()}-${pad2(nowRef.getMonth() + 1)}`)

  const applyPreset = (preset: number | 'ytd') => {
    const n = new Date()
    if (preset === 'ytd') {
      setPeriodStart(`${n.getFullYear()}-01`)
    } else {
      const d = new Date(n.getFullYear(), n.getMonth() - (preset - 1), 1)
      setPeriodStart(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
    }
    setPeriodEnd(`${n.getFullYear()}-${pad2(n.getMonth() + 1)}`)
  }

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

  // ── Análise por período (hectares/cliente, faturamento, despesa, saldo de caixa) ──
  const { data: periodStats, isLoading: isPeriodLoading } = useQuery({
    queryKey: ['dashboard_period_stats', periodStart, periodEnd],
    queryFn: async () => {
      const months = buildMonths(periodStart, periodEnd)
      if (months.length === 0) return null

      const first = months[0]
      const last = months[months.length - 1]
      const firstDayStr = `${first.key}-01`
      const lastDayNum = new Date(last.year, last.month, 0).getDate()
      const lastDayStr = `${last.key}-${pad2(lastDayNum)}`

      const periodStartTs = new Date(first.year, first.month - 1, 1).toISOString()
      const periodEndTs = new Date(last.year, last.month, 1).toISOString()
      const periodStartMs = Date.parse(periodStartTs)
      const periodEndMs = Date.parse(periodEndTs)

      // Período anterior de mesma duração (imediatamente antes)
      const n = months.length
      const prevFirst = new Date(first.year, first.month - 1 - n, 1)
      const prevLast = new Date(first.year, first.month - 2, 1)
      const prevStartTs = new Date(prevFirst.getFullYear(), prevFirst.getMonth(), 1).toISOString()
      const prevStartMs = Date.parse(prevStartTs)

      // 1. Saldo inicial + caixa acumulado antes do período
      const { data: settings } = await supabase.from('company_settings').select('initial_balance').eq('id', 1).single()
      const saldoInicial = Number(settings?.initial_balance || 0)
      const priorPaid = await fetchAllRows<{ type: string; amount: number }>(() => supabase
        .from('transactions').select('type, amount').eq('status', 'paid').lt('paid_at', periodStartTs).order('id'))
      const caixaAnterior = priorPaid.reduce(
        (acc, t) => acc + (t.type === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
        0
      )

      // 2. Transações do período — usadas para despesas (competência) e entradas/saídas efetivas (caixa).
      // O Faturamento NÃO vem daqui: é atribuído ao mês do serviço pelos boletins (item 3),
      // pois a nota pode agrupar serviços de meses diferentes e vencer em outro mês.
      const tx = await fetchAllRows<any>(() => supabase
        .from('transactions')
        .select('type, amount, status, due_date, paid_at')
        .or(
          `and(status.eq.pending,due_date.gte.${firstDayStr},due_date.lte.${lastDayStr}),` +
          `and(status.eq.paid,paid_at.gte."${periodStartTs}",paid_at.lt."${periodEndTs}")`
        )
        .order('id'))

      const monthMap = new Map<string, PeriodMonth>()
      months.forEach((m) => monthMap.set(m.key, { ...m, hectares: 0, faturamento: 0, despesa: 0, resultado: 0, entradas: 0, saidas: 0, saldoCaixa: 0 }))

      tx.forEach((t: any) => {
        const v = Number(t.amount) || 0
        let key: string | null = null
        if (t.status === 'paid' && t.paid_at) {
          const d = new Date(t.paid_at)
          key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
        } else if (t.due_date) {
          key = String(t.due_date).slice(0, 7)
        }
        const m = key ? monthMap.get(key) : undefined
        if (!m) return
        if (t.type === 'income') {
          if (t.status === 'paid') m.entradas += v
        } else {
          m.despesa += v
          if (t.status === 'paid') m.saidas += v
        }
      })

      // 3. Boletins — hectares pulverizados e faturamento por mês do serviço (período atual e anterior).
      // A data considerada é a do serviço (scheduled_at); quando não há OS, usa created_at.
      // Importante: boletins lançados em lote têm created_at ≠ data da pulverização.
      const bulletins = await fetchAllRows<any>(() => supabase
        .from('measurement_bulletins')
        .select('hectares_sprayed, total_value, created_at, status, client_id, client:clients(name), service_order:service_orders(scheduled_at)')
        .order('id'))

      type ClientHa = { name: string; ha: number; months: Record<string, number> }
      const curClients = new Map<string, ClientHa>()
      const prevClients = new Map<string, ClientHa>()
      const addHa = (map: Map<string, ClientHa>, id: string, name: string, ha: number, monthKey?: string) => {
        const g = map.get(id) || { name, ha: 0, months: {} }
        g.ha += ha
        if (name) g.name = name
        if (monthKey) g.months[monthKey] = (g.months[monthKey] || 0) + ha
        map.set(id, g)
      }

      bulletins.forEach((b: any) => {
        if (b.status === 'rejected' || b.status === 'cancelled') return
        const ha = Number(b.hectares_sprayed) || 0
        const effectiveDate = b.service_order?.scheduled_at || b.created_at
        const ts = effectiveDate ? new Date(effectiveDate).getTime() : 0
        const name = b.client?.name || 'Sem cliente'
        const id = b.client_id || `nome:${name}`
        if (ts >= periodStartMs && ts < periodEndMs) {
          const d = new Date(ts)
          const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
          addHa(curClients, id, name, ha, key)
          const m = monthMap.get(key)
          if (m) {
            m.hectares += ha
            m.faturamento += Number(b.total_value) || 0
          }
        } else if (ts >= prevStartMs && ts < periodStartMs) {
          addHa(prevClients, id, name, ha)
        }
      })

      // Saldo de caixa acumulado ao fim de cada mês + resultado do mês
      let running = saldoInicial + caixaAnterior
      months.forEach((mk) => {
        const m = monthMap.get(mk.key)!
        m.resultado = m.faturamento - m.despesa
        running += m.entradas - m.saidas
        m.saldoCaixa = running
      })
      const series = months.map((m) => monthMap.get(m.key)!)

      // Comparativo por cliente (atual × período anterior)
      const ids = new Set<string>([...curClients.keys(), ...prevClients.keys()])
      const clientComparison = [...ids]
        .map((id) => {
          const c = curClients.get(id)
          const p = prevClients.get(id)
          const haAtual = c?.ha || 0
          const haAnterior = p?.ha || 0
          const diff = haAtual - haAnterior
          const pct = haAnterior > 0 ? (diff / haAnterior) * 100 : null
          return { name: c?.name || p?.name || 'Sem cliente', haAtual, haAnterior, diff, pct, months: c?.months || {} }
        })
        .sort((a, b) => a.diff - b.diff)

      const totals = series.reduce(
        (acc, m) => {
          acc.hectares += m.hectares
          acc.faturamento += m.faturamento
          acc.despesa += m.despesa
          acc.entradas += m.entradas
          acc.saidas += m.saidas
          return acc
        },
        { hectares: 0, faturamento: 0, despesa: 0, entradas: 0, saidas: 0 }
      )

      return {
        series,
        clientComparison,
        totals: {
          ...totals,
          resultado: totals.faturamento - totals.despesa,
          saldoFinal: series[series.length - 1]?.saldoCaixa ?? saldoInicial + caixaAnterior,
        },
        novos: clientComparison.filter((c) => c.haAnterior === 0 && c.haAtual > 0).length,
        perdidos: clientComparison.filter((c) => c.haAnterior > 0 && c.haAtual === 0).length,
        reduziram: clientComparison.filter((c) => c.haAnterior > 0 && c.haAtual < c.haAnterior).length,
        aumentaram: clientComparison.filter((c) => c.haAtual > c.haAnterior && c.haAnterior > 0).length,
        prevRange: `${prevFirst.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })} – ${prevLast.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`,
      }
    },
    placeholderData: keepPreviousData,
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

  const ps = periodStats
  const psMaxCell = Math.max(1, ...(ps?.clientComparison.flatMap((c) => Object.values(c.months)) || [1]))
  const psReducoes = (ps?.clientComparison || []).filter((c) => c.diff < 0).slice(0, 5)

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

        <Card
          className="relative overflow-hidden border-muted/50 bg-gradient-to-b from-card to-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          onClick={() => navigate('/boletins')}
          title="Ver boletins"
        >
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

        <Card
          className="relative border-red-500/20 bg-red-500/5 group/atraso cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          onClick={() => navigate('/financeiro/receber')}
          title="Ver contas a receber"
        >
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-150">

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

      {/* Financeiro do Mês - Consolidado */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <Card className="xl:col-span-2 border-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base capitalize">
              <Scale className="h-4 w-4 text-primary" />
              Financeiro · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              Mês corrente · competência pelo vencimento e caixa realizado
            </p>
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

      {/* ── Histórico por Período ── */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-250">
        <Card className="border-muted/50">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  Histórico por Período
                  {isPeriodLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Consolidado do período selecionado. O período anterior de mesma duração ({ps?.prevRange ?? '—'}) é a base de comparação.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={periodStart}
                  max={periodEnd}
                  onChange={(e) => e.target.value && setPeriodStart(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="month"
                  value={periodEnd}
                  min={periodStart}
                  onChange={(e) => e.target.value && setPeriodEnd(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => applyPreset(6)}>6 meses</Button>
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => applyPreset(12)}>12 meses</Button>
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => applyPreset('ytd')}>Este ano</Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!ps ? (
              <p className="text-sm text-muted-foreground text-center py-6">Selecione um período válido.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-5">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Droplets className="h-3.5 w-3.5 text-primary" /> Hectares Pulverizados</p>
                  <p className="text-xl font-bold tracking-tight">{formatHa(ps.totals.hectares)}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">no período selecionado</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {ps.totals.resultado >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingDown className="h-3.5 w-3.5 text-red-600" />} Resultado
                  </p>
                  <p className={cn('text-xl font-bold tracking-tight', ps.totals.resultado >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(ps.totals.resultado)}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">faturamento − despesas</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Saldo de Caixa</p>
                  <p className={cn('text-xl font-bold tracking-tight', ps.totals.saldoFinal >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(ps.totals.saldoFinal)}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">ao fim do período · entradas − saídas</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {ps && (
          <>
            <div>
              <Card className="border-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Faturamento por Serviço, Despesas e Saldo de Caixa
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={ps.series} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={70}
                          tickFormatter={(v: any) => `R$ ${Number(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name]}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} verticalAlign="bottom" height={30} />
                        <Bar dataKey="faturamento" name="Faturamento (serviço)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="saldoCaixa" name="Saldo de Caixa" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

            </div>

            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scale className="h-4 w-4 text-primary" />
                      Detalhamento do Período
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Comparativo com o período anterior de mesma duração ({ps.prevRange})
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={histTab === 'mensal' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setHistTab('mensal')}
                    >
                      Evolução Mensal
                    </Button>
                    <Button
                      variant={histTab === 'clientes' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setHistTab('clientes')}
                    >
                      Hectares por Cliente
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  {[
                    { label: 'reduziram', value: ps.reduziram, className: 'text-red-600 bg-red-500/10 border-red-500/20' },
                    { label: 'aumentaram', value: ps.aumentaram, className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'novos', value: ps.novos, className: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
                    { label: 'sem serviço', value: ps.perdidos, className: 'text-muted-foreground bg-muted/40 border-border/40' },
                  ].map((s) => (
                    <span key={s.label} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', s.className)}>
                      <span className="font-bold">{s.value}</span>
                      {s.label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {histTab === 'mensal' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Mês</TableHead>
                      <TableHead className="text-right">Hectares</TableHead>
                      <TableHead className="text-right text-emerald-600">Faturamento (serviço)</TableHead>
                      <TableHead className="text-right text-red-600">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right text-emerald-600">Entradas (caixa)</TableHead>
                      <TableHead className="text-right text-red-600">Saídas (caixa)</TableHead>
                      <TableHead className="text-right pr-6 font-bold text-primary">Saldo de Caixa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ps.series.map((m, i) => {
                      const prevHa = i > 0 ? ps.series[i - 1].hectares : null
                      const varHa = prevHa && prevHa > 0 ? ((m.hectares - prevHa) / prevHa) * 100 : null
                      return (
                      <TableRow key={m.key} className="hover:bg-muted/30">
                        <TableCell className="pl-6 font-medium capitalize">
                          {new Date(m.year, m.month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{formatHa(m.hectares)}</span>
                            {varHa !== null && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-0.5 text-[11px] font-medium',
                                  varHa > 0 ? 'text-emerald-600' : varHa < 0 ? 'text-red-600' : 'text-muted-foreground'
                                )}
                                title={`vs. mês anterior: ${formatHa(prevHa!)} ha`}
                              >
                                {varHa > 0 ? <ArrowUpRight className="h-3 w-3" /> : varHa < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                {Math.abs(varHa).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(m.faturamento)}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{formatCurrency(m.despesa)}</TableCell>
                        <TableCell className={cn('text-right font-medium', m.resultado >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(m.resultado)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{formatCurrency(m.entradas)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(m.saidas)}</TableCell>
                        <TableCell className={cn('text-right pr-6 font-bold', m.saldoCaixa >= 0 ? 'text-primary' : 'text-red-500')}>{formatCurrency(m.saldoCaixa)}</TableCell>
                      </TableRow>
                      )
                    })}
                    <TableRow className="bg-muted/40 font-semibold border-t-2">
                      <TableCell className="pl-6">Total</TableCell>
                      <TableCell className="text-right">{formatHa(ps.totals.hectares)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(ps.totals.faturamento)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(ps.totals.despesa)}</TableCell>
                      <TableCell className={cn('text-right', ps.totals.resultado >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(ps.totals.resultado)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(ps.totals.entradas)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(ps.totals.saidas)}</TableCell>
                      <TableCell className={cn('text-right pr-6', ps.totals.saldoFinal >= 0 ? 'text-primary' : 'text-red-500')}>{formatCurrency(ps.totals.saldoFinal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                ) : (
                <div className="max-h-[520px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6 sticky left-0 z-10 bg-card min-w-[200px]">Cliente</TableHead>
                        {ps.series.map((m) => (
                          <TableHead key={m.key} className="text-center px-2 whitespace-nowrap font-medium">{m.label}</TableHead>
                        ))}
                        <TableHead className="text-right pr-6 whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ps.clientComparison.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={ps.series.length + 2} className="text-center py-6 text-muted-foreground">
                            Nenhum hectare pulverizado registrado nos períodos comparados.
                          </TableCell>
                        </TableRow>
                      ) : ps.clientComparison.map((c) => (
                        <TableRow key={c.name} className={cn('hover:bg-muted/30', c.haAnterior > 0 && c.haAtual === 0 && 'bg-red-500/5')}>
                          <TableCell className="pl-6 font-medium truncate max-w-[200px] sticky left-0 z-10 bg-card" title={c.name}>{c.name}</TableCell>
                          {ps.series.map((m, i) => {
                            const ha = c.months[m.key] || 0
                            const prevHa = i > 0 ? c.months[ps.series[i - 1].key] || 0 : null
                            const trend = prevHa === null || ha === prevHa ? null : ha > prevHa ? 'up' : 'down'
                            const alpha = ha > 0 ? 0.08 + 0.32 * (ha / psMaxCell) : 0
                            return (
                              <TableCell
                                key={m.key}
                                className={cn(
                                  'text-center px-2 tabular-nums',
                                  ha > 0 ? 'font-medium' : 'text-muted-foreground/40 bg-red-500/5'
                                )}
                                style={ha > 0 ? { backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(3)})` } : undefined}
                                title={prevHa === null ? undefined : `vs. mês anterior: ${formatHa(prevHa)} ha`}
                              >
                                <span className="inline-flex items-center justify-center gap-0.5">
                                  {trend === 'up' ? (
                                    <ArrowUp className="h-3 w-3 shrink-0 text-emerald-700" strokeWidth={3} />
                                  ) : trend === 'down' ? (
                                    <ArrowDown className="h-3 w-3 shrink-0 text-red-600" strokeWidth={3} />
                                  ) : null}
                                  <span>{ha > 0 ? formatHa(ha) : '—'}</span>
                                </span>
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right pr-6 font-semibold whitespace-nowrap">{formatHa(c.haAtual)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
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
