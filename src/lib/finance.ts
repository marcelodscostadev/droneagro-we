/**
 * Helpers financeiros compartilhados (Dashboard, Contas a Pagar, Contas a Receber).
 */

/**
 * Filtro PostgREST (`.or(...)`) para um mês:
 *  - pendentes: pelo mês do vencimento (due_date é DATE, sem fuso)
 *  - pagas: pelo mês da baixa (paid_at é TIMESTAMPTZ) — limites calculados no
 *    fuso LOCAL do navegador e convertidos para UTC, evitando que pagamentos
 *    feitos após 21h (Brasília) caiam no mês errado.
 *
 * @param year  ano (ex: 2026)
 * @param month mês 1-12
 */
export function monthCashFilter(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const startDate = `${year}-${pad(month)}-01`
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`

  const startTs = new Date(year, month - 1, 1).toISOString()
  const nextTs = new Date(year, month, 1).toISOString()

  return (
    `and(status.eq.pending,due_date.gte.${startDate},due_date.lte.${endDate}),` +
    `and(status.eq.paid,paid_at.gte."${startTs}",paid_at.lt."${nextTs}")`
  )
}

/**
 * Busca TODAS as linhas paginando via `.range()`, contornando o limite
 * padrão de 1000 linhas do Supabase/PostgREST.
 *
 * @param build função que cria a query (precisa ser recriada a cada página)
 */
export async function fetchAllRows<T = any>(
  build: () => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data || []) as T[]
    all.push(...rows)
    if (rows.length < pageSize) break
  }
  return all
}
