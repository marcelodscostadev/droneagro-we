import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { History, Sprout, FileDown, Loader2, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ClientHistorico() {
  const { data: user } = useAuth()
  const clientId = user?.client_id
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()))
  const currentYear = new Date().getFullYear()
  const anos = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

  const { data, isLoading } = useQuery({
    queryKey: ['client-historico', clientId, anoFiltro],
    queryFn: async () => {
      if (!clientId) return { orders: [], stats: { total: 0, mes: 0, ano: 0 } }

      const startOfYear = new Date(`${anoFiltro}-01-01`).toISOString()
      const endOfYear   = new Date(`${anoFiltro}-12-31T23:59:59`).toISOString()
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [osRes, boletinsRes] = await Promise.all([
        supabase.from('service_orders')
          .select(`
            id, os_number, scheduled_at, area_ha, notes, status,
            technician:profiles(name),
            bulletins:measurement_bulletins(id, hectares_sprayed, status, pdf_url)
          `)
          .eq('client_id', clientId)
          .in('status', ['completed', 'finished'])
          .gte('scheduled_at', startOfYear)
          .lte('scheduled_at', endOfYear)
          .order('scheduled_at', { ascending: false }),

        supabase.from('measurement_bulletins')
          .select('hectares_sprayed, created_at')
          .eq('client_id', clientId)
          .neq('status', 'rejected'),
      ])

      const boletins = boletinsRes.data || []
      const haMes = boletins.filter(b => b.created_at >= startOfMonth).reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)
      const haAno = boletins.filter(b => b.created_at >= startOfYear && b.created_at <= endOfYear).reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)
      const haTotal = boletins.reduce((s, b) => s + (Number(b.hectares_sprayed) || 0), 0)

      return {
        orders: osRes.data || [],
        stats: { haMes, haAno, haTotal },
      }
    },
    enabled: !!clientId,
  })

  // Gráfico de barras simples por mês
  const mesesLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const haPorMes = Array(12).fill(0)
  data?.orders.forEach((os: any) => {
    const mes = new Date(os.scheduled_at).getMonth()
    const ha = os.bulletins?.[0]?.hectares_sprayed || os.area_ha || 0
    haPorMes[mes] += ha
  })
  const maxHa = Math.max(...haPorMes, 1)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <History className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico de Pulverizações</h1>
            <p className="text-sm text-muted-foreground">Todos os serviços realizados na sua propriedade</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={anoFiltro} onValueChange={setAnoFiltro}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: `Ha em ${anoFiltro}`, value: data?.stats.haAno || 0 },
          { label: 'Ha este mês', value: data?.stats.haMes || 0 },
          { label: 'Ha total histórico', value: data?.stats.haTotal || 0 },
        ].map((k) => (
          <Card key={k.label} className="border-muted/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">{k.label}</p>
              <p className="text-3xl font-bold text-emerald-600">
                {isLoading ? '...' : k.value.toLocaleString('pt-BR')}
                <span className="text-base text-muted-foreground ml-1">ha</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de barras */}
      <Card className="border-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-500" />
            Hectares por Mês — {anoFiltro}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-32 pt-2">
            {haPorMes.map((ha, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 relative group"
                    style={{ height: `${(ha / maxHa) * 96}px`, minHeight: ha > 0 ? '4px' : '0' }}
                  >
                    {ha > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {ha.toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground font-medium">{mesesLabels[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (data?.orders || []).length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="py-16 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">Nenhuma pulverização em {anoFiltro}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.orders.map((os: any) => {
            const boletim = os.bulletins?.[0]
            const ha = boletim?.hectares_sprayed || os.area_ha
            const temBoletim = boletim?.status === 'approved' || boletim?.status === 'invoiced'
            return (
              <Card key={os.id} className="border-muted/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    <Sprout className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {new Date(os.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {ha && <span className="text-xs text-muted-foreground">{Number(ha).toLocaleString('pt-BR')} ha</span>}
                      {os.technician?.name && <span className="text-xs text-muted-foreground">{os.technician.name}</span>}
                      {os.os_number && <span className="text-xs text-muted-foreground">OS-{String(os.os_number).padStart(4,'0')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success" className="text-[11px]">Concluído</Badge>
                    {temBoletim && (
                      <Link
                        to={`/boletins/${boletim.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Baixar Boletim"
                      >
                        <Button size="icon" variant="outline" className="h-8 w-8">
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
