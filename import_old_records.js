import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

const records = [
  { date: '2026-05-29T12:00:00Z', ha: 9.27, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-06-02T12:00:00Z', ha: 19.70, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-06-23T12:00:00Z', ha: 15.03, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-07-06T12:00:00Z', ha: 14.06, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-07-15T12:00:00Z', ha: 41.46, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-07-21T12:00:00Z', ha: 38.10, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-07-24T12:00:00Z', ha: 22.50, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-07-25T12:00:00Z', ha: 46.94, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-07-29T12:00:00Z', ha: 44.17, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-07-30T12:00:00Z', ha: 9.75, clientName: 'ANA CARLA STELLITANO MAGALHAES SOARES (TROPICAL FRUIT)' },
  { date: '2026-07-31T12:00:00Z', ha: 7.28, clientName: 'EBFT EMPRESA BRASILEIRA DE FRUTAS TROPICAIS LTDA' },
  { date: '2026-08-01T12:00:00Z', ha: 43.97, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-04T12:00:00Z', ha: 39.15, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-05T12:00:00Z', ha: 48.99, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-08T12:00:00Z', ha: 67.78, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-12T12:00:00Z', ha: 55.91, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-17T12:00:00Z', ha: 37.97, clientName: 'GVS FRUIT COMPANY LTDA' },
  { date: '2026-08-18T12:00:00Z', ha: 19.43, clientName: 'GVS FRUIT COMPANY LTDA (CASA NOVA)' },
];

async function runImport() {
  console.log("Autenticando...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'marcelodscostadev@gmail.com',
    password: '131517',
  })

  if (authError) {
    console.error("Erro na autenticação:", authError.message)
    return
  }
  
  console.log("Autenticado com sucesso. Consultando clientes...")
  const { data: clients, error: errClients } = await supabase.from('clients').select('id, name, default_price_per_ha')
  
  if (errClients) {
    console.error("Erro ao buscar clientes:", errClients)
    return
  }

  const insertedServiceOrders = []
  const insertedBulletins = []

  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const client = clients.find(c => c.name === rec.clientName)
    
    if (!client) {
      console.error(`Cliente não encontrado para o registro ${i}: ${rec.clientName}`)
      continue
    }

    console.log(`Inserindo OS ${i+1}/${records.length} (${rec.date})...`)
    
    // Inserir OS
    const { data: osData, error: osError } = await supabase
      .from('service_orders')
      .insert({
        client_id: client.id,
        technician_id: authData.user.id, // O próprio técnico logado
        type: 'paid',
        status: 'finished',
        scheduled_at: rec.date,
        area_ha: rec.ha,
        notes: 'Importação de Histórico (Anterior ao Sistema)'
      })
      .select('id')
      .single()

    if (osError) {
      console.error("Erro ao inserir OS:", osError)
      continue
    }

    insertedServiceOrders.push(osData.id)

    // Inserir Boletim
    console.log(`Inserindo Boletim para OS ${osData.id}...`)
    const { data: bmData, error: bmError } = await supabase
      .from('measurement_bulletins')
      .insert({
        service_order_id: osData.id,
        client_id: client.id,
        technician_id: authData.user.id,
        status: 'pending',
        hectares_sprayed: rec.ha,
        price_per_ha: client.default_price_per_ha || 0,
        subtotal: rec.ha * (client.default_price_per_ha || 0),
        total_value: rec.ha * (client.default_price_per_ha || 0),
        notes: 'Importação de Histórico (Anterior ao Sistema)'
      })
      .select('id')
      .single()

    if (bmError) {
      console.error("Erro ao inserir Boletim:", bmError)
    } else {
      insertedBulletins.push(bmData.id)
    }
  }

  console.log("\nImportação concluída!")
  console.log(`${insertedServiceOrders.length} Ordens de Serviço inseridas.`)
  console.log(`${insertedBulletins.length} Boletins inseridos.`)

  // Salvar recibo para rollback
  const receipt = {
    service_orders: insertedServiceOrders,
    measurement_bulletins: insertedBulletins
  }
  
  fs.writeFileSync('import_receipt.json', JSON.stringify(receipt, null, 2))
  console.log("Recibo salvo em 'import_receipt.json' para caso de rollback.")
}

runImport()
