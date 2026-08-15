import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function CadastrosFinanceirosPage() {
  const queryClient = useQueryClient()
  const [ccName, setCcName] = useState('')
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState('expense')
  const [initialBalance, setInitialBalance] = useState('')

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost_centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cost_centers').select('*').order('name')
      if (error) throw error; return data
    }
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['financial_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_categories').select('*').order('name')
      if (error) throw error; return data
    }
  })

  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || { initial_balance: 0 }
    }
  })

  const addCc = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('cost_centers').insert([{ name }])
      if (error) throw error
    },
    onSuccess: () => { toast.success('Centro de custo criado'); setCcName(''); queryClient.invalidateQueries({ queryKey: ['cost_centers'] }) }
  })

  const delCc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Centro de custo removido'); queryClient.invalidateQueries({ queryKey: ['cost_centers'] }) }
  })

  const addCat = useMutation({
    mutationFn: async ({ name, type }: { name: string, type: string }) => {
      const { error } = await supabase.from('financial_categories').insert([{ name, type }])
      if (error) throw error
    },
    onSuccess: () => { toast.success('Categoria criada'); setCatName(''); queryClient.invalidateQueries({ queryKey: ['financial_categories'] }) }
  })

  const delCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Categoria removida'); queryClient.invalidateQueries({ queryKey: ['financial_categories'] }) }
  })

  const saveSettings = useMutation({
    mutationFn: async (balance: number) => {
      const { error } = await supabase.from('company_settings').upsert({ id: 1, initial_balance: balance })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Saldo inicial salvo'); queryClient.invalidateQueries({ queryKey: ['company_settings'] }) }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Settings2 className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastros Financeiros</h1>
          <p className="text-sm text-muted-foreground">Gerencie o plano de contas e configurações base do financeiro</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-muted/50">
          <CardHeader><CardTitle className="text-lg">Centros de Custo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nome do Centro de Custo" value={ccName} onChange={e => setCcName(e.target.value)} />
              <Button onClick={() => addCc.mutate(ccName)} disabled={!ccName || addCc.isPending}><Plus className="h-4 w-4" /></Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {costCenters.map((cc: any) => (
                  <TableRow key={cc.id}>
                    <TableCell>{cc.name}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => delCc.mutate(cc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-muted/50">
          <CardHeader><CardTitle className="text-lg">Categorias (Plano de Contas)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nome da Categoria" value={catName} onChange={e => setCatName(e.target.value)} className="flex-1" />
              <Select value={catType} onValueChange={setCatType}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => addCat.mutate({ name: catName, type: catType })} disabled={!catName || addCat.isPending}><Plus className="h-4 w-4" /></Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.type === 'income' ? 'Receita' : 'Despesa'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => delCat.mutate(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/50 w-full md:w-1/2">
        <CardHeader><CardTitle className="text-lg">Configurações Gerais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Saldo Inicial do Caixa (R$)</label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" placeholder={settings?.initial_balance?.toString()} value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
              <Button onClick={() => saveSettings.mutate(Number(initialBalance))} disabled={!initialBalance || saveSettings.isPending}>Salvar</Button>
            </div>
            <p className="text-xs text-muted-foreground">Este saldo será a base para o relatório de Fluxo de Caixa.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
