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

  // Create bucket
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('documents', { public: true })
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error("Error creating bucket:", bucketError)
  } else {
    console.log("Bucket 'documents' ready.")
  }

  // Create document_url column via RPC or we can just try to run raw query using an endpoint if there's no RPC.
  // Wait, I can't run DDL via REST API unless I have RPC. I can use the postgres connection string if available, or just create a migration file?
  // Is it possible to use RPC `exec_sql`? Let's check if they have one.
}

run()
