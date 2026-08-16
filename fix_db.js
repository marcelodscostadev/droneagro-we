import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

async function fix() {
  const { data, error } = await supabase.from('service_orders').select('*').in('status', ['completed', 'in_progress'])
  if (data) {
    for (const os of data) {
      const newStatus = os.status === 'completed' ? 'finished' : 'in_activity'
      console.log(`Fixing OS ${os.id} to ${newStatus}`)
      await supabase.from('service_orders').update({ status: newStatus }).eq('id', os.id)
      
      if (newStatus === 'finished') {
        const { data: existing } = await supabase.from('measurement_bulletins').select('id').eq('service_order_id', os.id)
        if (!existing || existing.length === 0) {
          const hectares = os.area_ha || 0
          const price = os.price_per_ha || 0
          const subtotal = hectares * price
          await supabase.from('measurement_bulletins').insert([{
            service_order_id: os.id,
            client_id: os.client_id,
            technician_id: os.technician_id,
            status: 'pending',
            hectares_sprayed: hectares,
            price_per_ha: price,
            subtotal: subtotal,
            total_value: subtotal,
            commission_pct: 10,
            commission_value: subtotal * 0.1,
            km_total: 0
          }])
          console.log(`Created bulletin for OS ${os.id}`)
        }
      }
    }
  }
}
fix()
