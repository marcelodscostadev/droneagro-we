import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { CalendarDays, History, FileText, Sprout, ChevronRight, Leaf, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending_client: { label: 'Aguardando Aprovação', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', icon: Clock },
  scheduled:      { label: 'Confirmado', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  rescheduled:    { label: 'Reagendado — Ação necessária', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
  in_activity:    { label: 'Em Andamento', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: Sprout },
  in_progress:    { label: 'Em Andamento', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: Sprout },
  completed:      { label: 'Concluído', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  finished:       { label: 'Concluído', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  cancelled:      { label: 'Cancelado', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: AlertCircle },
}

const BANNERS = [
  { bg: 'from-emerald-600 to-emerald-800', title: '🌱 Pulverização de Precisão', desc: 'Tecnologia de drones para maior produtividade na sua lavoura.' },
  { bg: 'from-teal-600 to-emerald-700', title: '📅 Agende com Antecedência', desc: 'Garanta sua data preferida com antecedência e evite filas de espera.' },
  { bg: 'from-green-700 to-emerald-800', title: '✅ Qualidade Garantida', desc: 'Todos os serviços realizados por técnicos certificados e experientes.' },
]

export function ClientDashboard() {
  const { data: user } = useAuth()
  const clientId = user?.client_id

  const { data, isLoading } = useQuery({
    queryKey: ['client-dashboard', clientId],
    queryFn: async () => {
      if (!clientId) return null
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfYear  = new Date(now.getFullYear(), 0, 1).toISOString()

      const [osRes, boletinsRes, docsRes] = await Promise.all([
        supabase.from('service_orders')
          .select('id, os_number, scheduled_at, status, area_ha, type, rescheduled_at')
          .eq('client_id', clientId)
          .order('scheduled_at', { ascending: false })
          .limit(5),

        supabase.from('measurement_bulletins')
          .select('id, hectares_sprayed, created_at, status, total_value')
          .eq('client_id', clientId)
          .neq('status', 'rejected'),

        supabase.from('measurement_bulletins')
          .select('id, invoice_number, boleto_url, invoice_url, total_value, created_at')
          .eq('client_id', clientId)
          .eq('status', 'invoiced')
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      const boletins = boletinsRes.data || []
      const haMes = boletins
        .filter(b => b.created_at >= startOfMonth)
        .reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)
      const haAno = boletins
        .filter(b => b.created_at >= startOfYear)
        .reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)
      const haTotal = boletins.reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)

      const proximas = (osRes.data || []).filter(os =>
        !['completed','finished','cancelled'].includes(os.status)
      )
      const ultimoDoc = docsRes.data?.[0] || null

      return { recentes: osRes.data || [], proximas, haMes, haAno, haTotal, ultimoDoc }
    },
    enabled: !!clientId,
  })

  const clientName = user?.client?.name || user?.name || 'Cliente'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const [bannerIdx, setBannerIdx] = useState(0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">

      {/* Saudação */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
            <Leaf className="h-6 w-6 text-emerald-500" />
          </div>
          {saudacao}, {clientName.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground text-sm ml-14">Bem-vindo ao seu portal de agendamentos</p>
      </div>

      {/* Banner carrossel */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className={`bg-gradient-to-r ${BANNERS[bannerIdx].bg} p-6 sm:p-8 text-white transition-all duration-500`}
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-1">{BANNERS[bannerIdx].title}</h2>
          <p className="text-white/80 text-sm mb-4">{BANNERS[bannerIdx].desc}</p>
          <Link to="/cliente/agendamentos">
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30 border backdrop-blur-sm">
              Agendar agora <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === bannerIdx ? 'bg-white scale-125' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ha este mês', value: `${(data?.haMes || 0).toLocaleString('pt-BR')} ha`, icon: Sprout, color: 'emerald' },
          { label: 'Ha este ano', value: `${(data?.haAno || 0).toLocaleString('pt-BR')} ha`, icon: Sprout, color: 'teal' },
          { label: 'Ha total histórico', value: `${(data?.haTotal || 0).toLocaleString('pt-BR')} ha`, icon: Sprout, color: 'green' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-muted/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`h-5 w-5 text-${kpi.color}-500`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight">{isLoading ? '...' : kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos agendamentos */}
        <Card className="border-muted/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              Próximos Agendamentos
            </CardTitle>
            <Link to="/cliente/agendamentos">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 h-7">
                Ver todos <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : data?.proximas.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum agendamento pendente.
                <div className="mt-3">
                  <Link to="/cliente/agendamentos">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Solicitar agendamento</Button>
                  </Link>
                </div>
              </div>
            ) : data?.proximas.slice(0, 3).map((os: any) => {
              const cfg = STATUS_MAP[os.status] || STATUS_MAP['scheduled']
              const Icon = cfg.icon
              return (
                <div key={os.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <div className={`p-1.5 rounded-lg border ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {os.rescheduled_at
                        ? new Date(os.rescheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : new Date(os.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">{os.area_ha ? `${os.area_ha} ha estimados` : 'Área a confirmar'}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card className="border-muted/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-emerald-500" />
              Histórico Recente
            </CardTitle>
            <Link to="/cliente/historico">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 h-7">
                Ver tudo <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : data?.recentes.filter((os: any) => ['completed','finished'].includes(os.status)).length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma pulverização concluída ainda.
              </div>
            ) : data?.recentes.filter((os: any) => ['completed','finished'].includes(os.status)).slice(0, 3).map((os: any) => (
              <div key={os.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="p-1.5 rounded-lg border text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {new Date(os.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{os.area_ha ? `${os.area_ha} ha pulverizados` : '—'}</p>
                </div>
                <Badge variant="success" className="text-[11px]">Concluído</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Último documento */}
        {data?.ultimoDoc && (
          <Card className="border-emerald-500/20 bg-emerald-500/5 lg:col-span-2">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Documento disponível</p>
                  <p className="text-xs text-muted-foreground">
                    NF {data.ultimoDoc.invoice_number || 'S/N'} · {formatCurrency(data.ultimoDoc.total_value)}
                  </p>
                </div>
              </div>
              <Link to="/cliente/documentos">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Ver documentos <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
