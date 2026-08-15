import { CalendarDays, Plus, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

const MOCK = [
  { id: '1', cliente: 'Fazenda Boa Vista', tecnico: 'João Silva', data: '2026-08-16T07:30:00', tipo: 'paid', status: 'scheduled', ha_previsto: 45 },
  { id: '2', cliente: 'Agro Santa Fé', tecnico: 'Pedro Santos', data: '2026-08-16T09:00:00', tipo: 'demo', status: 'in_activity', ha_previsto: null },
  { id: '3', cliente: 'Rancho das Flores', tecnico: 'João Silva', data: '2026-08-17T08:00:00', tipo: 'paid', status: 'scheduled', ha_previsto: 120 },
]

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
  traveling: { label: 'Em Deslocamento', variant: 'outline' },
  in_activity: { label: 'Em Atividade', variant: 'warning' },
  finished: { label: 'Finalizado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export function AgendamentosPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Controle de visitas e serviços agendados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Novo Agendamento</Button>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Exibindo {MOCK.length} agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Ha Previsto</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK.map(ag => {
                const s = STATUS_MAP[ag.status]
                return (
                  <TableRow key={ag.id}>
                    <TableCell>
                      <div className="font-semibold text-primary">{formatDate(ag.data)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(ag.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell className="font-medium">{ag.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{ag.tecnico}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={ag.tipo === 'paid' ? 'default' : 'outline'}>
                        {ag.tipo === 'paid' ? 'Serviço Pago' : 'Demonstração'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold">{ag.ha_previsto ? `${ag.ha_previsto} ha` : '—'}</TableCell>
                    <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm">Ver OS</Button></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
