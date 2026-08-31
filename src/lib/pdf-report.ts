import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PdfColumn {
  header: string
  dataKey: string
  width?: number
  align?: 'left' | 'center' | 'right'
}

interface PdfReportOptions {
  title: string
  subtitle?: string
  columns: PdfColumn[]
  rows: Record<string, any>[]
  summaryRows?: { label: string; value: string; color?: [number, number, number] }[]
  fileName?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

export function generateFinancialReport(options: PdfReportOptions): jsPDF {
  const { title, subtitle, columns, rows, summaryRows, fileName } = options

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const primary: [number, number, number] = [22, 163, 74] // green-600
  const dark: [number, number, number] = [15, 23, 42]
  const muted: [number, number, number] = [100, 116, 139]

  // --- Header Bar ---
  doc.setFillColor(...primary)
  doc.rect(0, 0, pageWidth, 22, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOP LOCAÇÕES E SERVIÇOS', 12, 10)

  // Report title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 12, 17)

  // Date top right
  const now = new Date()
  const dateStr = `Emitido em: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  doc.setFontSize(8)
  doc.text(dateStr, pageWidth - 12, 17, { align: 'right' })

  // --- Subtitle ---
  let yPos = 30
  if (subtitle) {
    doc.setTextColor(...muted)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 12, yPos)
    yPos += 6
  }

  // --- Table ---
  const tableColumns = columns.map((c) => ({
    header: c.header,
    dataKey: c.dataKey,
  }))

  const tableRows = rows.map((row) =>
    columns.reduce((acc, col) => ({ ...acc, [col.dataKey]: row[col.dataKey] ?? '—' }), {})
  )

  autoTable(doc, {
    startY: yPos,
    columns: tableColumns,
    body: tableRows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: dark,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: dark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      return {
        ...acc,
        [idx]: {
          halign: col.align || 'left',
          cellWidth: col.width ? col.width : 'auto',
        },
      }
    }, {}),
    margin: { left: 12, right: 12 },
  })

  // --- Summary rows ---
  if (summaryRows && summaryRows.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20
    let sy = finalY + 6

    doc.setLineWidth(0.5)
    doc.setDrawColor(...primary)
    doc.line(12, sy, pageWidth - 12, sy)
    sy += 5

    for (const row of summaryRows) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...(row.color || dark))
      doc.text(row.label, pageWidth - 60, sy)
      doc.text(row.value, pageWidth - 12, sy, { align: 'right' })
      sy += 6
    }
  }

  // --- Footer ---
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...muted)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' })
  }

  return doc
}

export function previewPdf(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function downloadPdf(doc: jsPDF, fileName: string): void {
  doc.save(fileName)
}
