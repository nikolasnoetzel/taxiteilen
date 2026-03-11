
-- Ride groups: a shared taxi ride that people can join
CREATE TABLE public.ride_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'completed', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ride requests: individual entries for each person joining a ride group
CREATE TABLE public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid REFERENCES public.ride_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  route_id text NOT NULL,
  flight_number text NOT NULL,
  scheduled_arrival text NOT NULL,
  estimated_arrival text NOT NULL,
  flight_status text NOT NULL DEFAULT 'on-time',
  is_initiator boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS for ride_groups: anyone authenticated can view open groups
CREATE POLICY "Anyone can view open ride groups"
  ON public.ride_groups FOR SELECT TO authenticated
  USING (status = 'open');

CREATE POLICY "Users can create ride groups"
  ON public.ride_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their ride groups"
  ON public.ride_groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- RLS for ride_requests: authenticated users can view requests for open groups
CREATE POLICY "Anyone can view ride requests for open groups"
  ON public.ride_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_groups rg
    WHERE rg.id = ride_group_id AND (rg.status = 'open' OR rg.created_by = auth.uid())
  ));

CREATE POLICY "Users can create their own ride requests"
  ON public.ride_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ride requests"
  ON public.ride_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at on ride_groups
CREATE TRIGGER update_ride_groups_updated_at
  BEFORE UPDATE ON public.ride_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for ride_requests so users see new joiners
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
