(function () {
  'use strict';

  // Update this when the backend deploys somewhere other than local dev.
  const API_BASE = 'http://localhost:3000';
  const TOKEN_KEY = 'everante_token';

  const dashAuth = document.getElementById('dashAuth');
  if (!dashAuth) return; // dashboard section not on this page

  const phoneForm = document.getElementById('dashPhoneForm');
  const codeForm = document.getElementById('dashCodeForm');
  const phoneInput = document.getElementById('dashPhoneInput');
  const codeInput = document.getElementById('dashCodeInput');
  const msgEl = document.getElementById('dashAuthMsg');
  const greetingEl = document.querySelector('.dash-hi');
  const planInfoEl = document.querySelector('.dash-date');

  let pendingPhone = '';

  function setMsg(text, type) {
    msgEl.textContent = text || '';
    msgEl.className = 'dash-auth-msg' + (type ? ' ' + type : '');
  }

  // dateStr is 'YYYY-MM-DD' from the API — parsed and formatted
  // explicitly in UTC, not left to default Date parsing/toString.
  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  function setGreeting(text) {
    // dash-hi's first child is the greeting text node; the sun icon span
    // is a sibling, so replacing just the text node's content leaves it intact.
    greetingEl.childNodes[0].textContent = text;
  }

  async function loadDashboard(token) {
    let res;
    try {
      res = await fetch(`${API_BASE}/dashboard/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('dashboard fetch failed', err);
      return false;
    }

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }

    const data = await res.json();
    if (!data.success) return false;

    dashAuth.hidden = true;
    setGreeting('Welcome back ');

    if (!data.subscription) {
      planInfoEl.textContent = 'No active plan yet — pick one above to get started.';
      planInfoEl.removeAttribute('title');
      return true;
    }

    const sub = data.subscription;
    const dayWord = sub.days_remaining === 1 ? 'day' : 'days';
    planInfoEl.textContent =
      `${sub.plan_name} · ${sub.days_remaining} ${dayWord} left · Auto-pay ${sub.auto_pay ? 'ON' : 'OFF'}`;
    planInfoEl.title = `${formatDate(sub.start_date)} – ${formatDate(sub.end_date)}`;
    return true;
  }

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
      phoneForm.hidden = true;
      codeForm.hidden = false;
      codeInput.focus();
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
      await loadDashboard(data.token);
    } catch (err) {
      setMsg('Network error. Is the backend running?', 'error');
    }
  });

  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    loadDashboard(existingToken);
  }
})();
