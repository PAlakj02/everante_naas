(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
  const API_BASE = 'https://everante-naas-website-development-1-xb54.onrender.com';
  const supabaseAuth = window.everanteSupabase.auth;

  const navLogoutBtn = document.getElementById('navLogoutBtn');
  const navMyPlanBtn = document.getElementById('navMyPlanBtn');
  if (navLogoutBtn || navMyPlanBtn) {
    if (navLogoutBtn) navLogoutBtn.addEventListener('click', () => supabaseAuth.signOut());
    const syncNavAuthUI = (session) => {
      if (navLogoutBtn) navLogoutBtn.hidden = !session;
      if (navMyPlanBtn) navMyPlanBtn.hidden = !session;
    };
    supabaseAuth.getSession().then(({ data }) => syncNavAuthUI(data.session));
    // also catches signOut() calls elsewhere (401 handling below, dashboard-auth.js)
    // and the SIGNED_IN fired by the checkout modal's verifyOtp, so these buttons
    // never drift out of sync with the actual session state.
    supabaseAuth.onAuthStateChange((_event, session) => syncNavAuthUI(session));
  }

  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  const backdrop = document.getElementById('checkoutModalBackdrop');
  const closeBtn = document.getElementById('checkoutModalClose');
  const stepEmail = document.getElementById('checkoutStepEmail');
  const stepCode = document.getElementById('checkoutStepCode');
  const stepProcessing = document.getElementById('checkoutStepProcessing');
  const stepSuccess = document.getElementById('checkoutStepSuccess');
  const processingMsg = document.getElementById('checkoutProcessingMsg');
  const emailForm = document.getElementById('checkoutEmailForm');
  const codeForm = document.getElementById('checkoutCodeForm');
  const emailInput = document.getElementById('checkoutEmailInput');
  const phoneInput = document.getElementById('checkoutPhoneInput');
  const whatsappHint = document.getElementById('checkoutWhatsappHint');
  const codeInput = document.getElementById('checkoutCodeInput');
  const msgEl = document.getElementById('checkoutModalMsg');
  const doneBtn = document.getElementById('checkoutDone');
  const successMsgEl = document.getElementById('checkoutSuccessMsg');
  const successHeading = document.getElementById('checkoutSuccessHeading');
  const joinCommunityBtn = document.getElementById('checkoutJoinCommunity');

  const required = { modal, emailForm, codeForm, emailInput, phoneInput,
                     codeInput, msgEl, whatsappHint, stepEmail, stepCode,
                     stepProcessing, stepSuccess, processingMsg, successHeading };
  const missing = Object.entries(required)
    .filter(([, el]) => !el).map(([name]) => name);
  if (missing.length) {
    console.error('checkout.js — missing elements:', missing);
    return;
  }

  let pendingEmail = '';
  let pendingPhone = '';
  let pendingWhatsappAvailable = false;
  let pendingPlanId = '';

  function setMsg(text, type) {
    msgEl.textContent = text || '';
    msgEl.className = 'checkout-modal-msg' + (type ? ' ' + type : '');
  }

  function showStep(step) {
    [stepEmail, stepCode, stepProcessing, stepSuccess].forEach((el) => {
      el.hidden = el !== step;
    });
  }

  // Shared by the post-payment poll, the "already subscribed" checks in
  // openModal/codeForm, and the nav "My Plan" link — one place to render
  // whatever /dashboard/me comes back with.
  function renderPlanStatus(subscription) {
    const active = subscription && subscription.status === 'active';
    successHeading.textContent = active ? "You're in." : 'No active plan';
    if (active) {
      const dayWord = subscription.days_remaining === 1 ? 'day' : 'days';
      const planLine = `${subscription.plan_name} · ${subscription.days_remaining} ${dayWord} left.`;
      successMsgEl.textContent = subscription.whatsapp_group_link
        ? `${planLine} Join the community for daily updates.`
        : planLine;
      if (subscription.whatsapp_group_link) joinCommunityBtn.href = subscription.whatsapp_group_link;
      joinCommunityBtn.hidden = !subscription.whatsapp_group_link;
    } else {
      joinCommunityBtn.hidden = true;
      successMsgEl.textContent = 'No active plan yet — pick one below to get started.';
    }
    showStep(stepSuccess);
  }

  // Shared by every path that can lead into startOrder() (openModal,
  // the code-verify handler) so an already-subscribed customer never
  // gets sent back through Razorpay from any of them. Returns the
  // active subscription, or null if there isn't one / the check failed
  // — callers fall through to startOrder() on null either way.
  async function checkActiveSubscription(token) {
    try {
      const res = await fetch(`${API_BASE}/dashboard/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.subscription && data.subscription.status === 'active') {
        return data.subscription;
      }
    } catch (err) {
      // treat as "no active subscription" — caller falls through to normal checkout
    }
    return null;
  }

  async function openModal(planId) {
    pendingPlanId = planId;
    setMsg('');
    modal.hidden = false;

    const { data } = await supabaseAuth.getSession();
    if (!data.session) {
      showStep(stepEmail);
      return;
    }

    const token = data.session.access_token;
    showStep(stepProcessing);
    processingMsg.textContent = 'Checking your account…';
    const activeSubscription = await checkActiveSubscription(token);
    if (activeSubscription) {
      renderPlanStatus(activeSubscription);
      return;
    }
    startOrder(token);
  }

  function closeModal() {
    modal.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  document.querySelectorAll('[data-plan-id]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-plan-id')));
  });

  if (navMyPlanBtn) {
    navMyPlanBtn.addEventListener('click', async () => {
      const { data } = await supabaseAuth.getSession();
      if (!data.session) return; // button is only shown while a session exists

      setMsg('');
      modal.hidden = false;
      showStep(stepProcessing);
      processingMsg.textContent = 'Checking your plan…';
      try {
        const res = await fetch(`${API_BASE}/dashboard/me`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const meData = await res.json();
        renderPlanStatus(meData.success ? meData.subscription : null);
      } catch (err) {
        showStep(stepEmail);
        setMsg('Network error. Is the backend running?', 'error');
      }
    });
  }

  document.querySelectorAll('input[name="checkoutWhatsapp"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      whatsappHint.hidden = radio.value !== 'no' || !radio.checked;
    });
  });

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const whatsappChecked = document.querySelector('input[name="checkoutWhatsapp"]:checked');
    const whatsappAvailable = !!whatsappChecked && whatsappChecked.value === 'yes';

    setMsg('Sending code…');
    const { error } = await supabaseAuth.signInWithOtp({ email });
    if (error) {
      setMsg(error.message || 'Could not send code.', 'error');
      return;
    }
    pendingEmail = email;
    pendingPhone = phone;
    pendingWhatsappAvailable = whatsappAvailable;
    showStep(stepCode);
    setMsg('Code sent — check your email.', 'success');
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    setMsg('Verifying…');

    console.log('verifyOtp →', { email: pendingEmail, tokenLength: code.length });
    const { data, error } = await supabaseAuth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: 'email',
    });
    if (error || !data.session) {
      setMsg((error && error.message) || 'Incorrect code.', 'error');
      return;
    }

    const token = data.session.access_token;
    try {
      const res = await fetch(`${API_BASE}/auth/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: pendingPhone, whatsapp_available: pendingWhatsappAvailable }),
      });
      const profileData = await res.json();
      if (!profileData.success) {
        setMsg(profileData.error || 'Could not save your details.', 'error');
        return;
      }
    } catch (err) {
      setMsg('Network error. Is the backend running?', 'error');
      return;
    }

    setMsg('');
    showStep(stepProcessing);
    processingMsg.textContent = 'Checking your account…';
    const activeSubscription = await checkActiveSubscription(token);
    if (activeSubscription) {
      renderPlanStatus(activeSubscription);
      return;
    }
    await startOrder(token);
  });

  async function startOrder(token) {
    showStep(stepProcessing);
    processingMsg.textContent = 'Creating your order…';

    let orderData;
    try {
      const res = await fetch(`${API_BASE}/orders/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: pendingPlanId }),
      });
      orderData = await res.json();

      if (res.status === 401) {
        await supabaseAuth.signOut();
        showStep(stepEmail);
        setMsg('Your session expired — log in again.', 'error');
        return;
      }
      if (!orderData.success) {
        showStep(stepEmail);
        setMsg(orderData.error || 'Could not start checkout.', 'error');
        return;
      }
    } catch (err) {
      showStep(stepEmail);
      setMsg('Network error. Is the backend running?', 'error');
      return;
    }

    openRazorpay(orderData, token);
  }

  function openRazorpay(orderData, token) {
    const rzp = new Razorpay({
      key: orderData.key_id,
      order_id: orderData.order_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Everante',
      description: 'Membership payment',
      theme: { color: '#D8A65C' },
      handler: function () {
        // Activation happens server-side via the Razorpay webhook, not
        // in this callback — this only confirms Razorpay itself
        // accepted the payment client-side.
        pollForActivation(token);
      },
      modal: {
        ondismiss: function () {
          showStep(stepEmail);
          setMsg('Payment cancelled.', 'error');
        },
      },
    });
    rzp.on('payment.failed', function () {
      showStep(stepEmail);
      setMsg('Payment failed. Try again.', 'error');
    });
    rzp.open();
  }

  async function pollForActivation(token) {
    showStep(stepProcessing);
    processingMsg.textContent = 'Payment received — activating your subscription…';

    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const res = await fetch(`${API_BASE}/dashboard/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.subscription && data.subscription.status === 'active') {
          renderPlanStatus(data.subscription);
          return;
        }
      } catch (err) {
        // keep retrying — a transient network hiccup shouldn't stop the poll
      }
    }

    processingMsg.textContent =
      "Payment received — it's taking longer than usual to activate. Check your dashboard again shortly.";
  }

  if (doneBtn) doneBtn.addEventListener('click', () => {
    closeModal();
  });
  }
})();
