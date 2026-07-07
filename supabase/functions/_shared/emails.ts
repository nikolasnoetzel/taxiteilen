// Transactional ride emails, delivered through the existing pgmq queue
// (process-email-queue drains 'transactional_emails' via Lovable email).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { formatEuro } from "./pricing.ts";

const SITE_NAME = "TaxiTeilen";
const FROM_DOMAIN = "taxi-teilen.de";
const SENDER_DOMAIN = "notify.taxi-teilen.de";
const SITE_URL = "https://taxiteilen.lovable.app";

const BRAND_INK = "#141414";
const BRAND_PAPER = "#FAF9F6";
const BRAND_YELLOW = "#F5C518";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="de"><body style="margin:0;padding:0;background:${BRAND_PAPER};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND_INK};">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;margin-bottom:24px;">
      <span style="display:inline-block;width:12px;height:12px;background:${BRAND_YELLOW};border-radius:3px;margin-right:8px;"></span>TaxiTeilen
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #ECEAE4;">
      <h1 style="font-size:20px;margin:0 0 16px;letter-spacing:-0.01em;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#8A877F;margin-top:20px;line-height:1.5;">
      TaxiTeilen · Taxi teilen, Kosten sparen ·
      <a href="${SITE_URL}" style="color:#8A877F;">${SITE_URL.replace("https://", "")}</a>
    </p>
  </div></body></html>`;
}

function p(text: string): string {
  return `<p style="font-size:15px;line-height:1.6;margin:0 0 14px;">${text}</p>`;
}

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_INK};color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px;margin-top:6px;">${label}</a>`;
}

export interface RideEmailContext {
  routeName: string;      // "Kiel → Hamburg Airport"
  departureLabel: string; // "Mo., 14. Juli, 06:30 Uhr"
  rideUrl: string;
}

export function rideUrl(groupId: string): string {
  return `${SITE_URL}/fahrt/${groupId}`;
}

type Rendered = { subject: string; html: string; text: string };

