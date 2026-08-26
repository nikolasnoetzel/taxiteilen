// In-Memory-Fakes für die Lebenszyklus-Simulation (src/test/lifecycle.sim.test.ts).
//
// FakeDb bildet genau die Query-Builder-Teilmenge nach, die die Module unter
// supabase/functions/_shared/ benutzen (select/eq/in/single, update, upsert,
// rpc). FakeStripe führt ein Geld-Ledger, damit Tests Erhaltungssätze prüfen
// können ("kein Cent entsteht oder verschwindet").

type Row = Record<string, unknown>;

class FakeQuery {
  private filters: Array<(r: Row) => boolean> = [];
  private mode: "select" | "update" | "upsert" = "select";
  private patch: Row = {};
  private upsertRow: Row = {};
  private conflictKey = "id";
  private wantSingle = false;
  private selectCols = "*";

  constructor(private db: FakeDb, private table: string) {}

  select(cols = "*") {
    this.selectCols = cols;
    return this;
  }
  update(patch: Row) {
    this.mode = "update";
    this.patch = patch;
    return this;
  }
  upsert(row: Row, opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.upsertRow = row;
    this.conflictKey = opts?.onConflict ?? "id";
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((r) => r[key] === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[key]));
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }

  private matches(): Row[] {
    const rows = this.db.tables[this.table] ?? [];
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private execute(): { data: unknown; error: null | { message: string } } {
    if (this.mode === "update") {
      const rows = this.matches();
      for (const r of rows) Object.assign(r, this.patch);
      return { data: null, error: null };
    }
    if (this.mode === "upsert") {
      const rows = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);
      const existing = rows.find((r) => r[this.conflictKey] === this.upsertRow[this.conflictKey]);
      if (existing) Object.assign(existing, this.upsertRow);
      else rows.push({ ...this.upsertRow });
      return { data: null, error: null };
    }
    let rows = this.matches().map((r) => ({ ...r }));
    // Join-Emulation für loadGroup: ride_groups.select("*, routes(...)")
    if (this.table === "ride_groups" && this.selectCols.includes("routes(")) {
      rows = rows.map((r) => ({
        ...r,
        routes: (this.db.tables["routes"] ?? []).find((rt) => rt.id === r.route_id) ?? null,
      }));
    }
    if (this.wantSingle) {
      if (rows.length !== 1) return { data: null, error: { message: `expected 1 row, got ${rows.length}` } };
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  // thenable → `await query` funktioniert wie beim echten Client
  then<T>(resolve: (v: { data: unknown; error: null | { message: string } }) => T) {
    return Promise.resolve(this.execute()).then(resolve);
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};
  rpcCalls: Array<{ fn: string; args: Row }> = [];

  from(table: string) {
    return new FakeQuery(this, table);
  }
  rpc(fn: string, args: Row) {
    this.rpcCalls.push({ fn, args });
    return Promise.resolve({ data: null, error: null });
  }
  /** Alle über enqueue_email eingereihten Mails (Empfänger + Betreff + Label). */
  get emails(): Array<{ to: string; subject: string; label: string }> {
    return this.rpcCalls
      .filter((c) => c.fn === "enqueue_email")
      .map((c) => {
        const payload = (c.args.payload ?? {}) as Record<string, unknown>;
        return { to: String(payload.to ?? ""), subject: String(payload.subject ?? ""), label: String(payload.label ?? "") };
      });
  }
}

export interface StripeCall {
  api: string;
  params: Record<string, unknown>;
  idempotencyKey?: string;
}

export class FakeStripe {
  calls: StripeCall[] = [];
  /** Ledger in Cents: was die Plattform je payment_intent eingenommen hat. */
  charged = new Map<string, number>();
  refundedCents = 0;
  transferredCents = 0;
  failNextTransfer = false;

  refunds = {
    create: (params: { payment_intent: string }, opts?: { idempotencyKey?: string }) => {
      this.calls.push({ api: "refunds.create", params, idempotencyKey: opts?.idempotencyKey });
      const amount = this.charged.get(params.payment_intent) ?? 0;
      this.refundedCents += amount;
      this.charged.set(params.payment_intent, 0);
      return Promise.resolve({ id: `re_${this.calls.length}` });
    },
  };

  transfers = {
    create: (params: { amount: number }, opts?: { idempotencyKey?: string }) => {
      this.calls.push({ api: "transfers.create", params: params as Record<string, unknown>, idempotencyKey: opts?.idempotencyKey });
      if (this.failNextTransfer) {
        this.failNextTransfer = false;
        return Promise.reject(new Error("balance_insufficient"));
      }
      this.transferredCents += params.amount;
      return Promise.resolve({ id: `tr_${this.calls.length}` });
    },
  };

  checkout = {
    sessions: {
      expire: (id: string) => {
        this.calls.push({ api: "checkout.sessions.expire", params: { id } });
        return Promise.resolve({ id });
      },
    },
  };

  of(api: string): StripeCall[] {
    return this.calls.filter((c) => c.api === api);
  }
}

let seq = 0;
const id = (prefix: string) => `${prefix}_${++seq}`;

/** Baut eine Gruppe mit Route/Hub/City-Seed und liefert bequeme Helfer. */
export function seedGroup(
  db: FakeDb,
  opts: { seatPriceCents: number; initiatorId?: string } = { seatPriceCents: 3750 }
) {
  const routeId = id("route");
  const groupId = id("grp");
  const initiatorId = opts.initiatorId ?? id("user");
  db.tables["routes"] = [
    {
      id: routeId,
      fixed_price_cents: opts.seatPriceCents * 4,
      duration_min: 70,
      hubs: { code: "HAM", name: "Hamburg Airport", city_name: "Hamburg" },
      cities: { name: "Kiel", slug: "kiel" },
    },
  ];
  db.tables["ride_groups"] = [
    {
      id: groupId,
      route_id: routeId,
      direction: "to_hub",
      departure_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
      meeting_point: "Hbf Kiel",
      seats_total: 4,
      seat_price_cents: opts.seatPriceCents,
      initiator_id: initiatorId,
      status: "open",
      takeover_deadline: null,
      payout_due_at: new Date(Date.now() + 120 * 3600_000).toISOString(),
    },
  ];
  db.tables["memberships"] = [
    { id: id("mem"), ride_group_id: groupId, user_id: initiatorId, role: "initiator", status: "active", num_persons: 1 },
  ];
  db.tables["payments"] = [];
  db.tables["transfers"] = [];
  db.tables["profiles"] = [
    { user_id: initiatorId, full_name: "Ina Initiator", email: "ina@example.com", stripe_customer_id: null, stripe_connect_account_id: "acct_ina", stripe_connect_onboarding_complete: true, blocked_at: null, is_admin: false },
  ];
  return { groupId, initiatorId, routeId };
}

/** Fügt einen zahlenden Mitfahrer hinzu (Status frei wählbar). */
export function seedRider(
  db: FakeDb,
  stripe: FakeStripe,
  groupId: string,
  o: { status: "paid" | "retained" | "requires_payment" | "transferred"; shareCents: number; feeCents: number; name?: string }
) {
  const userId = id("user");
  const memId = id("mem");
  const payId = id("pay");
  const pi = o.status === "requires_payment" ? null : id("pi");
  const membershipStatus =
    o.status === "requires_payment" ? "pending_payment" : o.status === "retained" ? "cancelled_late" : "active";
  db.tables["memberships"].push({ id: memId, ride_group_id: groupId, user_id: userId, role: "rider", status: membershipStatus, num_persons: 1 });
  db.tables["payments"].push({
    id: payId,
    membership_id: memId,
    ride_group_id: groupId,
    user_id: userId,
    stripe_checkout_session_id: id("cs"),
    stripe_payment_intent_id: pi,
    stripe_charge_id: pi ? id("ch") : null,
    share_cents: o.shareCents,
    fee_cents: o.feeCents,
    amount_cents: o.shareCents + o.feeCents,
    status: o.status,
  });
  db.tables["profiles"].push({ user_id: userId, full_name: o.name ?? "Rita Rider", email: `${userId}@example.com`, stripe_customer_id: null, stripe_connect_account_id: null, stripe_connect_onboarding_complete: false, blocked_at: null, is_admin: false });
  if (pi) stripe.charged.set(pi, o.shareCents + o.feeCents); // Geld ist eingegangen
  return { userId, memId, payId, pi };
}
