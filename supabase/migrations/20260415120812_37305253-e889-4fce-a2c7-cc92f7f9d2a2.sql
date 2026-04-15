
-- Make flight-related fields optional
ALTER TABLE public.ride_requests 
  ALTER COLUMN flight_number DROP NOT NULL,
  ALTER COLUMN scheduled_arrival DROP NOT NULL,
  ALTER COLUMN flight_status DROP DEFAULT,
  ALTER COLUMN flight_status DROP NOT NULL;

-- Add desired_time for manual time selection (primary field for matching)
ALTER TABLE public.ride_requests 
  ADD COLUMN IF NOT EXISTS desired_time text;
