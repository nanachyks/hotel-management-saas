-- Postgres enforces FK constraints (unlike the old sql.js schema, where they were
-- declared but never enforced). These tables hold rows that are meaningless once
-- their owning user is gone, so deleting a user should clean them up rather than
-- being blocked by them.

ALTER TABLE refresh_tokens
  DROP CONSTRAINT refresh_tokens_user_id_fkey,
  ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE password_resets
  DROP CONSTRAINT password_resets_user_id_fkey,
  ADD CONSTRAINT password_resets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_verifications
  DROP CONSTRAINT email_verifications_user_id_fkey,
  ADD CONSTRAINT email_verifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE hotel_members
  DROP CONSTRAINT hotel_members_user_id_fkey,
  ADD CONSTRAINT hotel_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- notifications.user_id is nullable and hotel-scoped (not exclusively user-owned),
-- so orphan the reference instead of deleting the notification.
ALTER TABLE notifications
  DROP CONSTRAINT notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
