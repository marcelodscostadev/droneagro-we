import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=')
  if (key && val) env[key.trim()] = val.trim()
})

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])

async function fixCommissions() {
  console.log('Finding or creating category "Comissões"...')
  let catId;
  const { data: catData, error: catErr } = await supabase
    .from('financial_categories')
    .select('id')
    .eq('name', 'Comissões')
    .eq('type', 'expense')
    .single()
  
  if (catData) {
    catId = catData.id;
    console.log('Found category "Comissões" with ID:', catId)
  } else {
    console.log('Category "Comissões" not found. Creating...')
    const { data: newCat, error: insertErr } = await supabase
      .from('financial_categories')
      .insert({ name: 'Comissões', type: 'expense' })
      .select('id')
      .single()
    if (insertErr) {
      console.error('Error creating category:', insertErr)
      return
    }
    catId = newCat.id
    console.log('Created category "Comissões" with ID:', catId)
  }

  console.log('Updating existing commissions...')
  const { data: transactions, error: txErr } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('type', 'expense')
    .not('technician_id', 'is', null)

  if (txErr) {
    console.error('Error fetching transactions:', txErr)
    return
  }

  console.log(`Found ${transactions.length} commission transactions. Updating to category_id: ${catId}...`)

  const { error: updateErr } = await supabase
    .from('transactions')
    .update({ category_id: catId })
    .eq('type', 'expense')
    .not('technician_id', 'is', null)

  if (updateErr) {
    console.error('Error updating transactions:', updateErr)
  } else {
    console.log('Successfully updated all commission transactions!')
  }
}

fixCommissions()
