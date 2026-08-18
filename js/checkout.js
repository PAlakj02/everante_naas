(function () {
  'use strict';

  // TODO: replace with the deployed backend URL before going live.
  const API_BASE = 'https://everante-naas.onrender.com';
  const TOKEN_KEY = 'everante_token';
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  const backdrop = document.getElementById('checkoutModalBackdrop');
  const closeBtn = document.getElementById('checkoutModalClose');
  const stepPhone = document.getElementById('checkoutStepPhone');
  const stepCode = document.getElementById('checkoutStepCode');
  const stepProcessing = document.getElementById('checkoutStepProcessing');
  const stepSuccess = document.getElementById('checkoutStepSuccess');
  const processingMsg = document.getElementById('checkoutProcessingMsg');
  const phoneForm = document.getElementById('checkoutPhoneForm');
  const codeForm = document.getElementById('checkoutCodeForm');
  const phoneInput = document.getElementById('checkoutPhoneInput');
  const codeInput = document.getElementById('checkoutCodeInput');
  const msgEl = document.getElementById('checkoutModalMsg');
  const doneBtn = document.getElementById('checkoutDone');
  const successMsgEl = document.getElementById('checkoutSuccessMsg');
  const joinCommunityBtn = document.getElementById('checkoutJoinCommunity');

  let pendingPhone = '';
  let pendingPlanId = '';

  function setMsg(text, type) {
    msgEl.textContent = text || '';
    msgEl.className = 'checkout-modal-msg' + (type ? ' ' + type : '');
  }

  function showStep(step) {
    [stepPhone, stepCode, stepProcessing, stepSuccess].forEach((el) => {
      el.hidden = el !== step;
    });
  }

  function openModal(planId) {
    pendingPlanId = planId;
    setMsg('');
    modal.hidden = false;

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      startOrder(token);
    } else {
      showStep(stepPhone);
    }
  }

  function closeModal() {
    modal.hidden = true;
  }

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.querySelectorAll('[data-plan-id]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-plan-id')));
  });

  phoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    setMsg('Sending code…');
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setMsg(data.error || 'Could not send code.', 'error');
        return;
      }
      pendingPhone = phone;
      showStep(stepCode);
      // NOTE: remove this hint once real MSG91 sending is live — SMS is mocked for now.
      setMsg('Code sent — check the backend console (SMS is mocked in this build).', 'success');
    } catch (err) {
      setMsg('Network error. Is the backend running?', 'error');
    }
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    setMsg('Verifying…');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pendingPhone, code }),
      });
      const data = await res.json();
      if (!data.success) {
        setMsg(data.error || 'Incorrect code.', 'error');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setMsg('');
      await startOrder(data.token);
    } catch (err) {
      setMsg('Network error. Is the backend running?', 'error');
    }
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
        localStorage.removeItem(TOKEN_KEY);
        showStep(stepPhone);
        setMsg('Your session expired — log in again.', 'error');
        return;
      }
      if (!orderData.success) {
        showStep(stepPhone);
        setMsg(orderData.error || 'Could not start checkout.', 'error');
        return;
      }
    } catch (err) {
      showStep(stepPhone);
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
          showStep(stepPhone);
          setMsg('Payment cancelled.', 'error');
        },
      },
    });
    rzp.on('payment.failed', function () {
      showStep(stepPhone);
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
          if (data.subscription.whatsapp_group_link) {
            joinCommunityBtn.href = data.subscription.whatsapp_group_link;
            joinCommunityBtn.hidden = false;
            successMsgEl.textContent = 'Your subscription is active. Join the community for daily updates.';
          } else {
            joinCommunityBtn.hidden = true;
            successMsgEl.textContent = 'Your subscription is active — your community invite is coming shortly.';
          }
          showStep(stepSuccess);
          return;
        }
      } catch (err) {
        // keep retrying — a transient network hiccup shouldn't stop the poll
      }
    }

    processingMsg.textContent =
      "Payment received — it's taking longer than usual to activate. Check your dashboard again shortly.";
  }

  doneBtn.addEventListener('click', () => {
    closeModal();
  });
})();
