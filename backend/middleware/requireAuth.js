const { verifySessionToken } = require('../lib/session');

// Expects: Authorization: Bearer <token>
// On success, attaches req.userId / req.userPhone from the token's own
// claims — routes trust these, never a client-supplied user_id, since
// that's the entire point of requiring a session.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'Missing or malformed Authorization header.' });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Log in again.' });
  }

  req.userId = payload.sub;
  req.userPhone = payload.phone;
  next();
}

module.exports = requireAuth;
