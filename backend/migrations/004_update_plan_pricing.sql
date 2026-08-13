-- Finalized frontend moved from daily delivery to Mon–Sat (6 deliveries
-- a week), so plan durations and totals both changed. Numbers below are
-- the ones actually printed on the finalized marketing site — treated
-- as authoritative per the founder.
update plans set duration_days = 12, price_paise = 225000, price_per_day_paise = 18700 where id = 'plan_2w';
update plans set duration_days = 24, price_paise = 438300, price_per_day_paise = 18300 where id = 'plan_4w';
update plans set duration_days = 48, price_paise = 864900, price_per_day_paise = 18000 where id = 'plan_8w';
