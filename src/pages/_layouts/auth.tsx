import { Outlet } from 'react-router-dom'
import { Cpu } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-r border-border/40 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/8 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-8 text-center max-w-md">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-primary/15 rounded-2xl border border-primary/20 shadow-xl shadow-primary/10">
              <Cpu className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">DroneAgro</h1>
            <p className="text-lg text-muted-foreground font-medium">Gestão Inteligente de Drones Agrícolas</p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Agendamentos', value: 'Online' },
              { label: 'Medições', value: 'Precisas' },
              { label: 'Relatórios', value: 'Em tempo real' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/40 text-center">
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <p className="text-sm font-bold text-primary mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="p-2 bg-primary/15 rounded-xl">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl">DroneAgro</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
