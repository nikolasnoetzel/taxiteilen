
-- Chat messages table for ride group communication
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Members of the ride group can view messages
CREATE POLICY "Members can view chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.ride_group_id = chat_messages.ride_group_id
    AND rr.user_id = auth.uid()
  )
);

-- Members can send messages
CREATE POLICY "Members can send chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.ride_group_id = chat_messages.ride_group_id
    AND rr.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Also allow anon/public to read ride_requests for anonymous browsing
CREATE POLICY "Anyone can view ride requests for open groups (anon)"
ON public.ride_requests FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.ride_groups rg
    WHERE rg.id = ride_requests.ride_group_id
    AND rg.status = 'open'
  )
);
