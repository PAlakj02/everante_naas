const express = require('express');
const supabase = require('../lib/supabase');
const config = require('../config');
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

async function fetchOwnSubscription(userId) {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, plans(name, duration_days), users(whatsapp_available)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!subscription) return null;

  // Only ever hand back a group link if the customer said their number
  // is on WhatsApp — otherwise there's nothing for them to join with.
  const whatsappGroupLink = subscription.users.whatsapp_available
    ? config.whatsapp.groupLinks[subscription.plan_id] || null
    : null;

  return {
    plan_id: subscription.plan_id,
    plan_name: subscription.plans.name,
    start_date: subscription.start_date,
    end_date: subscription.end_date,
    days_remaining: daysRemaining(subscription.end_date),
    auto_pay: subscription.auto_pay,
    status: subscription.status,
    whatsapp_group_link: whatsappGroupLink,
  };
}

// ── GET /dashboard/me ────────────────────────────────────────
// Used by the checkout flow to poll for payment activation — kept
// open to any authenticated user, not just admins. This is not "the
// dashboard" in the access-restricted sense, just an order-status check.
router.get('/me', requireAuth, async (req, res) => {
  let subscription;
  try {
    subscription = await fetchOwnSubscription(req.userId);
  } catch (err) {
    console.error('dashboard/me error:', err.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }
  return res.json({ success: true, subscription });
});

// ── GET /dashboard/admin ─────────────────────────────────────
// The actual internal dashboard — restricted to the company owner and
// referral-team contact (config.adminEmails). Everyone else, 403.
router.get('/admin', requireAuth, async (req, res) => {
  if (!config.adminEmails.includes((req.userEmail || '').toLowerCase())) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this dashboard.' });
  }

  let subscription;
  try {
    subscription = await fetchOwnSubscription(req.userId);
  } catch (err) {
    console.error('dashboard/admin error:', err.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }
  return res.json({ success: true, subscription });
});

module.exports = router;
