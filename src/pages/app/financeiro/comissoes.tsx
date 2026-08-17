import { BadgeDollarSign, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function ComissoesPage() {
  const queryClient = useQueryClient()

  const { data: commissions = [] } = useQuery({
    queryKey: ['transactions_commissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, technician:profiles(name)')
        .eq('type', 'expense')
        .not('technician_id', 'is', null) // filter only transactions with a technician assigned (commissions)
        .order('due_date', { ascending: false })
      if (error) throw error; return data
    }
  })

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').update({ status: 'paid' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions_commissions'] })
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><BadgeDollarSign className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground">Comissões dos técnicos geradas automaticamente</p>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Técnico</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
            <TableBody>
              {commissions.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>{formatDate(t.due_date)}</TableCell>
                  <TableCell>{t.technician?.name || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-amber-600">{formatCurrency(t.amount)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'pending' && <Button variant="outline" size="sm" onClick={() => markPaid.mutate(t.id)}><CheckCircle className="h-4 w-4 mr-1"/> Pagar Comissão</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
