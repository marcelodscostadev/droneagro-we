import { useState, useMemo } from 'react'
import { BadgeDollarSign, CheckCircle, ChevronLeft, ChevronRight, Clock, CheckCircle2, ListFilter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ComissoesPage() {
  const queryClient = useQueryClient()
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Filters
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'all'>('pending')

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['transactions_commissions', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('*, technician:profiles(name)')
        .eq('type', 'expense')
        .not('technician_id', 'is', null) // filter only transactions with a technician assigned (commissions)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: false })
      if (error) throw error; 
      
      // Ordenação: Pendentes primeiro, depois data
      return (data || []).sort((a: any, b: any) => {
        if (a.status === 'pending' && b.status === 'paid') return -1
        if (a.status === 'paid' && b.status === 'pending') return 1
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      })
    },
    placeholderData: keepPreviousData
  })

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').update({ status: 'paid' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Comissão marcada como paga!')
      queryClient.invalidateQueries({ queryKey: ['transactions_commissions'] })
    }
  })

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    let pending = 0; let paid = 0; let total = 0;
    commissions.forEach((c: any) => {
      total += Number(c.amount)
      if (c.status === 'pending') pending += Number(c.amount)
      if (c.status === 'paid') paid += Number(c.amount)
    })
    return { pending, paid, total }
  }, [commissions])

  // Filtro de lista
  const filteredCommissions = commissions.filter((c: any) => {
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredCommissions.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredCommissions.map((t: any) => t.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const selectedTotal = filteredCommissions
    .filter((t: any) => selectedRows.includes(t.id))
    .reduce((acc: number, t: any) => acc + Number(t.amount), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BadgeDollarSign className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comissões dos Técnicos</h1>
            <p className="text-sm text-muted-foreground">Gerencie e realize o pagamento de comissões</p>
          </div>
        </div>
        
        {/* Seletor de Mês */}
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold capitalize min-w-[120px] text-center">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards / Filtros Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 hover:border-primary/50",
            statusFilter === 'pending' ? "border-amber-500 bg-amber-500/5 shadow-md" : "border-transparent"
          )}
          onClick={() => { setStatusFilter('pending'); setSelectedRows([]) }}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(kpis.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">Clique para filtrar</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 hover:border-primary/50",
            statusFilter === 'paid' ? "border-emerald-500 bg-emerald-500/5 shadow-md" : "border-transparent"
          )}
          onClick={() => { setStatusFilter('paid'); setSelectedRows([]) }}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(kpis.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Clique para filtrar</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 hover:border-primary/50",
            statusFilter === 'all' ? "border-primary bg-primary/5 shadow-md" : "border-transparent"
          )}
          onClick={() => { setStatusFilter('all'); setSelectedRows([]) }}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-primary" /> Todas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(kpis.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">Clique para filtrar</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                    checked={selectedRows.length === filteredCommissions.length && filteredCommissions.length > 0}
                    onChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead>Técnico / Descrição</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Carregando comissões...</TableCell>
                </TableRow>
              ) : filteredCommissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma comissão encontrada para este filtro no mês selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCommissions.map((t: any) => (
                  <TableRow key={t.id} className={cn(selectedRows.includes(t.id) ? "bg-primary/5 hover:bg-primary/10" : "", t.status === 'paid' && "opacity-60")}>
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                        checked={selectedRows.includes(t.id)}
                        onChange={() => toggleSelectRow(t.id)} 
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-foreground">{t.technician?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">{t.description}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(t.created_at)}</TableCell>
                    <TableCell className="font-semibold text-sm">{formatDate(t.due_date)}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">{formatCurrency(t.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => markPaid.mutate(t.id)} className="h-8">
                          <CheckCircle className="h-4 w-4 mr-1 text-emerald-500"/> Pagar
                        </Button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600 flex items-center justify-end gap-1"><CheckCircle2 className="h-3 w-3" /> Liquidado</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Barra de Totais Flutuante */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-50">
          <span className="font-medium text-sm">{selectedRows.length} selecionado(s)</span>
          <div className="w-px h-4 bg-background/30" />
          <span className="font-bold text-primary">Total: {formatCurrency(selectedTotal)}</span>
          <Button size="sm" variant="secondary" className="ml-2 h-7 px-3 text-xs bg-background text-foreground hover:bg-background/90" onClick={() => setSelectedRows([])}>Limpar</Button>
        </div>
      )}
    </div>
  )
}
