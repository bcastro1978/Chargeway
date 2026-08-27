-- Migration: Soporte para Monetización por Volumen (5 Reservas Gratis / 20% Comisión) y Saldo Prepagado

-- 1. Añadir saldo prepagado y contador mensual a los puntos de carga del anfitrión
ALTER TABLE public.partner_charging_points
ADD COLUMN IF NOT EXISTS prepaid_balance_usd NUMERIC(8,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_reservations_count INT DEFAULT 0;

-- 2. Añadir tracking de comisión y cuota gratuita a las reservas
ALTER TABLE public.charger_reservations
ADD COLUMN IF NOT EXISTS commission_charged_usd NUMERIC(6,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_free_quota BOOLEAN DEFAULT TRUE;

-- 3. Tabla de Transacciones de Billetera / Saldo Prepagado del Anfitrión
CREATE TABLE IF NOT EXISTS public.host_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charging_point_id UUID REFERENCES public.partner_charging_points(id) ON DELETE CASCADE,
    host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transaction_type VARCHAR(30) NOT NULL, -- 'recharge', 'commission_deduction', 'refund', 'adjustment'
    amount_usd NUMERIC(8,2) NOT NULL,
    balance_before_usd NUMERIC(8,2) NOT NULL,
    balance_after_usd NUMERIC(8,2) NOT NULL,
    reservation_id UUID REFERENCES public.charger_reservations(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de auditoría y rendimiento
CREATE INDEX IF NOT EXISTS idx_host_wallet_tx_point ON public.host_wallet_transactions(charging_point_id);
CREATE INDEX IF NOT EXISTS idx_host_wallet_tx_created ON public.host_wallet_transactions(created_at);
