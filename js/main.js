/* Sufian Rasheed — small, dependency-free site script */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- intro (home only; overlay is inserted by the inline script in index.html) ---- */
  var intro = document.querySelector('.intro');
  function ready() { root.classList.add('ready'); }
  if (intro) {
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      ready();
      setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 400);
    };
    var skip = function () { if (done) return; intro.classList.add('skip'); finish(); };
    intro.addEventListener('animationend', function (e) { if (e.target === intro) finish(); });
    intro.addEventListener('click', skip);
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { skip(); document.removeEventListener('keydown', k); } });
    intro.addEventListener('touchstart', skip, { passive: true });
    setTimeout(finish, 2600);
  } else {
    ready();
  }

  /* ---- header ---- */
  var hdr = document.querySelector('.hdr');
  var onScroll = function () { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---- mobile menu ---- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('mmenu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (menu) { if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', ''); }
  }
  if (burger && menu) {
    setMenu(false);
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) setMenu(false); });
  }

  /* ---- enter-triggered reveals ---- */
  var items = document.querySelectorAll('.rv, .rv-img');
  if (!reduce && 'IntersectionObserver' in window && items.length) {
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- counters ---- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = parseInt(el.getAttribute('data-count'), 10), from = parseInt(el.getAttribute('data-from') || '0', 10);
        var suf = el.getAttribute('data-suffix') || '';
        cio.unobserve(el);
        if (reduce) return;
        var t0 = null, dur = 1400;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(from + (end - from) * e) + suf;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { cio.observe(n); });
  }

  /* ---- work filters ---- */
  var chips = document.querySelectorAll('.chip[data-filter]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      chips.forEach(function (x) { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      document.querySelectorAll('.post[data-brand]').forEach(function (p) { p.hidden = !(f === 'all' || p.getAttribute('data-brand') === f); });
    });
  });

  /* ---- copy buttons ---- */
  var toast = document.querySelector('.toast');
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      var say = function (m) { if (!toast) return; toast.textContent = m; toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { say('Copied ' + v); }, function () { say('Could not copy'); });
      else say(v);
    });
  });

  /* ---- year ---- */
  document.querySelectorAll('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
