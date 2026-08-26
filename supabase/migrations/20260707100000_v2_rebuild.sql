-- ============================================================================
-- TaxiTeilen v2 Rebuild
-- Fresh booking/payment schema. v1 tables are archived (renamed *_v1), not
-- dropped, so existing data stays recoverable. All money mutations happen
-- exclusively through edge functions (service role); RLS gives clients
-- read-only access to what they may see.
--
-- Policy source of truth: docs/policies.md (P1–P8). Fee semantics:
-- supabase/functions/_shared/pricing.ts (platform fee, see PLATFORM_FEE_PERCENT).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Archive v1 tables
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.ride_requests;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE IF EXISTS public.payments      RENAME TO payments_v1;
ALTER TABLE IF EXISTS public.chat_messages RENAME TO chat_messages_v1;
ALTER TABLE IF EXISTS public.ride_requests RENAME TO ride_requests_v1;
ALTER TABLE IF EXISTS public.ride_groups   RENAME TO ride_groups_v1;

-- ---------------------------------------------------------------------------
-- 2. Profiles additions
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. Operational settings (service-role only; edge_base_url must be updated
--    once when the project is remixed to a new Supabase project)
-- ---------------------------------------------------------------------------
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages settings" ON public.app_settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.app_settings (key, value) VALUES
  ('edge_base_url', to_jsonb('https://gabdgtrutcbozhpltxxn.supabase.co/functions/v1'::text)),
  ('cron_secret', to_jsonb(gen_random_uuid()::text))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Master data: hubs, cities, routes, taxi companies
-- ---------------------------------------------------------------------------
CREATE TABLE public.hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,          -- IATA, e.g. 'HAM'
  name text NOT NULL,                 -- 'Hamburg Airport'
  city_name text NOT NULL,            -- 'Hamburg'
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,          -- 'kiel'
  name text NOT NULL,                 -- 'Kiel'
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES public.hubs(id),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  fixed_price_cents integer NOT NULL CHECK (fixed_price_cents > 0),
  duration_min integer NOT NULL,
  distance_km integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hub_id, city_id)
);

CREATE TABLE public.taxi_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  phone text NOT NULL,                -- international format +49...
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.route_taxi_companies (
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  taxi_company_id uuid NOT NULL REFERENCES public.taxi_companies(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 1,
  PRIMARY KEY (route_id, taxi_company_id)
);

ALTER TABLE public.hubs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxi_companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_taxi_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hubs"      ON public.hubs      FOR SELECT USING (true);
CREATE POLICY "Public read cities"    ON public.cities    FOR SELECT USING (true);
CREATE POLICY "Public read routes"    ON public.routes    FOR SELECT USING (true);
CREATE POLICY "Public read taxi companies" ON public.taxi_companies FOR SELECT USING (true);
CREATE POLICY "Public read route companies" ON public.route_taxi_companies FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 5. Rides: ride_groups, memberships
-- ---------------------------------------------------------------------------
CREATE TABLE public.ride_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id),
  direction text NOT NULL CHECK (direction IN ('to_hub', 'from_hub')),
  departure_at timestamptz NOT NULL,
  meeting_point text,
  seats_total integer NOT NULL DEFAULT 4 CHECK (seats_total BETWEEN 2 AND 8),
  seat_price_cents integer NOT NULL CHECK (seat_price_cents > 0), -- frozen at creation
  initiator_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'initiator_needed', 'locked', 'completed', 'cancelled')),
  cancel_reason text,
  takeover_deadline timestamptz,
  locked_at timestamptz,
  payout_due_at timestamptz NOT NULL,   -- departure_at + 48h dispute window
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_groups_route_departure ON public.ride_groups (route_id, departure_at);
CREATE INDEX idx_ride_groups_status ON public.ride_groups (status, departure_at);

CREATE TRIGGER update_ride_groups_updated_at
  BEFORE UPDATE ON public.ride_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('initiator', 'rider')),
  num_persons integer NOT NULL DEFAULT 1 CHECK (num_persons BETWEEN 1 AND 7),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'cancelled_free', 'cancelled_late', 'no_show', 'expired')),
  pending_expires_at timestamptz,     -- set while status = pending_payment
  joined_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);

