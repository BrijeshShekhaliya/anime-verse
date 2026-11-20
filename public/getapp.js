/* Motion for the "Get the app" page (/app). The page itself is rendered by
   the server (src/seo/app-page.js) and reads fine without this file.
   app.js calls AVGetApp.mount() when it shows the page again after a page
   change inside the site, and AVGetApp.unmount() when it leaves. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let teardown = null;
  let mountedEl = null;

  function deviceKind() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return finePointer ? 'desktop' : 'other';
  }

  function mount(root = document) {
    const ga = root.querySelector('[data-ga]');
    if (!ga || ga === mountedEl) return;
    unmount();
    mountedEl = ga;

    const offs = [];
    const on = (el, type, fn, opts) => {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      offs.push(() => el.removeEventListener(type, fn, opts));
    };
    const every = (fn, ms) => {
      const id = setInterval(fn, ms);
      offs.push(() => clearInterval(id));
    };
    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      offs.push(() => clearTimeout(id));
      return id;
    };
    const $ = (sel) => ga.querySelector(sel);
    const $$ = (sel) => [...ga.querySelectorAll(sel)];

    const device = deviceKind();
    ga.dataset.device = device;
    ga.classList.add('js');

    // iPhone and iPad: there's no app to download, so point to the website instead.
    if (device === 'ios') {
      $$('[data-ga-cta]').forEach((el) => { el.hidden = true; });
      $$('[data-ga-ios]').forEach((el) => { el.hidden = false; });
    }

    // ---------- Reveal on scroll, and pause loops that are off screen ----------
    const revealIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        revealIo.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.ga-reveal').forEach((el) => revealIo.observe(el));
    offs.push(() => revealIo.disconnect());

    const liveIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('ga-vis', e.isIntersecting));
    }, { rootMargin: '60px 0px' });
    $$('.ga-art, .ga-iart, .ga-hero, .ga-final-card').forEach((el) => liveIo.observe(el));
    offs.push(() => liveIo.disconnect());

    // ---------- Little live details ----------
    // The phone's clock shows the real time.
    const clocks = $$('[data-ga-clock]');
    const tickClock = () => {
      const d = new Date();
      const t = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
      clocks.forEach((c) => { c.textContent = t; });
    };
    tickClock();
    every(tickClock, 10000);

    // "Next episode in 23m 12s", counting down.
    const countdown = $('[data-ga-countdown]');
    let left = 23 * 60 + 12;
    const showCountdown = () => {
      if (countdown) countdown.textContent = `${Math.floor(left / 60)}m ${String(left % 60).padStart(2, '0')}s`;
    };
    showCountdown();
    if (!reduceMotion) every(() => { left = left > 0 ? left - 1 : 23 * 60 + 12; showCountdown(); }, 1000);

    // The audio card cycles through the three languages.
    const langEl = $('[data-ga-lang]');
    const langs = ['Japanese', 'English', 'Hindi'];
    let langAt = 0;
    if (langEl && !reduceMotion) {
      every(() => {
        langAt = (langAt + 1) % langs.length;
        langEl.classList.add('swap');
        later(() => { langEl.textContent = langs[langAt]; langEl.classList.remove('swap'); }, 230);
      }, 2800);
    }

    // ---------- Hero: the phone flips through real app screens ----------
    const hero = $('.ga-hero');
    const carousel = $('[data-ga-carousel]');
    const shots = carousel ? [...carousel.querySelectorAll('.ga-shot')] : [];
    const tabs = $$('[data-ga-goto]');
    const tabBar = $('.ga-screen-tabs');
    const SLIDE_MS = 3800;
    let current = 0;
    let slideTimer = null;
    let heroVisible = true;
    tabBar?.style.setProperty('--slide', `${SLIDE_MS}ms`);

    const restartFill = (i) => {
      tabs.forEach((t) => t.classList.remove('run'));
      if (reduceMotion) return;
      void tabs[i]?.offsetWidth; // start the progress line from zero
      tabs[i]?.classList.add('run');
    };
    const showShot = (i) => {
      if (!shots.length) return;
      if (i !== current) {
        const prev = shots[current];
        prev.classList.remove('is-on');
        prev.classList.add('is-off');
        later(() => prev.classList.remove('is-off'), 900);
        shots[i].classList.remove('is-off');
        shots[i].classList.add('is-on');
        current = i;
      }
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
      restartFill(i);
    };
    const scheduleNext = () => {
      clearTimeout(slideTimer);
      if (reduceMotion || !heroVisible || document.hidden || shots.length < 2) {
        tabBar?.classList.add('paused');
        return;
      }
      tabBar?.classList.remove('paused');
      slideTimer = setTimeout(() => { showShot((current + 1) % shots.length); scheduleNext(); }, SLIDE_MS);
    };
    offs.push(() => clearTimeout(slideTimer));
    tabs.forEach((t, k) => on(t, 'click', () => { showShot(k); scheduleNext(); }));
    on(carousel, 'click', () => { showShot((current + 1) % shots.length); scheduleNext(); });
    if (hero) {
      const heroIo = new IntersectionObserver(([e]) => {
        const was = heroVisible;
        heroVisible = e.isIntersecting;
        if (heroVisible && !was) restartFill(current);
        scheduleNext();
      }, { threshold: 0.15 });
      heroIo.observe(hero);
      offs.push(() => heroIo.disconnect());
    }
    on(document, 'visibilitychange', () => { if (!document.hidden) restartFill(current); scheduleNext(); });
    restartFill(0);
    scheduleNext();

    // ---------- Hero: the phone and cards follow the mouse ----------
    const stage = $('[data-ga-stage]');
    if (stage && hero && finePointer && !reduceMotion) {
      const layers = [...stage.querySelectorAll('[data-ga-depth]')];
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const step = () => {
        x += (tx - x) * 0.07;
        y += (ty - y) * 0.07;
        layers.forEach((l) => {
          const d = Number(l.dataset.gaDepth) || 1;
          l.style.setProperty('--px', `${(-x * d * 26).toFixed(2)}px`);
          l.style.setProperty('--py', `${(-y * d * 22).toFixed(2)}px`);
        });
        stage.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
        stage.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
        raf = Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(step) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
      on(hero, 'pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        kick();
      });
      on(hero, 'pointerleave', () => { tx = 0; ty = 0; kick(); });
      offs.push(() => cancelAnimationFrame(raf));
    }

    // ---------- Hero: today's anime drifting in the background ----------
    const wall = $('[data-ga-wall]');
    if (wall) {
      const ctrl = new AbortController();
      offs.push(() => ctrl.abort());
      const small = (u) => String(u).replace(/\/t\/p\/(w\d+|original)\//, '/t/p/w185/');
      fetch('/api/home', { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((home) => {
          if (!home || !ga.isConnected) return;
          const seen = new Set();
          const posters = [];
          ['trending', 'seasonNow', 'popular', 'topRated', 'movies', 'upcoming'].forEach((k) => {
            (home[k] || []).forEach((a) => {
              if (a && a.image && !seen.has(a.id)) { seen.add(a.id); posters.push(small(a.image)); }
            });
          });
          if (posters.length < 16) return;
          // Small posters, and fewer on phones to go easy on mobile data.
          const narrow = window.innerWidth < 760;
          const rows = narrow ? 3 : 4;
          const per = Math.min(narrow ? 8 : 12, Math.floor(posters.length / rows));
          let html = '';
          for (let r = 0; r < rows; r++) {
            const set = posters.slice(r * per, r * per + per);
            const imgs = set.map((src) => `<img src="${src.replace(/"/g, '&quot;')}" alt="" width="128" height="192" fetchpriority="low" decoding="async">`).join('');
            // Enough copies that the row still covers the wall halfway through its loop.
            const copies = Math.max(1, Math.ceil(wall.clientWidth / (set.length * 144)));
            html += `<div class="ga-wall-row" style="--dur:${(70 + r * 12) * copies}s">${imgs.repeat(copies * 2)}</div>`;
          }
          wall.innerHTML = html;
          // Fade in once a handful of posters have arrived.
          const imgs = [...wall.querySelectorAll('img')];
          let loaded = 0;
          const done = () => { if (++loaded >= Math.min(8, imgs.length)) wall.classList.add('ready'); };
          imgs.forEach((img) => (img.complete ? done() : img.addEventListener('load', done, { once: true })));
        })
        .catch(() => { /* the glow alone looks fine */ });
    }

    // ---------- Tour: the phone follows the step you're reading ----------
    const steps = $$('[data-ga-step]');
    const tourPhone = $('[data-ga-tour-phone]');
    const tourShots = tourPhone ? [...tourPhone.querySelectorAll('.ga-shot')] : [];
    const dots = $$('[data-ga-dot]');
    let activeStep = null;
    const setStep = (key) => {
      if (key === activeStep) return;
      activeStep = key;
      steps.forEach((s) => s.classList.toggle('is-active', s.dataset.gaStep === key));
      dots.forEach((d) => d.classList.toggle('on', d.dataset.gaDot === key));
      tourShots.forEach((img) => {
        const on = img.dataset.key === key;
        if (img.classList.contains('is-on') && !on) {
          img.classList.add('is-off');
          later(() => img.classList.remove('is-off'), 900);
        }
        img.classList.toggle('is-on', on);
      });
      tourPhone?.classList.toggle('is-land', key === 'player');
    };
    if (steps.length) {
      setStep(steps[0].dataset.gaStep);
      const stepIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setStep(e.target.dataset.gaStep); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach((s) => stepIo.observe(s));
      offs.push(() => stepIo.disconnect());
    }

    // Phones and tablets: the steps are cards in a row; mark the centered one.
    const scroller = $('[data-ga-steps]');
    const swipeDots = $$('[data-ga-swipe-dots] i');
    if (scroller && steps.length) {
      const centerIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const centered = e.intersectionRatio >= 0.6;
          e.target.classList.toggle('is-center', centered);
          if (centered) {
            const i = steps.indexOf(e.target);
            swipeDots.forEach((d, k) => d.classList.toggle('on', k === i));
          }
        });
      }, { root: scroller, threshold: [0, 0.6, 1] });
      steps.forEach((s) => centerIo.observe(s));
      offs.push(() => centerIo.disconnect());
      swipeDots.forEach((d, k) => on(d, 'click', () => {
        const s = steps[k];
        scroller.scrollTo({ left: s.offsetLeft - (scroller.clientWidth - s.clientWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }));
    }

    // ---------- Cards: a soft light follows the mouse ----------
    if (finePointer && !reduceMotion) {
      $$('.ga-card').forEach((card) => on(card, 'pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--gx', `${e.clientX - r.left}px`);
        card.style.setProperty('--gy', `${e.clientY - r.top}px`);
      }));
    }

    // ---------- Links within the page scroll smoothly ----------
    const scrollToId = (id) => {
      const target = id && document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return true;
    };
    $$('a[href^="#"]').forEach((a) => on(a, 'click', (e) => {
      if (scrollToId(a.getAttribute('href').slice(1))) e.preventDefault();
    }));

    // ---------- Download: say what happens next ----------
    const toast = $('[data-ga-toast]');
    const toastText = toast?.querySelector('p');
    let toastTimer = null;
    const hideToast = () => {
      if (!toast || toast.hidden) return;
      toast.classList.add('out');
      later(() => { toast.hidden = true; toast.classList.remove('out'); }, 300);
    };
    const showToast = () => {
      if (!toast) return;
      if (toastText) {
        toastText.innerHTML = device === 'android' || device === 'other'
          ? '<b>Your download has started.</b> When it finishes, tap it in your notifications, then tap Install.'
          : '<b>Downloading to this computer.</b> The app installs on Android phones, so scanning the code with your phone is the quickest way.';
      }
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = later(hideToast, 12000);
    };
    on(toast?.querySelector('[data-ga-toast-close]'), 'click', hideToast);
    on(toast?.querySelector('[data-ga-toast-how]'), 'click', hideToast);
    $$('[data-ga-download]').forEach((a) => on(a, 'click', () => {
      try { localStorage.setItem('av-app-got', String(Date.now())); } catch { /* storage blocked */ }
      showToast();
      $$('[data-ga-istep]').forEach((s) => s.classList.toggle('is-hi', s.dataset.gaIstep === '2'));
    }));

    teardown = () => offs.splice(0).forEach((fn) => { try { fn(); } catch { /* already gone */ } });
  }

  function unmount() {
    if (teardown) teardown();
    teardown = null;
    mountedEl = null;
  }

  window.AVGetApp = { mount, unmount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(), { once: true });
  else mount();
})();
