-- Migration 005 dropped users_pkey with CASCADE while pivoting users.id
-- to reference auth.users(id). CASCADE also dropped every other table's
-- foreign key pointing at users.id, since those FKs depend on the
-- primary key they reference. 005 recreated users_pkey and added
-- users_id_fkey (to auth.users), but never recreated the FKs that
-- OTHER tables had pointing at users(id) — leaving PostgREST unable to
-- resolve the subscriptions/referrals -> users embed used throughout
-- the backend (dashboard.js, webhook.js, renewalReminders.js) and
-- breaking real referential integrity on both tables.
--
-- Confirmed safe before writing this: 0 orphaned subscriptions.user_id
-- rows (12 total) and 0 orphaned referrals rows (table empty) as of
-- 2026-09-01.

alter table subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

alter table referrals
  add constraint referrals_referrer_user_id_fkey
  foreign key (referrer_user_id) references users(id) on delete cascade,
  add constraint referrals_referred_user_id_fkey
  foreign key (referred_user_id) references users(id) on delete set null;

-- PostgREST caches the schema — without this, the routes above keep
-- failing with "Could not find a relationship" until something else
-- (e.g. a project restart) forces a reload.
notify pgrst, 'reload schema';
