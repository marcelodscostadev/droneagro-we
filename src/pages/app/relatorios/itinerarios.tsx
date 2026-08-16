import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileText, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function ItinerariosPage() {
  const navigate = useNavigate()

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['itinerarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_shifts')
        .select(`
          id,
          shift_date,
          km_start,
          km_end,
          status,
          technician:profiles(name)
        `)
        .order('shift_date', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  })

  if (isLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Itinerários Diários</h1>
            <p className="text-sm text-muted-foreground">Relatórios de fechamento de turno e rotas percorridas</p>
          </div>
        </div>
      </div>

      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Search className="h-4 w-4" /> Exibindo {shifts.length} registros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data do Turno</TableHead>
                <TableHead>Técnico / Piloto</TableHead>
                <TableHead className="text-center">KM Inicial</TableHead>
                <TableHead className="text-center">KM Final</TableHead>
                <TableHead className="text-center">Rodado (KM)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum turno registrado.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s: any) => {
                  const kmStart = s.km_start || 0;
                  const kmEnd = s.km_end || 0;
                  const kmRodado = kmEnd > 0 ? (kmEnd - kmStart) : 0;
                  
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {new Date(s.shift_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </TableCell>
                      <TableCell>{s.technician?.name || 'Desconhecido'}</TableCell>
                      <TableCell className="text-center">{kmStart.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{s.km_end ? kmEnd.toLocaleString() : '--'}</TableCell>
                      <TableCell className="text-center">{kmRodado > 0 ? kmRodado.toLocaleString() : '--'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/relatorios/itinerarios/${s.id}/pdf`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Gerar PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
