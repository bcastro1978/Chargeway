-- Migration: Módulo de Anfitriones, Registro, Reservas, QR y Calificaciones para ChargeWay Partner

-- 1. Puntos de Carga de Anfitriones (Partner Points)
CREATE TABLE IF NOT EXISTS public.partner_charging_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    host_name VARCHAR(255) NOT NULL,
    host_email VARCHAR(255) NOT NULL,
    host_phone VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'hotel', 'restaurante', 'gasolinera', 'municipio', 'turistico', 'particular_residencial', 'particular_negocio'
    address TEXT NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    connector_type VARCHAR(50) NOT NULL, -- 'CCS2', 'GBT', 'Type2', 'Wallbox_NEMA', etc.
    power_kw NUMERIC(5,2) NOT NULL,
    price_per_kwh NUMERIC(6,2) DEFAULT 0.00,
    price_per_hour NUMERIC(6,2) DEFAULT 0.00,
    photo_urls TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    rating_avg NUMERIC(3,2) DEFAULT 5.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Horarios y Disponibilidad Semanal del Anfitrión
CREATE TABLE IF NOT EXISTS public.host_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charging_point_id UUID REFERENCES public.partner_charging_points(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration_minutes INT DEFAULT 60,
    is_enabled BOOLEAN DEFAULT TRUE
);

-- 3. Reservas de Puntos de Carga
CREATE TABLE IF NOT EXISTS public.charger_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charging_point_id UUID REFERENCES public.partner_charging_points(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_email VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50),
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'in_progress', 'completed', 'cancelled'
    reject_reason TEXT,
    qr_token TEXT UNIQUE,
    validated_at TIMESTAMPTZ,
    alert_15m_sent BOOLEAN DEFAULT FALSE,
    alert_5m_sent BOOLEAN DEFAULT FALSE,
    alert_end_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Calificaciones y Reseñas (1 a 5 Estrellas)
CREATE TABLE IF NOT EXISTS public.charger_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.charger_reservations(id) ON DELETE CASCADE,
    charging_point_id UUID REFERENCES public.partner_charging_points(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    driver_name VARCHAR(255) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(1000), -- Máximo 200 palabras
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_partner_points_coords ON public.partner_charging_points(lat, lng);
CREATE INDEX IF NOT EXISTS idx_partner_points_category ON public.partner_charging_points(category);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.charger_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_token ON public.charger_reservations(qr_token);
