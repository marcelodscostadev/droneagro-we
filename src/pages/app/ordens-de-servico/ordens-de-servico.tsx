import { ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

const MOCK = [
  { id: 'OS-0042', cliente: 'Fazenda Boa Vista', tecnico: 'João Silva', data: '2026-08-15', status: 'finished', km_total: 84, hectares: 45 },
  { id: 'OS-0041', cliente: 'Agro Santa Fé', tecnico: 'Pedro Santos', data: '2026-08-15', status: 'in_activity', km_total: null, hectares: null },
  { id: 'OS-0040', cliente: 'Rancho das Flores', tecnico: 'João Silva', data: '2026-08-14', status: 'finished', km_total: 120, hectares: 80 },
]

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
  traveling: { label: 'Em Deslocamento', variant: 'outline' },
  in_activity: { label: 'Em Atividade', variant: 'warning' },
  finished: { label: 'Finalizada', variant: 'success' },
}

export function OrdensDeServico() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><ClipboardList className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">Acompanhe todas as OS em tempo real</p>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº OS</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">KM Total</TableHead>
                <TableHead className="text-center">Hectares</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK.map(os => {
                const s = STATUS_MAP[os.status]
                return (
                  <TableRow key={os.id}>
                    <TableCell className="font-bold text-primary">{os.id}</TableCell>
                    <TableCell>{formatDate(os.data)}</TableCell>
                    <TableCell className="font-medium">{os.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{os.tecnico}</TableCell>
                    <TableCell className="text-center">{os.km_total ? `${os.km_total} km` : '—'}</TableCell>
                    <TableCell className="text-center font-bold">{os.hectares ? `${os.hectares} ha` : '—'}</TableCell>
                    <TableCell className="text-center"><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm">Detalhes</Button></TableCell>
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
