const express = require('express');
const supabase = require('../lib/supabase');
const { sendOTP } = require('../services/sms');
const { issueSessionToken } = require('../lib/session');
const { generateReferralCode } = require('../lib/referral');
const {
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
  REQUEST_WINDOW_MINUTES,
  MAX_REQUESTS_PER_WINDOW,
  generateCode,
  hashCode,
  normalizePhone,
} = require('../lib/otp');

const router = express.Router();

// ── POST /auth/request-otp ──────────────────────────────────
router.post('/request-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
  }

  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('request-otp count error:', countError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: `Too many OTP requests. Try again in ${REQUEST_WINDOW_MINUTES} minutes.`,
    });
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('otp_codes')
    .insert({ phone, code_hash: codeHash, expires_at: expiresAt });

  if (insertError) {
    console.error('request-otp insert error:', insertError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  await sendOTP(phone, code);

  return res.json({
    success: true,
    message: 'OTP sent.',
    expires_in_seconds: OTP_TTL_MINUTES * 60,
  });
});

// ── POST /auth/verify-otp ───────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Enter the 6-digit code.' });
  }

  const { data: otpRow, error: fetchError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error('verify-otp fetch error:', fetchError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  if (!otpRow) {
    return res.status(400).json({ success: false, error: 'No pending OTP for this number. Request a new one.' });
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    return res.status(400).json({ success: false, error: 'OTP expired. Request a new one.' });
  }

  if (otpRow.attempt_count >= MAX_ATTEMPTS) {
    return res.status(429).json({ success: false, error: 'Too many incorrect attempts. Request a new one.' });
  }

  if (hashCode(code) !== otpRow.code_hash) {
    const nextAttemptCount = otpRow.attempt_count + 1;
    await supabase.from('otp_codes').update({ attempt_count: nextAttemptCount }).eq('id', otpRow.id);

    const remaining = MAX_ATTEMPTS - nextAttemptCount;
    return res.status(400).json({
      success: false,
      error: remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : 'Incorrect code. Request a new one.',
    });
  }

  // Correct code — consume it so it can't be replayed.
  await supabase.from('otp_codes').update({ verified: true }).eq('id', otpRow.id);

  // Find or create the user.
  const { data: existingUser, error: userFetchError } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (userFetchError) {
    console.error('verify-otp user fetch error:', userFetchError.message);
    return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }

  let user = existingUser;
  if (!user) {
    // Retry loop only guards the astronomically unlikely referral_code
    // collision (33^7 possible codes) — not expected to ever loop.
    let newUser = null;
    let createError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from('users')
        .insert({ phone, referral_code: generateReferralCode() })
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
      console.error('verify-otp user create error:', createError?.message);
      return res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
    }
    user = newUser;

    // Referral attribution — only relevant for a brand-new signup, and
    // only if a valid code from an existing user was supplied.
    const referralCodeInput = typeof req.body.referral_code === 'string'
      ? req.body.referral_code.trim().toUpperCase()
      : null;

    if (referralCodeInput) {
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCodeInput)
        .maybeSingle();

      if (referrerError) {
        console.error('verify-otp referrer lookup error:', referrerError.message);
      } else if (referrer) {
        const { error: referralInsertError } = await supabase
          .from('referrals')
          .insert({ referrer_user_id: referrer.id, referred_user_id: user.id, status: 'claimed' });
        if (referralInsertError) {
          console.error('verify-otp referral attribution failed:', referralInsertError.message);
        }
      } else {
        console.warn(`verify-otp: referral_code "${referralCodeInput}" did not match any user — ignoring`);
      }
    }
  }

  const token = issueSessionToken(user);
  return res.json({ success: true, user, token });
});

module.exports = router;
