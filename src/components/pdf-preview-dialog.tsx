import { useEffect, useRef, useState } from 'react'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type jsPDF from 'jspdf'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: jsPDF | null
  fileName?: string
}

export function PdfPreviewDialog({ open, onOpenChange, doc, fileName = 'relatorio.pdf' }: PdfPreviewDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<any>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carrega o documento com pdf.js (independente do visualizador de PDF do navegador)
  useEffect(() => {
    if (!open || !doc) {
      pdfDocRef.current = null
      setNumPages(0)
      setPage(1)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const pdf = await pdfjs.getDocument({ data: doc.output('arraybuffer') }).promise
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setPage(1)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao gerar a pré-visualização.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, doc])

  // Renderiza a página atual em canvas, ajustando à largura disponível
  useEffect(() => {
    const pdf = pdfDocRef.current
    if (!pdf || !open) return
    let cancelled = false
    ;(async () => {
      try {
        const pdfPage = await pdf.getPage(page)
        const canvas = canvasRef.current
        const container = scrollRef.current
        if (!canvas || !container || cancelled) return

        const base = pdfPage.getViewport({ scale: 1 })
        const scale = Math.min(Math.max((container.clientWidth - 32) / base.width, 0.5), 2.5)
        const viewport = pdfPage.getViewport({ scale })
        const dpr = window.devicePixelRatio || 1

        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const ctx = canvas.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        await pdfPage.render({ canvasContext: ctx, viewport }).promise
      } catch (e: any) {
        if (!cancelled && e?.name !== 'RenderingCancelledException') {
          setError(e?.message || 'Erro ao renderizar a página.')
        }
      }
    })()
    return () => { cancelled = true }
  }, [page, numPages, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] w-[95vw] h-[90vh] flex flex-col [&>button]:z-10">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Relatório</DialogTitle>
          <DialogDescription>Confira o documento antes de baixar.</DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 min-h-0 w-full overflow-auto rounded-md border bg-muted/40">
          {error ? (
            <div className="h-full flex items-center justify-center text-sm text-destructive p-6 text-center">
              {error}
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Gerando pré-visualização...
            </div>
          ) : (
            <div className="flex justify-center p-4">
              <canvas ref={canvasRef} className="bg-white shadow-lg rounded-sm" />
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2 items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {numPages || '—'}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= numPages}
              onClick={() => setPage(p => Math.min(numPages, p + 1))}
              title="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={() => doc?.save(fileName)} disabled={!doc}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function usePdfPreview(defaultFileName = 'relatorio.pdf') {
  const [open, setOpen] = useState(false)
  const [doc, setDoc] = useState<jsPDF | null>(null)
  const [fileName, setFileName] = useState(defaultFileName)

  const preview = (document: jsPDF, name?: string) => {
    setDoc(document)
    if (name) setFileName(name)
    setOpen(true)
  }

  return { open, setOpen, doc, fileName, preview }
}
