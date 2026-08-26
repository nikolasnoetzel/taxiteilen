-- Mitfahrer behalten Sicht auf ihre abgesagten/vergangenen Fahrten.
--
-- is_group_member() zählt bewusst nur lebende Mitgliedschaften
-- (pending_payment/active) — richtig für Chat-Schreibrechte, aber als
-- einziges Sichtbarkeitskriterium falsch: Nach einer Auflösung (P4/P5/P6/P7)
-- wird die Mitgliedschaft cancelled_free und der Mitfahrer verlor jede Sicht
-- auf die Gruppe. Folgen: Die stornierte Fahrt verschwand kommentarlos aus
-- der Dashboard-Historie (Join liefert null) und die Detail-Seite zeigte
-- "existiert nicht mehr" — ausgerechnet dann, wenn jemand seinen
-- Refund-Status sehen will.
--
-- Fix: eigene History-Funktion (JEDE frühere Mitgliedschaft) nur für die
-- SELECT-Sichtbarkeit; Chat-Policies bleiben auf is_group_member (lebende
-- Mitglieder) und ändern sich nicht.

CREATE OR REPLACE FUNCTION public.has_group_history(p_group uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.ride_group_id = p_group
      AND m.user_id = p_user
  );
$$;
REVOKE ALL ON FUNCTION public.has_group_history(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_group_history(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Browse joinable ride groups" ON public.ride_groups;
CREATE POLICY "Browse joinable ride groups" ON public.ride_groups
  FOR SELECT USING (
    status IN ('open', 'locked')
    OR initiator_id = auth.uid()
    OR public.has_group_history(id, auth.uid())
  );

DROP POLICY IF EXISTS "View memberships of visible groups" ON public.memberships;
CREATE POLICY "View memberships of visible groups" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ride_groups g
      WHERE g.id = memberships.ride_group_id
        AND (g.status IN ('open', 'locked') OR g.initiator_id = auth.uid()
             OR public.has_group_history(g.id, auth.uid()))
    )
  );
