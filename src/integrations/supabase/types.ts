// Hand-maintained v2 schema types (mirrors supabase/migrations/20260707100000_v2_rebuild.sql).
// Regenerate with `supabase gen types typescript` once connected to the live project.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDef<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export interface ProfileRow {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  terms_accepted_at: string | null
  stripe_customer_id: string | null
  stripe_connect_account_id: string | null
  stripe_connect_onboarding_complete: boolean
  blocked_at: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface HubRow {
  id: string
  code: string
  name: string
  city_name: string
  active: boolean
  created_at: string
}

export interface CityRow {
  id: string
  slug: string
  name: string
  active: boolean
  created_at: string
}

export interface RouteRow {
  id: string
  hub_id: string
  city_id: string
  fixed_price_cents: number
  duration_min: number
  distance_km: number | null
  active: boolean
  created_at: string
}

export interface TaxiCompanyRow {
  id: string
  city_id: string
  name: string
  phone: string
  description: string | null
  active: boolean
  created_at: string
}

export interface RouteTaxiCompanyRow {
  route_id: string
  taxi_company_id: string
  priority: number
}

export type RideGroupStatus = 'open' | 'initiator_needed' | 'locked' | 'completed' | 'cancelled'
export type RideDirection = 'to_hub' | 'from_hub'

export interface RideGroupRow {
  id: string
  route_id: string
  direction: RideDirection
  departure_at: string
  meeting_point: string | null
  seats_total: number
  seat_price_cents: number
  initiator_id: string
  status: RideGroupStatus
  cancel_reason: string | null
  takeover_deadline: string | null
  locked_at: string | null
  payout_due_at: string
  created_at: string
  updated_at: string
}

export type MembershipStatus =
  | 'pending_payment'
  | 'active'
  | 'cancelled_free'
  | 'cancelled_late'
  | 'no_show'
  | 'expired'

export interface MembershipRow {
  id: string
  ride_group_id: string
  user_id: string
  role: 'initiator' | 'rider'
  num_persons: number
  status: MembershipStatus
  pending_expires_at: string | null
  joined_at: string
  cancelled_at: string | null
}

export type PaymentStatus =
  | 'requires_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'retained'
  | 'transferred'
  | 'transfer_failed'

export interface PaymentRow {
  id: string
  membership_id: string
  ride_group_id: string
  user_id: string
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  share_cents: number
  fee_cents: number
  amount_cents: number
  currency: string
  status: PaymentStatus
  stripe_refund_id: string | null
  paid_at: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
}

export interface TransferRow {
  id: string
  payment_id: string
  ride_group_id: string
  stripe_transfer_id: string | null
  destination_account: string
  amount_cents: number
  status: 'pending' | 'paid' | 'failed' | 'reversed'
  created_at: string
}

export interface StrikeRow {
  id: string
  user_id: string
  ride_group_id: string | null
  reason: string
  created_at: string
}

export interface DisputeRow {
  id: string
  ride_group_id: string
  raised_by: string
  reason: string
  status: 'open' | 'resolved_refund' | 'resolved_payout'
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface ChatMessageRow {
  id: string
  ride_group_id: string
  user_id: string
  message: string
  created_at: string
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>
      hubs: TableDef<HubRow>
      cities: TableDef<CityRow>
      routes: TableDef<RouteRow>
      taxi_companies: TableDef<TaxiCompanyRow>
      route_taxi_companies: TableDef<RouteTaxiCompanyRow>
      ride_groups: TableDef<RideGroupRow>
      memberships: TableDef<MembershipRow>
      payments: TableDef<PaymentRow>
      transfers: TableDef<TransferRow>
      strikes: TableDef<StrikeRow>
      disputes: TableDef<DisputeRow>
      chat_messages: TableDef<ChatMessageRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
