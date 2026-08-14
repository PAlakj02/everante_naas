const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Server-side client using the secret (service-role) key. This bypasses
// RLS, which is expected — this process is the only thing that's
// supposed to touch these tables.
const supabase = createClient(config.supabase.url, config.supabase.secretKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
