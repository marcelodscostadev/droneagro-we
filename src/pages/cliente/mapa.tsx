import { useAuth } from '@/hooks/useAuth'
import { Map, MapPin, Sprout } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useRef } from 'react'

export function ClientMapa() {
  const { data: user } = useAuth()
  const mapRef = useRef<HTMLDivElement>(null)
  const client = user?.client

  const lat = client?.lat
  const lng = client?.lng
  const hasCoords = lat && lng

  useEffect(() => {
    if (!hasCoords || !mapRef.current) return

    // Embed OpenStreetMap via iframe (no API key needed)
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`
    iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;'
    iframe.title = 'Mapa da propriedade'
    mapRef.current.innerHTML = ''
    mapRef.current.appendChild(iframe)

    return () => {
      if (mapRef.current) mapRef.current.innerHTML = ''
    }
  }, [hasCoords, lat, lng])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
          <Map className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Fazenda</h1>
          <p className="text-sm text-muted-foreground">Localização da sua propriedade</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Propriedade</p>
              <p className="font-semibold text-sm truncate">{client?.name || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Sprout className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Área total</p>
              <p className="font-semibold text-sm">{client?.area_ha ? `${client.area_ha} ha` : '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="font-semibold text-sm truncate">{client?.address || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card className="border-muted/50 overflow-hidden">
        <CardContent className="p-0">
          {hasCoords ? (
            <div ref={mapRef} className="h-[450px] w-full" />
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/20">
              <Map className="h-16 w-16 opacity-20" />
              <div className="text-center">
                <p className="font-semibold">Localização não cadastrada</p>
                <p className="text-sm mt-1">Entre em contato para atualizar as coordenadas da sua propriedade.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasCoords && (
        <p className="text-xs text-muted-foreground text-center">
          📍 Coordenadas: {lat.toFixed(6)}, {lng.toFixed(6)} ·{' '}
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-600 hover:underline"
          >
            Abrir no Google Maps
          </a>
        </p>
      )}
    </div>
  )
}
