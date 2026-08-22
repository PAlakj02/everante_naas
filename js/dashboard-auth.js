(function () {
  'use strict';

  const API_BASE = 'https://everante-naas.onrender.com';
  const supabaseAuth = window.everanteSupabase.auth;

  const dashAuth = document.getElementById('dashAuth');
  if (!dashAuth) return; // dashboard section not on this page

  const emailForm = document.getElementById('dashEmailForm');
  const codeForm = document.getElementById('dashCodeForm');
  const emailInput = document.getElementById('dashEmailInput');
  const codeInput = document.getElementById('dashCodeInput');
  const msgEl = document.getElementById('dashAuthMsg');
  const greetingEl = document.querySelector('.dash-hi');
  const planInfoEl = document.querySelector('.dash-date');

  let pendingEmail = '';

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
      res = await fetch(`${API_BASE}/dashboard/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('dashboard fetch failed', err);
      return false;
    }

    if (res.status === 401) {
      await supabaseAuth.signOut();
      return false;
    }

    if (res.status === 403) {
      await supabaseAuth.signOut();
      setMsg("This dashboard is restricted — your email doesn't have access.", 'error');
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

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    setMsg('Sending code…');

    const { error } = await supabaseAuth.signInWithOtp({ email });
    if (error) {
      setMsg(error.message || 'Could not send code.', 'error');
      return;
    }
    pendingEmail = email;
    emailForm.hidden = true;
    codeForm.hidden = false;
    codeInput.focus();
    setMsg('Code sent — check your email.', 'success');
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    setMsg('Verifying…');

    const { data, error } = await supabaseAuth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: 'email',
    });
    if (error || !data.session) {
      setMsg((error && error.message) || 'Incorrect code.', 'error');
      return;
    }

    setMsg('');
    await loadDashboard(data.session.access_token);
  });

  supabaseAuth.getSession().then(({ data }) => {
    if (data.session) {
      loadDashboard(data.session.access_token);
    }
  });
})();
