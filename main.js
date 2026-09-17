/* ==========================================================================
   Version A — interaction + motion layer
   Scroll triggers use IntersectionObserver rootMargin (never a threshold
   ratio) so elements taller than the viewport still fire.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = window.matchMedia('(min-width: 960px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => root.classList.contains('rm');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const REVEAL_MARGIN = '0px 0px -15% 0px';

  /* ------------------------------------------------------------ reveals */
  function initReveals() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: REVEAL_MARGIN, threshold: 0 });
    items.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------- nav: condense */
  function initNavCondense() {
    const nav = $('[data-nav]');
    let ticking = false;
    const update = () => { nav.classList.toggle('is-condensed', window.scrollY > 24); ticking = false; };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------- nav: mega menus */
  function initMegaMenus() {
    const menus = $$('[data-menu]');
    const closeAll = (except) => menus.forEach(m => { if (m !== except) setOpen(m, false); });
    function setOpen(menu, open) {
      const btn = $('.nav__trigger', menu);
      const panel = $('[data-mega]', menu);
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    }
    menus.forEach((menu) => {
      const btn = $('.nav__trigger', menu);
      let timer;
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        closeAll(menu); setOpen(menu, open);
      });
      menu.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(timer); timer = setTimeout(() => { closeAll(menu); setOpen(menu, true); }, 70);
      });
      menu.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(timer); timer = setTimeout(() => setOpen(menu, false), 180);
      });
      menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { setOpen(menu, false); btn.focus(); }
      });
      menu.addEventListener('focusout', (e) => {
        if (!menu.contains(e.relatedTarget)) setOpen(menu, false);
      });
      $$('a', menu).forEach(a => a.addEventListener('click', () => setOpen(menu, false)));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-menu]')) closeAll();
    });
  }

  /* ---------------------------------------------------- mobile sheet */
  function initSheet() {
    const sheet = $('[data-sheet]');
    const burger = $('[data-burger]');
    const closeBtn = $('[data-sheet-close]');
    let lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      void sheet.offsetWidth;
      sheet.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtn.focus(), 60);
    }
    function close() {
      sheet.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const done = () => { sheet.hidden = true; };
      if (reduced()) done(); else setTimeout(done, 520);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    burger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('a, button', sheet).filter(el => el.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('.sheet__toggle', sheet).forEach((t) => {
      t.addEventListener('click', () => {
        const sub = document.getElementById(t.getAttribute('aria-controls'));
        const openNow = t.getAttribute('aria-expanded') !== 'true';
        t.setAttribute('aria-expanded', String(openNow));
        sub.hidden = !openNow;
      });
    });
    $$('a', sheet).forEach(a => a.addEventListener('click', () => { lastFocus = null; close(); }));
  }

  /* ---------------------------------------------- hero: load + wipe */
  function initHero() {
    const hero = $('.hero');
    const media = $('[data-hero-media]');
    const frame = $('.hero__frame', media);
    const blade = $('.hero__blade', media);
    $$('.w__i', hero).forEach((w, i) => w.style.setProperty('--wi', i));

    const finish = () => media.classList.add('is-wiped');
    const loadedAt = performance.now();
    const start = () => {
      hero.classList.add('is-loaded');
      if (reduced()) { finish(); return; }
      // The wipe is the signature moment: run it when the photo is actually on screen
      // (on phones the photo sits below the fold at load).
      const io = new IntersectionObserver((entries) => {
        if (!entries.some(e => e.isIntersecting)) return;
        io.disconnect();
        runWipe(performance.now() - loadedAt < 1200 ? 720 : 180);
      }, { rootMargin: REVEAL_MARGIN, threshold: 0 });
      io.observe(media);
    };

    function runWipe(delay) {
      const W = frame.offsetWidth; const H = frame.offsetHeight;
      const slant = 0.14; // fog edge leans 14% of width across its height
      const angle = Math.atan((slant * W) / H) * 180 / Math.PI;
      blade.style.setProperty('--ba', angle.toFixed(2) + 'deg');
      const duration = 1350;
      const from = -0.02; const to = 1 + slant + 0.04;
      let t0 = null;
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const setAt = (p) => {
        const wx = from + (to - from) * p;
        frame.style.setProperty('--wx', (wx * 100).toFixed(2) + '%');
        blade.style.setProperty('--bx', ((wx - slant / 2) * W).toFixed(1) + 'px');
      };
      setAt(0);
      const step = (ts) => {
        if (reduced()) { finish(); return; }
        if (t0 === null) t0 = ts;
        const p = clamp((ts - t0 - delay) / duration, 0, 1);
        setAt(ease(p));
        if (p < 1) requestAnimationFrame(step); else finish();
      };
      requestAnimationFrame(step);
      // Safety net: never leave the photo fogged if rAF is throttled (background tab).
      setTimeout(finish, delay + duration + 400);
    }

    const go = () => requestAnimationFrame(() => requestAnimationFrame(start));
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(go);
    } else { go(); }
  }

  /* ------------------------------------------------------- parallax */
  function initParallax() {
    const els = $$('[data-parallax]');
    let ticking = false;
    function update() {
      ticking = false;
      const active = desktopQuery.matches && !reduced();
      const vh = window.innerHeight;
      els.forEach((el) => {
        if (!active) { el.style.setProperty('--py', '0px'); return; }
        const host = el.parentElement.getBoundingClientRect();
        if (host.bottom < -100 || host.top > vh + 100) return;
        const factor = parseFloat(el.dataset.parallax) || 0.1;
        const center = host.top + host.height / 2 - vh / 2;
        const max = host.height * 0.06;
        el.style.setProperty('--py', clamp(-center * factor, -max, max).toFixed(1) + 'px');
      });
    }
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    desktopQuery.addEventListener('change', req);
    update();
    return update;
  }

  /* ------------------------------------------------ reviews masonry */
  function initMasonry() {
    const grid = $('[data-masonry]');
    if (!grid) return;
    const items = $$('.review', grid);
    function layout() {
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      if (cols < 2) { grid.classList.remove('is-masonry'); items.forEach(i => { i.style.gridRowEnd = ''; }); return; }
      grid.classList.add('is-masonry');
      items.forEach((item) => {
        const inner = item.firstElementChild;
        const h = inner.getBoundingClientRect().height + 20;
        item.style.gridRowEnd = 'span ' + Math.ceil(h / 4);
      });
    }
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  }

  /* --------------------------------------------- cursor-reactive glow */
  function initGlow() {
    $$('[data-glow]').forEach((card) => {
      const inner = card.firstElementChild;
      card.addEventListener('pointermove', (e) => {
        if (!finePointer.matches || reduced()) return;
        const r = inner.getBoundingClientRect();
        inner.style.setProperty('--gx', (e.clientX - r.left).toFixed(0) + 'px');
        inner.style.setProperty('--gy', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
  }

  /* ------------------------------------------------- magnetic buttons */
  function initMagnetic() {
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        if (!finePointer.matches || reduced()) return;
        const r = btn.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
        const dy = ((e.clientY - r.top) / r.height - 0.5) * 6;
        btn.style.setProperty('--mx', dx.toFixed(1) + 'px');
        btn.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--mx', '0px'); btn.style.setProperty('--my', '0px'); });
    });
  }

  /* ---------------------------------------- services: pin-and-swap */
  function initServicesSwap() {
    const tile = $('[data-service-tile]');
    const cards = $$('[data-service]');
    const icons = $$('[data-tile-icon]', tile);
    const dots = $$('.services__dots i', tile);
    function activate(key) {
      icons.forEach(i => i.classList.toggle('is-active', i.dataset.tileIcon === key));
      cards.forEach((c, n) => {
        const on = c.dataset.service === key;
        c.classList.toggle('is-current', on && desktopQuery.matches);
        if (dots[n]) dots[n].classList.toggle('is-active', on);
      });
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) activate(entry.target.dataset.service); });
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    cards.forEach(c => io.observe(c));
  }

  /* ------------------------------------ why: progressive word scrub */
  function initWordScrub() {
    const el = $('[data-scrub]');
    if (!el) return () => {};
    // Wrap words without changing textContent (spaces stay as text nodes).
    const text = el.textContent;
    el.textContent = '';
    const words = [];
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); return; }
      const s = document.createElement('span'); s.className = 'sw'; s.textContent = part;
      el.appendChild(s); words.push(s);
    });
    let ticking = false;
    function update() {
      ticking = false;
      if (reduced()) { words.forEach(w => w.style.setProperty('--o', 1)); return; }
      const r = el.getBoundingClientRect(); const vh = window.innerHeight;
      const startY = vh * 0.88; const dist = r.height + vh * 0.46;
      const p = clamp((startY - r.top) / dist, 0, 1);
      const n = words.length;
      words.forEach((w, i) => {
        const local = clamp(p * (n + 4) - i, 0, 1);
        w.style.setProperty('--o', (0.18 + 0.82 * local).toFixed(3));
      });
    }
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();
    return update;
  }

  /* ----------------------------- service areas: map, list, checker */
  function initCoverage() {
    const map = $('[data-map]');
    const pins = $$('.pin', map);
    const towns = $$('.town');
    const select = $('[data-checker-select]');
    const btn = $('[data-checker-btn]');
    const result = $('[data-checker-result]');
    const formArea = $('#f-area');
    const pinFor = name => pins.find(p => p.dataset.pin === name);
    const townFor = name => towns.find(t => t.dataset.town === name);

    // pin drop order: by distance tier from Red Deer (encodes geography)
    let tierIndex = {};
    pins.forEach((p) => {
      const tier = +p.dataset.tier; tierIndex[tier] = (tierIndex[tier] || 0);
      p.style.setProperty('--pd', (900 + tier * 260 + tierIndex[tier] * 90) + 'ms');
      tierIndex[tier]++;
    });

    function hot(name, on) {
      const p = pinFor(name); const t = townFor(name);
      if (p) p.classList.toggle('is-hot', on);
      if (t) t.classList.toggle('is-hot', on);
    }
    towns.forEach((t) => {
      t.addEventListener('pointerenter', () => hot(t.dataset.town, true));
      t.addEventListener('pointerleave', () => hot(t.dataset.town, false));
      t.addEventListener('focus', () => hot(t.dataset.town, true));
      t.addEventListener('blur', () => hot(t.dataset.town, false));
      t.addEventListener('click', () => choose(t.dataset.town));
    });
    pins.forEach((p) => {
      p.addEventListener('pointerenter', () => hot(p.dataset.pin, true));
      p.addEventListener('pointerleave', () => hot(p.dataset.pin, false));
      p.addEventListener('click', () => choose(p.dataset.pin));
    });

    function choose(name) {
      if (!name) {
        result.innerHTML = '<p class="checker__hint">Choose a community from the list to check it.</p>';
        return;
      }
      select.value = name;
      pins.forEach(p => p.classList.toggle('is-selected', p.dataset.pin === name));
      towns.forEach(t => t.classList.toggle('is-selected', t.dataset.town === name));
      result.innerHTML = '';
      const ok = document.createElement('p');
      ok.className = 'checker__ok';
      ok.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-map-pin-check"/></svg><span>You’re in our service area — <a href="#estimate" data-prefill>get your estimate</a></span>';
      result.appendChild(ok);
      $('[data-prefill]', ok).addEventListener('click', () => { if (formArea) { formArea.value = name; formArea.dispatchEvent(new Event('change')); } });
    }
    select.addEventListener('change', () => choose(select.value));
    btn.addEventListener('click', () => choose(select.value));

    // Nav / sheet town links pre-select the town when they jump here.
    $$('a[data-town]').forEach(a => a.addEventListener('click', () => choose(a.dataset.town)));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { map.classList.add('is-in'); io.unobserve(map); } });
    }, { rootMargin: REVEAL_MARGIN, threshold: 0 });
    io.observe(map);
  }

  /* ------------------------------------------- process: line scrub */
  function initProcess() {
    const section = $('.process');
    const track = $('[data-process]');
    const fill = $('[data-process-fill]');
    const steps = $$('[data-step]', track);
    let ticking = false;
    function update() {
      ticking = false;
      if (reduced()) {
        section.classList.remove('is-scrub');
        fill.style.setProperty('--p', 1);
        steps.forEach(s => s.classList.add('is-active'));
        return;
      }
      section.classList.add('is-scrub');
      const r = track.getBoundingClientRect(); const vh = window.innerHeight;
      const vertical = window.matchMedia('(max-width: 720px)').matches;
      const startY = vh * 0.78; const dist = vertical ? r.height : r.height + vh * 0.18;
      const p = clamp((startY - r.top) / dist, 0, 1);
      fill.style.setProperty('--p', p.toFixed(4));
      const n = steps.length;
      steps.forEach((s, i) => s.classList.toggle('is-active', p >= (vertical ? i / n : i / (n - 1)) - 0.015 && p > 0.001));
    }
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();
    return update;
  }

  /* ----------------------------------------------------------- FAQ */
  function initFaq() {
    $$('.qa').forEach((qa) => {
      const btn = $('.qa__btn', qa);
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        qa.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ------------------------------------------------- estimate form */
  function initForm() {
    // DEMO ONLY — validates in the browser and shows the success state.
    // TODO(Carter): connect to the client's real Jobber estimate flow before launch.
    const form = $('[data-estimate-form]');
    const success = $('[data-form-success]');
    let attempted = false;
    const rules = {
      'f-name': v => v.trim().length >= 2 || 'Enter your name.',
      'f-phone': (v) => {
        const d = v.replace(/\D/g, '');
        return (d.length === 10 || (d.length === 11 && d[0] === '1')) || 'Enter a 10-digit phone number, like 587-306-0182.';
      },
      'f-email': v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter an email address, like name@example.com.',
      'f-area': v => !!v || 'Choose the community closest to you.',
      'f-service': v => !!v || 'Choose the service you need.'
    };
    function check(id, show) {
      const input = document.getElementById(id);
      const field = input.closest('.field');
      const err = $('[data-error-for="' + id + '"]', form);
      const res = rules[id](input.value);
      const ok = res === true;
      if (show) {
        field.classList.toggle('is-invalid', !ok);
        field.classList.toggle('is-valid', ok);
        input.setAttribute('aria-invalid', String(!ok));
        err.textContent = ok ? '' : res;
      }
      return ok;
    }
    Object.keys(rules).forEach((id) => {
      const input = document.getElementById(id);
      input.addEventListener('blur', () => { if (input.value || attempted) check(id, true); });
      input.addEventListener('input', () => { if (attempted || input.closest('.field').classList.contains('is-invalid')) check(id, true); });
      input.addEventListener('change', () => { if (attempted || input.value) check(id, true); });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      attempted = true;
      const results = Object.keys(rules).map(id => [id, check(id, true)]);
      const firstBad = results.find(r => !r[1]);
      if (firstBad) { document.getElementById(firstBad[0]).focus(); return; }
      form.hidden = true;
      success.hidden = false;
      success.classList.add('is-in');
      success.focus({ preventScroll: true });
      const top = success.getBoundingClientRect().top;
      if (top < 80 || top > window.innerHeight * 0.6) success.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* ------------------------------------------ mobile sticky action bar */
  function initStickyBar() {
    const bar = $('[data-mbar]');
    const heroActions = $('[data-hero-actions]');
    const formCard = $('.form-card');
    let pastHero = false; let formVisible = false;
    const sync = () => bar.classList.toggle('is-visible', pastHero && !formVisible);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }, { threshold: 0 }).observe(heroActions);
    new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -10% 0px', threshold: 0 }).observe(formCard);
  }

  /* ------------------------------------------------------ back to top */
  function initToTop() {
    const link = $('[data-to-top]');
    let ticking = false;
    const update = () => { ticking = false; link.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5); };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------ reduced-motion live branch */
  function initMotionListener(updaters) {
    motionQuery.addEventListener('change', (e) => {
      root.classList.toggle('rm', e.matches);
      if (e.matches) {
        $('.hero').classList.add('is-loaded');
        $('[data-hero-media]').classList.add('is-wiped');
        $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
        const map = $('[data-map]'); if (map) map.classList.add('is-in');
        $$('[data-magnetic]').forEach(b => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
      }
      updaters.forEach(fn => fn && fn());
    });
  }

  /* ------------------------------------------------------------ boot */
  initReveals();
  initNavCondense();
  initMegaMenus();
  initSheet();
  initHero();
  const parallaxUpdate = initParallax();
  initMasonry();
  initGlow();
  initMagnetic();
  initServicesSwap();
  const scrubUpdate = initWordScrub();
  initCoverage();
  const processUpdate = initProcess();
  initFaq();
  initForm();
  initStickyBar();
  initToTop();
  initMotionListener([parallaxUpdate, scrubUpdate, processUpdate]);
})();
