-- The application checked availability with a SELECT and then ran a separate INSERT,
-- which is not atomic: two concurrent requests can both pass the check and both
-- insert, double-booking the room. This constraint makes the database itself the
-- source of truth, for every insert/update path (staff bookings and the public API
-- alike), instead of relying on app-level check-then-insert logic.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- check_in_date/check_out_date are TEXT in strict YYYY-MM-DD form (enforced by the app's
-- zod validation). A plain `::date` cast is only STABLE (its result can depend on the
-- session's DateStyle setting), which Postgres won't allow in an index expression — so this
-- wrapper parses the fixed format by hand and is safe to declare IMMUTABLE.
CREATE FUNCTION iso_date_immutable(text) RETURNS date AS $$
  SELECT make_date(substring($1, 1, 4)::int, substring($1, 6, 2)::int, substring($1, 9, 2)::int);
$$ LANGUAGE sql IMMUTABLE STRICT;

-- Matches the app's existing predicate: only confirmed/checked_in bookings hold a room.
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(iso_date_immutable(check_in_date), iso_date_immutable(check_out_date), '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'checked_in'));
