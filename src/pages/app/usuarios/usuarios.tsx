import { UserCog, Plus, Percent, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

const MOCK_USERS = [
  { id: '1', name: 'Carlos Oliveira', email: 'carlos@droneagro.com', role: 'admin', commission_type: null, commission_value: null },
  { id: '2', name: 'João Silva', email: 'joao@droneagro.com', role: 'technician', commission_type: 'percentage', commission_value: 10 },
  { id: '3', name: 'Pedro Santos', email: 'pedro@droneagro.com', role: 'technician', commission_type: 'fixed_per_ha', commission_value: 3.5 },
]

export function UsuariosPage() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('')
  const [commissionType, setCommissionType] = useState('')

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><UserCog className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários e configure comissões dos técnicos</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nome Completo *</Label><Input placeholder="Nome do usuário" /></div>
              <div className="space-y-2"><Label>E-mail *</Label><Input type="email" placeholder="email@exemplo.com" /></div>
              <div className="space-y-2"><Label>Senha Inicial *</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(65) 99999-0000" /></div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Selecionar função..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="technician">Técnico de Campo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'technician' && (
                <div className="border-t pt-4 space-y-4 bg-primary/5 -mx-4 px-4 pb-4 rounded-b-lg">
                  <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                    <Percent className="h-4 w-4" />Configurar Comissão
                  </h3>
                  <div className="space-y-2">
                    <Label>Tipo de Comissão</Label>
                    <Select onValueChange={setCommissionType}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (% sobre valor líquido)</SelectItem>
                        <SelectItem value="fixed_per_ha">Valor Fixo por Hectare (R$/ha)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {commissionType && (
                    <div className="space-y-2">
                      <Label>{commissionType === 'percentage' ? 'Percentual (%)' : 'Valor por Hectare (R$)'}</Label>
                      <Input type="number" step="0.01" placeholder={commissionType === 'percentage' ? 'Ex: 10' : 'Ex: 3,50'} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button>Salvar Usuário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-muted/50">
        <CardHeader className="pb-0" />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? 'Admin' : 'Técnico'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.commission_type === 'percentage' && (
                      <span className="flex items-center gap-1 text-sm"><Percent className="h-3 w-3 text-primary" />{u.commission_value}%</span>
                    )}
                    {u.commission_type === 'fixed_per_ha' && (
                      <span className="flex items-center gap-1 text-sm"><DollarSign className="h-3 w-3 text-primary" />R$ {u.commission_value}/ha</span>
                    )}
                    {!u.commission_type && <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
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
