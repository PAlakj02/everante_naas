const jwt = require('jsonwebtoken');
const config = require('../config');

function issueSessionToken(user) {
  return jwt.sign(
    { sub: user.id, phone: user.phone },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// Returns the decoded payload on success, or null on any failure
// (expired, tampered, wrong secret, malformed) — callers just check
// for null rather than handling jwt's various error types themselves.
function verifySessionToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return null;
  }
}

module.exports = { issueSessionToken, verifySessionToken };
