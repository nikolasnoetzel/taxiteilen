// Frontend re-export of the canonical money math (single source of truth,
// shared with the edge functions).
export {
  PLATFORM_FEE_PERCENT,
  riderCharge,
  seatPriceCents,
  formatEuro,
  type RiderCharge,
} from "../../supabase/functions/_shared/pricing";
