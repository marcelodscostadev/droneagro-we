import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, Users, Target, Activity } from 'lucide-react'
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
import { useMemo } from 'react'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

export function OperacionalPage() {
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
          technician:profiles(name)
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
        .select('status')
      if (error) throw error
      return data || []
    }
  })

  const { techData, clientData, totalHectares, avgHectares } = useMemo(() => {
    let tMap: Record<string, number> = {}
    let cMap: Record<string, number> = {}
    let total = 0

    boletins.forEach((b: any) => {
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
    const uniqueDays = new Set(boletins.map(b => b.created_at.split('T')[0])).size
    const avg = uniqueDays > 0 ? (total / uniqueDays) : 0

    return { techData: techArray, clientData: clientArray, totalHectares: total, avgHectares: avg }
  }, [boletins])

  const osStatusCount = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    osData.forEach(os => {
      counts[os.status] = (counts[os.status] || 0) + 1
    })
    return counts
  }, [osData])

  if (isLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório Operacional</h1>
          <p className="text-sm text-muted-foreground">Métricas de produtividade e execução de campo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <Target className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Total de Hectares</p>
            <h3 className="text-3xl font-bold">{totalHectares.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <Activity className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Média Diária (ha/dia)</p>
            <h3 className="text-3xl font-bold">{avgHectares.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <Users className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">OS Concluídas</p>
            <h3 className="text-3xl font-bold">{osStatusCount.completed}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">OS Pendentes / Em Progresso</p>
            <h3 className="text-3xl font-bold">{osStatusCount.pending + osStatusCount.in_progress}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Hectares por Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={techData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hectares" name="Hectares" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Hectares por Cliente (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
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
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
