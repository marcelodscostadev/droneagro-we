import { BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

function DRELine({
  label,
  value,
  sub,
  indent = 0,
  bold = false,
  color,
  maxValue,
  showBar = false,
  separator = false,
}: {
  label: string
  value: number
  sub?: string
  indent?: number
  bold?: boolean
  color?: string
  maxValue?: number
  showBar?: boolean
  separator?: boolean
}) {
  const pct = maxValue && maxValue > 0 ? Math.min(Math.abs(value) / maxValue, 1) * 100 : 0
  const valueColor = color ?? (value >= 0 ? 'text-emerald-600' : 'text-red-500')

  return (
    <div className={cn('group', separator && 'pt-2')}>
      {separator && <div className="border-t border-border/60 mb-2" />}
      <div
        className={cn(
          'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
          bold ? 'bg-muted/40 hover:bg-muted/60' : 'hover:bg-muted/20',
        )}
        style={{ paddingLeft: `${12 + indent * 16}px` }}
      >
        <div className="flex flex-col min-w-0">
          <span className={cn('text-sm', bold ? 'font-bold' : 'font-medium text-muted-foreground')}>
            {label}
          </span>
          {sub && <span className="text-xs text-muted-foreground/60">{sub}</span>}
        </div>
        <span className={cn('text-sm font-bold whitespace-nowrap ml-4', bold ? 'text-base' : '', valueColor)}>
          {value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
        </span>
      </div>
      {showBar && maxValue && maxValue > 0 && (
        <div className="mx-3 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', value >= 0 ? 'bg-emerald-500' : 'bg-red-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function ApuracaoPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scope, setScope] = useState<'paid' | 'all'>('paid')

  const y = currentDate.getFullYear()
  const m = String(currentDate.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, currentDate.getMonth() + 1, 0).getDate()
  const startOfMonth = `${y}-${m}-01`
  const endOfMonth = `${y}-${m}-${lastDay}T23:59:59`

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_dre', startOfMonth, endOfMonth, scope],
    queryFn: async () => {
      let query = supabase.from('transactions').select('*, category:financial_categories(name)')
      
      if (scope === 'paid') {
        query = query.eq('status', 'paid').gte('paid_at', startOfMonth).lte('paid_at', endOfMonth)
      } else {
        query = query.gte('due_date', startOfMonth).lte('due_date', endOfMonth)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const dre = useMemo(() => {
    const tx = transactions

    const incomes = tx.filter((t: any) => t.type === 'income')
    const expenses = tx.filter((t: any) => t.type === 'expense')

    const receitaBruta = incomes.reduce((a: number, t: any) => a + Number(t.amount), 0)

    // Comissões = despesas com technician_id
    const comissoes = expenses
      .filter((t: any) => t.technician_id)
      .reduce((a: number, t: any) => a + Number(t.amount), 0)

    // Outras despesas agrupadas por categoria
    const outrasDespesas = expenses.filter((t: any) => !t.technician_id)
    const outrasDespesasTotal = outrasDespesas.reduce((a: number, t: any) => a + Number(t.amount), 0)

    const byCategory = outrasDespesas.reduce((acc: any, t: any) => {
      const cat = t.category?.name || 'Sem Categoria'
      acc[cat] = (acc[cat] || 0) + Number(t.amount)
      return acc
    }, {})

    const despesasTotais = comissoes + outrasDespesasTotal
    const lucroBruto = receitaBruta - comissoes
    const resultadoLiquido = receitaBruta - despesasTotais
    const margem = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : 0

    return { receitaBruta, comissoes, outrasDespesasTotal, byCategory, despesasTotais, lucroBruto, resultadoLiquido, margem }
  }, [transactions, scope])

  const mes = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apuração de Resultado (DRE)</h1>
            <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Escopo */}
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border text-xs font-medium gap-1">
            <button
              className={cn('px-3 py-1.5 rounded-md transition-colors', scope === 'paid' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setScope('paid')}
            >Realizadas</button>
            <button
              className={cn('px-3 py-1.5 rounded-md transition-colors', scope === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setScope('all')}
            >Todas (incl. pendentes)</button>
          </div>
          {/* Mês */}
          <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-lg border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold capitalize min-w-[130px] text-center">{mes}</div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Receita Bruta',
            value: dre.receitaBruta,
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            color: 'text-emerald-600',
            bg: 'border-emerald-500/20 bg-emerald-500/5',
          },
          {
            label: 'Total de Despesas',
            value: dre.despesasTotais,
            icon: <TrendingDown className="h-4 w-4 text-red-500" />,
            color: 'text-red-600',
            bg: 'border-red-500/20 bg-red-500/5',
          },
          {
            label: 'Resultado Líquido',
            value: dre.resultadoLiquido,
            icon: <Minus className="h-4 w-4 text-primary" />,
            color: dre.resultadoLiquido >= 0 ? 'text-primary' : 'text-destructive',
            bg: dre.resultadoLiquido >= 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5',
          },
          {
            label: 'Margem Líquida',
            value: null,
            display: `${dre.margem.toFixed(1)}%`,
            icon: <BarChart3 className="h-4 w-4 text-primary" />,
            color: dre.margem >= 0 ? 'text-primary' : 'text-destructive',
            bg: 'border-muted/50 bg-muted/20',
          },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn('border', kpi.bg)}>
            <CardHeader className="pb-1 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent className="pb-4">
              <p className={cn('text-2xl font-bold', kpi.color)}>
                {kpi.display ?? formatCurrency(kpi.value!)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DRE Estruturado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Coluna Esquerda: Estrutura do DRE */}
        <Card className="border-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Estrutura do DRE
              <Badge variant="outline" className="ml-auto text-xs font-normal capitalize">{scope === 'paid' ? 'Realizadas' : 'Incl. Pendentes'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">

            {/* Receita */}
            <DRELine label="(+) Receita Bruta de Serviços" value={dre.receitaBruta} bold showBar maxValue={dre.receitaBruta} />

            {/* Custos */}
            <DRELine label="(-) Comissões de Técnicos" value={-dre.comissoes} indent={1} showBar maxValue={dre.receitaBruta} />

            <DRELine
              label="(=) Lucro Bruto"
              value={dre.lucroBruto}
              bold
              separator
              color={dre.lucroBruto >= 0 ? 'text-emerald-600' : 'text-red-500'}
              sub={dre.receitaBruta > 0 ? `Margem Bruta: ${((dre.lucroBruto / dre.receitaBruta) * 100).toFixed(1)}%` : undefined}
            />

            {/* Despesas Operacionais */}
            <div className="px-3 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Despesas Operacionais</p>
            </div>
            {Object.entries(dre.byCategory)
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([cat, val]: any) => (
                <DRELine key={cat} label={`(-) ${cat}`} value={-val} indent={1} showBar maxValue={dre.receitaBruta} />
              ))}
            {Object.keys(dre.byCategory).length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma despesa operacional no período.</p>
            )}

            {/* Resultado Final */}
            <DRELine
              label="(=) Resultado Líquido do Período"
              value={dre.resultadoLiquido}
              bold
              separator
              color={dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}
              sub={dre.receitaBruta > 0 ? `Margem Líquida: ${dre.margem.toFixed(1)}%` : undefined}
            />
          </CardContent>
        </Card>

        {/* Coluna Direita: Composição visual */}
        <div className="space-y-4">

          {/* Composição das Despesas */}
          <Card className="border-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Composição das Despesas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dre.despesasTotais === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
              ) : (
                <>
                  {/* Comissões */}
                  {dre.comissoes > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Comissões de Técnicos</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {((dre.comissoes / dre.despesasTotais) * 100).toFixed(1)}%
                          </span>
                          <span className="font-bold text-amber-600">{formatCurrency(dre.comissoes)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(dre.comissoes / dre.despesasTotais) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {/* Por categoria */}
                  {Object.entries(dre.byCategory)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([cat, val]: any, i) => {
                      const colors = ['bg-blue-400', 'bg-violet-400', 'bg-rose-400', 'bg-cyan-400', 'bg-orange-400']
                      const textColors = ['text-blue-600', 'text-violet-600', 'text-rose-600', 'text-cyan-600', 'text-orange-600']
                      const color = colors[i % colors.length]
                      const textColor = textColors[i % textColors.length]
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {((val / dre.despesasTotais) * 100).toFixed(1)}%
                              </span>
                              <span className={cn('font-bold', textColor)}>{formatCurrency(val)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', color)} style={{ width: `${(val / dre.despesasTotais) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}

                  <div className="pt-1 border-t flex justify-between text-sm font-bold">
                    <span>Total de Despesas</span>
                    <span className="text-red-600">{formatCurrency(dre.despesasTotais)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resultado Visual */}
          <Card className={cn('border', dre.resultadoLiquido >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('p-3 rounded-full', dre.resultadoLiquido >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
                {dre.resultadoLiquido >= 0
                  ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                  : <TrendingDown className="h-6 w-6 text-red-500" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {dre.resultadoLiquido >= 0 ? 'Empresa lucrativa no período' : 'Resultado negativo no período'}
                </p>
                <p className={cn('text-3xl font-bold', dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatCurrency(Math.abs(dre.resultadoLiquido))}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Margem líquida de {dre.margem.toFixed(1)}% sobre a receita bruta
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
