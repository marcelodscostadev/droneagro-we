-- Rode este comando no SQL Editor do Supabase para criar a tabela de propostas

CREATE TABLE IF NOT EXISTS public.commercial_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    proposal_number SERIAL NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    area_ha NUMERIC NOT NULL,
    price_per_ha NUMERIC NOT NULL,
    conditions TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    notes TEXT
);

-- Atualiza as politicas de seguranca (RLS)
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.commercial_proposals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all authenticated users" ON public.commercial_proposals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all authenticated users" ON public.commercial_proposals
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for all authenticated users" ON public.commercial_proposals
    FOR DELETE USING (auth.role() = 'authenticated');
