const supabase = require('../lib/supabase');
const { sendRenewalReminder } = require('../services/whatsapp');

const REMINDER_DAYS = [5, 3, 2, 1];

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

// Exported standalone so it can be triggered manually (tests, or a
// missed-tick catch-up) without waiting on the cron schedule itself.
async function runRenewalReminderCheck() {
  const today = todayUtc();

  for (const daysBefore of REMINDER_DAYS) {
    const targetDateStr = toDateString(addDays(today, daysBefore));

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, auto_pay, plan_id, plans(name), users(phone)')
      .eq('status', 'active')
      .eq('end_date', targetDateStr);

    if (error) {
      console.error(`[renewal-cron] fetch failed for ${daysBefore}d window:`, error.message);
      continue;
    }

    for (const sub of subscriptions) {
      // Idempotency: the unique (subscription_id, days_before) constraint
      // means a second attempt at the same reminder fails here and we
      // skip it, rather than sending WhatsApp twice.
      const { error: insertError } = await supabase
        .from('renewal_reminders')
        .insert({ subscription_id: sub.id, days_before: daysBefore });

      if (insertError) {
        if (insertError.code === '23505') continue; // already sent
        console.error(`[renewal-cron] could not record reminder for ${sub.id}:`, insertError.message);
        continue;
      }

      try {
        await sendRenewalReminder(sub.users.phone, {
          planName: sub.plans.name,
          daysRemaining: daysBefore,
          autoPay: sub.auto_pay,
        });
      } catch (err) {
        console.error(`[renewal-cron] WhatsApp send failed for subscription ${sub.id}:`, err.message);
      }
    }
  }
}

module.exports = { runRenewalReminderCheck, REMINDER_DAYS };
