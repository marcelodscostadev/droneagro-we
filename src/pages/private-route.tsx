import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
