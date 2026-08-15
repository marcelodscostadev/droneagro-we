import { FileBarChart, ChevronDown, ChevronUp, FileDown, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Fragment, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const MOCK_BOLETINS = [
  {
    id: 'BM-0042', os_number: 'OS-0042', status: 'pending',
    client_name: 'Fazenda Boa Vista', technician_name: 'João Silva', commission_pct: 10,
    date: '2026-08-15', hectares: 45, price_per_ha: 35, subtotal: 1575, total_value: 1490,
    commission_value: 149, km_total: 84,
    payment_method: 'PIX', payment_term_days: 30,
    expenses: [{ id: 'e1', description: 'Deslocamento', quantity: 1, unit_value: 85, total_value: 85 }],
    km_start_photo: 'https://placehold.co/200x120/1a2e1a/4ade80?text=KM+inicial',
    km_end_photo: 'https://placehold.co/200x120/1a2e1a/4ade80?text=KM+final',
  },
  {
    id: 'BM-0040', os_number: 'OS-0040', status: 'approved',
    client_name: 'Rancho das Flores', technician_name: 'João Silva', commission_pct: 10,
    date: '2026-08-14', hectares: 80, price_per_ha: 35, subtotal: 2800, total_value: 2800,
    commission_value: 280, km_total: 120,
    payment_method: 'Boleto', payment_term_days: 45,
    expenses: [],
    km_start_photo: null, km_end_photo: null,
  },
]

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' | 'destructive' | 'outline' | 'secondary' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  invoiced: { label: 'Faturado', variant: 'outline' },
}

export function BoletinsPage() {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = statusFilter === 'ALL' ? MOCK_BOLETINS : MOCK_BOLETINS.filter(b => b.status === statusFilter)

  function toggleRow(id: string) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleApprove(id: string) {
    toast.success(`Boletim ${id} aprovado! Conta a receber e comissão gerados.`)
  }

  function handleReject(id: string) {
    toast.error(`Boletim ${id} rejeitado.`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileBarChart className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Boletins de Medição</h1>
            <p className="text-sm text-muted-foreground">Aprovação de medições e geração de documentos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="invoiced">Faturado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]" />
                <TableHead>Boletim</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Hectares</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => {
                const isExpanded = expandedRows[b.id]
                const s = STATUS_MAP[b.status]
                const isPending = b.status === 'pending'

                return (
                  <Fragment key={b.id}>
                    <TableRow className={cn('group', isExpanded && 'bg-muted/30')}>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRow(b.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-primary">{b.id}</div>
                        <div className="text-xs text-muted-foreground">{b.os_number}</div>
                      </TableCell>
                      <TableCell className="font-medium">{b.client_name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.technician_name}</TableCell>
                      <TableCell>{formatDate(b.date)}</TableCell>
                      <TableCell className="text-center font-bold">{b.hectares} ha</TableCell>
                      <TableCell className="text-right font-bold text-lg">{formatCurrency(b.total_value)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(b.commission_value)}</TableCell>
                      <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => handleApprove(b.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleReject(b.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerar PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: details */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                Detalhamento do Serviço
                              </h3>
                              <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
                                {[
                                  ['Cliente', b.client_name],
                                  ['Forma de Pgto', b.payment_method],
                                  ['Vencimento', `${b.payment_term_days} dias após aprovação`],
                                  ['KM Rodado', `${b.km_total} km`],
                                  ['Hectares Pulverizados', `${b.hectares} ha`],
                                  ['Preço por Hectare', formatCurrency(b.price_per_ha)],
                                  ['Subtotal', formatCurrency(b.subtotal)],
                                ].map(([k, v]) => (
                                  <div key={k} className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{k}:</span>
                                    <span className="font-medium">{v}</span>
                                  </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-base bg-primary/5 p-2 rounded-lg">
                                  <span>Total do Boletim:</span>
                                  <span className="text-primary">{formatCurrency(b.total_value)}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                  <span>Comissão do Técnico ({b.commission_pct}%):</span>
                                  <span className="font-semibold">{formatCurrency(b.commission_value)}</span>
                                </div>
                              </div>

                              {/* KM Photos */}
                              {(b.km_start_photo || b.km_end_photo) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {b.km_start_photo && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-medium">KM Inicial</p>
                                      <img src={b.km_start_photo} alt="KM inicial" className="rounded-lg border w-full object-cover" />
                                    </div>
                                  )}
                                  {b.km_end_photo && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-medium">KM Final</p>
                                      <img src={b.km_end_photo} alt="KM final" className="rounded-lg border w-full object-cover" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: expenses */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm">Despesas e Descontos</h3>
                              <div className="rounded-lg border bg-card">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Descrição</TableHead>
                                      <TableHead className="text-right">Qtd</TableHead>
                                      <TableHead className="text-right">V. Unit.</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                      <TableHead className="w-[40px]" />
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {b.expenses.length > 0 ? b.expenses.map(exp => (
                                      <TableRow key={exp.id}>
                                        <TableCell className="py-2">{exp.description}</TableCell>
                                        <TableCell className="text-right py-2">{exp.quantity}</TableCell>
                                        <TableCell className="text-right py-2">{formatCurrency(exp.unit_value)}</TableCell>
                                        <TableCell className="text-right py-2 font-medium">{formatCurrency(exp.total_value)}</TableCell>
                                        <TableCell className="py-2">
                                          {isPending && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                                          Nenhuma despesa lançada
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>

                              {isPending && (
                                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                  <Label className="text-xs font-semibold">Adicionar Despesa / Desconto</Label>
                                  <div className="flex gap-2">
                                    <Input placeholder="Descrição" className="h-8 text-xs flex-1" />
                                    <Input placeholder="Qtd" className="h-8 text-xs w-16 text-right" />
                                    <Input placeholder="Valor" className="h-8 text-xs w-24 text-right" />
                                    <Button size="sm" className="h-8"><Plus className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
