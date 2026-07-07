import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Brand mark: yellow tile with a route path from A to B. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#F5C518" />
      <path
        d="M9 22.5 C 13 22.5, 12 9.5, 23 9.5"
        fill="none"
        stroke="#141414"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="0.1 4.4"
      />
      <circle cx="9" cy="22.5" r="2.6" fill="#141414" />
      <circle cx="23" cy="9.5" r="2.6" fill="none" stroke="#141414" strokeWidth="2.2" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 group", className)}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-lg font-bold tracking-tight">TaxiTeilen</span>
    </Link>
  );
}
