const express = require('express');
const supabase = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Explicit UTC math — end_date comes back as a plain 'YYYY-MM-DD' string
// from PostgREST. Parsing both sides as UTC midnight avoids the local-
// timezone drift we hit earlier with the raw pg driver.
function daysRemaining(endDateStr) {
  const end = new Date(`${endDateStr}T00:00:00Z`);
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.max(0, Math.round((end.getTime() - todayUtc.getTime()) / 86400000));
}

// ── GET /dashboard/me ────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, plans(name, duration_days)')
    .eq('user_id', req.userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('dashboard/me error:', error.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  if (!subscription) {
    return res.json({ success: true, subscription: null });
  }

  return res.json({
    success: true,
    subscription: {
      plan_id: subscription.plan_id,
      plan_name: subscription.plans.name,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      days_remaining: daysRemaining(subscription.end_date),
      auto_pay: subscription.auto_pay,
      status: subscription.status,
    },
  });
});

module.exports = router;
