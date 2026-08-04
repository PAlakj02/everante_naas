/* ============================================================
   EVERANTE — cinematic interactions
   Lenis smooth scroll + vanilla scroll engine (no heavy deps)
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ 1. BOTTLE RENDERER ============
     Photoreal-styled SVG bottles. Swap these containers for
     Ideogram-generated renders when image credits are available. */
  var FLAVORS = {
    cacao:   { top: '#C9976B', bot: '#4A2C18', cap: '#1E1710', tag: 'CC' },
    berry:   { top: '#EE9AAE', bot: '#8E3550', cap: '#241820', tag: 'BR' },
    coffee:  { top: '#C8A47E', bot: '#54371F', cap: '#1C140E', tag: 'CB' },
    vanilla: { top: '#F2E3C8', bot: '#C39A58', cap: '#241C12', tag: 'VR' },
    chai:    { top: '#E4C39A', bot: '#8A5A3B', cap: '#241C12', tag: 'CS' }
  };
  var bottleUid = 0;

  function bottleSVG(flavor, h) {
    var f = FLAVORS[flavor] || FLAVORS.cacao;
    var id = 'bg' + (++bottleUid);
    var w = Math.round(h * 0.36);
    return '' +
    '<svg class="bottle-svg" width="' + w + '" height="' + h + '" viewBox="0 0 120 340" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="' + id + 'j" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + f.top + '"/><stop offset="1" stop-color="' + f.bot + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".34"/>' +
          '<stop offset=".22" stop-color="#fff" stop-opacity=".05"/>' +
          '<stop offset=".78" stop-color="#000" stop-opacity=".06"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".22"/>' +
        '</linearGradient>' +
        '<clipPath id="' + id + 'c"><path d="M36 66 Q36 50 52 47 L68 47 Q84 50 84 66 L86 296 Q86 320 60 320 Q34 320 34 296 Z"/></clipPath>' +
      '</defs>' +
      /* shadow */
      '<ellipse cx="60" cy="330" rx="40" ry="7" fill="#000" opacity=".35"/>' +
      /* cap */
      '<rect x="44" y="8" width="32" height="26" rx="7" fill="' + f.cap + '"/>' +
      '<rect x="44" y="8" width="32" height="26" rx="7" fill="none" stroke="#fff" stroke-opacity=".14"/>' +
      '<ellipse cx="60" cy="11" rx="13" ry="2.6" fill="#fff" opacity=".16"/>' +
      /* neck */
      '<rect x="49" y="33" width="22" height="16" fill="' + f.cap + '" opacity=".9"/>' +
      /* smoothie body */
      '<g clip-path="url(#' + id + 'c)">' +
        '<rect x="30" y="42" width="60" height="284" fill="url(#' + id + 'j)"/>' +
        /* headspace (air gap at shoulder) */
        '<rect x="30" y="42" width="60" height="26" fill="#0A0807" opacity=".22"/>' +
        /* inner glow */
        '<ellipse cx="60" cy="300" rx="34" ry="26" fill="#fff" opacity=".1"/>' +
      '</g>' +
      /* glass shading overlay */
      '<path d="M36 66 Q36 50 52 47 L68 47 Q84 50 84 66 L86 296 Q86 320 60 320 Q34 320 34 296 Z" fill="url(#' + id + 'g)"/>' +
      '<path d="M36 66 Q36 50 52 47 L68 47 Q84 50 84 66 L86 296 Q86 320 60 320 Q34 320 34 296 Z" fill="none" stroke="#fff" stroke-opacity=".26" stroke-width="1.4"/>' +
      /* highlight streak */
      '<path d="M43 74 Q42 62 50 56 L52 56 Q45 66 46 78 L47 270 Q47 288 54 296 L52 297 Q43 289 43 272 Z" fill="#fff" opacity=".38"/>' +
      /* condensation */
      '<circle cx="76" cy="120" r="1.7" fill="#fff" opacity=".5"/>' +
      '<circle cx="72" cy="176" r="1.2" fill="#fff" opacity=".4"/>' +
      '<circle cx="79" cy="220" r="1.5" fill="#fff" opacity=".45"/>' +
      '<circle cx="44" cy="150" r="1.2" fill="#fff" opacity=".35"/>' +
      /* label */
      '<rect x="45" y="150" width="30" height="96" rx="4" fill="#F6EFE3" opacity=".96"/>' +
      '<rect x="45" y="150" width="30" height="96" rx="4" fill="none" stroke="#000" stroke-opacity=".06"/>' +
      '<text x="60" y="164" text-anchor="middle" font-family="Inter, sans-serif" font-size="6.5" letter-spacing="1.2" fill="#26190F" opacity=".85">EVERANTE</text>' +
      '<line x1="52" y1="170" x2="68" y2="170" stroke="#26190F" stroke-opacity=".25" stroke-width=".8"/>' +
      '<text x="60" y="204" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="17" fill="' + f.bot + '">' + f.tag + '</text>' +
      '<circle cx="60" cy="224" r="5" fill="none" stroke="' + f.bot + '" stroke-width="1"/>' +
      '<path d="M55 226 a5 5 0 0 1 10 0" fill="' + f.bot + '"/>' +
      '<text x="60" y="240" text-anchor="middle" font-family="Inter, sans-serif" font-size="4.6" letter-spacing="1" fill="#26190F" opacity=".6">BLENDED FRESH DAILY</text>' +
    '</svg>';
  }

  document.querySelectorAll('[data-bottle]').forEach(function (el) {
    el.innerHTML = bottleSVG(el.getAttribute('data-bottle'), parseInt(el.getAttribute('data-h') || '220', 10));
  });

  /* ============ 2. STREAK CALENDAR DOTS ============ */
  var dotsEl = document.querySelector('.dots');
  if (dotsEl) {
    var html = '';
    for (var d = 0; d < 28; d++) {
      var filled = d < 26 || d === 27; /* one missed day — honest data */
      html += '<i class="' + (filled ? 'f' : '') + '" style="--i:' + d + '"></i>';
    }
    dotsEl.innerHTML = html;
  }

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

  /* ---- sticky membership bar --------------------------------
     The rule is "never compete with a visible CTA", so watch the
     buttons themselves rather than guessing from section geometry.
     Measuring sections meant an 88px sliver of a tall mobile
     pricing block still counted as "pricing on screen" and kept the
     bar suppressed for most of the page. Observing the real CTAs is
     exact and needs no per-breakpoint thresholds. */
  var joinbar = document.getElementById('joinbar');
  if (joinbar) {
    joinbar.removeAttribute('hidden');
    var rivals = document.querySelectorAll('.hero-ctas .btn, .price .btn, .cta .btn');
    var visibleRivals = 0;
    var pricingSec = document.getElementById('pricing');
    /* Also stand down while pricing itself holds the screen: the bar
       links to #pricing, so showing it there is a jump to nowhere.
       Measured as a share of the viewport rather than "any pixel
       visible" — a tall mobile section leaves an 88px tail behind
       that should not count as present. */
    var pricingHolds = function () {
      if (!pricingSec) return false;
      var r = pricingSec.getBoundingClientRect(), h = window.innerHeight;
      var shown = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0));
      return shown / h > 0.35;
    };
    var sync = function () {
      joinbar.classList.toggle('show',
        window.scrollY > window.innerHeight * 0.9 &&
        visibleRivals === 0 && !pricingHolds());
    };
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.__vis = en.isIntersecting;
      });
      visibleRivals = 0;
      rivals.forEach(function (r) { if (r.__vis) visibleRivals++; });
      sync();
    }, { rootMargin: '0px 0px -40px 0px' });
    rivals.forEach(function (r) { ctaObserver.observe(r); });
    window.addEventListener('scroll', sync, { passive: true });
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

  /* ============ 8. SCORE RINGS + CARD STATE ============ */
  var ringObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-ring]').forEach(function (ring) {
        var pct = parseFloat(ring.getAttribute('data-ring')) / 100;
        var len = parseFloat(ring.getAttribute('stroke-dasharray'));
        ring.style.strokeDashoffset = (len * (1 - pct)).toFixed(1);
      });
      ringObserver.unobserve(en.target);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.dash, .mini-dash').forEach(function (el) { ringObserver.observe(el); });

  /* ============ 10. MANIFESTO WORD REVEAL (scroll-scrubbed) ============ */
  var mani = document.getElementById('maniText');
  var maniWords = [];
  if (mani) {
    var words = mani.textContent.trim().split(/\s+/);
    mani.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    maniWords = Array.prototype.slice.call(mani.querySelectorAll('.w'));
  }

  /* ============ 11. rAF SCROLL EFFECT (manifesto scrub) ============ */
  var heroContent = document.querySelector('.hero-content');
  var heroBottles = document.querySelector('.hero-bottles');
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

  function frame() {
    var y = window.scrollY;


    /* hero content drifts up + fades as you leave */
    if (heroContent && y < vh * 1.2) {
      var p = Math.min(y / (vh * 0.9), 1);
      heroContent.style.transform = 'translateY(' + (-p * 60).toFixed(1) + 'px)';
      heroContent.style.opacity = (1 - p * 1.1).toFixed(2);
      if (heroBottles) heroBottles.style.transform = 'translateY(' + (p * 90).toFixed(1) + 'px)';
    }

    /* manifesto scrub */
    if (maniWords.length) {
      var mr = mani.getBoundingClientRect();
      if (mr.bottom > 0 && mr.top < vh) {
        var start = vh * 0.82, end = vh * 0.3;
        var prog = Math.max(0, Math.min(1, (start - mr.top) / (start - end)));
        var onCount = Math.floor(prog * maniWords.length);
        maniWords.forEach(function (w, i) { w.classList.toggle('on', i < onCount); });
      }
    }

    requestAnimationFrame(frame);
  }
  if (!reduceMotion) requestAnimationFrame(frame);
  else if (maniWords.length) maniWords.forEach(function (w) { w.classList.add('on'); });

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


})();
