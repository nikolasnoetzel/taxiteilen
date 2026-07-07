import { cn } from "@/lib/utils";

/**
 * The A→B motif used across the site: filled origin dot, dashed line,
 * ringed destination dot.
 */
export function RoutePath({
  from,
  to,
  className,
  compact = false,
}: {
  from: string;
  to: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <span className={cn("font-display font-bold tracking-tight truncate", compact ? "text-base" : "text-lg md:text-xl")}>
        {from}
      </span>
      <span className="flex items-center flex-1 min-w-8 gap-0">
        <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
        <span className="route-dash h-[3px] flex-1" />
        <span className="h-2.5 w-2.5 rounded-full border-2 border-foreground bg-transparent shrink-0" />
      </span>
      <span className={cn("font-display font-bold tracking-tight truncate text-right", compact ? "text-base" : "text-lg md:text-xl")}>
        {to}
      </span>
    </div>
  );
}
