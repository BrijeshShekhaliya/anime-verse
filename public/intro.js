// ── Opening animation (the website's version of the app's AnimatedSplash) ────
// Warm embers drift in and a ring of light draws itself; the logo blooms in at
// the centre inside a soft glow, then glides aside as "ANIME VERSE" unfolds
// beside it; a light passes across the lockup, and it flies up into the
// header's own logo. The launch sound plays when the browser allows it.
//
// The small script in the page's <head> decides whether this runs at all: only
// when the site is opened fresh (a new tab, or a link from another site),
// never on reloads, Back/Forward, page changes inside the site or tabs
// opened in the background. It also covers the page in black until
// this takes over, so nothing flashes first.
//
// Same timeline as the app. Every movement is a precomputed transform/opacity
// animation, so it stays smooth while the page itself is still loading.
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('av-intro')) return;

  var LOGO = '/brand/logo-256.webp';
  var SOUND = '/brand/launch-sound.mp3';
  var K = 1.6; // the lockup starts at K times the header's size
  var SOLO = 1.75; // the logo on its own is shown this much bigger, centred
  var FIRE = '#FF640A';
  var GOLD = '#FFC15E';

  // Timeline in ms.
  var GATHER = 550; // embers drift in while a ring of light draws itself
  var ORBIT_FROM = 100;
  var BLOOM = 550; // the logo blooms in
  var FORM = 800; // the logo glides aside and the name unfolds beside it
  var FORM_MS = 500;
  var SHINE = 1150; // light passes across the lockup
  var SHINE_MS = 600;
  var INTRO_MS = 1500; // then it flies into the header
  var FLY_MS = 500;
  var END = SHINE + SHINE_MS;
  var STEP = 1000 / 60;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sound = null;
  if (!reduce) {
    try {
      sound = new Audio(SOUND);
      sound.preload = 'auto';
      sound.volume = 0.8;
    } catch (e) {}
  }

  // ── Easing, matching the app's ──
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function range(x, x0, x1, y0, y1) { return lerp(y0, y1, clamp01((x - x0) / (x1 - x0))); }
  function bezier(x1, y1, x2, y2) {
    function at(a1, a2, t) { return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t; }
    function slope(a1, a2, t) { return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var d = slope(x1, x2, t);
        if (Math.abs(d) < 1e-6) break;
        t -= (at(x1, x2, t) - x) / d;
      }
      return at(y1, y2, clamp01(t));
    };
  }
  var soft = bezier(0.45, 0, 0.2, 1);
  var formEase = bezier(0.5, 0, 0.15, 1);
  var flyEase = bezier(0.55, 0, 0.2, 1);
  function inOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function outQuad(t) { return 1 - (1 - t) * (1 - t); }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  // The app's spring: damping 18, stiffness 120, mass 0.9.
  function spring(ms) {
    if (ms <= 0) return 0;
    var t = ms / 1000;
    var w0 = Math.sqrt(120 / 0.9);
    var z = 18 / (2 * Math.sqrt(120 * 0.9));
    var wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  function stage(t) {
    return {
      gather: soft(clamp01(t / GATHER)),
      orbit: inOutQuad(clamp01((t - ORBIT_FROM) / (BLOOM - ORBIT_FROM))),
      bloom: spring(t - BLOOM),
      glow: outQuad(clamp01((t - (BLOOM - 100)) / 350)),
      ripple: outCubic(clamp01((t - BLOOM) / 650)),
      drift: outCubic(clamp01((t - BLOOM) / 800)),
      form: formEase(clamp01((t - FORM) / FORM_MS)),
      shine: inOutQuad(clamp01((t - SHINE) / SHINE_MS)),
    };
  }
  var STAGES = [];
  for (var s = 0; s * STEP < END; s++) STAGES.push(stage(s * STEP));
  STAGES.push(stage(END));

  // One animation over the whole timeline, sampled every frame from `frame(stage)`.
  function animate(node, frame) {
    var frames = STAGES.map(function (st, i) {
      var f = frame(st);
      f.offset = i / (STAGES.length - 1);
      return f;
    });
    return node.animate(frames, { duration: END, fill: 'forwards', easing: 'linear' });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  // Deterministic "random" layout (same every visit, as in the app).
  function rand(i, k) {
    var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var layer, lockup, finished = false, exiting = false, anims = [];

  function done() {
    if (finished) return;
    finished = true;
    root.classList.remove('av-intro', 'av-intro-cover');
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    // A sound that never got going (blocked, or still loading) shouldn't start late.
    if (sound && (sound.paused || sound.currentTime < 0.05)) {
      try { sound.pause(); sound.removeAttribute('src'); sound.load(); } catch (e) {}
    }
    removeEventListener('keydown', skip, true);
    document.removeEventListener('visibilitychange', onHidden);
  }

  // A tap, click or key press skips straight to the page.
  function skip() {
    if (exiting || finished || !layer) return done();
    exiting = true;
    anims.forEach(function (a) { try { a.pause(); } catch (e) {} });
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = done;
    setTimeout(done, 300); // in case the browser isn't drawing the page and the fade never finishes
  }
  function onHidden() { if (document.hidden) done(); }

  function build() {
    layer = el('div', 'av-intro-layer');
    layer.setAttribute('aria-hidden', 'true');
    var bg = el('div', 'av-intro-bg');
    var center = el('div', 'av-intro-center');
    var ring = el('div', 'av-intro-ring');
    // The same classes as the header's logo, so it measures exactly the same.
    lockup = el(
      'div',
      'brand av-intro-lockup',
      '<span class="av-intro-logo"><span class="av-intro-glow"></span>' +
        '<img class="brand-logo" src="' + LOGO + '" width="40" height="40" alt="" decoding="async">' +
        '<span class="av-intro-shine av-intro-shine-logo"></span></span>' +
        '<span class="av-intro-word"><span class="brand-word"><span class="w-anime">ANIME</span><span class="w-verse">VERSE</span></span>' +
        '<span class="brand-word av-intro-shine av-intro-shine-word"><span>ANIME</span><span>VERSE</span></span></span>'
    );
    center.appendChild(ring);
    layer.appendChild(bg);
    layer.appendChild(center);
    layer.appendChild(lockup);
    document.body.appendChild(layer);
    root.classList.remove('av-intro-cover'); // our own black takes over from the head's cover
    layer.addEventListener('pointerdown', skip);
    addEventListener('keydown', skip, true);
    document.addEventListener('visibilitychange', onHidden);
    return { bg: bg, center: center, ring: ring };
  }

  function run() {
    var parts = build();
    var logoWrap = lockup.querySelector('.av-intro-logo');
    var img = logoWrap.querySelector('img');
    var glow = lockup.querySelector('.av-intro-glow');
    var word = lockup.querySelector('.av-intro-word');
    var shineLogo = lockup.querySelector('.av-intro-shine-logo');
    var shineWord = lockup.querySelector('.av-intro-shine-word');

    // Wait (briefly) for the logo and the wordmark's font, like the app.
    var fontReady = document.fonts && document.fonts.load ? document.fonts.load('900 24px Orbitron') : Promise.resolve();
    var imgReady = img.decode ? img.decode() : Promise.resolve();
    var waited = new Promise(function (r) { setTimeout(r, 500); });
    Promise.race([Promise.all([fontReady, imgReady]).catch(function () {}), waited]).then(function () {
      if (!finished) start(parts, logoWrap, glow, word, shineLogo, shineWord);
    });
  }

  function start(parts, logoWrap, glow, word, shineLogo, shineWord) {
    var w = lockup.offsetWidth;
    var h = lockup.offsetHeight;
    var logoW = logoWrap.offsetWidth || 40;
    var wordX = word.offsetLeft;
    var vw = innerWidth;
    var vh = innerHeight;
    var BIG = logoW * K;
    var ORBIT_R = BIG * SOLO * 0.62;
    var R = Math.hypot(vw, vh) / 2;
    var soloShift = w / 2 - logoW / 2;
    var base = 'translate(' + -w / 2 + 'px,' + -h / 2 + 'px) ';
    lockup.style.transform = base + 'scale(' + K + ')';

    if (sound) {
      var p = sound.play();
      if (p && p.catch) p.catch(function () {}); // blocked until the visitor interacts: carry on silently
    }

    if (reduce) {
      // A plain fade, as in the app.
      anims.push(lockup.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' }));
      setTimeout(function () {
        if (exiting || finished) return;
        exiting = true;
        layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).onfinish = done;
        setTimeout(done, 350);
      }, 700);
      return;
    }

    // Embers: drift in from the dark, curling round to the ring, then float away.
    for (var i = 0; i < 22; i++) {
      (function (i) {
        var e = {
          angle: (i / 22) * 360 + rand(i, 1) * 15,
          from: 0.38 + rand(i, 2) * 0.45,
          size: 2 + rand(i, 3) * 3,
          spin: 30 + rand(i, 4) * 40,
          lag: rand(i, 5) * 0.3,
          color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? GOLD : FIRE,
        };
        var n = el('span', 'av-intro-ember');
        n.style.cssText = 'width:' + e.size + 'px;height:' + e.size + 'px;left:' + -e.size / 2 + 'px;top:' + -e.size / 2 + 'px;background:' + e.color;
        parts.center.appendChild(n);
        anims.push(animate(n, function (st) {
          var g = range(st.gather, e.lag, 1, 0, 1);
          var r = lerp(R * e.from, ORBIT_R, g) + st.drift * ORBIT_R * 0.8;
          return {
            opacity: range(g, 0, 0.4, 0, 0.85) * (1 - st.drift),
            transform: 'rotate(' + (e.angle + g * e.spin + st.drift * 15) + 'deg) translateX(' + r + 'px) scale(' + (1 - st.drift * 0.5) + ')',
          };
        }));
      })(i);
    }

    // The ring of light: its points light up in turn, then it ripples outwards.
    var DOTS = 40;
    for (var d = 0; d < DOTS; d++) {
      (function (d) {
        var at = d / DOTS;
        var angle = at * 360 - 90;
        var n = el('span', 'av-intro-dot');
        n.style.background = d % 5 === 0 ? GOLD : d % 2 === 0 ? '#FFFFFF' : FIRE;
        parts.ring.appendChild(n);
        anims.push(animate(n, function (st) {
          return {
            opacity: range(st.orbit, at, at + 0.1, 0, 1) * (d % 2 === 0 ? 0.9 : 0.5),
            transform: 'rotate(' + angle + 'deg) translateX(' + ORBIT_R + 'px) scale(' + range(st.orbit, at, at + 0.1, 1.8, 1) + ')',
          };
        }));
      })(d);
    }
    anims.push(animate(parts.ring, function (st) {
      return {
        opacity: 1 - st.ripple,
        transform: 'scale(' + lerp(1, 1.8, st.ripple) + ') rotate(' + (st.orbit * 40 + st.ripple * 25) + 'deg)',
      };
    }));

    // The logo blooms in at the centre, then glides to its place in the lockup.
    anims.push(animate(logoWrap, function (st) {
      return {
        opacity: range(st.bloom, 0, 0.6, 0, 1),
        transform: 'translateX(' + (1 - st.form) * soloShift + 'px) scale(' + lerp(0.82, 1, st.bloom) * lerp(SOLO, 1, st.form) + ')',
      };
    }));
    anims.push(animate(glow, function (st) {
      return { opacity: st.glow, transform: 'scale(' + lerp(0.8, 1, st.glow) + ')' };
    }));
    // "ANIME VERSE" unfolds from behind the logo.
    anims.push(animate(word, function (st) {
      return {
        opacity: range(st.form, 0.2, 0.85, 0, 1),
        transform: 'translateX(' + lerp(-36 / K, 0, st.form) + 'px) scale(' + lerp(0.94, 1, st.form) + ')',
      };
    }));
    // A light passes across the whole lockup (logo first, then the name).
    var band = logoW * 0.9;
    [[shineLogo, 0], [shineWord, wordX]].forEach(function (pair) {
      var node = pair[0];
      var offset = pair[1];
      node.style.backgroundSize = band + 'px 100%';
      anims.push(animate(node, function (st) {
        var x = lerp(-logoW - band, w + logoW, st.shine) - offset;
        var o = st.shine <= 0 ? 0 : st.shine < 0.12 ? st.shine / 0.12 : st.shine < 0.88 ? 1 : (1 - st.shine) / 0.12;
        return { opacity: o, backgroundPosition: x + 'px 0' };
      }));
    });

    // Then it flies into the header's logo and the page shows through.
    setTimeout(function () {
      if (exiting || finished) return;
      exiting = true;
      var target = document.querySelector('.topbar .brand');
      var rect = target && target.getBoundingClientRect();
      var visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && getComputedStyle(target).display !== 'none';
      parts.bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 100, easing: 'ease-out', fill: 'forwards' });
      glow.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards', composite: 'replace' });
      var frames = [];
      for (var f = 0; f <= 30; f++) {
        var p = flyEase(f / 30);
        if (visible) {
          var dx = rect.left + rect.width / 2 - vw / 2;
          var dy = rect.top + rect.height / 2 - vh / 2;
          frames.push({ transform: base + 'translate(' + p * dx + 'px,' + p * dy + 'px) scale(' + lerp(K, 1, p) + ')' });
        } else {
          // No header logo on screen: drift forward and fade instead.
          frames.push({ transform: base + 'scale(' + K * lerp(1, 1.3, p) + ')', opacity: 1 - clamp01(p / 0.9) });
        }
      }
      lockup.animate(frames, { duration: FLY_MS, fill: 'forwards' }).onfinish = done;
      setTimeout(done, FLY_MS + 150); // in case the browser isn't drawing the page and the flight never finishes
    }, INTRO_MS);
  }

  function boot() {
    if (finished) return;
    if (!document.body) return requestAnimationFrame(boot);
    try {
      run();
    } catch (e) {
      done();
    }
  }
  boot();
})();
