import { supabase } from '@/lib/supabase'

export const AGENT_TOOLS = [{
  functionDeclarations: [
    {
      name: "read_database",
      description: "Lê dados do banco Supabase. Para perguntas de 'quantos' use mode='count'; para totais em R$ use mode='sum' com sumColumn. Só use mode='rows' quando precisar listar registros, e selecione apenas as colunas necessárias.",
      parameters: {
        type: "OBJECT",
        properties: {
          table: { type: "STRING", description: "Nome da tabela (veja o esquema nas instruções)" },
          mode: { type: "STRING", description: "'count' (só quantidade), 'sum' (quantidade + soma de sumColumn) ou 'rows' (lista). Padrão: 'rows'." },
          select: { type: "STRING", description: "Colunas para mode='rows' (ex: 'id, amount, status'). Evite '*'." },
          sumColumn: { type: "STRING", description: "Coluna numérica para mode='sum' (ex: amount, total_value, hectares_sprayed)." },
          matchFiltersJson: { type: "STRING", description: "Filtros exatos em JSON stringificado (ex: {\"type\": \"expense\", \"status\": \"pending\"}). Opcional." },
          dateColumn: { type: "STRING", description: "Coluna de data para filtro (ex: due_date). Opcional." },
          dateStart: { type: "STRING", description: "Data inicial YYYY-MM-DD. Opcional." },
          dateEnd: { type: "STRING", description: "Data final YYYY-MM-DD. Opcional." },
          orderBy: { type: "STRING", description: "Coluna para ordenar (desc). Opcional." },
          limit: { type: "NUMBER", description: "Máximo de linhas em mode='rows' (padrão 50, máx 200)." }
        },
        required: ["table"]
      }
    },
    {
      name: "write_database",
      description: "Insere, atualiza ou deleta registros no banco. USE COM CAUTELA.",
      parameters: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", description: "'insert', 'update' ou 'delete'" },
          table: { type: "STRING", description: "Nome da tabela" },
          id: { type: "STRING", description: "ID do registro (obrigatório para update e delete)" },
          dataJson: { type: "STRING", description: "Dados em JSON (obrigatório para insert e update)" }
        },
        required: ["action", "table"]
      }
    }
  ]
}]

export async function executeAgentTool(name: string, args: any) {
  const db = supabase as any
  try {
    if (name === 'read_database') {
      const mode = args.mode || 'rows'
      const applyFilters = (q: any) => {
        if (args.matchFiltersJson) {
          try { q = q.match(JSON.parse(args.matchFiltersJson)) } catch (e) {}
        }
        if (args.dateColumn && args.dateStart) q = q.gte(args.dateColumn, args.dateStart)
        if (args.dateColumn && args.dateEnd) q = q.lte(args.dateColumn, args.dateEnd)
        return q
      }

      // Contagem: só o número, sem trafegar linhas
      if (mode === 'count') {
        const { count, error } = await applyFilters(db.from(args.table).select('*', { count: 'exact', head: true }))
        if (error) throw error
        return { count }
      }

      // Soma: busca apenas a coluna numérica e devolve o total
      if (mode === 'sum' && args.sumColumn) {
        const { data, error } = await applyFilters(db.from(args.table).select(args.sumColumn))
        if (error) throw error
        const total = (data || []).reduce((acc: number, r: any) => acc + (Number(r[args.sumColumn]) || 0), 0)
        return { count: (data || []).length, total }
      }

      const limit = Math.min(Number(args.limit) || 50, 200)
      let q = applyFilters(db.from(args.table).select(args.select || 'id', { count: 'exact' }))
      if (args.orderBy) q = q.order(args.orderBy, { ascending: false })
      const { data, count, error } = await q.limit(limit)
      if (error) throw error
      return { total_matching: count, returned: data?.length || 0, data }
    }
    
    if (name === 'write_database') {
      if (args.action === 'insert') {
        const { data, error } = await db.from(args.table).insert(JSON.parse(args.dataJson)).select()
        if (error) throw error
        return { success: true, inserted: data }
      }
      if (args.action === 'update') {
        const { data, error } = await db.from(args.table).update(JSON.parse(args.dataJson)).eq('id', args.id).select()
        if (error) throw error
        return { success: true, updated: data }
      }
      if (args.action === 'delete') {
        const { error } = await db.from(args.table).delete().eq('id', args.id)
        if (error) throw error
        return { success: true, deleted: true }
      }
    }
    return { error: 'Ferramenta não encontrada' }
  } catch (err: any) {
    return { error: err.message }
  }
}
