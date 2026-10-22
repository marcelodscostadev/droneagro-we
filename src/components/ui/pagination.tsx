import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_SIZE_OPTIONS = [50, 100]

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  if (totalItems === 0) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  // Calcular quais páginas exibir (janela de 5 ao redor da atual)
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Exibindo <span className="font-semibold text-foreground">{from}–{to}</span> de{' '}
          <span className="font-semibold text-foreground">{totalItems}</span> registros
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 py-0 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              title="Registros por página"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">/ página</span>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm select-none">…</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-sm"
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
