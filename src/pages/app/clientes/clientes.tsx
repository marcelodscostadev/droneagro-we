import { Users, Plus, Search, Phone, MapPin, CreditCard, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

const MOCK_CLIENTES = [
  { id: '1', name: 'Fazenda Boa Vista', phone: '(65) 99999-0001', address: 'Rod. MT-130, Km 45, Tangará da Serra - MT', area_ha: 850, payment_method: 'pix', payment_term_days: 30 },
  { id: '2', name: 'Agro Santa Fé', phone: '(65) 98888-0002', address: 'Zona Rural, Campo Novo do Parecis - MT', area_ha: 1200, payment_method: 'boleto', payment_term_days: 45 },
  { id: '3', name: 'Rancho das Flores', phone: '(65) 97777-0003', address: 'Linha C, s/n, Sapezal - MT', area_ha: 320, payment_method: 'dinheiro', payment_term_days: 0 },
]

const PAYMENT_LABELS: Record<string, string> = { pix: 'PIX', boleto: 'Boleto', dinheiro: 'Dinheiro', outros: 'Outros' }

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = MOCK_CLIENTES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus clientes e propriedades</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2"><Label>Nome / Razão Social *</Label><Input placeholder="Ex: Fazenda Boa Vista" /></div>
                <div className="space-y-2"><Label>Telefone / WhatsApp</Label><Input placeholder="(65) 99999-0000" /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" placeholder="contato@email.com" /></div>
                <div className="space-y-2 col-span-2"><Label>Endereço / Propriedade</Label><Input placeholder="Rod. MT-130, Km 45, Tangará da Serra - MT" /></div>
                <div className="space-y-2"><Label>Área Total (ha)</Label><Input type="number" placeholder="0,00" /></div>
                <div className="space-y-2"><Label>Valor Padrão por Hectare (R$)</Label><Input type="number" placeholder="0,00" /></div>
              </div>
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />Dados de Pagamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Prazo de Pagamento (dias)</Label><Input type="number" placeholder="Ex: 30" /></div>
                </div>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea placeholder="Informações adicionais..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button>Salvar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead><Phone className="h-3 w-3 inline mr-1" />Contato</TableHead>
                <TableHead><MapPin className="h-3 w-3 inline mr-1" />Localização</TableHead>
                <TableHead className="text-center">Área (ha)</TableHead>
                <TableHead><CreditCard className="h-3 w-3 inline mr-1" />Pagamento</TableHead>
                <TableHead><Clock className="h-3 w-3 inline mr-1" />Prazo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.address}</TableCell>
                  <TableCell className="text-center font-bold text-primary">{c.area_ha.toLocaleString('pt-BR')}</TableCell>
                  <TableCell><Badge variant="outline">{PAYMENT_LABELS[c.payment_method]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{c.payment_term_days > 0 ? `${c.payment_term_days} dias` : 'À vista'}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm">Editar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
