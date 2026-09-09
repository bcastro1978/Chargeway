-- Migration: Tabla Staging para Analítica de Movilidad Eléctrica (BigQuery Sync)
-- Registra eventos agregados de consumo y sesiones de carga para reportería B2B

CREATE TABLE IF NOT EXISTS public.analytics_sessions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    vehicle_model VARCHAR(100),
    initial_soc INT,
    final_soc INT,
    energy_delivered_kwh NUMERIC(6,2),
    duration_minutes INT,
    province VARCHAR(100),
    canton VARCHAR(100),
    charger_speed VARCHAR(50),
    charger_power_kw NUMERIC(5,1),
    co2_saved_kg NUMERIC(6,2),
    synced_to_bigquery BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_synced ON public.analytics_sessions_log(synced_to_bigquery);
CREATE INDEX IF NOT EXISTS idx_analytics_province ON public.analytics_sessions_log(province);
