import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | undefined | null) {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatDatetime(date: string | Date | undefined | null) {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function maskCurrencyInput(value: string | number) {
  if (!value && value !== 0) return ''
  const str = String(value)
  const isNegative = str.includes('-')
  let v = str.replace(/\D/g, '')
  if (v === '') return isNegative ? '-' : ''
  v = (Number(v) / 100).toFixed(2)
  v = v.replace('.', ',')
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  return isNegative ? `-${v}` : v
}

export function parseMaskedValue(value: string) {
  if (!value || value === '-') return 0
  const isNegative = value.includes('-')
  let v = value.replace(/\D/g, '')
  if (v === '') return 0
  const num = Number(v) / 100
  return isNegative ? -num : num
}
