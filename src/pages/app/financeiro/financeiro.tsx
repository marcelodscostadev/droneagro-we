import { TrendingUp, Receipt, BadgeDollarSign, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

function PlaceholderPage({ icon: Icon, title, description, data, columns }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card className="border-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>{columns.map((c: string) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any) => (
                <TableRow key={row.id}>
                  {Object.values(row).slice(1).map((v: any, i: number) => (
                    <TableCell key={i}>{v}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

const RECEBER_DATA = [
  { id: '1', desc: 'Fazenda Boa Vista - BM-0042', valor: 'R$ 1.490,00', vencimento: '14/09/2026', forma: 'PIX', status: <Badge variant="warning">Pendente</Badge>, acao: <Button size="sm" variant="outline">Marcar Pago</Button> },
  { id: '2', desc: 'Rancho das Flores - BM-0040', valor: 'R$ 2.800,00', vencimento: '28/09/2026', forma: 'Boleto', status: <Badge variant="warning">Pendente</Badge>, acao: <Button size="sm" variant="outline">Marcar Pago</Button> },
]

const PAGAR_DATA = [
  { id: '1', desc: 'Combustível - Agosto 2026', valor: 'R$ 850,00', vencimento: '20/08/2026', categoria: 'Combustível', status: <Badge variant="warning">Pendente</Badge>, acao: <Button size="sm" variant="outline">Marcar Pago</Button> },
  { id: '2', desc: 'Manutenção Drone DJI Agras', valor: 'R$ 1.200,00', vencimento: '25/08/2026', categoria: 'Manutenção', status: <Badge variant="success">Pago</Badge>, acao: null },
]

const COMISSOES_DATA = [
  { id: '1', tecnico: 'João Silva', boletim: 'BM-0042', valor: 'R$ 149,00', vencimento: '14/09/2026', status: <Badge variant="warning">Pendente</Badge>, acao: <Button size="sm" variant="outline">Marcar Pago</Button> },
  { id: '2', tecnico: 'João Silva', boletim: 'BM-0040', valor: 'R$ 280,00', vencimento: '28/09/2026', status: <Badge variant="warning">Pendente</Badge>, acao: <Button size="sm" variant="outline">Marcar Pago</Button> },
]

export function ContasReceberPage() {
  return <PlaceholderPage icon={TrendingUp} title="Contas a Receber" description="Controle de receitas e cobranças"
    data={RECEBER_DATA} columns={['Descrição', 'Valor', 'Vencimento', 'Forma Pgto', 'Status', 'Ação']} />
}

export function ContasPagarPage() {
  return <PlaceholderPage icon={Receipt} title="Contas a Pagar" description="Controle de despesas e pagamentos"
    data={PAGAR_DATA} columns={['Descrição', 'Valor', 'Vencimento', 'Categoria', 'Status', 'Ação']} />
}

export function ComissoesPage() {
  return <PlaceholderPage icon={BadgeDollarSign} title="Comissões" description="Comissões dos técnicos geradas automaticamente"
    data={COMISSOES_DATA} columns={['Técnico', 'Boletim', 'Valor', 'Vencimento', 'Status', 'Ação']} />
}

export function ApuracaoPage() {
  const receitas = 18500
  const despesas = 4250
  const comissoes = 1490
  const resultado = receitas - despesas - comissoes

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apuração de Resultado</h1>
          <p className="text-sm text-muted-foreground">DRE simplificado por período</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Receitas', value: receitas, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Total de Despesas', value: -despesas, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Comissões a Pagar', value: -comissoes, color: 'text-amber-600', bg: 'bg-amber-500/10' },
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
        <CardHeader><CardTitle>Detalhamento por Categoria</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Gráficos e tabela detalhada serão implementados na integração com o Supabase.</p>
        </CardContent>
      </Card>
    </div>
  )
}
