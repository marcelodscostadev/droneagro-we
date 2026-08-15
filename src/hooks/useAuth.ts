import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const mockUser = localStorage.getItem('@droneagro:user')
      if (mockUser) return JSON.parse(mockUser)

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      return profile
    },
    staleTime: 1000 * 60 * 10,
  })
}
