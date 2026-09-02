import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function ItinerarioMensalPdfPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')

  if (!startStr || !endStr) {
    return <div className="p-8">Período não fornecido.</div>
  }

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['itinerarios_mensal', startStr, endStr],
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
        .gte('shift_date', startStr)
        .lte('shift_date', endStr)
        .order('shift_date', { ascending: true })
      
      if (error) throw error
      return data || []
    }
  })

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  // Cálculos do mês
  let totalKm = 0
  shifts.forEach((s: any) => {
    if (s.km_start != null && s.km_end != null && s.km_end >= s.km_start) {
      totalKm += (s.km_end - s.km_start)
    }
  })

  const dtRef = new Date(startStr)
  const monthName = dtRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white min-h-screen text-slate-900 pb-16">
      {/* Action Bar - Hidden on print */}
      <div className="print:hidden sticky top-0 bg-white/80 backdrop-blur z-50 border-b p-4 flex justify-between items-center shadow-sm">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir PDF
        </Button>
      </div>

      {/* PDF Content Area */}
      <div className="max-w-[210mm] mx-auto p-8 bg-white" style={{ minHeight: '297mm' }}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-800">Relatório Mensal de Frota</h1>
            <p className="text-slate-500 mt-1">
              Referência: <span className="font-semibold text-slate-800 capitalize">{monthName}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Empresa</p>
            <p className="text-lg font-bold text-slate-800">DroneAgro</p>
            <p className="text-slate-500 text-sm">Controle de Quilometragem</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Resumo do Período</h2>
          <div className="flex gap-8">
            <div className="flex-1 bg-emerald-50 border-emerald-100 border p-4 rounded-lg">
              <p className="text-sm text-emerald-600 mb-1">KM Total Rodado no Mês</p>
              <p className="text-3xl font-bold text-emerald-700">{totalKm.toLocaleString('pt-BR')} <span className="text-xl">KM</span></p>
            </div>
            <div className="flex-1 bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-slate-500 mb-1">Total de Deslocamentos</p>
              <p className="text-3xl font-bold">{shifts.length}</p>
            </div>
          </div>
        </div>

        {/* Listagem */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Detalhamento dos Turnos</h2>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="py-3 px-4 font-semibold text-slate-600">Data</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Técnico / Motorista</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-center">KM Inicial</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-center">KM Final</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-center">Rodado (KM)</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">Nenhum registro encontrado para este mês.</td>
                </tr>
              ) : (
                shifts.map((s: any) => {
                  const kmStart = s.km_start || 0
                  const kmEnd = s.km_end || 0
                  const kmRodado = kmEnd > 0 ? (kmEnd - kmStart) : 0
                  return (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{new Date(s.shift_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="py-3 px-4">{s.technician?.name || '---'}</td>
                      <td className="py-3 px-4 text-center">{kmStart.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 text-center">{kmEnd > 0 ? kmEnd.toLocaleString('pt-BR') : '---'}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{kmRodado > 0 ? kmRodado.toLocaleString('pt-BR') : '---'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
