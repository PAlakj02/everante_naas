-- Tracks which (subscription, days_before) reminders have already been
-- sent, so the daily cron can run repeatedly (restarts, redeploys)
-- without ever double-sending the same reminder.
create table if not exists renewal_reminders (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references subscriptions(id) on delete cascade,
  days_before      integer not null check (days_before in (5, 3, 2, 1)),
  sent_at          timestamptz not null default now(),
  unique (subscription_id, days_before)
);

alter table renewal_reminders enable row level security;
