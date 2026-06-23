-- Allow admins to read all trips (needed for charger traffic analytics)
DROP POLICY IF EXISTS "Admins can view all trips" ON public.trips;

CREATE POLICY "Admins can view all trips"
  ON public.trips FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
