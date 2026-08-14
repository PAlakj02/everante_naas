const express = require('express');
const supabase = require('../lib/supabase');
const razorpay = require('../lib/razorpay');
const config = require('../config');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ── POST /orders/create-order ───────────────────────────────
// user_id comes from the verified session token, never the request
// body — this endpoint predates requireAuth (built in Step 4, before
// sessions existed in Step "Dashboard API") and was trusting a
// client-supplied user_id with no auth check at all until now.
router.post('/create-order', requireAuth, async (req, res) => {
  const user_id = req.userId;
  const { plan_id, auto_pay } = req.body;

  if (!plan_id) {
    return res.status(400).json({ success: false, error: 'plan_id is required.' });
  }

  // Price always comes from our own table — never trust a client-supplied amount.
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', plan_id)
    .eq('is_active', true)
    .maybeSingle();

  if (planError) {
    console.error('create-order plan lookup error:', planError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }
  if (!plan) {
    return res.status(404).json({ success: false, error: 'Plan not found.' });
  }

  // Create the subscription row first so we have a stable internal id to
  // use as the Razorpay receipt, before the order itself exists.
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id,
      plan_id,
      status: 'pending',
      auto_pay: typeof auto_pay === 'boolean' ? auto_pay : true,
    })
    .select()
    .single();

  if (subError) {
    console.error('create-order subscription insert error:', subError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  let order;
  try {
    order = await razorpay.orders.create({
      amount: plan.price_paise,
      currency: config.razorpay.currency,
      receipt: subscription.id,
      notes: { user_id, plan_id, subscription_id: subscription.id },
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err.message || err);
    await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', subscription.id);
    return res.status(502).json({ success: false, error: 'Could not create payment order. Try again.' });
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ razorpay_order_id: order.id })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('create-order subscription update error:', updateError.message);
  }

  return res.json({
    success: true,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: config.razorpay.keyId,
    subscription_id: subscription.id,
  });
});

module.exports = router;
