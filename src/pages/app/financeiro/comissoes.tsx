import { useState, useMemo, useEffect } from 'react'
import { BadgeDollarSign, CheckCircle, ChevronLeft, ChevronRight, Clock, CheckCircle2, ListFilter, FileText, Download, X, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateFinancialReport, downloadPdf } from '@/lib/pdf-report'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ComissoesPage() {
  const queryClient = useQueryClient()
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [openPdf, setOpenPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)

  // Retroactive fix for missing categories on commissions
  useEffect(() => {
    async function fixMissingCategories() {
      const { data: txs } = await supabase.from('transactions')
        .select('id')
        .eq('type', 'expense')
        .not('technician_id', 'is', null)
        .is('category_id', null)
      
      if (txs && txs.length > 0) {
        let catId = null
        const { data: catData } = await supabase.from('financial_categories').select('id').eq('name', 'Comissões').eq('type', 'expense').single()
        if (catData) {
          catId = catData.id
        } else {
          const { data: newCat } = await supabase.from('financial_categories').insert({ name: 'Comissões', type: 'expense' }).select('id').single()
          if (newCat) catId = newCat.id
        }
        if (catId) {
          await supabase.from('transactions')
            .update({ category_id: catId })
            .eq('type', 'expense')
            .not('technician_id', 'is', null)
            .is('category_id', null)
          
          queryClient.invalidateQueries({ queryKey: ['transactions_commissions'] })
          queryClient.invalidateQueries({ queryKey: ['transactions_expense'] })
        }
      }
    }
    fixMissingCategories()
  }, [])
  
  // Modal Pagar
  const [payCommissionId, setPayCommissionId] = useState<string | null>(null)
  const [payCommissionDate, setPayCommissionDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  // Filters
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'all'>('pending')

  const y = currentDate.getFullYear()
  const m = String(currentDate.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, currentDate.getMonth() + 1, 0).getDate()
  
  const startOfMonth = `${y}-${m}-01`
  const endOfMonth = `${y}-${m}-${lastDay}T23:59:59`

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['transactions_commissions', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select(`
          *,
          technician:profiles(name),
          bulletin:measurement_bulletins(
            hectares_sprayed,
            total_value,
            commission_pct,
            service_order:service_orders(
              os_number,
              scheduled_at
            ),
            client:clients(name)
          )
        `)
        .eq('type', 'expense')
        .not('technician_id', 'is', null)
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
    mutationFn: async ({ id, date }: { id: string, date: string }) => {
      const { error } = await supabase.from('transactions')
        .update({ status: 'paid', paid_at: new Date(date + 'T12:00:00').toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Comissão marcada como paga!')
      queryClient.invalidateQueries({ queryKey: ['transactions_commissions'] })
      setPayCommissionId(null)
    }
  })

  const markUnpaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions')
        .update({ status: 'pending', paid_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Pagamento desfeito!')
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

  function handleGeneratePdf() {
    const mes = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const data = filteredCommissions.map((t: any) => ({
      tecnico: t.technician?.name || '—',
      cliente: t.bulletin?.client?.name || '—',
      data_os: t.bulletin?.service_order?.scheduled_at ? formatDate(t.bulletin.service_order.scheduled_at) : '—',
      hectares: t.bulletin?.hectares_sprayed != null ? `${t.bulletin.hectares_sprayed} ha` : '—',
      valor_servico: t.bulletin?.total_value != null ? formatCurrency(t.bulletin.total_value) : '—',
      pct: t.bulletin?.commission_pct != null ? `${t.bulletin.commission_pct}%` : '—',
      comissao: formatCurrency(t.amount),
      status: t.status === 'paid' ? 'Pago' : 'Pendente',
    }))

    const totalPendente = filteredCommissions
      .filter((c: any) => c.status === 'pending')
      .reduce((a: number, c: any) => a + Number(c.amount), 0)
    const totalPago = filteredCommissions
      .filter((c: any) => c.status === 'paid')
      .reduce((a: number, c: any) => a + Number(c.amount), 0)
    const totalGeral = filteredCommissions
      .reduce((a: number, c: any) => a + Number(c.amount), 0)

    const doc = generateFinancialReport({
      title: `Relatório de Comissões — ${mes}`,
      subtitle: `${data.length} lançamento(s) | Pendente: ${formatCurrency(totalPendente)} | Pago: ${formatCurrency(totalPago)} | Total: ${formatCurrency(totalGeral)}`,
      columns: [
        { header: 'Técnico',         dataKey: 'tecnico' },
        { header: 'Cliente',         dataKey: 'cliente' },
        { header: 'Data OS',         dataKey: 'data_os',       width: 22, align: 'center' },
        { header: 'Hectares',        dataKey: 'hectares',      width: 20, align: 'center' },
        { header: 'Valor Serviço',   dataKey: 'valor_servico', width: 30, align: 'right' },
        { header: 'Comissão (%)',    dataKey: 'pct',           width: 22, align: 'center' },
        { header: 'Valor Comissão',  dataKey: 'comissao',      width: 30, align: 'right' },
        { header: 'Status',          dataKey: 'status',        width: 18, align: 'center' },
      ],
      rows: data,
      summaryRows: [
        { label: 'Pendente:',    value: formatCurrency(totalPendente), color: [245, 158, 11] },
        { label: 'Pago:',        value: formatCurrency(totalPago),     color: [16, 185, 129] },
        { label: 'Total Geral:', value: formatCurrency(totalGeral) },
      ],
    })

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
    setPdfDoc(doc)
    setOpenPdf(true)
  }

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
        <Button variant="outline" onClick={handleGeneratePdf}>
          <FileText className="h-4 w-4 mr-2" />Emitir Relatório
        </Button>
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
                <TableHead>Técnico</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data OS</TableHead>
                <TableHead className="text-center">Hectares</TableHead>
                <TableHead className="text-right">Valor Serviço</TableHead>
                <TableHead className="text-right">Comissão (%)</TableHead>
                <TableHead className="text-right">Valor Comissão</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Data Baixa</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">Carregando comissões...</TableCell>
                </TableRow>
              ) : filteredCommissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
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
                    {/* Técnico */}
                    <TableCell>
                      <p className="font-bold text-foreground whitespace-nowrap">{t.technician?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{t.description}</p>
                    </TableCell>
                    {/* Cliente */}
                    <TableCell className="font-medium whitespace-nowrap">
                      {t.bulletin?.client?.name || '—'}
                    </TableCell>
                    {/* Data OS */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {t.bulletin?.service_order?.scheduled_at
                        ? formatDate(t.bulletin.service_order.scheduled_at)
                        : '—'}
                      {t.bulletin?.service_order?.os_number && (
                        <p className="text-xs text-muted-foreground/60">OS-{String(t.bulletin.service_order.os_number).padStart(4, '0')}</p>
                      )}
                    </TableCell>
                    {/* Hectares */}
                    <TableCell className="text-center font-semibold">
                      {t.bulletin?.hectares_sprayed != null
                        ? `${t.bulletin.hectares_sprayed} ha`
                        : '—'}
                    </TableCell>
                    {/* Valor Total do Serviço */}
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {t.bulletin?.total_value != null
                        ? formatCurrency(t.bulletin.total_value)
                        : '—'}
                    </TableCell>
                    {/* % Comissão */}
                    <TableCell className="text-right text-muted-foreground">
                      {t.bulletin?.commission_pct != null
                        ? `${t.bulletin.commission_pct}%`
                        : '—'}
                    </TableCell>
                    {/* Valor da Comissão */}
                    <TableCell className="text-right font-bold text-amber-600">
                      {formatCurrency(t.amount)}
                    </TableCell>
                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
                    </TableCell>
                    {/* Data Baixa */}
                    <TableCell className="text-center text-sm">
                      {t.paid_at ? (
                        <span className="text-emerald-600 font-medium">{formatDate(t.paid_at)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    {/* Ação */}
                    <TableCell className="text-right">
                      {t.status === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => {
                          setPayCommissionId(t.id)
                          setPayCommissionDate(new Date().toISOString().split('T')[0])
                        }} className="h-8">
                          <CheckCircle className="h-4 w-4 mr-1 text-emerald-500"/> Pagar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                          onClick={() => markUnpaid.mutate(t.id)}
                          disabled={markUnpaid.isPending}
                          title="Desfazer pagamento"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Desfazer
                        </Button>
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

      {/* Modal de Pré-visualização PDF */}
      <Dialog open={openPdf} onOpenChange={(v) => { setOpenPdf(v); if (!v && pdfUrl) URL.revokeObjectURL(pdfUrl) }}>
        <DialogContent className="flex flex-col p-0" style={{ width: '95vw', maxWidth: '95vw', height: '95vh' }}>
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pré-visualização — Comissões
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => pdfDoc && downloadPdf(pdfDoc, `comissoes-${currentDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '-')}.pdf`)}>
                <Download className="h-4 w-4 mr-2" />Baixar PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenPdf(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfUrl && (
              <iframe src={`${pdfUrl}#zoom=page-width`} className="w-full h-full" title="PDF Comissões" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Pagamento */}
      <Dialog open={!!payCommissionId} onOpenChange={(v) => !v && setPayCommissionId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data da Baixa (Pagamento)</Label>
              <Input 
                type="date" 
                value={payCommissionDate} 
                onChange={(e) => setPayCommissionDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayCommissionId(null)}>Cancelar</Button>
            <Button onClick={() => payCommissionId && markPaid.mutate({ id: payCommissionId, date: payCommissionDate })} disabled={markPaid.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
