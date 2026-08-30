import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  // Autenticação
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'marcelodscostadev@gmail.com',
    password: '131517',
  })

  if (authError) {
    console.error("Erro na autenticação:", authError.message)
    return
  }
  
  console.log("Autenticado com sucesso como:", authData.user.email)

  console.log("\nConsultando Clientes...")
  const { data: clients, error: errClients } = await supabase.from('clients').select('id, name')
  if (errClients) console.error("Erro clients:", errClients)

  if (clients && clients.length > 0) {
    console.log(`Clientes cadastrados (${clients.length}):`)
    clients.forEach(c => console.log(`- ${c.name}`))
  } else {
    console.log("Nenhum cliente encontrado.")
  }

  console.log("\nConsultando Ordens de Serviço (2026)...")
  const { data: os, error: errOs } = await supabase
    .from('service_orders')
    .select('id, os_number, status, scheduled_at, area_ha, client_id')
    .gte('scheduled_at', '2026-05-01T00:00:00Z')
    .lte('scheduled_at', '2026-08-31T23:59:59Z')
    
  if (errOs) console.error("Erro OS:", errOs)
  
  if (os && os.length > 0) {
    console.log(`Encontradas ${os.length} OS nesse período:`)
    os.forEach(o => {
      const client = clients.find(c => c.id === o.client_id)
      console.log(`- OS #${o.os_number} | Data: ${new Date(o.scheduled_at).toLocaleDateString('pt-BR')} | Cliente: ${client?.name || 'Sem cliente'} | Status: ${o.status} | Hectares: ${o.area_ha}`)
    })
  } else {
    console.log("Nenhuma OS encontrada nesse período de maio a agosto de 2026.")
  }

  console.log("\nConsultando Boletins de Medição...")
  const { data: bm } = await supabase.from('measurement_bulletins').select('id, service_order_id, status, created_at, hectares_sprayed')
  if (bm && bm.length > 0) {
    console.log(`Encontrados ${bm.length} boletins de medição no total.`)
  } else {
    console.log("Nenhum boletim de medição encontrado.")
  }
}
check()
