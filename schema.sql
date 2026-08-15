-- Limpeza de tabelas (caso existam)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bulletin_expenses CASCADE;
DROP TABLE IF EXISTS public.measurement_bulletins CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.service_orders CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis (substituindo a antiga "users" para evitar conflito com auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician',
  phone TEXT,
  commission_type TEXT,
  commission_value DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  area_ha FLOAT,
  default_price_per_ha DECIMAL,
  payment_method TEXT,
  payment_term_days INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Ordens de Serviço
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_number SERIAL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'demo' or 'paid'
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  area_ha FLOAT,
  price_per_ha DECIMAL,
  km_start INT,
  km_end INT,
  km_start_photo_url TEXT,
  km_end_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Atividades
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  lat FLOAT,
  lng FLOAT,
  hectares_sprayed FLOAT
);

-- 5. Tabela de Boletins de Medição
CREATE TABLE public.measurement_bulletins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  hectares_sprayed FLOAT,
  price_per_ha DECIMAL,
  subtotal DECIMAL,
  total_value DECIMAL,
  commission_value DECIMAL,
  commission_pct DECIMAL,
  km_total INT,
  pdf_url TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  boleto_url TEXT,
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Despesas do Boletim
CREATE TABLE public.bulletin_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bulletin_id UUID REFERENCES public.measurement_bulletins(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit_value DECIMAL NOT NULL,
  total_value DECIMAL NOT NULL
);

-- 6. Transações Financeiras (Contas a Pagar/Receber)
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL -- 'income' or 'expense'
);

CREATE TABLE public.company_settings (
  id INT PRIMARY KEY DEFAULT 1,
  initial_balance DECIMAL DEFAULT 0
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'income' or 'expense'
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid', -- 'pending' or 'paid'
  bulletin_id UUID REFERENCES public.measurement_bulletins(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.financial_categories(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security - RLS)
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados em profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em clients" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em service_orders" ON public.service_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em activities" ON public.activities FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em measurement_bulletins" ON public.measurement_bulletins FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em bulletin_expenses" ON public.bulletin_expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para autenticados em transactions" ON public.transactions FOR ALL TO authenticated USING (true);
