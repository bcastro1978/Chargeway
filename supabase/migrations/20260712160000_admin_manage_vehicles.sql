-- Allow admins to manage vehicle brands
DROP POLICY IF EXISTS "Admins can manage vehicle_brands" ON public.vehicle_brands;

CREATE POLICY "Admins can manage vehicle_brands"
  ON public.vehicle_brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Allow admins to manage vehicle models
DROP POLICY IF EXISTS "Admins can manage vehicle_models" ON public.vehicle_models;

CREATE POLICY "Admins can manage vehicle_models"
  ON public.vehicle_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
