import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co'
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_key'

if (supabaseUrl === 'your_supabase_url_here') supabaseUrl = 'https://dummy.supabase.co'
if (supabaseAnonKey === 'your_supabase_anon_key_here') supabaseAnonKey = 'dummy_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
