import { Settings, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function ConfiguracoesPage() {
  const [isWiping, setIsWiping] = useState(false)
  const [isWipingFinance, setIsWipingFinance] = useState(false)
  const queryClient = useQueryClient()

  const handleWipeData = async () => {
    if (!confirm('ATENÇÃO: Você tem certeza que deseja APAGAR TODAS as Ordens de Serviço, Agendamentos, Boletins e Turnos? Esta ação não pode ser desfeita.')) return
    
    setIsWiping(true)
    try {
      // 1. Apagar Boletins
      await supabase.from('measurement_bulletins').delete().not('id', 'is', null)
      // 2. Apagar Ordens de Serviço (Agendamentos)
      await supabase.from('service_orders').delete().not('id', 'is', null)
      // 3. Apagar Turnos Diários
      await supabase.from('daily_shifts').delete().not('id', 'is', null)

      toast.success('Todos os agendamentos e ordens de serviço foram zerados com sucesso.')
      queryClient.clear()
    } catch (e: any) {
      toast.error('Erro ao limpar dados: ' + e.message)
    } finally {
      setIsWiping(false)
    }
  }

  const handleWipeFinance = async () => {
    if (!confirm('ATENÇÃO: Você tem certeza que deseja APAGAR TODO O HISTÓRICO do Contas a Pagar, Contas a Receber e Comissões? Esta ação não pode ser desfeita.')) return
    
    setIsWipingFinance(true)
    try {
      await supabase.from('transactions').delete().not('id', 'is', null)
      toast.success('Todos os registros financeiros foram apagados com sucesso.')
      queryClient.clear()
    } catch (e: any) {
      toast.error('Erro ao limpar dados financeiros: ' + e.message)
    } finally {
      setIsWipingFinance(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Settings className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Ajustes gerais do sistema e personalizações</p>
        </div>
      </div>

      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription className="text-red-600/80">
            Ações irreversíveis do sistema. Use com extrema cautela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border-t border-red-200/60 pt-4 mt-4">
            <div>
              <p className="font-semibold text-slate-900">Zerar Base Operacional</p>
              <p className="text-sm text-slate-500">Exclui todas as OS, Boletins e Turnos para iniciar do zero.</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleWipeData}
              disabled={isWiping}
            >
              {isWiping ? 'Apagando...' : 'Zerar Operacional'}
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-red-200/60 pt-4 mt-4">
            <div>
              <p className="font-semibold text-slate-900">Zerar Financeiro</p>
              <p className="text-sm text-slate-500">Exclui todo o histórico de Contas a Pagar, Receber e Comissões.</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleWipeFinance}
              disabled={isWipingFinance}
            >
              {isWipingFinance ? 'Apagando...' : 'Zerar Financeiro'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
