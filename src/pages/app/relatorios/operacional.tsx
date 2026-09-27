import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, Users, Target, Activity, CheckCircle, Clock, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

export function OperacionalPage() {
  const today = new Date()
  const [filterType, setFilterType] = useState<'all'|'month'|'period'>('all')
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const { data: boletins = [], isLoading } = useQuery({
    queryKey: ['relatorio_operacional'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurement_bulletins')
        .select(`
          id,
          status,
          hectares_sprayed,
          created_at,
          client:clients(name),
          technician:profiles(name),
          service_order:service_orders(scheduled_at)
        `)
        .in('status', ['approved', 'invoiced'])
      
      if (error) throw error
      return data || []
    }
  })

  const { data: osData = [] } = useQuery({
    queryKey: ['relatorio_os_status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select('status, created_at, scheduled_at')
      if (error) throw error
      return data || []
    }
  })

  const filteredBoletins = useMemo(() => {
    return boletins.filter((b: any) => {
      const dateRaw = b.service_order?.scheduled_at || b.created_at
      const date = dateRaw ? dateRaw.split('T')[0] : ''
      if (filterType === 'all') return true
      if (filterType === 'month' && monthFilter) {
        return date.startsWith(monthFilter)
      }
      if (filterType === 'period' && dateRange.start && dateRange.end) {
        return date >= dateRange.start && date <= dateRange.end
      }
      return true
    })
  }, [boletins, filterType, monthFilter, dateRange])

  const filteredOsData = useMemo(() => {
    return osData.filter((os: any) => {
      const dateRaw = os.scheduled_at || os.created_at
      const date = dateRaw ? dateRaw.split('T')[0] : ''
      if (filterType === 'all') return true
      if (filterType === 'month' && monthFilter) {
        return date.startsWith(monthFilter)
      }
      if (filterType === 'period' && dateRange.start && dateRange.end) {
        return date >= dateRange.start && date <= dateRange.end
      }
      return true
    })
  }, [osData, filterType, monthFilter, dateRange])

  const { techData, clientData, totalHectares, avgHectares } = useMemo(() => {
    let tMap: Record<string, number> = {}
    let cMap: Record<string, number> = {}
    let total = 0

    filteredBoletins.forEach((b: any) => {
      const h = Number(b.hectares_sprayed) || 0
      total += h
      
      const tName = b.technician?.name || 'Sem Técnico'
      tMap[tName] = (tMap[tName] || 0) + h

      const cName = b.client?.name || 'Sem Cliente'
      cMap[cName] = (cMap[cName] || 0) + h
    })

    const techArray = Object.entries(tMap).map(([name, hectares]) => ({ name, hectares })).sort((a,b) => b.hectares - a.hectares)
    const clientArray = Object.entries(cMap).map(([name, hectares]) => ({ name, hectares })).sort((a,b) => b.hectares - a.hectares)
    
    // Average hectares per day (assuming operations spread over unique days)
    const uniqueDays = new Set(filteredBoletins.map((b: any) => {
      const dateRaw = b.service_order?.scheduled_at || b.created_at
      return dateRaw.split('T')[0]
    })).size
    const avg = uniqueDays > 0 ? (total / uniqueDays) : 0

    return { techData: techArray, clientData: clientArray, totalHectares: total, avgHectares: avg }
  }, [filteredBoletins])

  const osStatusCount = useMemo(() => {
    const counts: Record<string, number> = { 
      scheduled: 0, traveling: 0, in_activity: 0, in_progress: 0, pending: 0, 
      finished: 0, completed: 0, cancelled: 0 
    }
    filteredOsData.forEach((os: any) => {
      counts[os.status] = (counts[os.status] || 0) + 1
    })
    return counts
  }, [filteredOsData])

  if (isLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const concluídas = (osStatusCount.finished || 0) + (osStatusCount.completed || 0)
  const pendentes = (osStatusCount.scheduled || 0) + (osStatusCount.traveling || 0) + (osStatusCount.in_activity || 0) + (osStatusCount.in_progress || 0) + (osStatusCount.pending || 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório Operacional</h1>
          <p className="text-sm text-muted-foreground">Métricas de produtividade e execução de campo</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border shadow-sm mb-6">
        <div className="w-full sm:w-[200px]">
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Histórico</SelectItem>
              <SelectItem value="month">Mensalmente</SelectItem>
              <SelectItem value="period">Por Período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterType === 'month' && (
          <div className="w-full sm:w-[200px] animate-in slide-in-from-left-2">
            <Input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </div>
        )}

        {filterType === 'period' && (
          <div className="w-full sm:w-auto flex items-center gap-2 animate-in slide-in-from-left-2">
            <Input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full sm:w-[150px]"
            />
            <span className="text-muted-foreground text-sm font-medium">até</span>
            <Input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full sm:w-[150px]"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Hectares */}
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-muted/60">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
            <Target className="w-32 h-32 text-blue-500" />
          </div>
          <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Target className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-tight">Total de<br/>Hectares</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <h3 className="text-3xl font-bold tracking-tight">{totalHectares.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</h3>
              <span className="text-sm font-medium text-muted-foreground">ha</span>
            </div>
          </CardContent>
        </Card>

        {/* Média Diária */}
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-muted/60">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
            <Activity className="w-32 h-32 text-emerald-500" />
          </div>
          <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-tight">Média<br/>Diária</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <h3 className="text-3xl font-bold tracking-tight">{avgHectares.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</h3>
              <span className="text-sm font-medium text-muted-foreground">ha/dia</span>
            </div>
          </CardContent>
        </Card>

        {/* OS Concluídas */}
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-muted/60">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
            <CheckCircle className="w-32 h-32 text-indigo-500" />
          </div>
          <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-tight">Ordens<br/>Concluídas</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <h3 className="text-3xl font-bold tracking-tight">{concluídas}</h3>
              <span className="text-sm font-medium text-muted-foreground">OS</span>
            </div>
          </CardContent>
        </Card>

        {/* OS Pendentes */}
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-muted/60">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
            <Clock className="w-32 h-32 text-amber-500" />
          </div>
          <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-tight">Ordens<br/>Pendentes</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <h3 className="text-3xl font-bold tracking-tight">{pendentes}</h3>
              <span className="text-sm font-medium text-muted-foreground">OS</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-muted/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              Hectares por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={techData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha`, 'Hectares']}
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hectares" name="Hectares" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                <PieChartIcon className="h-4 w-4" />
              </div>
              Top 5 Clientes (Hectares)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="hectares"
                  >
                    {clientData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha`, 'Hectares']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
