/* Sufian Rasheed portfolio — interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, smoothTouch: false });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- split headings into lines/words ---------- */
  $$('[data-split]').forEach(el => {
    const html = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = html.map(line => `<span class="split-line"><span>${line.trim()}</span></span>`).join('');
  });

  /* ---------- header ---------- */
  const hdr = $('.hdr');
  const onScroll = () => hdr && hdr.classList.toggle('is-solid', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $('.burger');
  if (burger) burger.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGSAP) gsap.fromTo('.mmenu a.big', { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: .06, duration: .8, ease: 'expo.out', delay: .2 });
  });

  /* ---------- cursor ---------- */
  if (!fine || reduce) $$('.cursor,.cursor-dot').forEach(el => el.remove());
  if (fine && !reduce) {
    const c = $('.cursor'), d = $('.cursor-dot');
    if (c && d) {
      let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
      addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; d.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; });
      const loop = () => { cx += (x - cx) * .16; cy += (y - cy) * .16; c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
      loop();
      $$('a,button,[data-cursor]').forEach(el => {
        el.addEventListener('mouseenter', () => { c.classList.add('is-hover'); const t = el.getAttribute('data-cursor'); if (t) c.querySelector('span').textContent = t; else c.querySelector('span').textContent = 'View'; });
        el.addEventListener('mouseleave', () => c.classList.remove('is-hover'));
      });
    }
    /* magnetic */
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * .3, my = (e.clientY - r.top - r.height / 2) * .35;
        el.style.transform = `translate(${mx}px,${my}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    /* spotlight on service cards */
    $$('.svc').forEach(el => el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  /* ---------- page transitions ---------- */
  const curtain = $('.curtain');
  const bars = curtain ? $$('i', curtain) : [];
  const enterPage = () => {
    if (!hasGSAP || !bars.length) return;
    gsap.set(bars, { scaleY: 1, transformOrigin: 'top' });
    gsap.to(bars, { scaleY: 0, duration: .8, ease: 'expo.inOut', stagger: .06 });
  };
  $$('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || a.target === '_blank') return;
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      document.documentElement.classList.remove('menu-open');
      if (!hasGSAP || reduce || !bars.length) { location.href = href; return; }
      gsap.set(bars, { transformOrigin: 'bottom' });
      gsap.to(bars, { scaleY: 1, duration: .6, ease: 'expo.inOut', stagger: .05, onComplete: () => { location.href = href; } });
    });
  });
  addEventListener('pageshow', e => { if (e.persisted && hasGSAP) gsap.set(bars, { scaleY: 0 }); });

  /* ---------- preloader (first visit in session) ---------- */
  const loader = $('.loader');
  let seen = false;
  try { seen = sessionStorage.getItem('sr_seen') === '1'; sessionStorage.setItem('sr_seen', '1'); } catch (e) {}
  const start = () => { document.documentElement.classList.add('loaded'); intro(); };
  if (loader && hasGSAP && !seen && !reduce) {
    const count = $('.loader__count', loader);
    const o = { v: 0 };
    const tl = gsap.timeline({ onComplete: start });
    tl.to('.loader__logo', { opacity: 1, scale: 1, duration: .7, ease: 'expo.out' })
      .to('.loader__name span', { y: 0, duration: .9, ease: 'expo.out' }, '-=.3')
      .to('.loader__bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, '-=.6')
      .to(o, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => count.textContent = String(Math.round(o.v)).padStart(3, '0') }, '<')
      .to(loader, { yPercent: -100, duration: .9, ease: 'expo.inOut' }, '+=.15');
  } else {
    if (loader) loader.style.display = 'none';
    enterPage();
    start();
  }

  /* ---------- intro + scroll reveals ---------- */
  function intro() {
    if (!hasGSAP || reduce) { $$('.split-line>span').forEach(s => s.style.transform = 'none'); return; }
    const heroLines = $$('.hero h1 .split-line>span, .phero .h1 .split-line>span');
    gsap.from(heroLines, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .08 });
    gsap.from('.hero__eyebrow, .hero__lede, .hero .hero__ctas, .phero .mono, .phero .lede, .phero .notice', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, delay: .35 });
    gsap.from('.portrait', { clipPath: 'inset(100% 0 0 0 round 220px 220px 22px 22px)', duration: 1.4, ease: 'expo.inOut', delay: .1 });
    gsap.from('.portrait img', { scale: 1.35, duration: 1.8, ease: 'expo.out', delay: .1 });
    gsap.from('.hdr__row > *', { y: -20, opacity: 0, duration: .8, stagger: .06, ease: 'expo.out', delay: .2 });

    if (!window.ScrollTrigger) return;
    $$('.sec [data-split], .cta [data-split]').forEach(h => {
      gsap.from($$('.split-line>span', h), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: h, start: 'top 85%' } });
    });
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-stagger]').forEach(g => {
      gsap.from(g.children, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: g, start: 'top 85%' } });
    });
    /* parallax images */
    $$('[data-parallax]').forEach(el => {
      gsap.to(el, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* hero portrait drift */
    if ($('.portrait')) gsap.to('.portrait', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    /* word-by-word reading highlight */
    $$('[data-read]').forEach(p => {
      p.innerHTML = p.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
      gsap.to($$('.w', p), { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });
    /* counters */
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => el.textContent = Math.round(o.v) + suf });
    });
    /* funnel */
    $$('.fbar').forEach((b, i) => {
      ScrollTrigger.create({ trigger: b, start: 'top 85%', onEnter: () => setTimeout(() => b.style.setProperty('--fill', b.dataset.fill || 1), i * 180) });
    });
    $$('[data-fcount]').forEach(el => {
      const end = parseFloat(el.dataset.fcount); const o = { v: 0 };
      gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-US') + (el.dataset.suffix || '') });
    });
  }
  if (reduce) $$('.fbar').forEach(b => b.style.setProperty('--fill', b.dataset.fill || 1));
  if (!hasGSAP) $$('.fbar').forEach(b => b.style.setProperty('--fill', b.dataset.fill || 1));

  /* ---------- hero gold particle field (fallback / overlay) ---------- */
  const cv = $('#field');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, pts = [];
    const DPR = Math.min(devicePixelRatio || 1, 2);
    const N = innerWidth < 700 ? 46 : 110;
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      pts = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: -Math.random() * .35 - .05, r: Math.random() * 1.6 + .3, a: Math.random() * .6 + .2 }));
    };
    resize(); addEventListener('resize', resize);
    let mx = -999, my = -999;
    addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    let visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    const draw = () => {
      if (visible) {
        ctx.clearRect(0, 0, W, H);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 14000) { p.x += dx * .02; p.y += dy * .02; }
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,196,110,${p.a})`; ctx.fill();
        }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < 9000) { ctx.strokeStyle = `rgba(212,175,95,${.12 * (1 - d / 9000)})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    draw();
  }

  /* hero video: play only when allowed, keep poster otherwise */
  const vid = $('.hero__media video');
  if (vid) {
    if (reduce) vid.removeAttribute('autoplay');
    else { const p = vid.play && vid.play(); if (p && p.catch) p.catch(() => {}); }
  }

  /* ---------- funnel flow particles ---------- */
  const fc = $('.flow-canvas');
  if (fc && !reduce) {
    const ctx = fc.getContext('2d'); const DPR = Math.min(devicePixelRatio || 1, 2);
    let W, H, dots = [];
    const size = () => { W = fc.clientWidth; H = fc.clientHeight; fc.width = W * DPR; fc.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    size(); addEventListener('resize', size);
    const spawn = () => dots.push({ x: -10, y: H * (.2 + Math.random() * .6), v: 1.2 + Math.random() * 1.6, life: 1 });
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      if (Math.random() < .5) spawn();
      dots = dots.filter(d => d.x < W + 20 && d.life > 0);
      for (const d of dots) {
        d.x += d.v;
        const stage = Math.floor((d.x / W) * 4);
        if (Math.random() < .004 * (stage + 1)) d.life = 0; /* drop-off at each stage */
        d.y += (H * .5 - d.y) * .004 * (stage + 1);
        ctx.fillStyle = 'rgba(243,217,143,.55)'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------- work filters ---------- */
  const chips = $$('.chip[data-filter]');
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c => c.classList.toggle('is-on', c === ch));
    const f = ch.dataset.filter;
    $$('.post').forEach(p => {
      const show = f === 'all' || p.dataset.brand === f;
      if (hasGSAP && !reduce) {
        if (show) { p.classList.remove('is-hidden'); gsap.fromTo(p, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out' }); }
        else p.classList.add('is-hidden');
      } else p.classList.toggle('is-hidden', !show);
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));

  /* ---------- copy buttons ---------- */
  const toast = $('.toast');
  const showToast = msg => { if (!toast) return; toast.textContent = msg; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 1800); };
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.copy;
    const done = () => showToast('Copied: ' + v);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done).catch(() => fallback(v, done));
    else fallback(v, done);
  }));
  function fallback(v, done) { const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }

  /* to top */
  $$('.totop').forEach(b => b.addEventListener('click', () => lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: 'smooth' })));

  /* year */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
