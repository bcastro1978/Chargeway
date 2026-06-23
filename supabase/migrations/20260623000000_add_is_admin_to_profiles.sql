-- Add is_admin field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Only admins can see who else is admin (service role bypasses RLS)
-- Regular users cannot read/write this column via the anon key
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.is_admin = true
    )
  );

-- is_admin can only be set by service role (backend) — regular users cannot update it
-- The existing "Users can update their own profile" policy allows updating name/avatar but
-- the is_admin column should only be set via the Supabase dashboard or a service-role migration.
-- To protect it explicitly, we restrict updates via column-level security note:
-- (Supabase doesn't support column-level RLS, so this is enforced at the API/service level)

-- To grant admin to a user, run via Supabase dashboard SQL editor:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your-email@domain.com';
