import { Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ConfiguracoesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Settings className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Ajustes gerais do sistema e personalizações</p>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Em breve! Esta seção está reservada para configurações de perfil, preferências de notificações e parâmetros da empresa.
        </CardContent>
      </Card>
    </div>
  )
}
