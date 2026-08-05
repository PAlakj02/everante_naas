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
  },

  sms: {
    mock: process.env.MOCK_SMS === 'true',
    msg91AuthKey: process.env.MSG91_AUTH_KEY,
    msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
    msg91SenderId: process.env.MSG91_SENDER_ID,
  },

  whatsapp: {
    mock: process.env.MOCK_WHATSAPP === 'true',
    aisensyApiKey: process.env.AISENSY_API_KEY,
    aisensyCampaignName: process.env.AISENSY_CAMPAIGN_NAME,
  },
};
