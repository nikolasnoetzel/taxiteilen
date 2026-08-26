-- KRITISCH: Selbst-Privilegien-Eskalation über profiles schließen.
--
-- Die RLS-Policy "Users can update their own profile" beschränkt nur die
-- ZEILE (auth.uid() = user_id), nicht die SPALTEN. Damit konnte sich jeder
-- eingeloggte Nutzer per PostgREST selbst is_admin = true setzen, eine
-- Sperre (blocked_at) aufheben oder das Connect-Onboarding-Flag fälschen —
-- und darüber resolve-dispute (Admin-Refunds!) und die Erstellen-Gates
-- aushebeln.
--
-- Fix: Spalten-Grants. Clients dürfen nur noch die harmlosen Profilfelder
-- ändern; alles andere schreiben ausschließlich Edge Functions über die
-- service_role (die von diesem REVOKE unberührt bleibt).

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, terms_accepted_at)
  ON public.profiles TO authenticated;

-- Gleiche Härtung für INSERT: Profile entstehen über den handle_new_user-
-- Trigger (SECURITY DEFINER); ein Client-INSERT könnte sonst dieselben
-- privilegierten Spalten setzen.
REVOKE INSERT ON public.profiles FROM anon, authenticated;
