-- Guest bookings from the public API (WordPress plugin) now go through Paystack
-- before being confirmed. The webhook records the resulting charge directly into
-- `payments` (bypassing the staff-facing POST /invoices/:id/pay route, which keeps
-- its own hardcoded method list), so 'online' needs to be a valid method here too.
ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash','card','mobile_money','bank_transfer','online'));

-- Tracks the Paystack transaction behind a public (guest) booking, mirroring
-- subscription_payments for the equivalent subscription-payment flow.
CREATE TABLE booking_payments (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  paystack_reference TEXT,
  paystack_access_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
