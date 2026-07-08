export { formatEuro } from "./pricing";

export function formatDepartureLong(iso: string): string {
  return (
    new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(new Date(iso)) + " Uhr"
  );
}

export function formatDepartureShort(iso: string): string {
  return (
    new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(new Date(iso)) + " Uhr"
  );
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export function formatPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/** Hours until departure, for policy display only (server decides for real). */
export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/**
 * Interpret a wall-clock date+time as German time (Europe/Berlin), regardless
 * of the visitor's browser timezone. Rides happen in Germany — a user booking
 * from Lisbon still means 08:00 German time.
 */
export function berlinToIso(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess, "Europe/Berlin")).toISOString();
}

/** UTC range covering one German calendar day. */
export function berlinDayRange(date: string): { start: string; end: string } {
  const start = berlinToIso(date, "00:00");
  return { start, end: new Date(new Date(start).getTime() + 24 * 3_600_000).toISOString() };
}
