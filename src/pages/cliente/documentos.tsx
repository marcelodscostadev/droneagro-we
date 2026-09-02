import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileText, Receipt, ExternalLink, FileDown, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

export function ClientDocumentos() {
  const { data: user } = useAuth()
  const clientId = user?.client_id
  const [tab, setTab] = useState<'boletos' | 'notas'>('boletos')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['client-documentos', clientId],
    queryFn: async () => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('measurement_bulletins')
        .select('id, invoice_number, invoice_url, boleto_url, total_value, created_at, approved_at, service_order:service_orders(scheduled_at, os_number), transactions(status, type)')
        .eq('client_id', clientId)
        .eq('status', 'invoiced')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!clientId,
  })

  // Encontra todas as notas que têm pelo menos uma transação paga
  const paidInvoiceNumbers = new Set(
    docs.filter((d: any) => {
      const inc = d.transactions?.find((t: any) => t.type === 'income')
      return inc && inc.status === 'paid'
    }).map((d: any) => d.invoice_number).filter(Boolean)
  )

  const openDocs: any[] = []
  const seenInvoices = new Map<string, any>()

  docs.forEach((d: any) => {
    // É considerado pago se a própria transação for paga OU se compartilhar o mesmo número de uma nota paga
    const inc = d.transactions?.find((t: any) => t.type === 'income')
    const isPaid = (inc && inc.status === 'paid') || (d.invoice_number && paidInvoiceNumbers.has(d.invoice_number))

    if (!isPaid) {
      if (d.invoice_number) {
        if (!seenInvoices.has(d.invoice_number)) {
          seenInvoices.set(d.invoice_number, d)
          openDocs.push(d)
        } else {
          // Se já existe, garante que vamos usar o que tem os URLs dos arquivos!
          const existing = seenInvoices.get(d.invoice_number)
          if (!existing.invoice_url && d.invoice_url) {
            existing.invoice_url = d.invoice_url
          }
          if (!existing.boleto_url && d.boleto_url) {
            existing.boleto_url = d.boleto_url
          }
        }
      } else {
        openDocs.push(d)
      }
    }
  })

  const comBoleto = openDocs.filter((d: any) => d.boleto_url)
  const comNota   = openDocs.filter((d: any) => d.invoice_url || d.invoice_number)

  const lista = tab === 'boletos' ? comBoleto : comNota

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
          <FileText className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Documentos</h1>
          <p className="text-sm text-muted-foreground">Notas fiscais e boletos disponíveis para download</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-muted/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Receipt className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Boletos</p>
              <p className="text-2xl font-bold">{comBoleto.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notas Fiscais</p>
              <p className="text-2xl font-bold">{comNota.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        {(['boletos', 'notas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'boletos' ? '🧾 Boletos' : '📄 Notas Fiscais'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : lista.length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">
              {tab === 'boletos' ? 'Nenhum boleto disponível ainda' : 'Nenhuma nota fiscal disponível ainda'}
            </p>
            <p className="text-sm mt-1">Os documentos aparecem aqui após o faturamento do serviço.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((doc: any) => {
            const url = tab === 'boletos' ? doc.boleto_url : doc.invoice_url
            const osDate = doc.service_order?.scheduled_at
            const osNum = doc.service_order?.os_number

            return (
              <Card key={doc.id} className="border-muted/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn(
                    'p-2.5 rounded-xl border shrink-0',
                    tab === 'boletos'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-purple-500/10 border-purple-500/20'
                  )}>
                    {tab === 'boletos'
                      ? <Receipt className="h-5 w-5 text-blue-500" />
                      : <FileText className="h-5 w-5 text-purple-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {tab === 'notas'
                        ? `NF ${doc.invoice_number || 'S/N'}`
                        : `Boleto — ${osNum ? `OS-${String(osNum).padStart(4,'0')}` : 'Serviço'}`
                      }
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(doc.total_value)}
                      </span>
                      {osDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(osDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {url ? (
                      <Badge variant="success" className="text-[11px] hidden sm:inline-flex">Disponível</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[11px] hidden sm:inline-flex">Aguardando Arquivo</Badge>
                    )}
                    
                    {url ? (
                      <>
                        <a href={url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Abrir</span>
                          </Button>
                        </a>
                        <a href={url} download target="_blank" rel="noreferrer">
                          <Button size="icon" variant="outline" className="h-8 w-8">
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="hidden sm:inline">Em processamento</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
