-- Create leads table for the landing page
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    daily_km NUMERIC,
    brand_interest TEXT,
    model_interest TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert and read leads (we'll use the service role key from our secure API route)
CREATE POLICY "Service role can manage leads" ON public.leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