export const templates = {
  join_confirmed(ctx: RideEmailContext, amountCents: number): Rendered {
    const subject = `Du bist dabei: ${ctx.routeName}`;
    const body =
      p(`Deine Zahlung über <strong>${formatEuro(amountCents)}</strong> ist eingegangen — dein Platz für die Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> ist reserviert.`) +
      p(`Kostenlos stornieren kannst du bis 24 Stunden vor Abfahrt. Danach wird der Betrag einbehalten.`) +
      cta("Zur Fahrt", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Deine Zahlung über ${formatEuro(amountCents)} ist eingegangen. Fahrt: ${ctx.routeName}, ${ctx.departureLabel}. Details: ${ctx.rideUrl}` };
  },

  new_rider(ctx: RideEmailContext, riderName: string, seatsLeft: number): Rendered {
    const subject = `${riderName} fährt mit (${ctx.routeName})`;
    const body =
      p(`<strong>${riderName}</strong> hat sich deiner Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> angeschlossen.`) +
      p(seatsLeft > 0 ? `Es ${seatsLeft === 1 ? "ist noch 1 Platz" : `sind noch ${seatsLeft} Plätze`} frei.` : `Die Fahrt ist damit voll besetzt.`) +
      cta("Zur Fahrt", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `${riderName} ist deiner Fahrt ${ctx.routeName} am ${ctx.departureLabel} beigetreten. ${ctx.rideUrl}` };
  },

  ride_locked_rider(ctx: RideEmailContext, meetingPoint: string | null): Rendered {
    const subject = `Fahrt ist fix: ${ctx.routeName}`;
    const body =
      p(`Deine Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> ist jetzt verbindlich.`) +
      (meetingPoint ? p(`Treffpunkt: <strong>${meetingPoint}</strong>`) : "") +
      p(`Bitte sei pünktlich — bei Nichterscheinen wird dein Beitrag einbehalten.`) +
      cta("Details & Gruppenchat", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Deine Fahrt ${ctx.routeName} am ${ctx.departureLabel} ist fix. ${meetingPoint ? `Treffpunkt: ${meetingPoint}. ` : ""}${ctx.rideUrl}` };
  },

  ride_locked_initiator(ctx: RideEmailContext, riders: number, expectedPayoutCents: number): Rendered {
    const subject = `Fahrt ist fix: ${ctx.routeName} — ${riders} Mitfahrer`;
    const body =
      p(`Deine Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> ist fix: <strong>${riders} Mitfahrer</strong> sind verbindlich dabei.`) +
      p(`Nach der Fahrt erhältst du voraussichtlich <strong>${formatEuro(expectedPayoutCents)}</strong> (Auszahlung ca. 48 Stunden nach Abfahrt).`) +
      p(`Denk daran, das Taxi telefonisch vorzubestellen — Empfehlungen findest du auf der Fahrtseite.`) +
      cta("Zur Fahrt", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Fahrt fix: ${ctx.routeName} am ${ctx.departureLabel}, ${riders} Mitfahrer. Erwartete Auszahlung ${formatEuro(expectedPayoutCents)}. ${ctx.rideUrl}` };
  },

  reminder(ctx: RideEmailContext): Rendered {
    const subject = `Bald geht's los: ${ctx.routeName}`;
    const body =
      p(`Erinnerung: Deine Fahrt <strong>${ctx.routeName}</strong> startet am <strong>${ctx.departureLabel}</strong>.`) +
      p(`Kostenlos stornieren kannst du nur noch bis 24 Stunden vor Abfahrt.`) +
      cta("Zur Fahrt", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Erinnerung: ${ctx.routeName} am ${ctx.departureLabel}. ${ctx.rideUrl}` };
  },

  cancelled_free(ctx: RideEmailContext, amountCents: number): Rendered {
    const subject = `Storno bestätigt: ${ctx.routeName}`;
    const body =
      p(`Deine Teilnahme an der Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> wurde storniert.`) +
      p(`Die Rückerstattung über <strong>${formatEuro(amountCents)}</strong> ist unterwegs und erscheint je nach Bank innerhalb von 5–10 Werktagen.`);
    return { subject, html: layout(subject, body), text: `Storno bestätigt. Rückerstattung ${formatEuro(amountCents)} unterwegs.` };
  },

  cancelled_late(ctx: RideEmailContext, amountCents: number): Rendered {
    const subject = `Storno erhalten: ${ctx.routeName}`;
    const body =
      p(`Deine Teilnahme an der Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> wurde storniert.`) +
      p(`Da die Stornierung weniger als 24 Stunden vor Abfahrt erfolgt ist, wird der Betrag von <strong>${formatEuro(amountCents)}</strong> gemäß unserer Stornoregeln einbehalten.`);
    return { subject, html: layout(subject, body), text: `Storno <24h: Betrag ${formatEuro(amountCents)} wird einbehalten.` };
  },

  seat_freed(ctx: RideEmailContext, riderName: string): Rendered {
    const subject = `Platz frei geworden: ${ctx.routeName}`;
    const body =
      p(`<strong>${riderName}</strong> hat die Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> verlassen. Der Platz ist wieder frei.`) +
      cta("Zur Fahrt", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `${riderName} hat die Fahrt verlassen. ${ctx.rideUrl}` };
  },

  ride_dissolved(ctx: RideEmailContext, amountCents: number | null): Rendered {
    const subject = `Fahrt abgesagt: ${ctx.routeName}`;
    const body =
      p(`Die Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> wurde leider abgesagt.`) +
      (amountCents ? p(`Dein Beitrag von <strong>${formatEuro(amountCents)}</strong> wird vollständig zurückerstattet (5–10 Werktage).`) : "") +
      p(`Schau gern nach einer anderen Fahrt auf derselben Strecke.`) +
      cta("Fahrten ansehen", SITE_URL);
    return { subject, html: layout(subject, body), text: `Fahrt abgesagt: ${ctx.routeName} am ${ctx.departureLabel}.${amountCents ? ` Rückerstattung ${formatEuro(amountCents)} unterwegs.` : ""}` };
  },

  takeover_offer(ctx: RideEmailContext, deadlineLabel: string): Rendered {
    const subject = `Initiator gesucht: ${ctx.routeName}`;
    const body =
      p(`Der Initiator deiner Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> hat abgesagt.`) +
      p(`Du kannst die Fahrt als neue:r Initiator:in übernehmen (du bestellst das Taxi, zahlst den Fahrer und erhältst die Anteile der Mitfahrer). Dein eigener Beitrag wird dir dafür zurückerstattet.`) +
      p(`Übernimmt bis <strong>${deadlineLabel}</strong> niemand, wird die Fahrt aufgelöst und alle Beiträge werden vollständig erstattet.`) +
      cta("Fahrt übernehmen", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Initiator hat abgesagt. Übernimm die Fahrt bis ${deadlineLabel}, sonst wird sie aufgelöst: ${ctx.rideUrl}` };
  },

  payout_sent(ctx: RideEmailContext, amountCents: number): Rendered {
    const subject = `Auszahlung unterwegs: ${formatEuro(amountCents)}`;
    const body =
      p(`Für deine Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> haben wir <strong>${formatEuro(amountCents)}</strong> an dein Konto überwiesen.`) +
      p(`Die Gutschrift erfolgt je nach Bank innerhalb weniger Werktage.`);
    return { subject, html: layout(subject, body), text: `Auszahlung ${formatEuro(amountCents)} für ${ctx.routeName} unterwegs.` };
  },

  no_show_marked(ctx: RideEmailContext, amountCents: number): Rendered {
    const subject = `Nichterscheinen vermerkt: ${ctx.routeName}`;
    const body =
      p(`Der Initiator hat vermerkt, dass du bei der Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> nicht erschienen bist. Dein Beitrag von <strong>${formatEuro(amountCents)}</strong> wird gemäß Stornoregeln einbehalten.`) +
      p(`Stimmt das nicht? Dann melde dich innerhalb von 48 Stunden nach Abfahrt über die Fahrtseite (Problem melden).`) +
      cta("Problem melden", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `No-Show vermerkt für ${ctx.routeName}. Widerspruch innerhalb 48h: ${ctx.rideUrl}` };
  },

  unfilled_choice(ctx: RideEmailContext): Rendered {
    const subject = `Noch keine Mitfahrer: ${ctx.routeName}`;
    const body =
      p(`Für deine Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> hat sich bislang niemand angemeldet.`) +
      p(`Du kannst die Fahrt kostenlos absagen oder sie offen lassen — vielleicht springt noch jemand kurzfristig auf. Ohne Mitfahrer entstehen dir keinerlei Kosten oder Pflichten.`) +
      cta("Fahrt verwalten", ctx.rideUrl);
    return { subject, html: layout(subject, body), text: `Noch keine Mitfahrer für ${ctx.routeName}. Verwalten: ${ctx.rideUrl}` };
  },

  dispute_opened(ctx: RideEmailContext): Rendered {
    const subject = `Problem gemeldet: ${ctx.routeName}`;
    const body =
      p(`Für die Fahrt <strong>${ctx.routeName}</strong> am <strong>${ctx.departureLabel}</strong> wurde ein Problem gemeldet. Die Auszahlung ist pausiert, bis wir den Fall geprüft haben.`) +
      p(`Wir melden uns, sobald es eine Entscheidung gibt.`);
    return { subject, html: layout(subject, body), text: `Problem gemeldet für ${ctx.routeName}. Auszahlung pausiert.` };
  },
};

export async function enqueueEmail(
  admin: SupabaseClient,
  to: string,
  rendered: Rendered,
  label: string
): Promise<void> {
  const messageId = crypto.randomUUID();
  const { error } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      run_id: crypto.randomUUID(),
      message_id: messageId,
      to,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      purpose: "transactional",
      label,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) console.error("Failed to enqueue email", { label, to, error });
}

export function departureLabel(departureAtIso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(departureAtIso)) + " Uhr";
}
