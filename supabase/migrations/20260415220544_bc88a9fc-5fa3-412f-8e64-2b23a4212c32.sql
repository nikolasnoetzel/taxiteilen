
-- Allow authenticated users to see profiles of people in the same ride group
CREATE POLICY "Users can view profiles of ride group members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM ride_requests my_rr
    JOIN ride_requests their_rr ON my_rr.ride_group_id = their_rr.ride_group_id
    WHERE my_rr.user_id = auth.uid()
      AND their_rr.user_id = profiles.user_id
  )
);
