import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, client:clients(id, name, email, phone, address, area_ha, lat, lng)')
        .eq('id', user.id)
        .maybeSingle()

      return profile
    },
    staleTime: 1000 * 60 * 10,
  })
}
