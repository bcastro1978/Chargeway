-- ============================================================
-- ChargeWay – Registro de Consentimientos (LOPDP Ecuador)
-- Migración: 20260623200000_create_consent_records.sql
-- ============================================================
-- Almacena evidenciables legales de cada aceptación de políticas
-- conforme a la Ley Orgánica de Protección de Datos Personales
-- de Ecuador y la Resolución SPDP-SPD-2025-0030-R.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consent_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Versión del documento legal aceptado (permite control de versiones)
  terms_version             TEXT NOT NULL DEFAULT '1.0',
  privacy_version           TEXT NOT NULL DEFAULT '1.0',

  -- Consentimientos obligatorios
  accepted_terms            BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_privacy          BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_statistical_use  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Consentimientos opcionales (opt-in granular)
  accepted_marketing_chargeWay  BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_marketing_brands     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Evidenciables técnicos (Art. 12 y 24 LOPDP)
  ip_address                TEXT,
  user_agent                TEXT,
  accepted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Para revocatoria posterior
  revoked_marketing_brands_at TIMESTAMPTZ,
  revoked_marketing_chargeWay_at TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para lookup rápido por usuario
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id
  ON public.consent_records (user_id);

-- Solo el usuario activo puede ver y actualizar su propio registro
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Users can insert their own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Users can update their own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Admins can read all consents" ON public.consent_records;

CREATE POLICY "Users can view their own consent"
  ON public.consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent"
  ON public.consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent"
  ON public.consent_records FOR UPDATE
  USING (auth.uid() = user_id);

-- (Política de admin removida temporalmente ya que la tabla profiles no tiene columna 'role')

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_consent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_updated_at ON public.consent_records;
CREATE TRIGGER trg_consent_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_consent_updated_at();

-- Comentarios de documentación
COMMENT ON TABLE public.consent_records IS 
  'Evidenciables de consentimiento LOPDP Ecuador. Un registro por usuario. Actualizable en revocatoria.';
COMMENT ON COLUMN public.consent_records.terms_version IS 
  'Versión de T&C aceptados. Cambiar versión invalida aceptaciones previas y requiere re-aceptación.';
COMMENT ON COLUMN public.consent_records.ip_address IS 
  'IP del usuario al momento de aceptar, capturada para evidencia legal (Art. 24 LOPDP).';
COMMENT ON COLUMN public.consent_records.accepted_marketing_brands IS 
  'Consentimiento opt-in para transferencia de email a fabricantes socios. Revocable en cualquier momento.';
