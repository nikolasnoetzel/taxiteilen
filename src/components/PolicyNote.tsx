import { ShieldCheck, Clock } from "lucide-react";
import { hoursUntil } from "@/lib/format";

/** Live cancellation-policy hint: green while free, amber once <24h. */
export function PolicyNote({ departureAt }: { departureAt: string }) {
  const free = hoursUntil(departureAt) >= 24;
  return free ? (
    <p className="flex items-start gap-2 text-sm text-success">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <strong>Kostenlos stornierbar</strong> bis 24 Stunden vor Abfahrt — volle Rückerstattung.
      </span>
    </p>
  ) : (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Weniger als 24 Stunden bis zur Abfahrt — bei Stornierung wird der Betrag einbehalten.
      </span>
    </p>
  );
}
