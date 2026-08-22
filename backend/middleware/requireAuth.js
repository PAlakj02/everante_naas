const supabase = require('../lib/supabase');

// Expects: Authorization: Bearer <token>, where <token> is the
// access_token Supabase's own client SDK issued after email OTP
// verification — not a token we mint ourselves. getUser() asks
// Supabase's auth server to validate it (signature + expiry) and
// hands back the verified user, so routes trust req.userId/req.userEmail
// exactly the way they trusted our own JWT claims before.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'Missing or malformed Authorization header.' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Log in again.' });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email;
  next();
}

module.exports = requireAuth;
