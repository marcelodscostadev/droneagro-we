import { BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

// ─── Linha do DRE ─────────────────────────────────────────────────────────────
function DRERow({
  label,
  value,
  sub,
  indent = 0,
  bold = false,
  highlight = false,
  positive = true,
  maxBar,
  separator = false,
}: {
  label: string
  value: number
  sub?: string
  indent?: number
  bold?: boolean
  highlight?: boolean
  positive?: boolean
  maxBar?: number
  separator?: boolean
}) {
  const barPct = maxBar && maxBar > 0 ? Math.min(Math.abs(value) / maxBar, 1) * 100 : 0
  const isNeg = value < 0

  return (
    <div className={cn(separator && 'pt-3 mt-1')}>
      {separator && <div className="border-t border-border/50 mb-3" />}
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
          highlight
            ? isNeg
              ? 'bg-red-500/8 border border-red-500/20'
              : 'bg-emerald-500/8 border border-emerald-500/20'
            : bold
            ? 'bg-muted/40'
            : 'hover:bg-muted/20',
        )}
        style={{ paddingLeft: `${12 + indent * 20}px` }}
      >
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm leading-tight', bold ? 'font-bold' : 'font-medium text-muted-foreground')}>{label}</p>
          {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
          {maxBar != null && maxBar > 0 && (
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-[160px]">
              <div
                className={cn('h-full rounded-full transition-all duration-700', positive ? 'bg-emerald-400' : 'bg-red-400')}
                style={{ width: `${barPct}%` }}
              />
            </div>
          )}
        </div>
        <span className={cn(
          'ml-4 whitespace-nowrap font-bold',
          bold ? 'text-base' : 'text-sm',
          highlight
            ? isNeg ? 'text-red-600' : 'text-emerald-600'
            : isNeg
            ? 'text-red-500'
            : positive
            ? 'text-emerald-600'
            : 'text-red-500'
        )}>
          {value < 0
            ? `(${formatCurrency(Math.abs(value))})`
            : formatCurrency(value)}
        </span>
      </div>
    </div>
  )
}

