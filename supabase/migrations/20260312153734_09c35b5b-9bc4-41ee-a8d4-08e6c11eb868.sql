
-- Add Stripe fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean NOT NULL DEFAULT false;

-- Payments table to track pre-auth holds and captures per rider per ride group
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_payment_intent_id text NOT NULL,
  amount_authorized integer NOT NULL, -- in cents
  amount_captured integer, -- in cents, set after capture
  platform_fee integer, -- in cents, 10% fee
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'authorized', -- authorized, captured, canceled, failed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view payments in their ride groups"
  ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_requests rr 
    WHERE rr.ride_group_id = payments.ride_group_id 
    AND rr.user_id = auth.uid()
  ));

CREATE POLICY "System can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add ride_date to ride_groups to track when the ride happens
ALTER TABLE public.ride_groups 
  ADD COLUMN IF NOT EXISTS final_price integer, -- in cents, entered by initiator after ride
  ADD COLUMN IF NOT EXISTS ride_date date;
