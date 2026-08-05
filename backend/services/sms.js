const config = require('../config');

// Every caller in this app talks to sendOTP() only. Swapping the mock
// for real MSG91 sending later means filling in sendViaMsg91() and
// flipping MOCK_SMS=false — nothing else in the codebase changes.
async function sendOTP(phone, code) {
  if (config.sms.mock) {
    return sendViaMock(phone, code);
  }
  return sendViaMsg91(phone, code);
}

async function sendViaMock(phone, code) {
  console.log(`[MOCK SMS] OTP for ${phone}: ${code}`);
  return { success: true, provider: 'mock' };
}

async function sendViaMsg91(phone, code) {
  // Pending DLT template approval. Once approved, implement the MSG91
  // OTP API call here, e.g.:
  //
  // const res = await fetch('https://control.msg91.com/api/v5/otp', {
  //   method: 'POST',
  //   headers: { 'authkey': config.sms.msg91AuthKey, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     template_id: config.sms.msg91TemplateId,
  //     sender: config.sms.msg91SenderId,
  //     mobile: phone.replace('+', ''),
  //     otp: code,
  //   }),
  // });
  // if (!res.ok) throw new Error(`MSG91 send failed: ${res.status}`);
  // return { success: true, provider: 'msg91' };

  throw new Error('MSG91 live sending not implemented yet — set MOCK_SMS=true');
}

module.exports = { sendOTP };
