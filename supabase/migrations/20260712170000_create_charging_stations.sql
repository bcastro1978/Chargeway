-- Create charging_stations table
CREATE TABLE IF NOT EXISTS charging_stations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  province TEXT NOT NULL,
  canton TEXT NOT NULL,
  speed TEXT NOT NULL,
  charger_type TEXT NOT NULL,
  power_kw TEXT NOT NULL,
  schedule TEXT NOT NULL,
  cost TEXT NOT NULL,
  gps_link TEXT NOT NULL,
  source TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE charging_stations ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read charging_stations"
  ON charging_stations FOR SELECT
  USING (true);

-- Allow admins to manage charging stations
CREATE POLICY "Admins can manage charging_stations"
  ON charging_stations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
