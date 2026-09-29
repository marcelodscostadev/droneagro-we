import { supabase } from '@/lib/supabase'

export const AGENT_TOOLS = [{
  functionDeclarations: [
    {
      name: "read_database",
      description: "Lê dados do banco de dados Supabase do sistema. Tabelas: service_orders, clients, measurement_bulletins, daily_shifts, transactions.",
      parameters: {
        type: "OBJECT",
        properties: {
          table: { type: "STRING", description: "Nome da tabela (ex: clients, transactions)" },
          select: { type: "STRING", description: "Colunas para buscar (ex: '*', 'id, name')" },
          filterColumn: { type: "STRING", description: "Coluna para filtro exato (opcional)" },
          filterValue: { type: "STRING", description: "Valor para o filtro exato (opcional)" }
        },
        required: ["table", "select"]
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
      let q = db.from(args.table).select(args.select)
      if (args.filterColumn && args.filterValue) q = q.eq(args.filterColumn, args.filterValue)
      const { data, error } = await q.limit(20)
      if (error) throw error
      return { data }
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
