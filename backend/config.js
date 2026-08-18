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

  // Phone numbers (E.164, e.g. +919876543210) allowed to see the
  // internal dashboard — the company owner plus the referral-team
  // contact. Everyone else gets 403 from /dashboard/admin.
  adminPhones: (process.env.ADMIN_PHONES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  supabase: {
    url: required('SUPABASE_URL'),
    publishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    secretKey: required('SUPABASE_SECRET_KEY'),
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: '30d',
  },

  razorpay: {
    keyId: required('RAZORPAY_KEY_ID'),
    keySecret: required('RAZORPAY_KEY_SECRET'),
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    currency: process.env.RAZORPAY_CURRENCY || 'INR',
  },

  sms: {
    mock: process.env.MOCK_SMS === 'true',
    msg91AuthKey: process.env.MSG91_AUTH_KEY,
    msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
    msg91SenderId: process.env.MSG91_SENDER_ID,
    msg91BaseUrl: process.env.MSG91_BASE_URL || 'https://control.msg91.com/api/v5/otp',
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