-- A user can hold at most one live membership per group (rejoin after cancel is fine)
CREATE UNIQUE INDEX idx_memberships_one_live_per_user
  ON public.memberships (ride_group_id, user_id)
  WHERE status IN ('pending_payment', 'active');
CREATE INDEX idx_memberships_group ON public.memberships (ride_group_id);
CREATE INDEX idx_memberships_user ON public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- 6. Money: payments, transfers
-- ---------------------------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL UNIQUE REFERENCES public.memberships(id) ON DELETE CASCADE,
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  share_cents integer NOT NULL,       -- goes to initiator on payout
  fee_cents integer NOT NULL,         -- platform keeps this
  amount_cents integer NOT NULL,      -- share + fee = what the rider paid
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'requires_payment'
    CHECK (status IN ('requires_payment', 'paid', 'failed', 'refunded', 'retained', 'transferred', 'transfer_failed')),
  stripe_refund_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_group ON public.payments (ride_group_id);
CREATE INDEX idx_payments_user ON public.payments (user_id);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id),
  stripe_transfer_id text,
  destination_account text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. Strikes & disputes
-- ---------------------------------------------------------------------------
CREATE TABLE public.strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ride_group_id uuid REFERENCES public.ride_groups(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('late_cancel_initiator', 'no_show_initiator')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strikes_user ON public.strikes (user_id);

CREATE OR REPLACE FUNCTION public.block_after_three_strikes()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.strikes WHERE user_id = NEW.user_id) >= 3 THEN
    UPDATE public.profiles SET blocked_at = now()
    WHERE user_id = NEW.user_id AND blocked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_strike_added
  AFTER INSERT ON public.strikes
  FOR EACH ROW EXECUTE FUNCTION public.block_after_three_strikes();

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved_refund', 'resolved_payout', 'resolved_dissolve')),
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_disputes_group ON public.disputes (ride_group_id, status);

-- ---------------------------------------------------------------------------
-- 8. Chat (fresh, references new ride_groups)
-- ---------------------------------------------------------------------------
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_group ON public.chat_messages (ride_group_id, created_at);

-- Marker table so cron notifications are sent exactly once per group+event
CREATE TABLE public.ride_group_events (
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ride_group_id, event)
);

-- ---------------------------------------------------------------------------
-- 9. RLS for ride data
-- ---------------------------------------------------------------------------
ALTER TABLE public.ride_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strikes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_group_events ENABLE ROW LEVEL SECURITY;

-- Membership helper (SECURITY DEFINER avoids recursive RLS between
-- ride_groups and memberships policies)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.ride_group_id = p_group
      AND m.user_id = p_user
      AND m.status IN ('pending_payment', 'active')
  );
$$;

-- Anyone (incl. anonymous browsing) may see joinable rides; members and the
-- initiator can always see their own groups. No client INSERT/UPDATE — all
-- writes go through edge functions with the service role.
CREATE POLICY "Browse joinable ride groups" ON public.ride_groups
  FOR SELECT USING (
    status IN ('open', 'locked')
    OR initiator_id = auth.uid()
    OR public.is_group_member(id, auth.uid())
  );

-- Memberships of visible groups are visible (needed for seat counts and the
-- participant list). Money data lives in payments, which stays private.
CREATE POLICY "View memberships of visible groups" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ride_groups g
      WHERE g.id = memberships.ride_group_id
        AND (g.status IN ('open', 'locked') OR g.initiator_id = auth.uid()
             OR public.is_group_member(g.id, auth.uid()))
    )
  );

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Initiators view group payment status" ON public.payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ride_groups g
            WHERE g.id = payments.ride_group_id AND g.initiator_id = auth.uid())
  );

CREATE POLICY "Initiators view own transfers" ON public.transfers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ride_groups g
            WHERE g.id = transfers.ride_group_id AND g.initiator_id = auth.uid())
  );

CREATE POLICY "Users view own strikes" ON public.strikes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members view group disputes" ON public.disputes
  FOR SELECT TO authenticated USING (
    raised_by = auth.uid() OR public.is_group_member(ride_group_id, auth.uid())
  );

