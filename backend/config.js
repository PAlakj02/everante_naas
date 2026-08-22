require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) console.warn(`[config] Missing env var: ${name}`);
  return value;
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL,

  // Comma-separated list of extra allowed CORS origins (e.g. the
  // deployed Vercel domain). Localhost is always allowed separately in
  // server.js regardless of this list, so local dev never breaks.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Email addresses allowed to see the internal dashboard — the
  // company owner plus the referral-team contact. Everyone else gets
  // 403 from /dashboard/admin. Email, not phone, because phone is now
  // unverified free text (see the email-auth pivot) and can't be
  // trusted for an access-control decision.
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  supabase: {
    url: required('SUPABASE_URL'),
    publishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    secretKey: required('SUPABASE_SECRET_KEY'),
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  razorpay: {
    keyId: required('RAZORPAY_KEY_ID'),
    keySecret: required('RAZORPAY_KEY_SECRET'),
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    currency: process.env.RAZORPAY_CURRENCY || 'INR',
  },

  whatsapp: {
    mock: process.env.MOCK_WHATSAPP === 'true',
    aisensyApiKey: process.env.AISENSY_API_KEY,
    aisensyCampaignName: process.env.AISENSY_CAMPAIGN_NAME,
    aisensyBaseUrl: process.env.AISENSY_BASE_URL || 'https://backend.aisensy.com/campaign/t1/api/v2',
    businessName: process.env.BUSINESS_NAME || 'Everante',
    // Per-plan WhatsApp community/group invite links (chat.whatsapp.com/...,
    // NOT a wa.me personal-chat link). Kept out of the static frontend —
    // only ever revealed via an authenticated, active-subscription check.
    groupLinks: {
      plan_2w: process.env.WHATSAPP_GROUP_LINK_PLAN_2W || '',
      plan_4w: process.env.WHATSAPP_GROUP_LINK_PLAN_4W || '',
      plan_8w: process.env.WHATSAPP_GROUP_LINK_PLAN_8W || '',
    },
  },
};
