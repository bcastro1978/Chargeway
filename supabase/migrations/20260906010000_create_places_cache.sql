-- Migration: Cache de Lugares y Amenidades Cercanas ("Carga y Disfruta")
-- Evita llamadas repetidas a Google Places API para cargadores en ubicaciones fijas.

CREATE TABLE IF NOT EXISTS public.places_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_key VARCHAR(100) NOT NULL, -- 'lat_round,lng_round' o charger_id
    category VARCHAR(50) NOT NULL, -- 'cafe', 'restaurant', 'shopping', 'restroom'
    places_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_station_category UNIQUE (station_key, category)
);

CREATE INDEX IF NOT EXISTS idx_places_cache_station ON public.places_cache(station_key);
