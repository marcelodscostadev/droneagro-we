import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Briefcase, FileSignature, Edit, Trash2, Loader2, RefreshCcw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Dados da empresa Fixos (fornecidos pelo usuário)
const COMPANY_INFO = {
  company_name: 'TOP LOCACOES LTDA',
  trade_name: 'TOP LOCACOES E SERVICOS',
  document: '43.452.661/0001-60',
  im: '79157',
  address: 'Rua ANTONIO SEVERO DE SANTANA R-26, 25 - LOTEAMENTO RECIFE',
  city: 'Petrolina',
  state: 'PE',
  zip: '56320-740',
  email: 'top@topconstrucoes.com.br'
}

const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'outline' | 'success' | 'destructive' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'outline' },
  accepted: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'destructive' }
}

export function PropostasPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('')
  const [serviceType, setServiceType] = useState('Pulverização Agrícola')
  const [areaHa, setAreaHa] = useState('')
  const [pricePerHa, setPricePerHa] = useState('')
  const [conditions, setConditions] = useState('O pagamento deverá ser efetuado em até 30 (trinta) dias líquidos após a conclusão integral e entrega técnica dos serviços executados. O faturamento será realizado via Boleto Bancário, acompanhado da respectiva Nota Fiscal de prestação de serviços.')
  const [status, setStatus] = useState('draft')

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, document_number, phone, address').order('name')
      if (error) throw error
      return data || []
    }
  })

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_proposals')
        .select('*, client:clients(name, document_number, address)')
        .order('created_at', { ascending: false })
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet
          toast.error('Tabela de propostas não encontrada. Execute o SQL de criação.')
          return []
        }
        throw error
      }
      return data || []
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: selectedClient,
        service_type: serviceType,
        area_ha: Number(areaHa),
        price_per_ha: Number(pricePerHa),
        conditions,
        status
      }

      if (editingId) {
        const { error } = await supabase.from('commercial_proposals').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('commercial_proposals').insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Proposta atualizada!' : 'Proposta criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      setOpen(false)
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar proposta: ' + err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commercial_proposals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Proposta excluída!')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    }
  })

  const handleOpenNew = () => {
    setEditingId(null)
    setSelectedClient('')
    setServiceType('Pulverização Agrícola')
    setAreaHa('')
    setPricePerHa('')
    setConditions('O pagamento deverá ser efetuado em até 30 (trinta) dias líquidos após a conclusão integral e entrega técnica dos serviços executados. O faturamento será realizado via Boleto Bancário, acompanhado da respectiva Nota Fiscal de prestação de serviços.')
    setStatus('draft')
    setOpen(true)
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id)
    setSelectedClient(p.client_id)
    setServiceType(p.service_type)
    setAreaHa(p.area_ha.toString())
    setPricePerHa(p.price_per_ha.toString())
    setConditions(p.conditions)
    setStatus(p.status)
    setOpen(true)
  }

  const generatePDF = (p: any, type: 'proposal' | 'contract') => {
    const total = Number(p.area_ha) * Number(p.price_per_ha)
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const clientName = p.client?.name || 'Cliente'
    const clientDoc = p.client?.document_number || ''
    const clientAddr = p.client?.address || ''
    const proposalNum = p.proposal_number ? String(p.proposal_number).padStart(4, '0') : '0000'

    if (type === 'proposal') {
      // Cabecalho com fundo escuro e texto dourado
      doc.setFillColor(50, 48, 43) 
      doc.rect(0, 0, pageWidth, 45, 'F')
      doc.setTextColor(255, 193, 7) 
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      // Deixamos um espaço maior (x=50) caso o logo exista
      doc.text('PROPOSTA COMERCIAL', 50, 28)

      doc.setTextColor(230, 230, 230)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nº PROP-${proposalNum} | Data: ${formatDate(p.created_at)}`, pageWidth - 14, 35, { align: 'right' })

      // Apresentação Inicial
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(11)
      const introText = "Agradecemos a oportunidade de apresentar nossa proposta comercial para prestação de serviços. Nosso compromisso é entregar excelência técnica, segurança operacional e os melhores resultados para sua área."
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 28)
      doc.text(splitIntro, 14, 60)

      // Box de Dados (Emitente / Cliente) usando autoTable para quebra de linha perfeita
      autoTable(doc, {
        startY: 75,
        head: [['EMITENTE:', 'CLIENTE:']],
        body: [[
          `${COMPANY_INFO.company_name}\nCNPJ: ${COMPANY_INFO.document}\nE-mail: ${COMPANY_INFO.email}`,
          `${clientName}\nCPF/CNPJ: ${clientDoc}\nEndereço: ${clientAddr}`
        ]],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5, textColor: [60, 60, 60], lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: pageWidth / 2 - 14 },
          1: { cellWidth: pageWidth / 2 - 14 }
        },
        margin: { left: 14, right: 14 }
      })

      const detailsStartY = (doc as any).lastAutoTable.finalY + 10

      // Detalhes do Serviço (Tabela)
      autoTable(doc, {
        startY: detailsStartY,
        head: [['Escopo / Descrição do Serviço', 'Área (ha)', 'Valor por ha', 'Valor Total Estimado']],
        body: [
          [p.service_type, `${p.area_ha} ha`, formatCurrency(Number(p.price_per_ha)), formatCurrency(total)]
        ],
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [50, 48, 43], textColor: [255, 193, 7], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        }
      })

      const finalY = (doc as any).lastAutoTable.finalY + 15

      // Usa autoTable para Condições para não estourar a página
      autoTable(doc, {
        startY: finalY,
        head: [['CONDIÇÕES COMERCIAIS E PAGAMENTO']],
        body: [[p.conditions]],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 6, textColor: [70, 70, 70] },
        headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
        bodyStyles: { fillColor: [250, 250, 250] },
        willDrawCell: function(data) {
          if (data.row.section === 'body' || data.row.section === 'head') {
            doc.setDrawColor(255, 193, 7)
            doc.setLineWidth(1)
            doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height)
          }
        }
      })

      const sigY = (doc as any).lastAutoTable.finalY + 30

      // Verifica se a assinatura cabe na página, se não, cria nova página
      if (sigY > doc.internal.pageSize.height - 40) {
        doc.addPage()
      }

      const drawY = sigY > doc.internal.pageSize.height - 40 ? 40 : sigY

      // Validade da Proposta
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Validade desta proposta: 15 dias a partir da data de emissão.', 14, drawY - 15)

      // Assinaturas
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.3)
      
      doc.line(20, drawY, 90, drawY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(COMPANY_INFO.trade_name, 20, drawY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Departamento Comercial', 20, drawY + 9)

      doc.line(pageWidth - 90, drawY, pageWidth - 20, drawY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const clientSigName = doc.splitTextToSize(clientName, 70)
      doc.text(clientSigName, pageWidth - 90, drawY + 4)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`CPF/CNPJ: ${clientDoc}`, pageWidth - 90, drawY + 4 + (clientSigName.length * 4))

      const img = new Image()
      img.src = '/logo.png'
      img.onload = () => {
        doc.addImage(img, 'PNG', 14, 5, 30, 30)
        window.open(URL.createObjectURL(doc.output('blob')), '_blank')
      }
      img.onerror = () => {
        window.open(URL.createObjectURL(doc.output('blob')), '_blank')
      }
    } else {
      // Contrato
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, 20, { align: 'center' })
      
      const text = `
Pelo presente instrumento particular, de um lado:
CONTRATADA: ${COMPANY_INFO.company_name}, CNPJ ${COMPANY_INFO.document}, Inscrição Municipal ${COMPANY_INFO.im}, sediada em ${COMPANY_INFO.address}, ${COMPANY_INFO.city}-${COMPANY_INFO.state}, CEP ${COMPANY_INFO.zip}.

E de outro lado:
CONTRATANTE: ${clientName}, CPF/CNPJ ${clientDoc}, residente/sediado(a) em ${clientAddr}.

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem como objeto a prestação de serviços de ${p.service_type} utilizando tecnologia e equipamentos adequados na propriedade do CONTRATANTE.

CLÁUSULA SEGUNDA - DA ÁREA E VALORES
A área total estimada para a aplicação é de ${p.area_ha} hectares. O valor acordado é de ${formatCurrency(Number(p.price_per_ha))} por hectare, totalizando o valor estimado de ${formatCurrency(total)}.

CLÁUSULA TERCEIRA - DAS CONDIÇÕES DE PAGAMENTO
${p.conditions}

CLÁUSULA QUARTA - DAS RESPONSABILIDADES
A CONTRATADA compromete-se a executar os serviços com a máxima diligência técnica. O CONTRATANTE responsabiliza-se por fornecer as condições necessárias e acesso seguro à área de aplicação.

E, por estarem de acordo, assinam o presente contrato em duas vias de igual teor.

${COMPANY_INFO.city}-${COMPANY_INFO.state}, ${formatDate(p.created_at)}.
      `.trim()

      // Usando autoTable para garantir paginação automática do texto do contrato
      autoTable(doc, {
        startY: 30,
        body: [[text]],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 0, textColor: [50, 50, 50] }
      })

      let sigY = (doc as any).lastAutoTable.finalY + 30

      if (sigY > doc.internal.pageSize.height - 40) {
        doc.addPage()
        sigY = 40
      }

      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.3)
      doc.line(14, sigY, 80, sigY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(COMPANY_INFO.company_name, 14, sigY + 4)
      doc.setFont('helvetica', 'normal')
      doc.text(`CNPJ: ${COMPANY_INFO.document}`, 14, sigY + 8)

      doc.line(pageWidth - 80, sigY, pageWidth - 14, sigY)
      doc.setFont('helvetica', 'bold')
      const contractClientSig = doc.splitTextToSize(clientName, 66)
      doc.text(contractClientSig, pageWidth - 80, sigY + 4)
      doc.setFont('helvetica', 'normal')
      doc.text(`CPF/CNPJ: ${clientDoc}`, pageWidth - 80, sigY + 4 + (contractClientSig.length * 4))

      const img = new Image()
      img.src = '/logo.png'
      img.onload = () => {
        doc.addImage(img, 'PNG', 14, 5, 30, 30)
        window.open(URL.createObjectURL(doc.output('blob')), '_blank')
      }
      img.onerror = () => {
        window.open(URL.createObjectURL(doc.output('blob')), '_blank')
      }
    }
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Propostas & Contratos</h1>
            <p className="text-sm text-muted-foreground">Gerencie o seu comercial</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['proposals'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenNew}><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button>
        </div>
      </div>

      <Card className="border-muted/50 shadow-xl shadow-black/5">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Área / Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma proposta registrada. Crie sua primeira proposta!
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((p: any) => {
                  const statusCfg = STATUS_MAP[p.status] || STATUS_MAP['draft']
                  const total = Number(p.area_ha) * Number(p.price_per_ha)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-primary">PROP-{String(p.proposal_number).padStart(4, '0')}</TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate" title={p.client?.name}>
                        {p.client?.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.service_type}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
                          <span className="text-xs text-muted-foreground">{p.area_ha} ha</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(p)}>
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => {
                            if (confirm('Tem certeza que deseja excluir esta proposta?')) deleteMutation.mutate(p.id)
                          }}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => generatePDF(p, 'proposal')}>
                            <FileText className="h-4 w-4 mr-1" /> Proposta
                          </Button>
                          <Button variant="default" size="sm" onClick={() => generatePDF(p, 'contract')}>
                            <FileSignature className="h-4 w-4 mr-1" /> Contrato
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Proposta' : 'Nova Proposta Comercial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Input value={serviceType} onChange={e => setServiceType(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="sent">Enviada ao Cliente</SelectItem>
                    <SelectItem value="accepted">Aprovada</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área Estimada (ha)</Label>
                <Input type="number" value={areaHa} onChange={e => setAreaHa(e.target.value)} placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label>Valor por Hectare (R$)</Label>
                <Input type="number" value={pricePerHa} onChange={e => setPricePerHa(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condições Comerciais e de Pagamento</Label>
              <Textarea 
                value={conditions} 
                onChange={e => setConditions(e.target.value)} 
                rows={3} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => {
                if (!selectedClient || !areaHa || !pricePerHa) {
                  toast.error('Preencha os campos obrigatórios')
                  return
                }
                saveMutation.mutate()
              }} 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
