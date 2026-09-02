import {
  templateSolicitacao,
  templateAprovacao,
  templateReagendamento,
  templateCancelamento,
  templateConcluido,
  templateDocumentoDisponivel,
} from '../_shared/email-templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'onboarding@resend.dev'
const FROM_NAME = 'TOP LOCAÇÕES (Agendamento)'
const REPLY_TO_EMAIL = 'topconstrucoes79@gmail.com' // Respostas dos clientes chegam aqui
const PORTAL_URL = Deno.env.get('PORTAL_URL') || 'https://droneagro.vercel.app/cliente/agendamentos'

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      reply_to: REPLY_TO_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }

  return res.json()
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    let emailResult: { subject: string; html: string } | null = null
    let recipientEmail = data.client_email

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'client_email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    switch (type) {
      case 'solicitacao':
        emailResult = templateSolicitacao({
          clientName: data.client_name,
          scheduledAt: formatDate(data.scheduled_at),
          notes: data.notes,
          portalUrl: PORTAL_URL,
        })
        break

      case 'aprovacao':
        emailResult = templateAprovacao({
          clientName: data.client_name,
          scheduledAt: formatDate(data.scheduled_at),
          technicianName: data.technician_name || 'A definir',
          areaHa: data.area_ha || 0,
          portalUrl: PORTAL_URL,
        })
        break

      case 'reagendamento':
        emailResult = templateReagendamento({
          clientName: data.client_name,
          originalDate: formatDate(data.original_date),
          newDate: formatDate(data.new_date),
          reason: data.reason,
          portalUrl: PORTAL_URL,
        })
        break

      case 'cancelamento':
        emailResult = templateCancelamento({
          clientName: data.client_name,
          scheduledAt: formatDate(data.scheduled_at),
          portalUrl: PORTAL_URL,
        })
        break

      case 'concluido':
        emailResult = templateConcluido({
          clientName: data.client_name,
          completedAt: formatDate(data.completed_at),
          hectaresSprayed: data.hectares_sprayed || 0,
          technicianName: data.technician_name || 'Técnico DroneAgro',
          portalUrl: PORTAL_URL,
        })
        break

      case 'documento_disponivel':
        emailResult = templateDocumentoDisponivel({
          clientName: data.client_name,
          invoiceNumber: data.invoice_number || 'S/N',
          totalValue: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(data.total_value || 0),
          dueDate: data.due_date
            ? new Date(data.due_date).toLocaleDateString('pt-BR')
            : 'A confirmar',
          portalUrl: PORTAL_URL + '/../documentos',
        })
        break

      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    if (!emailResult) {
      throw new Error('Failed to generate email template')
    }

    const result = await sendEmail(recipientEmail, emailResult.subject, emailResult.html)

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('send-client-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
