(function () {
  'use strict';

  // The publishable key is meant to be public — same trust level as the
  // Razorpay key_id already shown in the checkout flow. Auth calls made
  // with it (signInWithOtp/verifyOtp) are the only Supabase calls this
  // site makes directly; every other read/write still goes through our
  // own backend using its service-role key, unaffected by this key
  // being public.
  const SUPABASE_URL = 'https://fgkyvvewsfcianphphpq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tHx-qKGo1W0Gf2rfWe63og_UxrCouzp';

  window.everanteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
