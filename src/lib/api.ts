// Typed wrappers around the edge functions, with German error translation.
import { supabase } from "@/integrations/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Bitte melde dich zuerst an.",
  account_blocked: "Dein Konto ist gesperrt. Bitte kontaktiere den Support.",
  connect_onboarding_required: "Richte zuerst den Zahlungsempfang ein, um Fahrten anzubieten.",
  group_not_found: "Diese Fahrt existiert nicht mehr.",
  group_not_joinable: "Dieser Fahrt kann nicht mehr beigetreten werden.",
  too_close_to_departure: "Die Abfahrt ist zu knapp — Beitritt ist bis 1 Stunde vorher möglich.",
  already_member: "Du bist bei dieser Fahrt bereits dabei.",
  not_enough_seats: "Nicht genügend freie Plätze.",
  departure_too_soon: "Die Abfahrt muss mindestens 1 Stunde in der Zukunft liegen.",
  departure_too_far: "Fahrten können maximal 90 Tage im Voraus angelegt werden.",
  route_not_found: "Diese Strecke ist nicht verfügbar.",
  not_a_member: "Du bist bei dieser Fahrt nicht dabei.",
  not_initiator: "Nur der Initiator kann das tun.",
  use_cancel_ride: "Als Initiator sagst du die ganze Fahrt ab.",
  group_not_cancellable: "Diese Fahrt kann nicht mehr storniert werden.",
  no_takeover_open: "Für diese Fahrt wird gerade kein Initiator gesucht.",
  takeover_expired: "Das Übernahme-Fenster ist abgelaufen.",
  ride_not_departed: "Das geht erst nach der Abfahrt.",
  window_closed: "Das Zeitfenster dafür ist abgelaufen.",
  dispute_already_open: "Du hast bereits ein Problem gemeldet.",
  payout_already_done: "Die Auszahlung ist bereits erfolgt.",
  dispute_not_found: "Dieser Fall ist bereits entschieden oder existiert nicht.",
  forbidden: "Dafür fehlt dir die Berechtigung.",
};

export interface AdminDispute {
  dispute: {
    id: string;
    ride_group_id: string;
    raised_by: string;
    reason: string;
    status: string;
    created_at: string;
  };
  group: {
    id: string;
    departure_at: string;
    status: string;
    payout_due_at: string;
    initiator_id: string;
  } | null;
  routeName: string;
  reporter: { name: string | null; email: string | null; is_initiator: boolean } | null;
  payments: { user_id: string; amount_cents: number; share_cents: number; status: string }[];
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // supabase-js wraps non-2xx responses; try to extract our error code
    let code = "internal";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const parsed = await ctx.json();
        code = parsed.error ?? code;
        if (!ERROR_MESSAGES[code] && parsed.message) {
          throw new Error(parsed.message);
        }
      }
    } catch (inner) {
      if (inner instanceof Error && inner.message && !("context" in (inner as object))) throw inner;
    }
    throw new Error(ERROR_MESSAGES[code] ?? "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
  }
  if (data?.error) {
    throw new Error(ERROR_MESSAGES[data.error] ?? data.message ?? "Etwas ist schiefgelaufen.");
  }
  return data as T;
}

export const api = {
  createRide: (input: {
    route_id: string;
    direction: "to_hub" | "from_hub";
    departure_at: string;
    meeting_point?: string;
    seats_total: number;
    num_persons: number;
  }) => invoke<{ ride_group_id: string }>("create-ride", input),

  joinRide: (ride_group_id: string, num_persons: number) =>
    invoke<{ url: string }>("join-ride", { ride_group_id, num_persons }),

  cancelMembership: (ride_group_id: string) =>
    invoke<{ status: string; refunded: boolean }>("cancel-membership", { ride_group_id }),

  cancelRide: (ride_group_id: string) =>
    invoke<{ status: string; refunds: number; strike: boolean }>("cancel-ride", { ride_group_id }),

  takeoverInitiator: (ride_group_id: string) =>
    invoke<{ status: string }>("takeover-initiator", { ride_group_id }),

  markNoShow: (ride_group_id: string, rider_user_id: string) =>
    invoke<{ status: string }>("mark-no-show", { ride_group_id, rider_user_id }),

  openDispute: (ride_group_id: string, reason: string) =>
    invoke<{ dispute_id: string }>("open-dispute", { ride_group_id, reason }),

  adminListDisputes: () =>
    invoke<{ disputes: AdminDispute[] }>("admin-list-disputes", {}),

  resolveDispute: (input: {
    dispute_id: string;
    resolution: "resolved_refund" | "resolved_payout" | "resolved_dissolve";
    note?: string;
    strike_initiator?: boolean;
  }) => invoke<{ status: string }>("resolve-dispute", input),

  connectStatus: () =>
    invoke<{ onboarded: boolean; has_account: boolean }>("stripe-connect-status", {}),

  connectOnboarding: () =>
    invoke<{ url?: string; already_complete?: boolean }>("stripe-connect-onboarding", {}),
};
