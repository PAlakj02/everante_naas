-- Everante NaaS — initial schema
-- Tables: plans, users, subscriptions, otp_codes, referrals (stub)

create extension if not exists pgcrypto;

-- ── plans ──────────────────────────────────────────────────
create table if not exists plans (
  id                   text primary key,
  name                 text not null,
  duration_days        integer not null,
  price_paise          integer not null,
  price_per_day_paise  integer not null,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

insert into plans (id, name, duration_days, price_paise, price_per_day_paise)
values
  ('plan_2w', '2 Weeks', 14, 250000, 17800),
  ('plan_4w', '4 Weeks', 28, 484000, 17200),
  ('plan_8w', '8 Weeks', 56, 960000, 17000)
on conflict (id) do nothing;

-- ── users ──────────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── subscriptions ────────────────────────────────────────────
create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  plan_id              text not null references plans(id),
  status               text not null default 'pending'
                         check (status in ('pending','active','expired','cancelled','failed')),
  auto_pay             boolean not null default true,
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  start_date           date,
  end_date             date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status   on subscriptions(status);

-- ── otp_codes ──────────────────────────────────────────────
create table if not exists otp_codes (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null,
  code_hash      text not null,
  expires_at     timestamptz not null,
  attempt_count  integer not null default 0,
  verified       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_otp_codes_phone_created on otp_codes(phone, created_at desc);

-- ── referrals (stub — no reward logic wired up yet) ────────
create table if not exists referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_user_id    uuid not null references users(id) on delete cascade,
  referred_user_id    uuid references users(id) on delete set null,
  code                text not null unique,
  status              text not null default 'pending'
                        check (status in ('pending','claimed','rewarded')),
  created_at          timestamptz not null default now()
);

create index if not exists idx_referrals_referrer on referrals(referrer_user_id);

-- ── updated_at auto-touch ───────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
-- Only this Express API talks to Supabase, using the service-role
-- secret key (which bypasses RLS). Enabling RLS with zero policies
-- means the publishable/anon key can read or write nothing here,
-- even if that key leaked.
alter table plans         enable row level security;
alter table users         enable row level security;
alter table subscriptions enable row level security;
alter table otp_codes     enable row level security;
alter table referrals     enable row level security;
