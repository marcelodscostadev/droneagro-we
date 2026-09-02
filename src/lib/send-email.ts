import { supabase } from './supabase'

type EmailType =
  | 'solicitacao'
  | 'aprovacao'
  | 'reagendamento'
  | 'cancelamento'
  | 'concluido'
  | 'documento_disponivel'

interface EmailData {
  client_email: string
  client_name: string
  scheduled_at?: string
  technician_name?: string
  area_ha?: number
  notes?: string
  original_date?: string
  new_date?: string
  reason?: string
  completed_at?: string
  hectares_sprayed?: number
  invoice_number?: string
  total_value?: number
  due_date?: string
}

/**
 * Envia e-mail automático para o cliente via Edge Function + Resend.
 * Não lança erro caso falhe — apenas loga no console para não bloquear o fluxo.
 */
export async function sendClientEmail(type: EmailType, data: EmailData): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-client-email', {
      body: { type, data },
    })

    if (error) {
      console.error(`[sendClientEmail] Erro ao enviar e-mail "${type}":`, error)
    }
  } catch (err) {
    console.error(`[sendClientEmail] Erro inesperado ao enviar e-mail "${type}":`, err)
  }
}