// ─── Bloco de categoria de despesa ────────────────────────────────────────────
function ExpenseBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground truncate max-w-[55%]">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
          <span className="font-semibold text-foreground">{formatCurrency(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ApuracaoPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const y = currentDate.getFullYear()
  const m = String(currentDate.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, currentDate.getMonth() + 1, 0).getDate()
  const startOfMonth = `${y}-${m}-01`
  const endOfMonth = `${y}-${m}-${lastDay}T23:59:59`

  // Transações pagas no mês
  const { data: paidTx = [] } = useQuery({
    queryKey: ['dre_paid', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:financial_categories(name, type)')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth)
      if (error) throw error
      return data
    },
  })

  // Receitas pendentes com vencimento no mês (para alertar)
  const { data: pendingIncome = [] } = useQuery({
    queryKey: ['dre_pending_income', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, description')
        .eq('type', 'income')
        .eq('status', 'pending')
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
      if (error) throw error
      return data
    },
  })

  const dre = useMemo(() => {
    const incomes = paidTx.filter((t: any) => t.type === 'income')
    const expenses = paidTx.filter((t: any) => t.type === 'expense')

    const receitaBruta = incomes.reduce((a: number, t: any) => a + Number(t.amount), 0)
    const receitaPendente = pendingIncome.reduce((a: number, t: any) => a + Number(t.amount), 0)

    // Comissões de técnicos (com technician_id)
    const comissoesTecnicos = expenses
      .filter((t: any) => t.technician_id)
      .reduce((a: number, t: any) => a + Number(t.amount), 0)

    // Demais despesas sem technician_id
    const opExpenses = expenses.filter((t: any) => !t.technician_id)

    // Separar: financiamento de ativo (Compra de Ativo) vs despesas operacionais reais
    const financiamento = opExpenses
      .filter((t: any) => t.category?.name === 'Compra de Ativo')
      .reduce((a: number, t: any) => a + Number(t.amount), 0)

    const opPuras = opExpenses.filter((t: any) => t.category?.name !== 'Compra de Ativo')

    // Agrupar por categoria
    const byCategory: Record<string, number> = {}
    opPuras.forEach((t: any) => {
      const cat = t.category?.name || 'Sem Categoria'
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount)
    })

    // Comissões categoria (sem technician_id mas categoria Comissões — ex: ajudantes)
    const comissoesCateg = byCategory['Comissões'] || 0
    const comissoesTotais = comissoesTecnicos + comissoesCateg
    delete byCategory['Comissões']

    const despesasOpTotal = Object.values(byCategory).reduce((a: number, v: any) => a + v, 0)
    const despesasTotais = comissoesTotais + despesasOpTotal + financiamento

    const lucroBruto = receitaBruta - comissoesTotais
    const ebitda = lucroBruto - despesasOpTotal
    const resultadoLiquido = ebitda - financiamento

    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0
    const margemLiquida = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : 0

    return {
      receitaBruta, receitaPendente,
      comissoesTotais, comissoesTecnicos, comissoesCateg,
      despesasOpTotal, byCategory,
      financiamento,
      despesasTotais,
      lucroBruto, ebitda, resultadoLiquido,
      margemBruta, margemLiquida,
    }
  }, [paidTx, pendingIncome])

  const mes = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const BAR_COLORS = ['bg-blue-400', 'bg-violet-400', 'bg-cyan-400', 'bg-orange-400', 'bg-rose-400', 'bg-teal-400']

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apuração de Resultado (DRE)</h1>
            <p className="text-sm text-muted-foreground capitalize">{mes} · apenas transações realizadas</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-lg border">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold capitalize min-w-[140px] text-center">{mes}</div>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Alerta de receita pendente ── */}
      {dre.receitaPendente > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/8 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {formatCurrency(dre.receitaPendente)} em receitas ainda não recebidas neste mês
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O DRE exibe apenas receitas efetivamente recebidas (regime de caixa). Vá em Contas a Receber para ver os detalhes.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Receita Bruta',
            value: dre.receitaBruta,
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            cls: 'text-emerald-600',
            bg: 'border-emerald-500/20 bg-emerald-500/5',
          },
          {
            label: 'Despesas Operac.',
            value: dre.comissoesTotais + dre.despesasOpTotal,
            icon: <TrendingDown className="h-4 w-4 text-red-500" />,
            cls: 'text-red-600',
            bg: 'border-red-500/20 bg-red-500/5',
          },
          {
            label: 'Resultado Operacional',
            value: dre.ebitda,
            icon: dre.ebitda >= 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />,
            cls: dre.ebitda >= 0 ? 'text-primary' : 'text-destructive',
            bg: dre.ebitda >= 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5',
          },
          {
            label: 'Margem Operacional',
            value: null,
            display: `${dre.margemBruta > 0 ? ((dre.ebitda / dre.receitaBruta) * 100).toFixed(1) : '—'}%`,
            icon: <Info className="h-4 w-4 text-primary" />,
            cls: 'text-primary',
            bg: 'border-muted/50 bg-muted/20',
          },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn('border', kpi.bg)}>
            <CardHeader className="pb-1 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent className="pb-4">
              <p className={cn('text-2xl font-bold', kpi.cls)}>
                {kpi.display ?? formatCurrency(kpi.value!)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Corpo do DRE + Composição ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* DRE Estrutura — 3/5 */}
        <Card className="lg:col-span-3 border-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Demonstrativo de Resultado
              <Badge variant="outline" className="ml-auto text-xs font-normal">Regime de Caixa</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-0">

            {/* Receita */}
            <DRERow
              label="(+) Receita Bruta de Serviços"
              value={dre.receitaBruta}
              bold
              positive
              maxBar={dre.receitaBruta}
            />

            {/* Comissões */}
            {dre.comissoesTotais > 0 && (
              <>
                <DRERow
                  label="(-) Comissões de Técnicos"
                  value={dre.comissoesTecnicos > 0 ? -dre.comissoesTecnicos : 0}
                  indent={1}
                  sub="Técnicos com boletim vinculado"
                  positive={false}
                  maxBar={dre.receitaBruta}
                />
                {dre.comissoesCateg > 0 && (
                  <DRERow
                    label="(-) Comissões / Ajudantes"
                    value={-dre.comissoesCateg}
                    indent={1}
                    sub="Adiantamentos e extras sem boletim"
                    positive={false}
                    maxBar={dre.receitaBruta}
                  />
                )}
              </>
            )}

            {/* Lucro Bruto */}
            <DRERow
              label="(=) Lucro Bruto"
              value={dre.lucroBruto}
              bold
              highlight
              separator
              sub={dre.receitaBruta > 0 ? `Margem Bruta: ${dre.margemBruta.toFixed(1)}%` : undefined}
            />

            {/* Despesas Operacionais */}
            {Object.keys(dre.byCategory).length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Despesas Operacionais</p>
              </div>
            )}
            {Object.entries(dre.byCategory)
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([cat, val]: any) => (
                <DRERow key={cat} label={`(-) ${cat}`} value={-val} indent={1} positive={false} maxBar={dre.receitaBruta} />
              ))}

            {/* Resultado Operacional (EBITDA simplificado) */}
            <DRERow
              label="(=) Resultado Operacional"
              value={dre.ebitda}
              bold
              highlight
              separator
              sub={dre.receitaBruta > 0
                ? `Margem Operacional: ${((dre.ebitda / dre.receitaBruta) * 100).toFixed(1)}%`
                : undefined}
            />

            {/* Financiamento de Ativo */}
            {dre.financiamento > 0 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Financiamento de Ativo</p>
                </div>
                <DRERow
                  label="(-) Parcelas de Cartão / Equipamento"
                  value={-dre.financiamento}
                  indent={1}
                  sub="Compra parcelada de drone e equipamentos (não é custo operacional)"
                  positive={false}
                  maxBar={dre.receitaBruta}
                />
              </>
            )}

            {/* Resultado Final */}
            <DRERow
              label="(=) Resultado Líquido do Período"
              value={dre.resultadoLiquido}
              bold
              highlight
              separator
              sub={dre.receitaBruta > 0 ? `Margem Líquida: ${dre.margemLiquida.toFixed(1)}%` : undefined}
            />

          </CardContent>
        </Card>

        {/* Coluna direita — 2/5 */}
        <div className="lg:col-span-2 space-y-4">

          {/* Resultado destaque */}
          <Card className={cn('border', dre.ebitda >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('p-3 rounded-full shrink-0', dre.ebitda >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
                {dre.ebitda >= 0
                  ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                  : <TrendingDown className="h-6 w-6 text-red-500" />}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {dre.ebitda >= 0 ? 'Resultado Operacional Positivo' : 'Resultado Operacional Negativo'}
                </p>
                <p className={cn('text-2xl font-bold mt-0.5', dre.ebitda >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatCurrency(Math.abs(dre.ebitda))}
                </p>
                {dre.receitaBruta > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {dre.ebitda >= 0
                      ? `Cada R$100 faturado gera R$${((dre.ebitda / dre.receitaBruta) * 100).toFixed(0)} de resultado`
                      : `Despesas superam a receita em ${((Math.abs(dre.ebitda) / dre.receitaBruta) * 100).toFixed(0)}%`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

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
                  {dre.comissoesTotais > 0 && (
                    <ExpenseBar
                      label="Comissões"
                      value={dre.comissoesTotais}
                      total={dre.despesasTotais}
                      color="bg-amber-400"
                    />
                  )}
                  {Object.entries(dre.byCategory)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([cat, val]: any, i) => (
                      <ExpenseBar
                        key={cat}
                        label={cat}
                        value={val}
                        total={dre.despesasTotais}
                        color={BAR_COLORS[i % BAR_COLORS.length]}
                      />
                    ))}
                  {dre.financiamento > 0 && (
                    <ExpenseBar
                      label="Financiamento Ativo"
                      value={dre.financiamento}
                      total={dre.despesasTotais}
                      color="bg-slate-400"
                    />
                  )}
                  <div className="pt-2 border-t flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span className="text-red-600">{formatCurrency(dre.despesasTotais)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Nota explicativa */}
          <Card className="border-muted/30 bg-muted/10">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Como ler este DRE
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• <strong>Lucro Bruto</strong> = Receita menos comissões de técnicos</li>
                <li>• <strong>Resultado Operacional</strong> = Lucro Bruto menos despesas do dia a dia (combustível, aluguel, impostos etc.)</li>
                <li>• <strong>Financiamento de Ativo</strong> são parcelas do drone/equipamentos — não são custo operacional, mas impactam o caixa</li>
                <li>• <strong>Resultado Líquido</strong> = Operacional menos financiamento</li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
