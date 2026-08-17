import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Loader2, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const createIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

export function ItinerarioPdfPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: shift, isLoading: isLoadingShift } = useQuery({
    queryKey: ['daily_shift', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_shifts')
        .select(`
          *,
          technician:profiles(name, email)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: osList = [], isLoading: isLoadingOs } = useQuery({
    queryKey: ['shift_os', id],
    enabled: !!shift,
    queryFn: async () => {
      // Find OS started or finished on that day by that technician
      const dateStr = shift.shift_date; // 'YYYY-MM-DD'
      
      const { data, error } = await supabase
        .from('service_orders')
        .select('*, client:clients(name)')
        .eq('technician_id', shift.technician_id)
        .gte('scheduled_at', `${dateStr}T00:00:00Z`)
        .lte('scheduled_at', `${dateStr}T23:59:59.999Z`)
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      return data || []
    }
  })

  if (isLoadingShift || isLoadingOs) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!shift) {
    return <div className="p-8">Turno não encontrado.</div>
  }

  const kmStart = shift.km_start || 0
  const kmEnd = shift.km_end || 0
  const kmRodado = kmEnd > 0 ? (kmEnd - kmStart) : 0
  
  const totalHectares = osList.reduce((acc: number, os: any) => acc + (os.area_ha || 0), 0)
  const totalValue = osList.reduce((acc: number, os: any) => acc + ((os.area_ha || 0) * (os.price_per_ha || 0)), 0)

  // Calc map center
  let centerLat = -15.7801;
  let centerLng = -47.9292;
  if (osList.length > 0 && osList[0].start_lat) {
    centerLat = osList[0].start_lat;
    centerLng = osList[0].start_lng;
  }

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
            <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-800">Relatório Diário de Atividades</h1>
            <p className="text-slate-500 mt-1">
              Data: <span className="font-semibold text-slate-800">{new Date(shift.shift_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Técnico / Piloto</p>
            <p className="text-lg font-bold text-slate-800">{shift.technician?.name}</p>
            <p className="text-slate-500 text-sm">{shift.technician?.email}</p>
          </div>
        </div>

        {/* Resumo do Turno */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Resumo do Veículo</h2>
          <div className="flex gap-8">
            <div className="flex-1 bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-slate-500 mb-1">KM Inicial</p>
              <p className="text-2xl font-bold">{kmStart.toLocaleString()}</p>
            </div>
            <div className="flex-1 bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-slate-500 mb-1">KM Final</p>
              <p className="text-2xl font-bold">{kmEnd > 0 ? kmEnd.toLocaleString() : 'N/A'}</p>
            </div>
            <div className="flex-1 bg-emerald-50 border-emerald-100 border p-4 rounded-lg">
              <p className="text-sm text-emerald-600 mb-1">KM Total Rodado</p>
              <p className="text-2xl font-bold text-emerald-700">{kmRodado > 0 ? kmRodado.toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Fotos do Painel */}
        <div className="mb-8 page-break-inside-avoid">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Registros Fotográficos (Painel)</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <span className="mb-2 font-semibold text-sm">Painel Inicial</span>
              {shift.km_start_photo_url ? (
                <img src={shift.km_start_photo_url} alt="KM Inicial" className="w-full h-48 object-cover rounded-lg border shadow-sm" />
              ) : (
                <div className="w-full h-48 bg-slate-100 rounded-lg border flex items-center justify-center text-slate-400">Sem Foto</div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className="mb-2 font-semibold text-sm">Painel Final</span>
              {shift.km_end_photo_url ? (
                <img src={shift.km_end_photo_url} alt="KM Final" className="w-full h-48 object-cover rounded-lg border shadow-sm" />
              ) : (
                <div className="w-full h-48 bg-slate-100 rounded-lg border flex items-center justify-center text-slate-400">Sem Foto</div>
              )}
            </div>
          </div>
        </div>

        {/* Resumo Financeiro / Produtividade */}
        <div className="mb-8 page-break-inside-avoid">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Resumo Operacional e Financeiro do Dia</h2>
          <div className="flex gap-8">
            <div className="flex-1 bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-slate-500 mb-1">Total de Serviços (OS)</p>
              <p className="text-2xl font-bold">{osList.length}</p>
            </div>
            <div className="flex-1 bg-blue-50 border-blue-100 border p-4 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Total Área (Hectares)</p>
              <p className="text-2xl font-bold text-blue-700">{totalHectares.toLocaleString('pt-BR')} ha</p>
            </div>
            <div className="flex-1 bg-emerald-50 border-emerald-100 border p-4 rounded-lg">
              <p className="text-sm text-emerald-600 mb-1">Valor Bruto Gerado</p>
              <p className="text-2xl font-bold text-emerald-700">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Listagem de Serviços */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Ordens de Serviço Executadas</h2>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="py-3 px-4 font-semibold text-slate-600">OS Nº</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Cliente</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Tipo</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Hectares</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {osList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">Nenhum serviço registrado neste dia.</td>
                </tr>
              ) : (
                osList.map((os: any) => (
                  <tr key={os.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold">#{os.os_number}</td>
                    <td className="py-3 px-4">{os.client?.name || '---'}</td>
                    <td className="py-3 px-4">
                      {os.type === 'demo' ? <span className="bg-slate-200 px-2 py-1 rounded text-xs">Demonstração</span> : <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">Pago</span>}
                    </td>
                    <td className="py-3 px-4">{os.area_ha || 0} ha</td>
                    <td className="py-3 px-4 text-right font-medium">
                      R$ {((os.area_ha || 0) * (os.price_per_ha || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mapa do Itinerário */}
        <div className="mb-8 page-break-inside-avoid">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Mapa de Atividades (Localizações de Início)</h2>
          {osList.filter((os: any) => os.start_lat && os.start_lng).length > 0 ? (
            <div className="h-[400px] rounded-lg border overflow-hidden shadow-inner">
              <MapContainer 
                center={[centerLat, centerLng]} 
                zoom={10} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {osList.filter((os: any) => os.start_lat && os.start_lng).map((os: any) => (
                  <Marker 
                    key={os.id} 
                    position={[os.start_lat, os.start_lng]}
                    icon={createIcon(os.type === 'demo' ? 'grey' : 'green')}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong className="block">OS #{os.os_number}</strong>
                        <span className="text-sm">{os.client?.name}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="h-32 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-500 font-medium">
               Nenhum dado de GPS (Localização) foi capturado pelo celular do piloto neste turno.
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2 text-center">Nota: O mapa requer conexão com a internet para ser renderizado corretamente na impressão.</p>
        </div>

      </div>
    </div>
  )
}
