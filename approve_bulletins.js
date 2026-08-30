import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envParams = fs.readFileSync('.env', 'utf8').split('\n')
const getEnv = (key) => envParams.find(l => l.startsWith(key))?.split('=')[1]?.trim()

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Autenticando...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'marcelodscostadev@gmail.com',
    password: '131517',
  })
  
  if (authError) return console.error(authError)

  const datesToApprove = [
    '2026-07-15T12:00:00Z',
    '2026-07-21T12:00:00Z',
    '2026-07-25T12:00:00Z',
    '2026-07-29T12:00:00Z',
    '2026-08-01T12:00:00Z'
  ]

  console.log("Buscando Ordens de Serviço...")
  const { data: os } = await supabase.from('service_orders').select('id, scheduled_at, technician_id').in('scheduled_at', datesToApprove)
  
  if (!os || os.length === 0) {
    console.log("Nenhuma OS encontrada para essas datas.")
    return
  }

  const osIds = os.map(o => o.id)
  console.log(`Foram encontradas ${osIds.length} Ordens de Serviço.`)

  console.log("Buscando Boletins de Medição vinculados...")
  const { data: bms } = await supabase.from('measurement_bulletins').select('id, hectares_sprayed, service_order_id').in('service_order_id', osIds)
  
  if (!bms || bms.length === 0) {
    console.log("Nenhum boletim encontrado.")
    return
  }

  let totalGeral = 0;
  let totalComissao = 0;

  for (const bm of bms) {
    const total = bm.hectares_sprayed * 100 // R$ 100 por hectare
    totalGeral += total;
    const comissao = total * 0.10;
    totalComissao += comissao;
    
    const osReferente = os.find(o => o.id === bm.service_order_id)
    
    // 1. Aprovar o Boletim
    await supabase.from('measurement_bulletins').update({
      status: 'approved',
      invoice_number: '43',
      price_per_ha: 100,
      subtotal: total,
      total_value: total,
      approved_at: new Date().toISOString()
    }).eq('id', bm.id)
    
    console.log(`- Boletim aprovado | NF 43 | Hectares: ${bm.hectares_sprayed} | Valor: R$ ${total.toFixed(2)} | Comissão: R$ ${comissao.toFixed(2)}`)

    // 2. Gerar Transação (Conta a Receber)
    const { error: insertError } = await supabase.from('transactions').insert({
      type: 'income',
      description: `Nota Fiscal 43 (Referente a ${bm.hectares_sprayed}ha pulverizados)`,
      amount: total,
      due_date: '2026-08-22', // Data de Vencimento
      status: 'pending', // Fica 'pending' aguardando o pagamento do cliente
      bulletin_id: bm.id
    })
    if (insertError) {
      console.error(`Erro ao inserir transação (receita) para o boletim ${bm.id}:`, insertError)
    }

    // 3. Gerar Transação (Conta a Pagar - Comissão 10%)
    const shortId = bm.id.substring(0, 4);
    const { error: comissaoError } = await supabase.from('transactions').insert({
      type: 'expense',
      description: `Comissão - Boletim BM-${shortId}`,
      amount: comissao,
      due_date: '2026-08-28', // Data de Vencimento da comissão
      status: 'pending', 
      bulletin_id: bm.id,
      technician_id: osReferente ? osReferente.technician_id : null
    })
    
    if (comissaoError) {
      console.error(`Erro ao inserir comissão para o boletim ${bm.id}:`, comissaoError)
    }
  }
  
  console.log(`\nFechamento concluído com sucesso!`)
  console.log(`Valor Total Gerado (Contas a Receber): R$ ${totalGeral.toFixed(2)}`)
  console.log(`Valor Total Gerado (Contas a Pagar / Comissões): R$ ${totalComissao.toFixed(2)}`)
}

run()
