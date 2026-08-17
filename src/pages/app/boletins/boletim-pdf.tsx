import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export function BoletimPdfPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: boletim, isLoading } = useQuery({
    queryKey: ['boletim_pdf', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurement_bulletins')
        .select(`
          *,
          client:clients(*),
          technician:profiles(name, email),
          service_order:service_orders(os_number, scheduled_at, type),
          expenses:bulletin_expenses(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!boletim) {
    return <div className="p-8">Boletim não encontrado.</div>
  }

  const expensesTotal = boletim.expenses?.reduce((acc: number, curr: any) => acc + Number(curr.total_value), 0) || 0

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
            <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-800">Boletim de Medição</h1>
            <p className="text-slate-500 mt-1">
              Data de Emissão: <span className="font-semibold text-slate-800">{new Date(boletim.created_at).toLocaleDateString('pt-BR')}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Número do Boletim</p>
            <p className="text-xl font-bold text-slate-800">BM-{boletim.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-slate-500 text-sm mt-1">Ref: OS-{String(boletim.service_order?.os_number).padStart(4, '0')}</p>
          </div>
        </div>

        {/* Informações */}
        <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Dados do Cliente</h3>
            <p className="font-bold text-lg">{boletim.client?.name}</p>
            {boletim.client?.document && <p className="text-slate-600 text-sm mt-1">CNPJ: {boletim.client.document}</p>}
            <p className="text-slate-600 text-sm">{boletim.client?.address ? `Endereço: ${boletim.client.address}` : 'Endereço não informado'}</p>
            {boletim.client?.email && <p className="text-slate-600 text-sm">{boletim.client.email}</p>}
            {boletim.client?.phone && <p className="text-slate-600 text-sm">{boletim.client.phone}</p>}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Dados do Serviço</h3>
            <p className="font-medium text-slate-700">Técnico/Piloto: <span className="font-normal">{boletim.technician?.name}</span></p>
            {boletim.technician?.email && <p className="text-slate-600 text-sm">{boletim.technician.email}</p>}
            <p className="font-medium text-slate-700 mt-2">Data da OS: <span className="font-normal">{boletim.service_order?.scheduled_at ? formatDate(boletim.service_order.scheduled_at) : '---'}</span></p>
          </div>
        </div>

        {/* Resumo da Medição */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Detalhamento da Execução</h2>
          <table className="w-full text-left text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="py-3 px-4 font-semibold text-slate-600">Descrição</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-center">Quantidade</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Valor Unitário</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">Pulverização com Drone (Área Medida)</td>
                <td className="py-3 px-4 text-center">{boletim.hectares_sprayed} ha</td>
                <td className="py-3 px-4 text-right">{formatCurrency(boletim.price_per_ha)} / ha</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(boletim.subtotal)}</td>
              </tr>
              {boletim.expenses && boletim.expenses.map((exp: any) => (
                <tr key={exp.id} className="border-b text-slate-600">
                  <td className="py-2 px-4 italic">+ Custo: {exp.description}</td>
                  <td className="py-2 px-4 text-center">{exp.quantity} un</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(exp.unit_price)} / un</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(exp.total_value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-lg">
                <td colSpan={3} className="py-4 px-4 text-right text-slate-700">VALOR TOTAL DO SERVIÇO:</td>
                <td className="py-4 px-4 text-right text-emerald-700">{formatCurrency(boletim.total_value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Assinaturas */}
        <div className="mt-32 pt-8 border-t grid grid-cols-2 gap-16 text-center text-sm text-slate-500 page-break-inside-avoid">
          <div>
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="font-bold text-slate-700">DroneAgro (Prestador)</p>
            <p>{boletim.technician?.name}</p>
          </div>
          <div>
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="font-bold text-slate-700">Cliente (Tomador)</p>
            <p>{boletim.client?.name}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
