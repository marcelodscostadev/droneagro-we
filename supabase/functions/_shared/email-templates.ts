const BASE_STYLE = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f4f7f6;
  margin: 0;
  padding: 0;
`

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Top Locações Ltda</title>
</head>
<body style="${BASE_STYLE}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center;">
              <div style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                🌱 TOP Locações
              </div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; font-weight: 500;">
                Pulverização Agrícola por Drones
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              ${content}

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  Este e-mail foi enviado automaticamente pelo sistema Top Locações Ltda.<br/>
                  Em caso de dúvidas, entre em contato com nossa equipe.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function infoBox(rows: Array<[string, string]>): string {
  return `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="font-size: 13px; color: #6b7280; padding: 6px 0; width: 50%;">${label}</td>
            <td style="font-size: 13px; color: #111827; font-weight: 600; padding: 6px 0; text-align: right;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `
}

function button(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}"
         style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                color: #ffffff;
                text-decoration: none;
                font-size: 15px;
                font-weight: 700;
                padding: 14px 36px;
                border-radius: 10px;
                display: inline-block;
                letter-spacing: 0.2px;
                box-shadow: 0 4px 12px rgba(22,163,74,0.3);">
        ${label}
      </a>
    </div>
  `
}

export function templateSolicitacao(params: {
  clientName: string
  scheduledAt: string
  notes?: string
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '✅ Solicitação de agendamento recebida — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Olá, ${params.clientName}! 👋
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Recebemos sua solicitação de agendamento de pulverização. Nossa equipe irá analisar a disponibilidade e em breve você receberá a confirmação.
    </p>

    ${infoBox([
      ['Data solicitada', params.scheduledAt],
      ['Status', 'Aguardando aprovação'],
      ...(params.notes ? [['Observações', params.notes] as [string, string]] : []),
    ])}

    ${button(params.portalUrl, 'Acompanhar no Portal')}

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      Você receberá outro e-mail assim que sua solicitação for aprovada ou caso seja necessário um reagendamento.
    </p>
  `)
  return { subject, html }
}

export function templateAprovacao(params: {
  clientName: string
  scheduledAt: string
  technicianName: string
  areaHa: number
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '🎉 Agendamento confirmado — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Agendamento confirmado! 🎉
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Ótima notícia, <strong>${params.clientName}</strong>! Sua pulverização foi aprovada e está na agenda da nossa equipe.
    </p>

    ${infoBox([
      ['Data e Horário', params.scheduledAt],
      ['Técnico Responsável', params.technicianName],
      ['Área Prevista', `${params.areaHa} ha`],
      ['Status', 'Confirmado ✓'],
    ])}

    ${button(params.portalUrl, 'Ver Agendamento no Portal')}

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      Em caso de imprevistos climáticos, nossa equipe entrará em contato.
    </p>
  `)
  return { subject, html }
}

export function templateReagendamento(params: {
  clientName: string
  originalDate: string
  newDate: string
  reason?: string
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '📅 Proposta de reagendamento — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Precisamos reagendar 📅
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Olá, <strong>${params.clientName}</strong>. Infelizmente não conseguiremos atender na data solicitada. Nossa equipe propõe uma nova data para o serviço.
    </p>

    ${infoBox([
      ['Data original', params.originalDate],
      ['Nova data proposta', params.newDate],
      ...(params.reason ? [['Motivo', params.reason] as [string, string]] : []),
    ])}

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 16px 0 4px; font-weight: 600;">
      O que deseja fazer?
    </p>

    ${button(params.portalUrl, 'Aceitar nova data ou Cancelar no Portal')}

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      Acesse o portal para confirmar a nova data ou solicitar um novo agendamento.
    </p>
  `)
  return { subject, html }
}

export function templateCancelamento(params: {
  clientName: string
  scheduledAt: string
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '❌ Agendamento cancelado — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Agendamento cancelado
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Olá, <strong>${params.clientName}</strong>. Confirmamos o cancelamento do seu agendamento. Quando quiser, você pode fazer uma nova solicitação diretamente pelo portal.
    </p>

    ${infoBox([
      ['Data cancelada', params.scheduledAt],
      ['Status', 'Cancelado'],
    ])}

    ${button(params.portalUrl, 'Fazer Novo Agendamento')}
  `)
  return { subject, html }
}

export function templateConcluido(params: {
  clientName: string
  completedAt: string
  hectaresSprayed: number
  technicianName: string
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '✅ Pulverização concluída — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Pulverização concluída! ✅
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Excelente notícia, <strong>${params.clientName}</strong>! O serviço de pulverização da sua propriedade foi finalizado com sucesso.
    </p>

    ${infoBox([
      ['Data de conclusão', params.completedAt],
      ['Técnico', params.technicianName],
      ['Hectares pulverizados', `${params.hectaresSprayed} ha`],
      ['Status', 'Concluído ✓'],
    ])}

    ${button(params.portalUrl, 'Ver Histórico no Portal')}

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      O boletim de medição será gerado em breve. Você receberá outro e-mail quando os documentos estiverem disponíveis.
    </p>
  `)
  return { subject, html }
}

export function templateDocumentoDisponivel(params: {
  clientName: string
  invoiceNumber: string
  totalValue: string
  dueDate: string
  portalUrl: string
}): { subject: string; html: string } {
  const subject = '📄 Seus documentos estão disponíveis — Top Locações Ltda'
  const html = baseTemplate(`
    <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px;">
      Documentos disponíveis 📄
    </h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 4px;">
      Olá, <strong>${params.clientName}</strong>! Sua nota fiscal e boleto de pagamento já estão disponíveis no portal para visualização e download.
    </p>

    ${infoBox([
      ['Número da NF', params.invoiceNumber],
      ['Valor total', params.totalValue],
      ['Vencimento do boleto', params.dueDate],
    ])}

    ${button(params.portalUrl, 'Acessar Documentos no Portal')}

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      Acesse o portal para baixar sua nota fiscal e realizar o pagamento do boleto.
    </p>
  `)
  return { subject, html }
}
