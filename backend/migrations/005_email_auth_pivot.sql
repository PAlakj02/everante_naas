-- Pivot from custom phone+OTP auth to Supabase's native email OTP auth.
-- users.id now must equal the corresponding auth.users.id, so a
-- verified Supabase session always maps to exactly one profile row
-- here — this table becomes a profile extension of Supabase's own
-- identity table, not an identity table of its own.
--
-- Safe to run on a fresh project (no existing rows reference the old
-- self-generated ids). If ever run on a project with existing users
-- from the old flow, those rows must be re-created against real
-- auth.users ids first — this migration does not attempt to migrate
-- old rows, since there is no way to recover a matching auth identity
-- for a user who never went through Supabase auth.

alter table users drop constraint if exists users_pkey cascade;
alter table users alter column id drop default;
alter table users
  add constraint users_pkey primary key (id),
  add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- phone is now unverified and purely informational — dropping both
-- the uniqueness and required-ness a verified identity would need.
alter table users alter column phone drop not null;
alter table users drop constraint if exists users_phone_key;

-- Mirrors auth.users.email, written only by our backend at profile-
-- completion time from an already-verified Supabase token — never
-- taken from client input directly, so this can't drift from what
-- Supabase itself verified.
alter table users add column if not exists email text;

-- Plain yes/no the customer answers at signup — not verified against
-- any API, purely informational and used to decide whether to show
-- the WhatsApp community button after checkout.
alter table users add column if not exists whatsapp_available boolean not null default false;

-- otp_codes is entirely unused now — Supabase generates, hashes,
-- expires and sends the OTP itself, we never see the code.
drop table if exists otp_codes;
