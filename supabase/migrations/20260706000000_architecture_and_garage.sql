-- Migration: Architecture for Relational Vehicles and My Garage

-- 1. Vehicle Brands
CREATE TABLE IF NOT EXISTS vehicle_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for vehicle_brands
ALTER TABLE vehicle_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vehicle_brands" ON vehicle_brands FOR SELECT USING (true);

-- 2. Vehicle Models
CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES vehicle_brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- For the legacy ID mapping like 'audi-etron-55'
    usable_battery_kwh DECIMAL(10, 2) NOT NULL,
    drag_coefficient DECIMAL(5, 3) NOT NULL,
    frontal_area_m2 DECIMAL(5, 2) NOT NULL,
    weight_kg INTEGER NOT NULL,
    peak_charging_kw INTEGER NOT NULL,
    wltp_range_km INTEGER NOT NULL,
    charger_type TEXT NOT NULL,
    commercial_range_km INTEGER NOT NULL,
    commercial_standard TEXT NOT NULL,
    certificado_wltp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for vehicle_models
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vehicle_models" ON vehicle_models FOR SELECT USING (true);

-- 3. User Vehicles (My Garage)
CREATE TABLE IF NOT EXISTS user_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_model_id UUID REFERENCES vehicle_models(id),
    alias TEXT NOT NULL,
    photo_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Max 3 vehicles per user constraint
-- A simple way in Postgres without writing complex triggers is to just rely on the application logic for the hard limit, 
-- or we can use a trigger. We'll add a trigger.
CREATE OR REPLACE FUNCTION check_vehicle_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM user_vehicles WHERE user_id = NEW.user_id) >= 3 THEN
        RAISE EXCEPTION 'Vehicle limit reached. A maximum of 3 vehicles per user is allowed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vehicle_limit
BEFORE INSERT ON user_vehicles
FOR EACH ROW
EXECUTE FUNCTION check_vehicle_limit();

-- Only one primary vehicle per user constraint
CREATE OR REPLACE FUNCTION ensure_single_primary_vehicle()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- Set all other vehicles for this user to non-primary
        UPDATE user_vehicles SET is_primary = false WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_primary_vehicle
BEFORE INSERT OR UPDATE ON user_vehicles
FOR EACH ROW
EXECUTE FUNCTION ensure_single_primary_vehicle();

-- Enable RLS for user_vehicles
ALTER TABLE user_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own vehicles" ON user_vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vehicles" ON user_vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON user_vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON user_vehicles FOR DELETE USING (auth.uid() = user_id);

-- Create Storage Bucket for vehicle photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle_photos', 'vehicle_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for vehicle_photos
CREATE POLICY "Public read vehicle_photos" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle_photos');
CREATE POLICY "Authenticated upload vehicle_photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle_photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE USING (bucket_id = 'vehicle_photos' AND auth.uid() = owner);
