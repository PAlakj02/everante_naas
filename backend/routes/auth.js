const express = require('express');
const supabase = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const { generateReferralCode } = require('../lib/referral');

const router = express.Router();

// ── POST /auth/complete-profile ──────────────────────────────
// Called once, right after the frontend's own Supabase email-OTP
// verification succeeds — this route never issues or checks an OTP
// itself, Supabase's own auth server already did that. It only fills
// in the business-specific profile fields Supabase's identity doesn't
// carry: phone and "is this WhatsApp number" are plain, unverified
// values the customer typed in; email always comes from the verified
// token (req.userEmail), never from the request body, so it can't be
// spoofed to a different address than what was actually verified.
router.post('/complete-profile', requireAuth, async (req, res) => {
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : null;
  const whatsappAvailable = req.body.whatsapp_available === true;
  const referralCodeInput = typeof req.body.referral_code === 'string'
    ? req.body.referral_code.trim().toUpperCase()
    : null;

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.userId)
    .maybeSingle();

  if (fetchError) {
    console.error('complete-profile fetch error:', fetchError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  if (existingUser) {
    // Returning user completing the form again — keep phone/WhatsApp
    // answer current, but referral_code and referral attribution only
    // ever happen once, at first signup.
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ phone, whatsapp_available: whatsappAvailable })
      .eq('id', req.userId)
      .select()
      .single();

    if (updateError) {
      console.error('complete-profile update error:', updateError.message);
      return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
    }
    return res.json({ success: true, user: updatedUser });
  }

  // First time this Supabase identity has completed a profile here.
  // Retry loop only guards the astronomically unlikely referral_code
  // collision (33^7 possible codes) — not expected to ever loop.
  let newUser = null;
  let createError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await supabase
      .from('users')
      .insert({
        id: req.userId,
        email: req.userEmail,
        phone,
        whatsapp_available: whatsappAvailable,
        referral_code: generateReferralCode(),
      })
      .select()
      .single();

    if (!result.error) {
      newUser = result.data;
      createError = null;
      break;
    }
    createError = result.error;
    if (result.error.code !== '23505') break;
  }

  if (!newUser) {
    console.error('complete-profile create error:', createError?.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  // Referral attribution — only relevant for a brand-new signup, and
  // only if a valid code from a different existing user was supplied.
  if (referralCodeInput) {
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCodeInput)
      .maybeSingle();

    if (referrerError) {
      console.error('complete-profile referrer lookup error:', referrerError.message);
    } else if (referrer && referrer.id !== newUser.id) {
      const { error: referralInsertError } = await supabase
        .from('referrals')
        .insert({ referrer_user_id: referrer.id, referred_user_id: newUser.id, status: 'claimed' });
      if (referralInsertError) {
        console.error('complete-profile referral attribution failed:', referralInsertError.message);
      }
    } else if (!referrer) {
      console.warn(`complete-profile: referral_code "${referralCodeInput}" did not match any user — ignoring`);
    }
  }

  return res.json({ success: true, user: newUser });
});

module.exports = router;
