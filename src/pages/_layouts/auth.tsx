import { Outlet } from 'react-router-dom'
import { Cpu } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left panel - branding with video background */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden border-r border-border/40">
        
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]" />
          <video 
            src="/video-login.mp4" 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Decorative elements over video */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl z-10" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl z-10" />

        <div className="relative z-20 space-y-8 text-center max-w-md text-white">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-black/20">
              <Cpu className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Top Locações</h1>
            <p className="text-lg text-white/80 font-medium drop-shadow-sm">Gestão Inteligente de Drones Agrícolas</p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Agendamentos', value: 'Online' },
              { label: 'Medições', value: 'Precisas' },
              { label: 'Relatórios', value: 'Em tempo real' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-center">
                <p className="text-xs text-white/70 font-medium">{item.label}</p>
                <p className="text-sm font-bold text-white mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="p-2 bg-primary/15 rounded-xl">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl">Top Locações</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
