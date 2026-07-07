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
