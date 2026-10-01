// ─────────────────────────────────────────────────────────────────────────────
// src/types/entities.ts
// Definições centrais das entidades do sistema DroneAgro.
// Use estes tipos em vez de `any` ao tipar respostas do Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Perfil de usuário ───────────────────────────────────────────────────────
export type UserRole = 'admin' | 'technician' | 'client'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  client_id?: string | null
  created_at?: string
  client?: ClientSummary | null
}

// ─── Cliente ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  area_ha: number
  default_price_per_ha: number
  payment_method?: string | null
  payment_term_days?: number
  notes?: string | null
  lat?: number | null
  lng?: number | null
  person_type?: 'PF' | 'PJ' | null
  document_number?: string | null
  logo_url?: string | null
  created_at?: string
}

export type ClientSummary = Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'address' | 'area_ha' | 'lat' | 'lng'>

// ─── Ordem de Serviço / Agendamento ─────────────────────────────────────────
export type ServiceOrderStatus =
  | 'pending_client'
  | 'scheduled'
  | 'rescheduled'
  | 'traveling'
  | 'in_activity'
  | 'in_progress'   // retrocompatibilidade
  | 'finished'
  | 'completed'     // retrocompatibilidade
  | 'cancelled'

export type ServiceOrderType = 'paid' | 'demo'

export interface ServiceOrder {
  id: string
  os_number?: number
  client_id: string
  technician_id?: string | null
  status: ServiceOrderStatus
  type: ServiceOrderType
  scheduled_at: string
  rescheduled_at?: string | null
  reschedule_reason?: string | null
  area_ha?: number
  price_per_ha?: number
  notes?: string | null
  km_start?: number | null
  km_end?: number | null
  created_at?: string
  // relações
  client?: Pick<Client, 'id' | 'name'> | null
  technician?: Pick<Profile, 'id' | 'name'> | null
}

// ─── Boletim de Medição ───────────────────────────────────────────────────────
export type BulletinStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export interface MeasurementBulletin {
  id: string
  service_order_id?: string | null
  client_id: string
  technician_id?: string | null
  status: BulletinStatus
  hectares_sprayed: number
  price_per_ha: number
  subtotal: number
  total_value: number
  commission_pct?: number
  commission_value?: number
  km_total?: number | null
  invoice_number?: string | null
  invoice_url?: string | null
  boleto_url?: string | null
  batch_id?: string | null
  commission_paid?: boolean
  notes?: string | null
  created_at?: string
  // relações
  client?: Pick<Client, 'id' | 'name'> | null
  technician?: Pick<Profile, 'id' | 'name'> | null
  service_orders?: Pick<ServiceOrder, 'id' | 'os_number'> & {
    clients?: Pick<Client, 'id' | 'name'> | null
  } | null
}

// ─── Transação Financeira ─────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'pending' | 'paid'

export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  description: string
  amount: number
  due_date?: string | null
  paid_at?: string | null
  emission_date?: string | null
  created_at?: string
  category_id?: string | null
  cost_center_id?: string | null
  client_id?: string | null
  technician_id?: string | null
  bulletin_id?: string | null
  batch_id?: string | null
  // relações
  category?: Pick<FinancialCategory, 'id' | 'name'> | null
  cost_center?: Pick<CostCenter, 'id' | 'name'> | null
  technician?: Pick<Profile, 'id' | 'name'> | null
  bulletin?: Pick<MeasurementBulletin, 'id' | 'invoice_number' | 'invoice_url' | 'boleto_url'> & {
    service_orders?: {
      clients?: Pick<Client, 'id' | 'name'> | null
    } | null
  } | null
}

// ─── Categoria Financeira ─────────────────────────────────────────────────────
export interface FinancialCategory {
  id: string
  name: string
  type: TransactionType
}

// ─── Centro de Custo ──────────────────────────────────────────────────────────
export interface CostCenter {
  id: string
  name: string
}

// ─── Proposta Comercial ───────────────────────────────────────────────────────
export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export interface Proposal {
  id: string
  client_id: string
  status: ProposalStatus
  total_value?: number
  area_ha?: number
  price_per_ha?: number
  notes?: string | null
  created_at?: string
  valid_until?: string | null
  // relações
  client?: Pick<Client, 'id' | 'name' | 'document_number' | 'phone' | 'address'> | null
}

// ─── Jornada de Trabalho (Diária) ─────────────────────────────────────────────
export interface DailyShift {
  id: string
  technician_id: string
  date: string
  start_time?: string | null
  end_time?: string | null
  km_start?: number | null
  km_end?: number | null
  notes?: string | null
  // relações
  technician?: Pick<Profile, 'id' | 'name'> | null
}

// ─── Configurações da Empresa ─────────────────────────────────────────────────
export interface CompanySettings {
  id: number
  initial_balance: number
  company_name?: string | null
  company_cnpj?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_address?: string | null
}
