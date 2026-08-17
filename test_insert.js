import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('transactions').insert([{
        type: 'income',
        description: `Teste`,
        amount: 10,
        due_date: '2026-08-16',
        status: 'pending',
        bulletin_id: '123e4567-e89b-12d3-a456-426614174000'
      }])
  console.log("Error:", error)
}
check()