CREATE POLICY "Members view chat" ON public.chat_messages
  FOR SELECT TO authenticated USING (public.is_group_member(ride_group_id, auth.uid()));
CREATE POLICY "Members send chat" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.is_group_member(ride_group_id, auth.uid())
  );

-- Replace v1 cross-profile visibility policy with a memberships-based one
DROP POLICY IF EXISTS "Users can view profiles of ride group members" ON public.profiles;
CREATE POLICY "Users can view profiles of ride group members" ON public.profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.memberships mine
      JOIN public.memberships theirs ON mine.ride_group_id = theirs.ride_group_id
      WHERE mine.user_id = auth.uid()
        AND theirs.user_id = profiles.user_id
        AND mine.status IN ('pending_payment', 'active')
        AND theirs.status IN ('pending_payment', 'active')
    )
  );

-- Realtime for live seat counts and chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_groups;

-- ---------------------------------------------------------------------------
-- 10. Atomic seat reservation (called by join-ride with service role;
--     row lock prevents overbooking races)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_membership(
  p_group uuid, p_user uuid, p_persons integer, p_ttl_minutes integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  g record;
  taken integer;
  new_id uuid;
BEGIN
  SELECT * INTO g FROM public.ride_groups WHERE id = p_group FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'group_not_found'; END IF;
  IF g.status NOT IN ('open', 'locked') THEN RAISE EXCEPTION 'group_not_joinable'; END IF;
  IF g.departure_at <= now() + interval '60 minutes' THEN RAISE EXCEPTION 'too_close_to_departure'; END IF;

  -- Free up expired pending reservations first
  UPDATE public.memberships
    SET status = 'expired'
    WHERE ride_group_id = p_group AND status = 'pending_payment'
      AND pending_expires_at IS NOT NULL AND pending_expires_at < now();

  IF EXISTS (SELECT 1 FROM public.memberships
             WHERE ride_group_id = p_group AND user_id = p_user
               AND status IN ('pending_payment', 'active')) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  SELECT COALESCE(sum(num_persons), 0) INTO taken
    FROM public.memberships
    WHERE ride_group_id = p_group AND status IN ('pending_payment', 'active');

  IF taken + p_persons > g.seats_total THEN RAISE EXCEPTION 'not_enough_seats'; END IF;

  INSERT INTO public.memberships (ride_group_id, user_id, role, num_persons, status, pending_expires_at)
  VALUES (p_group, p_user, 'rider', p_persons, 'pending_payment', now() + make_interval(mins => p_ttl_minutes))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_membership(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_membership(uuid, uuid, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 11. Seeds: hubs, cities, routes (fixed prices researched 2026-07,
--     see docs/routes.md), taxi companies
-- ---------------------------------------------------------------------------
INSERT INTO public.hubs (code, name, city_name) VALUES
  ('HAM', 'Hamburg Airport', 'Hamburg'),
  ('MUC', 'Flughafen München', 'München'),
  ('FRA', 'Flughafen Frankfurt', 'Frankfurt am Main'),
  ('DUS', 'Flughafen Düsseldorf', 'Düsseldorf');

INSERT INTO public.cities (slug, name) VALUES
  ('kiel', 'Kiel'),
  ('hamburg', 'Hamburg'),
  ('muenchen', 'München'),
  ('frankfurt', 'Frankfurt am Main'),
  ('duesseldorf', 'Düsseldorf');

INSERT INTO public.routes (hub_id, city_id, fixed_price_cents, duration_min, distance_km)
SELECT h.id, c.id, r.price, r.duration, r.distance
FROM (VALUES
  ('HAM', 'kiel',        15000, 70, 90),
  ('MUC', 'muenchen',    11000, 40, 38),
  ('FRA', 'frankfurt',    5000, 22, 13),
  ('DUS', 'duesseldorf',  3500, 20, 9)
) AS r(hub_code, city_slug, price, duration, distance)
JOIN public.hubs h ON h.code = r.hub_code
JOIN public.cities c ON c.slug = r.city_slug;

INSERT INTO public.taxi_companies (city_id, name, phone, description)
SELECT c.id, t.name, t.phone, t.description
FROM (VALUES
  ('kiel',        'Mare Taxi Kiel (Vineta)',        '+49431 77070',  'Etabliertes Kieler Taxiunternehmen mit Flughafentransfer-Erfahrung, 24/7.'),
  ('kiel',        'Taxi Kiel eG',                   '+49431 680101', 'Genossenschaftliche Taxizentrale für Kiel und Umgebung, 24/7.'),
  ('hamburg',     'Hansa-Taxi',                     '+4940 211211',  'Hamburgs führende Taxizentrale mit eigenem Flughafen-Abholservice, 24/7.'),
  ('hamburg',     'Taxi Hamburg 6x6',               '+4940 666666',  'Große Hamburger Taxizentrale, Bestellung rund um die Uhr per Telefon und App.'),
  ('muenchen',    'Taxi-München eG',                '+4989 21610',   'Größte Taxizentrale Deutschlands, über 3.000 Fahrzeuge, 24/7.'),
  ('muenchen',    'IsarFunk Taxizentrale',          '+4989 450540',  'Münchner Taxizentrale mit Flughafentransfer und Festpreisen, 24/7.'),
  ('frankfurt',   'Taxi Frankfurt eG',              '+4969 230001',  'Älteste und größte Taxizentrale Hessens, über 1.400 Fahrzeuge, 24/7.'),
  ('frankfurt',   'Taxi-Vereinigung Frankfurt',     '+4969 250001',  'Zweite große Frankfurter Taxizentrale, 24/7 erreichbar.'),
  ('duesseldorf', 'Taxi Düsseldorf eG',             '+49211 33333',  'Größte Düsseldorfer Taxizentrale mit Flughafen-Vorbestellung, 24/7.'),
  ('duesseldorf', 'Rhein-Taxi Düsseldorf',          '+49211 212121', 'Große Düsseldorfer Taxizentrale, Bestellung per Telefon und App, 24/7.')
) AS t(city_slug, name, phone, description)
JOIN public.cities c ON c.slug = t.city_slug;

-- Recommend each city's companies on its route (city-side pickup is usually
-- cheaper — the Kiel insight generalized), plus the hub city's companies as
-- secondary option.
INSERT INTO public.route_taxi_companies (route_id, taxi_company_id, priority)
SELECT r.id, t.id, 1
FROM public.routes r
JOIN public.taxi_companies t ON t.city_id = r.city_id;

INSERT INTO public.route_taxi_companies (route_id, taxi_company_id, priority)
SELECT r.id, t.id, 2
FROM public.routes r
JOIN public.hubs h ON h.id = r.hub_id AND h.code = 'HAM'
JOIN public.cities hc ON hc.slug = 'hamburg'
JOIN public.taxi_companies t ON t.city_id = hc.id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. Cron: invoke edge functions via pg_net. Base URL + shared secret come
--     from app_settings so a remix only needs one UPDATE statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  base text;
  secret text;
BEGIN
  SELECT value #>> '{}' INTO base FROM public.app_settings WHERE key = 'edge_base_url';
  SELECT value #>> '{}' INTO secret FROM public.app_settings WHERE key = 'cron_secret';
  IF base IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := base || '/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', coalesce(secret, '')),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_edge_function(text) FROM PUBLIC;

DO $$ BEGIN
  PERFORM cron.schedule('taxiteilen-lock-rides', '*/10 * * * *',
    $cmd$SELECT public.invoke_edge_function('cron-lock-rides')$cmd$);
  PERFORM cron.schedule('taxiteilen-payout', '*/15 * * * *',
    $cmd$SELECT public.invoke_edge_function('cron-payout')$cmd$);
  PERFORM cron.schedule('taxiteilen-reminders', '7 * * * *',
    $cmd$SELECT public.invoke_edge_function('cron-reminders')$cmd$);
  -- Drive the email queue unless something already does
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE command ILIKE '%process-email-queue%') THEN
    PERFORM cron.schedule('taxiteilen-email-queue', '* * * * *',
      $cmd$SELECT public.invoke_edge_function('process-email-queue')$cmd$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'cron scheduling skipped: %', SQLERRM;
END $$;
