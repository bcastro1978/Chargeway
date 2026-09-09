-- Migration: Cache de Elevaciones para Optimización de Costos y Precisión Andina
-- Almacena pares (lat, lng redondeados a 4 decimales ~11m) y su elevación en metros.

CREATE TABLE IF NOT EXISTS public.elevation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lat_round NUMERIC(7,4) NOT NULL, -- Ej: -0.1807
    lng_round NUMERIC(7,4) NOT NULL, -- Ej: -78.4678
    elevation NUMERIC(7,2) NOT NULL, -- Metros sobre el nivel del mar
    source VARCHAR(30) DEFAULT 'google_maps', -- 'google_maps', 'opentopodata'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_lat_lng_elevation UNIQUE (lat_round, lng_round)
);

CREATE INDEX IF NOT EXISTS idx_elevation_cache_coords ON public.elevation_cache(lat_round, lng_round);
