import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'marcelodscostadev@gmail.com',
    password: '131517',
  })
  if (authError) return console.error(authError)

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) return console.error(error)

  console.log("Buckets:", buckets.map(b => b.name))
}

run()
