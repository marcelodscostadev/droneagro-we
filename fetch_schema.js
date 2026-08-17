import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const url = getEnv('VITE_SUPABASE_URL')
const key = getEnv('VITE_SUPABASE_ANON_KEY')

fetch(`${url}/rest/v1/`, { headers: { apikey: key } })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data).substring(0, 500)))
  .catch(e => console.log(e))
