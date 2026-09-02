import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

// Rota protegida para admin/técnicos — redireciona clientes para o portal deles
export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { data: user, isLoading, isError } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/auth/sign-in" replace />
  }

  // Clientes não podem acessar o painel admin
  if (user.role === 'client') {
    return <Navigate to="/cliente/dashboard" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Rota protegida exclusiva para clientes
export function ClientRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/cliente/login" replace />
  }

  // Admin/técnicos acessando rota de cliente → redireciona para painel admin
  if (user.role !== 'client') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
