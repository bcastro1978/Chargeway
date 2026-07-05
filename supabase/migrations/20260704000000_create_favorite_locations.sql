-- Migration: Create favorite_locations table

CREATE TABLE IF NOT EXISTS public.favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see only their own favorites
CREATE POLICY "Users can view own favorite_locations"
    ON public.favorite_locations FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorite_locations"
    ON public.favorite_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorite_locations"
    ON public.favorite_locations FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Users can update their own favorites
CREATE POLICY "Users can update own favorite_locations"
    ON public.favorite_locations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for faster lookup by user_id
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id ON public.favorite_locations(user_id);
