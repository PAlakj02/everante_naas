const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 3;

function generateCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Accepts a bare 10-digit Indian mobile number or one already prefixed
// with +91, and normalizes to E.164 (+91XXXXXXXXXX). Returns null if
// the input doesn't look like a valid Indian mobile number.
function normalizePhone(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const withPrefix = trimmed.startsWith('+') ? trimmed : `+91${trimmed}`;
  return /^\+91[6-9]\d{9}$/.test(withPrefix) ? withPrefix : null;
}

module.exports = {
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
  REQUEST_WINDOW_MINUTES,
  MAX_REQUESTS_PER_WINDOW,
  generateCode,
  hashCode,
  normalizePhone,
};
