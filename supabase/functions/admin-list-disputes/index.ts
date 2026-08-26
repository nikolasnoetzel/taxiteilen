// Admin-only (profiles.is_admin): lists open disputes with enough context to
// decide them — route, departure, reporter, and the group's payment summary.
// Reads run with the service role because dispute triage needs data (cancelled
// groups, foreign payments) that member-scoped RLS intentionally hides.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { loadGroup, loadProfile, loadProfiles } from "../_shared/rides.ts";

interface DisputeRow {
  id: string;
  ride_group_id: string;
  raised_by: string;
  reason: string;
  status: string;
  created_at: string;
}

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const caller = await loadProfile(admin, user.id);
  if (!caller.is_admin) throw new ApiError("forbidden", 403);

  const { data } = await admin
    .from("disputes")
    .select("id, ride_group_id, raised_by, reason, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const disputes = (data ?? []) as DisputeRow[];

  const reporterIds = [...new Set(disputes.map((d) => d.raised_by))];
  const reporters = await loadProfiles(admin, reporterIds);

  const result = [];
  for (const dispute of disputes) {
    let routeName = "Unbekannte Strecke";
    let group: Record<string, unknown> | null = null;
    try {
      const ctx = await loadGroup(admin, dispute.ride_group_id);
      routeName = ctx.routeName;
      group = {
        id: ctx.group.id,
        departure_at: ctx.group.departure_at,
        status: ctx.group.status,
        payout_due_at: ctx.group.payout_due_at,
        initiator_id: ctx.group.initiator_id,
      };
    } catch (_err) {
      // Gruppe gelöscht — Dispute trotzdem anzeigen
    }
    const { data: payments } = await admin
      .from("payments")
      .select("user_id, amount_cents, share_cents, status")
      .eq("ride_group_id", dispute.ride_group_id);
    const reporter = reporters.get(dispute.raised_by);
    result.push({
      dispute,
      group,
      routeName,
      reporter: reporter
        ? { name: reporter.full_name, email: reporter.email, is_initiator: group?.initiator_id === dispute.raised_by }
        : null,
      payments: payments ?? [],
    });
  }

  return json({ disputes: result });
}));
