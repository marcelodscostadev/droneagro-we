import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MapPin, Loader2, Navigation } from 'lucide-react'
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

// Custom colorful icons based on frequency
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

const ICONS = {
  high: createIcon('green'),
  medium: createIcon('gold'),
  low: createIcon('red'),
  none: createIcon('grey')
}

const createLogoIcon = (logoUrl: string, freqCategory: string) => {
  const colors: Record<string, string> = {
    high: '#22c55e',
    medium: '#eab308',
    low: '#ef4444',
    none: '#94a3b8'
  }
  const borderColor = colors[freqCategory] || '#94a3b8'
  
  return new L.DivIcon({
    html: `
      <div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        background: white; 
        border: 3px solid ${borderColor}; 
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">
        <img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${borderColor};
        margin: 0 auto;
        margin-top: -2px;
      "></div>
    `,
    className: 'custom-logo-marker',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48]
  })
}

export function MapaPage() {
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['map_clients'],
    queryFn: async () => {
      // Get all clients with coordinates
      const { data: clients, error: clientsErr } = await supabase
        .from('clients')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      
      if (clientsErr) throw clientsErr

      // Get OS count per client
      const { data: osData, error: osErr } = await supabase
        .from('service_orders')
        .select('client_id, status')
      
      if (osErr) throw osErr

      // Map frequency
      const osCount = osData.reduce((acc: any, os) => {
        acc[os.client_id] = (acc[os.client_id] || 0) + 1
        return acc
      }, {})

      return clients.map(c => {
        const freq = osCount[c.id] || 0
        let freqCategory = 'none'
        if (freq > 5) freqCategory = 'high'
        else if (freq > 1) freqCategory = 'medium'
        else if (freq === 1) freqCategory = 'low'

        return { ...c, osCount: freq, freqCategory }
      })
    }
  })

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  // Center on Brazil or average of points
  const defaultCenter: [number, number] = clientsData && clientsData.length > 0 
    ? [clientsData[0].lat, clientsData[0].lng] 
    : [-14.235, -51.925]

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mapa de Fazendas</h1>
            <p className="text-sm text-muted-foreground">Visão geográfica dos clientes e frequência de atendimento</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium bg-card p-2 px-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-1"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" className="h-4" /> Alto (+5 OS)</div>
          <div className="flex items-center gap-1"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png" className="h-4" /> Médio (2-5 OS)</div>
          <div className="flex items-center gap-1"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" className="h-4" /> Baixo (1 OS)</div>
          <div className="flex items-center gap-1"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png" className="h-4" /> Sem OS</div>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border shadow-sm relative z-0">
        <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {clientsData?.map((client) => (
            <Marker 
              key={client.id} 
              position={[client.lat, client.lng]} 
              icon={client.logo_url ? createLogoIcon(client.logo_url, client.freqCategory) : ICONS[client.freqCategory as keyof typeof ICONS]}
            >
              <Popup className="rounded-lg">
                <div className="font-sans space-y-2 min-w-[200px]">
                  <div className="flex items-center gap-3 border-b pb-2">
                    {client.logo_url && (
                      <img src={client.logo_url} alt={client.name} className="w-10 h-10 rounded-full object-cover border shadow-sm" />
                    )}
                    <h3 className="font-bold text-sm">{client.name}</h3>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {client.person_type && client.document_number && (
                      <p><strong>{client.person_type === 'PJ' ? 'CNPJ' : 'CPF'}:</strong> {client.document_number}</p>
                    )}
                    <p><strong>Área Total:</strong> {client.area_ha || 0} ha</p>
                    <p><strong>Total de OS:</strong> {client.osCount} serviços</p>
                    <p><strong>Contato:</strong> {client.phone || 'N/A'}</p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 mt-2 bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-md text-xs font-semibold transition-colors"
                  >
                    <Navigation className="h-3 w-3" /> Como chegar
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {(!clientsData || clientsData.length === 0) && (
          <div className="absolute inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-bold text-lg">Nenhuma fazenda no mapa</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Você ainda não tem clientes com Latitude e Longitude cadastradas. Vá em Cadastros - Clientes, edite um cliente e adicione as coordenadas!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
