const express = require('express');
const crypto = require('crypto');
const supabase = require('../lib/supabase');
const config = require('../config');
const { sendWhatsAppInvite } = require('../services/whatsapp');

const router = express.Router();

function isValidSignature(rawBody, signature, secret) {
  if (!signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// ── POST /webhook/razorpay ───────────────────────────────────
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!isValidSignature(req.rawBody, signature, config.razorpay.webhookSecret)) {
    console.warn('[webhook] invalid signature — rejected');
    return res.status(400).json({ success: false, error: 'Invalid signature.' });
  }

  const { event, payload } = req.body;
  console.log(`[webhook] verified event: ${event}`);

  try {
    if (event === 'payment.captured') {
      await handlePaymentCaptured(payload.payment.entity);
    } else if (event === 'payment.failed') {
      await handlePaymentFailed(payload.payment.entity);
    } else {
      console.log(`[webhook] unhandled event type: ${event} — ignoring`);
    }
  } catch (err) {
    // Return 500 so Razorpay retries — this is presumed transient (DB, etc).
    console.error('[webhook] handler error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal error processing webhook.' });
  }

  return res.json({ success: true });
});

async function handlePaymentCaptured(payment) {
  const { order_id: orderId, id: paymentId } = payment;

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*, plans(duration_days), users(phone)')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (fetchError) throw new Error(`subscription lookup failed: ${fetchError.message}`);
  if (!subscription) {
    console.warn(`[webhook] payment.captured for unknown order_id ${orderId} — ignoring`);
    return;
  }
  if (subscription.status === 'active') {
    console.log(`[webhook] subscription ${subscription.id} already active — idempotent skip`);
    return;
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + subscription.plans.duration_days);

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      razorpay_payment_id: paymentId,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
    })
    .eq('id', subscription.id);

  if (updateError) throw new Error(`subscription activation failed: ${updateError.message}`);

  console.log(
    `[webhook] subscription ${subscription.id} activated ` +
    `(${startDate.toISOString().slice(0, 10)} -> ${endDate.toISOString().slice(0, 10)})`
  );

  // A failed invite shouldn't fail the whole webhook — the payment is
  // captured and the subscription is active regardless of whether this
  // notification goes out. Razorpay would otherwise retry the whole
  // event over a WhatsApp hiccup.
  try {
    await sendWhatsAppInvite(subscription.users.phone, subscription.plan_id);
  } catch (err) {
    console.error(`[webhook] WhatsApp invite failed for subscription ${subscription.id}:`, err.message);
  }
}

async function handlePaymentFailed(payment) {
  const { order_id: orderId } = payment;

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (fetchError) throw new Error(`subscription lookup failed: ${fetchError.message}`);
  if (!subscription) {
    console.warn(`[webhook] payment.failed for unknown order_id ${orderId} — ignoring`);
    return;
  }
  if (subscription.status === 'active') {
    // Don't downgrade an already-active subscription on a late/duplicate failed event.
    return;
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ status: 'failed' })
    .eq('id', subscription.id);

  if (updateError) throw new Error(`subscription fail-mark failed: ${updateError.message}`);

  console.log(`[webhook] subscription ${subscription.id} marked failed`);
}

module.exports = router;
