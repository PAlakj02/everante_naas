const config = require('../config');

// Every caller talks to sendWhatsAppInvite() only. Swapping the mock
// for real AiSensy sending later means filling in sendViaAisensy() and
// flipping MOCK_WHATSAPP=true — nothing else in the codebase changes.
async function sendWhatsAppInvite(phone, planId) {
  if (config.whatsapp.mock) {
    return sendViaMock(phone, planId);
  }
  return sendViaAisensy(phone, planId);
}

async function sendViaMock(phone, planId) {
  console.log(`[MOCK WHATSAPP] Sending invite to ${phone} for ${planId}`);
  return { success: true, provider: 'mock' };
}

async function sendViaAisensy(phone, planId) {
  // Pending WhatsApp template approval. Once approved, implement the
  // AiSensy campaign API call here, e.g.:
  //
  // const res = await fetch(config.whatsapp.aisensyBaseUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     apiKey: config.whatsapp.aisensyApiKey,
  //     campaignName: config.whatsapp.aisensyCampaignName,
  //     destination: phone.replace('+', ''),
  //     userName: config.whatsapp.businessName,
  //     templateParams: [planId],
  //   }),
  // });
  // if (!res.ok) throw new Error(`AiSensy send failed: ${res.status}`);
  // return { success: true, provider: 'aisensy' };

  throw new Error('AiSensy live sending not implemented yet — set MOCK_WHATSAPP=true');
}

// Same mock/real branch as sendWhatsAppInvite — message wording differs
// by auto_pay, since an auto-renewing plan and a manually-renewed one
// need the customer to do different things.
async function sendRenewalReminder(phone, { planName, daysRemaining, autoPay }) {
  if (config.whatsapp.mock) {
    return sendReminderViaMock(phone, planName, daysRemaining, autoPay);
  }
  return sendReminderViaAisensy(phone, planName, daysRemaining, autoPay);
}

function reminderMessage(planName, daysRemaining, autoPay) {
  const dayWord = daysRemaining === 1 ? 'day' : 'days';
  return autoPay
    ? `Your ${planName} plan renews automatically in ${daysRemaining} ${dayWord}.`
    : `Your plan is ending in ${daysRemaining} ${dayWord} — renew manually to keep your ${planName} deliveries going.`;
}

async function sendReminderViaMock(phone, planName, daysRemaining, autoPay) {
  const message = reminderMessage(planName, daysRemaining, autoPay);
  console.log(`[MOCK WHATSAPP] Reminder to ${phone}: ${message}`);
  return { success: true, provider: 'mock' };
}

async function sendReminderViaAisensy(phone, planName, daysRemaining, autoPay) {
  // Pending WhatsApp template approval — same AiSensy call shape as
  // sendViaAisensy() above, with the reminder message/template instead.
  throw new Error('AiSensy live sending not implemented yet — set MOCK_WHATSAPP=true');
}

module.exports = { sendWhatsAppInvite, sendRenewalReminder };
