import { TrendingUp, Plus, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'

export function ContasReceberPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset } = useForm<any>({ defaultValues: { type: 'income', status: 'pending' } })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions_income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, category:financial_categories(name), cost_center:cost_centers(name), bulletin:measurement_bulletins(invoice_number, service_orders(clients(name)))')
        .eq('type', 'income')
        .order('due_date', { ascending: false })
      if (error) throw error; return data
    }
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['financial_categories_income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_categories').select('*').eq('type', 'income')
      if (error) throw error; return data
    }
  })

  const createTrans = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('transactions').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Receita adicionada!')
      queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
      setOpen(false)
      reset()
    }
  })

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').update({ status: 'paid' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions_income'] })
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
            <p className="text-sm text-muted-foreground">Controle de receitas e cobranças</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Receita</Button>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Nota Fiscal</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
            <TableBody>
              {transactions.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>{t.bulletin?.invoice_number || '—'}</TableCell>
                  <TableCell>{t.bulletin?.service_orders?.clients?.name || '—'}</TableCell>
                  <TableCell>{formatDate(t.due_date)}</TableCell>
                  <TableCell>{t.category?.name || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(t.amount)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Recebido' : 'Pendente'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'pending' && <Button variant="outline" size="sm" onClick={() => markPaid.mutate(t.id)}><CheckCircle className="h-4 w-4 mr-1"/> Marcar Recebido</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createTrans.mutate(d))} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input {...register('description', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" {...register('amount', { required: true })} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" {...register('due_date', { required: true })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller name="category_id" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
