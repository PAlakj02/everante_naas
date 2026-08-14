-- The original referrals stub put a UNIQUE code directly on each
-- referrals row. That only allows a referrer to ever be credited once
-- (a second signup with the same code would collide on the unique
-- constraint). A shareable code belongs on the user themselves —
-- generated once, reused across every signup that uses it — with
-- `referrals` recording one row per successful claim.
alter table users add column if not exists referral_code text unique;

alter table referrals drop column if exists code;
