-- Migration to add is_active to vehicle tables
ALTER TABLE vehicle_brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE vehicle_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
