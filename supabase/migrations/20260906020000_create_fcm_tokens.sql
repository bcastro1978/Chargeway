-- Migration: Registro de Tokens para Notificaciones Push (Firebase Cloud Messaging)
-- Soporta conductores y anfitriones en Web / PWA / Android / iOS

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    token TEXT NOT NULL,
    device_type VARCHAR(50) DEFAULT 'web', -- 'web', 'android', 'ios'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_user_fcm_email ON public.user_fcm_tokens(email);
CREATE INDEX IF NOT EXISTS idx_user_fcm_user_id ON public.user_fcm_tokens(user_id);
