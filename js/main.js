/* ============================================================
   EVERANTE — cinematic interactions
   Lenis smooth scroll + vanilla scroll engine (no heavy deps)
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ 3. PRELOADER ============ */
  function ready() { document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
  if (reduceMotion) { ready(); }
  else {
    var done = false;
    var finish = function () { if (!done) { done = true; setTimeout(ready, 650); } };
    window.addEventListener('load', finish);
    setTimeout(finish, 2600); /* never trap the user behind a slow CDN */
  }

  /* ============ 4. LENIS SMOOTH SCROLL ============ */
  var lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* anchor navigation through Lenis */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ============ 5. SUNRISE BACKGROUND + NAV THEME ============ */
  var bgSections = Array.prototype.slice.call(document.querySelectorAll('[data-bg]'));
  var nav = document.getElementById('nav');
  var bgObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      document.body.style.backgroundColor = en.target.getAttribute('data-bg');
      if (nav) nav.classList.toggle('over-light', en.target.getAttribute('data-nav') === 'light');
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  bgSections.forEach(function (s) { bgObserver.observe(s); });

  /* hide nav on scroll down, show on scroll up */
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('hidden', y > 500 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* ---- the pocket -------------------------------------------
     Always present once the page moves, always showing its own
     "Start my mornings" button — it no longer contracts to a
     bare price tab when a rival CTA is on screen. A visitor should
     never scroll past this bar and find its button gone. */
  var joinbar = document.getElementById('joinbar');
  if (joinbar) {
    joinbar.removeAttribute('hidden');
    var sync = function () {
      var moved = window.scrollY > window.innerHeight * 0.45;
      joinbar.classList.toggle('show', moved);
    };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  /* ============ 6. REVEALS ============ */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { revealObserver.observe(el); });

  /* ============ 7. STAT COUNTERS ============ */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var t0 = null, dur = 1500;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = dec ? val.toFixed(dec)
        : Math.round(val).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    if (reduceMotion) { el.textContent = dec ? target.toFixed(dec) : target.toLocaleString('en-IN'); return; }
    requestAnimationFrame(step);
  }
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { animateCount(en.target); countObserver.unobserve(en.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countObserver.observe(el); });

  /* ============ 11. rAF SCROLL EFFECT ============ */
  var heroContent = document.querySelector('.hero-content');
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

  function frame() {
    var y = window.scrollY;

    /* hero content drifts up + fades as you leave */
    if (heroContent && y < vh * 1.2) {
      var p = Math.min(y / (vh * 0.9), 1);
      heroContent.style.transform = 'translateY(' + (-p * 60).toFixed(1) + 'px)';
      heroContent.style.opacity = (1 - p * 1.1).toFixed(2);
    }


    requestAnimationFrame(frame);
  }
  if (!reduceMotion) requestAnimationFrame(frame);


  /* ============ 12. SHELF DRAG-TO-SCROLL ============ */
  var shelf = document.getElementById('shelf');
  if (shelf) {
    var isDown = false, startX = 0, startScroll = 0, moved = false;
    shelf.addEventListener('pointerdown', function (e) {
      isDown = true; moved = false;
      startX = e.clientX; startScroll = shelf.scrollLeft;
      shelf.classList.add('dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      shelf.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      isDown = false; shelf.classList.remove('dragging');
    });
    shelf.addEventListener('click', function (e) { if (moved) e.preventDefault(); }, true);
  }

  /* ============ 13. WHATSAPP CTA ============
     Single source of truth for the WhatsApp community link. The
     "Join WhatsApp" action-step and the "Talk to Everante" secondary
     CTA (both in the Action section, tagged [data-whatsapp-cta]) are
     real <a> elements with no href — correctly non-interactive and
     out of tab order — until this constant is set. Set it once here
     when the real link exists; nothing in the HTML needs to change. */
  var WHATSAPP_URL = ''; // e.g. 'https://wa.me/91XXXXXXXXXX' or a chat.whatsapp.com invite link
  if (WHATSAPP_URL) {
    document.querySelectorAll('[data-whatsapp-cta]').forEach(function (el) {
      el.href = WHATSAPP_URL;
      el.target = '_blank';
      el.rel = 'noopener';
      el.classList.remove('is-inert');
      el.removeAttribute('aria-disabled');
    });
    document.querySelectorAll('[data-whatsapp-status]').forEach(function (el) { el.remove(); });
  }

})();
