-- AGB-Zustimmung und Telefonnummer zuverlässig persistieren.
--
-- Bisher versuchte das Frontend nach signUp() ein profiles-Update; bei
-- aktivierter E-Mail-Bestätigung existiert zu dem Zeitpunkt aber noch keine
-- Session, das Update scheiterte still und terms_accepted_at blieb NULL
-- (rechtlich relevant). Jetzt reisen beide Werte als raw_user_meta_data mit
-- und der Signup-Trigger schreibt sie direkt ins Profil.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, terms_accepted_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL
        THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
