import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function FluxoCaixaPage() {
  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('initial_balance').eq('id', 1).single()
      if (error && error.code !== 'PGRST116') throw error; return data || { initial_balance: 0 }
    }
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_paid'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*')
        .eq('status', 'paid')
        .order('date', { ascending: true }) // important to calculate running balance
      if (error) throw error; return data
    }
  })

  // Group by date
  const flowByDate: Record<string, { income: number, expense: number }> = {}
  transactions.forEach((t: any) => {
    if (!flowByDate[t.date]) flowByDate[t.date] = { income: 0, expense: 0 }
    if (t.type === 'income') flowByDate[t.date].income += Number(t.amount)
    if (t.type === 'expense') flowByDate[t.date].expense += Number(t.amount)
  })

  const dates = Object.keys(flowByDate).sort()
  
  let runningBalance = Number(settings?.initial_balance || 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa Diário</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de entradas, saídas e saldo em conta</p>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right text-emerald-600">Entradas (R$)</TableHead>
                <TableHead className="text-right text-red-600">Saídas (R$)</TableHead>
                <TableHead className="text-right">Saldo do Dia (R$)</TableHead>
                <TableHead className="text-right font-bold text-primary">Saldo Acumulado (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Saldo Inicial Row */}
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium italic">Saldo Inicial</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right font-bold text-primary">{formatCurrency(runningBalance)}</TableCell>
              </TableRow>

              {dates.map((date) => {
                const data = flowByDate[date]
                const dailyBalance = data.income - data.expense
                runningBalance += dailyBalance

                return (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{formatDate(date)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{data.income > 0 ? formatCurrency(data.income) : '—'}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{data.expense > 0 ? formatCurrency(data.expense) : '—'}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(dailyBalance)}</TableCell>
                    <TableCell className="text-right font-bold text-primary text-lg">{formatCurrency(runningBalance)}</TableCell>
                  </TableRow>
                )
              })}
              
              {dates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma transação recebida/paga registrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
