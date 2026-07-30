-- Pending bookings previously didn't hold the room at all, so two guests could both pay for
-- the same room before either payment cleared. Pending bookings now count as holding the room
-- too. pending_expires_at bounds how long a public/guest booking can sit unpaid before a
-- sweeper (see jobs/expirePendingBookings.ts) cancels it and frees the room; staff-created
-- pending bookings (no payment involved) leave this NULL and hold the room indefinitely, same
-- as before, until a staff member confirms or cancels them.
ALTER TABLE bookings ADD COLUMN pending_expires_at TIMESTAMPTZ;

ALTER TABLE bookings DROP CONSTRAINT no_overlapping_bookings;
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(iso_date_immutable(check_in_date), iso_date_immutable(check_out_date), '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'checked_in', 'pending'));
