const config = require('./config');
const express = require('express');
const cors = require('cors');
const app = express();

// Localhost/127.0.0.1 (any port) is always allowed for local dev,
// regardless of ALLOWED_ORIGINS — so local testing never breaks no
// matter what's configured for production. Anything else must be
// listed in ALLOWED_ORIGINS (comma-separated in .env), e.g. the
// deployed Vercel domain — update that env var when the domain
// changes, no code change needed.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
console.log('CORS allowed origins:', JSON.stringify(config.allowedOrigins));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || LOCALHOST_ORIGIN.test(origin) || config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // false (not an Error) — the cors package just omits the CORS headers,
    // so the browser blocks it cleanly. Passing an Error here throws into
    // Express's request pipeline and, with no error-handling middleware,
    // surfaces as a raw 500 with a leaked stack trace instead of a clean
    // CORS rejection.
    callback(null, false);
  },
}));

// The verify callback stashes the exact raw bytes on req.rawBody, which
// the Razorpay webhook needs for HMAC signature verification — signing
// a re-serialized copy of the JSON can produce a different byte string
// than what Razorpay actually signed.
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

app.get('/', (req, res) => {
  res.send('Server is alive!');
});

app.use('/auth', require('./routes/auth'));
app.use('/orders', require('./routes/orders'));
app.use('/webhook', require('./routes/webhook'));
app.use('/dashboard', require('./routes/dashboard'));

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  require('./jobs/scheduler').startScheduler();
});