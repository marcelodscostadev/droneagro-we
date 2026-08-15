import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function ApuracaoPage() {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*, category:financial_categories(name)')
      if (error) throw error; return data
    }
  })

  // Calculate totals based on 'paid' transactions
  const paidTransactions = transactions.filter((t: any) => t.status === 'paid')
  
  const receitas = paidTransactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  
  const allExpenses = paidTransactions.filter((t: any) => t.type === 'expense')
  const comissoes = allExpenses.filter((t: any) => t.technician_id).reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const outrasDespesas = allExpenses.filter((t: any) => !t.technician_id).reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  
  const despesasTotal = comissoes + outrasDespesas
  const resultado = receitas - despesasTotal

  // Group expenses by category
  const expensesByCategory = allExpenses.reduce((acc: any, t: any) => {
    const catName = t.category?.name || (t.technician_id ? 'Comissões de Técnicos' : 'Sem Categoria')
    acc[catName] = (acc[catName] || 0) + Number(t.amount)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apuração de Resultado (DRE)</h1>
          <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício - Realizado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Receitas', value: receitas, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Despesas Gerais', value: -outrasDespesas, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Comissões Pagas', value: -comissoes, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Resultado do Período', value: resultado, color: resultado >= 0 ? 'text-primary' : 'text-destructive', bg: resultado >= 0 ? 'bg-primary/10' : 'bg-destructive/10' },
        ].map(item => (
          <Card key={item.label} className={`border-muted/50 ${item.bg}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${item.color}`}>{formatCurrency(Math.abs(item.value))}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-muted/50">
        <CardHeader><CardTitle>Detalhamento de Despesas por Categoria</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(expensesByCategory)
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([category, amount]: any) => (
              <div key={category} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="font-medium text-muted-foreground">{category}</span>
                <span className="font-bold text-red-600">{formatCurrency(amount)}</span>
              </div>
            ))}
            {Object.keys(expensesByCategory).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
