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

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      // Self-healing: se o usuário existe no Auth mas não no Profiles, cria agora
      if (!profile) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            name: user.user_metadata?.full_name || 'Administrador',
            email: user.email,
            role: 'admin'
          }])
          .select('*')
          .single()
        
        profile = newProfile
      }

      return profile
    },
    staleTime: 1000 * 60 * 10,
  })
}
