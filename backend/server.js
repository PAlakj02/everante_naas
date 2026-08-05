const config = require('./config');
const express = require('express');
const cors = require('cors');
const app = express();

// Dev-only: allow any localhost/127.0.0.1 origin regardless of port,
// since the frontend's dev server port can vary. Tighten this to the
// real domain (remove the localhost wildcard) before deploying.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || LOCALHOST_ORIGIN.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
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