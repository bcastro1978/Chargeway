-- Add last_vehicle_id and last_soc columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_vehicle_id TEXT,
ADD COLUMN IF NOT EXISTS last_soc NUMERIC;
