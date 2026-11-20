// "Get the app" page (/app): why the Android app is worth it, a tour of its
// screens, how to install it, and questions people ask. The whole page is
// rendered here, so it works without JavaScript and search engines see all of
// it; public/getapp.js adds the motion on top.
//
// Every download button points at /download/android, which redirects to the
// app file. The file ships with the site (public/download/AnimeVerse.apk);
// to serve it from somewhere else instead, set APP_DOWNLOAD_URL to its address.
// After replacing the file with a new build, update sizeMB below (a test checks it).

const { esc } = require('./util');
const { faqLd } = require('./render');

const APP = {
  name: 'AnimeVerse',
  androidPackage: 'com.anonymous.animeverseapp',
  version: '1.0.0',
  sizeMB: 42,
  minAndroid: '7.0',
};
APP.sizeLabel = `About ${APP.sizeMB} MB`;

const DOWNLOAD_PATH = '/download/android';
const APK_PATH = '/download/AnimeVerse.apk';
const downloadUrl = () => {
  const url = String(process.env.APP_DOWNLOAD_URL || '').trim();
  return /^https?:\/\//.test(url) ? url : APK_PATH;
};

// ---------- Icons (the site's duotone style) ----------
const ic = (body, cls = '') => `<svg class="ic${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const tint = 'fill="currentColor" stroke="none" opacity=".2"';
const solid = 'fill="currentColor" stroke="none"';
const I = {
  download: ic(`<path d="M12 3.5v11M7 10l5 5 5-5" stroke-width="2.4"/><path d="M4.5 16.5v1.5a2.5 2.5 0 002.5 2.5h10a2.5 2.5 0 002.5-2.5v-1.5" stroke-width="2.4"/>`),
  check: ic('<path d="M5 12.5l4.2 4.2L19 7" stroke-width="2.8"/>'),
  minus: ic('<path d="M7 12h10" stroke-width="2.4"/>'),
  arrow: ic('<path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" stroke-width="2.4"/>'),
  down: ic('<path d="M7 10l5 4.5 5-4.5" stroke-width="2.4"/>'),
  play: ic(`<path ${solid} d="M8 5.6v12.8c0 .9 1 1.5 1.8 1l10-6.4c.7-.5.7-1.5 0-2l-10-6.4C9 4.1 8 4.7 8 5.6z"/>`),
  user: ic(`<circle ${tint} cx="12" cy="8" r="4"/><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0115 0"/>`),
  shield: ic(`<path ${tint} d="M12 2.8l7.5 3v5.6c0 4.6-3.1 8.4-7.5 9.8-4.4-1.4-7.5-5.2-7.5-9.8V5.8z"/><path d="M12 2.8l7.5 3v5.6c0 4.6-3.1 8.4-7.5 9.8-4.4-1.4-7.5-5.2-7.5-9.8V5.8z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>`),
  phone: ic(`<rect ${tint} x="6" y="2.5" width="12" height="19" rx="3"/><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>`),
  heart: ic(`<path ${tint} d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>`),
  mic: ic(`<rect ${tint} x="8" y="2.5" width="8" height="12.5" rx="4"/><rect x="8" y="2.5" width="8" height="12.5" rx="4"/><path d="M4.5 11.5a7.5 7.5 0 0015 0M12 19v2.5"/>`),
  spark: ic(`<path ${solid} d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/>`),
  clock: ic(`<circle ${tint} cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5.2l3.2 2"/>`),
  globe: ic(`<circle ${tint} cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.8 6 3.8 9.5s-1.2 6.7-3.8 9.5c-2.6-2.8-3.8-6-3.8-9.5s1.2-6.7 3.8-9.5z"/>`),
  bolt: ic(`<path ${tint} d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z"/><path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z"/>`),
  hand: ic(`<path ${tint} d="M8.5 11V5a1.5 1.5 0 013 0v5.5-7a1.5 1.5 0 013 0v7-5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-.6a6 6 0 01-4.6-2.2L3.4 15a1.6 1.6 0 012.4-2.1L8.5 15z"/><path d="M8.5 11V5a1.5 1.5 0 013 0v5.5-7a1.5 1.5 0 013 0v7-5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-.6a6 6 0 01-4.6-2.2L3.4 15a1.6 1.6 0 012.4-2.1L8.5 15z"/>`),
  data: ic(`<path d="M3 17.5h3v3H3zM8.5 13.5h3v7h-3zM14 9.5h3v11h-3zM19.5 4.5h1.5v16h-1.5" stroke-width="2"/>`),
  home: ic(`<path ${tint} d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/><path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/>`),
  scan: ic(`<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16M4 12h16"/>`),
};

const signalIcons = `<svg viewBox="0 0 40 12" aria-hidden="true"><path fill="currentColor" d="M1 9h2v3H1zM5 7h2v5H5zM9 5h2v7H9zM13 3h2v9h-2z"/><rect x="21" y="2" width="15" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="22.5" y="3.5" width="10" height="5" rx="1" fill="currentColor"/><path fill="currentColor" d="M37 5h1.4v2H37z"/></svg>`;

// ---------- Screens ----------
const SHOTS = {
  home: { alt: 'AnimeVerse app home screen with the featured show and the Top 10 airing right now' },
  detail: { alt: 'Attack on Titan page in the app with ratings, My List, Share, Trailer and a Continue button' },
  episodes: { alt: 'Episode list for Attack on Titan Season 1 in the app' },
  more: { alt: 'More Like This in the app: Vinland Saga, The Promised Neverland, 86 and more' },
  browse: { alt: 'Browse screen in the app with search and popular anime' },
  schedule: { alt: 'Release schedule in the app showing today’s new episodes in local time' },
  continue: { alt: 'Continue watching in the app, with how far you got in each episode' },
  mylist: { alt: 'My List in the app with saved shows' },
  history: { alt: 'Watch history in the app' },
  settings: { alt: 'Settings in the app: title language, audio language, streaming quality and launch sound' },
  welcome: { alt: 'Welcome screen of the AnimeVerse app' },
  player: { alt: 'The app’s video player in full screen with audio, subtitles, speed, quality and Enhance buttons', land: true },
};
const shotSrc = (key) => `/app-shots/${key}.webp`;

function shotImg(key, { cls = 'ga-shot', eager = false, on = false } = {}) {
  const s = SHOTS[key];
  const [w, h] = s.land ? [1329, 600] : [600, 1329];
  return `<img class="${cls}${on ? ' is-on' : ''}" data-key="${key}" src="${shotSrc(key)}" alt="${esc(s.alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

const statusBar = `<div class="ga-status" aria-hidden="true"><span class="ga-clock" data-ga-clock>8:30</span>${signalIcons}</div>`;

// A phone showing one screen (used where only one picture is needed).
const phoneOf = (key, extra = '') => {
  const land = SHOTS[key].land;
  return `<div class="ga-phone${land ? ' ga-phone-land' : ''} ${extra}">
      <div class="ga-phone-screen">${shotImg(key)}${land ? '' : statusBar}</div>
    </div>`;
};

// ---------- Content ----------
const HERO_SCREENS = [
  ['home', 'Home'],
  ['detail', 'Details'],
  ['continue', 'My List'],
  ['schedule', 'Schedule'],
  ['settings', 'Settings'],
];

const TOUR = [
  { key: 'home', title: 'Everything that’s on, the moment you open it', text: 'The Top 10 airing shows, this season’s new arrivals and the most popular anime, fresh every day. Tap any poster to dive in.' },
  { key: 'detail', title: 'All you need before you press play', text: 'Ratings, genres and the story, a trailer, and one big button that starts the show or picks up where you stopped.' },
  { key: 'episodes', title: 'Every season, every episode', text: 'Switch seasons in a tap and see each episode with its picture and running time, so you always know what’s next.' },
  { key: 'player', title: 'A player that belongs on your phone', text: 'Turn your phone sideways for full screen. Audio, subtitles, speed, quality and Enhance sit right under the timeline, and the next episode is one tap away.' },
  { key: 'continue', title: 'Your shows, kept on your phone', text: 'Continue Watching, My List and History in one place. Each show remembers the exact second you stopped.' },
  { key: 'schedule', title: 'Know when new episodes land', text: 'This week’s episodes in your own time, with what’s already out and a countdown to what isn’t.' },
  { key: 'settings', title: 'Make it yours', text: 'Show titles in English or Romaji, pick your audio language and a backup, and choose the picture quality that suits your data plan.' },
];

const COMPARE = [
  ['Free, with no sign-up', true, true],
  ['Japanese, English and Hindi audio', true, true],
  ['Continue Watching and My List', true, true],
  ['Swipe for brightness and volume', false, true],
  ['Pinch to fill your screen', false, true],
  ['A backup audio language', false, true],
  ['Data saver setting', false, true],
  ['Enhance', 'Brighter colors', 'Sharper picture and brighter colors'],
  ['A gentle buzz when you tap', false, true],
  ['Opens full screen from your home screen', false, true],
  ['Works on iPhone and computers', true, false],
];

const FAQ = [
  { q: 'Is the app free?', a: 'Yes. The app is completely free, with no sign-up and no subscription.' },
  { q: 'Do I need an account?', a: 'No. Open it and start watching. Your list and your progress are saved on your phone.' },
  { q: 'Will my list from the website move to the app?', a: 'Not automatically. The website keeps your list in this browser, and the app keeps its own list on your phone. Tap the bookmark on a show in the app to add it again; it only takes a moment.' },
  { q: 'Is it safe to install?', a: 'The app only needs an internet connection. It never asks for your contacts, photos, location, camera or microphone. Download it only from this page, so you always get the real AnimeVerse.' },
  { q: 'Why does my phone show a message before installing?', a: 'Android shows it for every app that doesn’t come from the Play Store. Allow it once for your browser and you’re set. If Google Play Protect offers to scan the app, tap <b>Scan app</b>; it only takes a few seconds.' },
  { q: 'Which phones does it work on?', a: `Android phones and tablets running Android ${APP.minAndroid} or newer, which covers almost every Android phone still in use.` },
  { q: 'Does it work on iPhone?', a: 'Not right now. The app is for Android. On iPhone and iPad, AnimeVerse works in Safari, right here on the website.' },
  { q: 'How do I get a newer version?', a: 'Download it again from this page and tap <b>Install</b>. Your list and progress stay as they are.' },
];

// ---------- Pieces ----------
const downloadButton = (where) => `<a class="ga-dl" href="${DOWNLOAD_PATH}" download="AnimeVerse.apk" rel="nofollow" data-ga-download="${where}">
      <span class="ga-dl-ic">${I.download}</span>
      <span class="ga-dl-text"><small>Free download</small><b>Download for Android</b></span>
      <span class="ga-dl-shine" aria-hidden="true"></span>
    </a>`;

const dlMeta = `<p class="ga-dl-meta"><span>Free</span><span>No sign-up</span><span>${APP.sizeLabel}</span><span>Android ${APP.minAndroid}+</span></p>`;

const iosNote = `<div class="ga-ios" data-ga-ios hidden>
      <p><b>The app is for Android phones.</b> On your iPhone, AnimeVerse works right here in Safari, with nothing to install.</p>
      <a class="btn btn-primary btn-pill btn-lg" href="/" data-link>${I.play}<span>Keep watching on the website</span></a>
    </div>`;

const qrCard = `<div class="ga-qr" data-ga-qr>
      <img src="/app-shots/qr.svg" width="264" height="264" alt="QR code that opens this page on your phone" loading="lazy" decoding="async">
      <p><b>On a computer?</b> Point your Android phone’s camera at this code to open this page there, then tap Download.</p>
    </div>`;

// Small living illustrations for the feature cards (animated in getapp.css).
const ART = {
  gesture: `<div class="ga-art ga-art-gesture" aria-hidden="true">
      <div class="ga-mini-player">
        <img src="/app-shots/player.webp" alt="" width="1329" height="600" loading="lazy" decoding="async">
        <span class="ga-dim"></span>
        <span class="ga-meter ga-meter-l"><i></i><svg class="ic" viewBox="0 0 24 24"><circle fill="currentColor" stroke="none" cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg></span>
        <span class="ga-meter ga-meter-r"><i></i><svg class="ic" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/></svg></span>
        <span class="ga-finger ga-finger-l"></span><span class="ga-finger ga-finger-r"></span>
        <span class="ga-tap"><i></i><i></i><b>+10s</b></span>
        <span class="ga-gesture-label"></span>
      </div>
    </div>`,
  language: `<div class="ga-art ga-art-lang" aria-hidden="true">
      <p class="ga-art-label"><span>1</span>First choice</p>
      <div class="ga-seg ga-seg-3" style="--n:3"><i></i><span>Japanese</span><span>English</span><span>Hindi</span></div>
      <p class="ga-art-label"><span>2</span>If it isn’t available</p>
      <div class="ga-seg ga-seg-2" style="--n:2"><i></i><span>English</span><span>Hindi</span></div>
    </div>`,
  enhance: `<div class="ga-art ga-art-enhance" aria-hidden="true">
      <div class="ga-wipe">
        <img class="ga-wipe-a" src="/app-shots/player.webp" alt="" width="1329" height="600" loading="lazy" decoding="async">
        <div class="ga-wipe-b"><img src="/app-shots/player.webp" alt="" width="1329" height="600" loading="lazy" decoding="async"></div>
        <span class="ga-wipe-line"></span>
      </div>
      <span class="ga-enhance-chip">${I.spark}Enhance</span>
    </div>`,
  homescreen: `<div class="ga-art ga-art-home" aria-hidden="true">
      <div class="ga-icons">${'<i></i>'.repeat(5)}<span class="ga-appicon"><img src="/brand/logo-96.png" alt="" width="96" height="96" loading="lazy"></span>${'<i></i>'.repeat(6)}</div>
      <span class="ga-ripple"></span>
    </div>`,
  data: `<div class="ga-art ga-art-data" aria-hidden="true">
      <div class="ga-seg ga-seg-q" style="--n:3"><i></i><span>Data saver</span><span>Medium</span><span>Highest</span></div>
      <div class="ga-bars"><i></i><i></i><i></i><i></i><i></i></div>
    </div>`,
  alive: `<div class="ga-art ga-art-alive" aria-hidden="true">
      <span class="ga-wave"></span><span class="ga-wave"></span><span class="ga-wave"></span>
      <img src="/brand/logo-192.png" alt="" width="192" height="192" loading="lazy" decoding="async">
    </div>`,
};

const FEATURES = [
  { art: 'gesture', cls: 'ga-wide', icon: I.hand, title: 'Control everything with your thumb', text: 'Swipe up or down on the right side to change the volume, and on the left for brightness. Double-tap to jump 10 seconds. Pinch to fill your whole screen.' },
  { art: 'language', cls: '', icon: I.mic, title: 'Your language comes first', text: 'Pick Japanese, English or Hindi, plus a backup. If a show doesn’t have your first choice, the next best one plays by itself.' },
  { art: 'enhance', cls: '', icon: I.spark, title: 'A sharper, brighter picture', text: 'Tap Enhance and every frame gets crisper with richer colors. Older shows look noticeably better.' },
  { art: 'homescreen', cls: '', icon: I.home, title: 'One tap from your home screen', text: 'No browser, no tabs, no address bar. AnimeVerse opens straight to your shows, full screen.' },
  { art: 'data', cls: '', icon: I.data, title: 'Go easy on your data', text: 'Choose Data saver, Medium or Highest once, and every episode follows your choice.' },
  { art: 'alive', cls: 'ga-full', icon: I.heart, title: 'It feels alive', text: 'A gentle buzz when you tap, smooth movement on every screen, and a short opening animation with sound each time you launch it. Prefer quiet? Turn the sound off in Settings.' },
];

const cell = (v) =>
  v === true
    ? `<span class="ga-yes" aria-label="Yes">${I.check}</span>`
    : v === false
      ? `<span class="ga-no" aria-label="No">${I.minus}</span>`
      : `<span class="ga-txt">${esc(v)}</span>`;

// ---------- Page ----------
function pageHtml() {
  return `<div class="ga" data-ga>
  <section class="ga-hero" aria-labelledby="ga-title">
    <div class="ga-hero-bg" aria-hidden="true">
      <div class="ga-aurora"><i></i><i></i><i></i></div>
      <div class="ga-wall" data-ga-wall></div>
      <div class="ga-vignette"></div>
    </div>

    <div class="ga-hero-inner container">
      <div class="ga-hero-copy">
        <p class="ga-eyebrow ga-in" style="--d:0"><span class="ga-live"></span>AnimeVerse for Android</p>
        <h1 class="ga-title ga-in" id="ga-title" style="--d:1">AnimeVerse is <span class="ga-grad">better in the app.</span></h1>
        <p class="ga-lead ga-in" style="--d:2">Everything you love on the website, built for your phone. A smoother player you control with your thumb, your language picked first, and your shows one tap away on your home screen.</p>
        <div class="ga-cta ga-in" style="--d:3">
          <div class="ga-cta-row" data-ga-cta>${downloadButton('hero')}${dlMeta}</div>
          ${iosNote}
          ${qrCard}
        </div>
        <a class="ga-web-link ga-in" style="--d:4" href="/" data-link>Or keep watching on the website ${I.arrow}</a>
        <ul class="ga-trust ga-in" style="--d:5">
          <li>${I.user}No account needed</li>
          <li>${I.shield}Never asks for your contacts or photos</li>
          <li>${I.phone}Your list stays on your phone</li>
        </ul>
      </div>

      <div class="ga-hero-visual ga-in" style="--d:2">
        <div class="ga-stage" data-ga-stage>
          <div class="ga-glow" aria-hidden="true"></div>
          <div class="ga-phone ga-phone-hero" data-ga-depth="0.4">
            <div class="ga-phone-screen" data-ga-carousel>
              ${HERO_SCREENS.map(([k], i) => shotImg(k, { eager: i === 0, on: i === 0 })).join('')}
              ${statusBar}
            </div>
          </div>
          <div class="ga-float ga-f-rating" data-ga-depth="1.4" aria-hidden="true">
            <span class="ga-chip-sub">SUB</span><span class="ga-chip-dub">DUB</span><span class="ga-star">★ 8.7</span>
          </div>
          <div class="ga-float ga-f-next" data-ga-depth="2" aria-hidden="true">
            <span class="ga-f-ic">${I.clock}</span>
            <span><small>Next episode</small><b>in <span data-ga-countdown>23:12</span></b></span>
          </div>
          <div class="ga-float ga-f-audio" data-ga-depth="1.1" aria-hidden="true">
            <span class="ga-f-ic ga-f-ic-pink">${I.mic}</span>
            <span><small>Audio</small><b data-ga-lang>Japanese</b></span>
          </div>
          <div class="ga-float ga-f-continue" data-ga-depth="1.7" aria-hidden="true">
            <span class="ga-f-play">${I.play}</span>
            <span class="ga-f-cont"><b>Continue E3</b><span class="ga-f-track"><i></i></span></span>
          </div>
          <div class="ga-float ga-f-enhance" data-ga-depth="2.4" aria-hidden="true">${I.spark}Enhance</div>
        </div>
        <div class="ga-screen-tabs" role="tablist" aria-label="App screens">
          ${HERO_SCREENS.map(([k, label], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-ga-goto="${i}"><span>${label}</span><i></i></button>`).join('')}
        </div>
      </div>
    </div>

    <a class="ga-cue" href="#why" aria-label="See what’s inside the app"><span></span></a>
  </section>

  <section class="ga-sec container" id="why" aria-labelledby="ga-why">
    <header class="ga-head ga-reveal">
      <p class="ga-kicker">Why the app</p>
      <h2 id="ga-why">Made for your phone, not squeezed onto it.</h2>
      <p>The website is great on a big screen. On a phone, the app does what a browser can’t.</p>
    </header>
    <div class="ga-bento">
      ${FEATURES.map((f, i) => `<article class="ga-card ${f.cls} ga-reveal" style="--d:${i % 3}">
        ${ART[f.art]}
        <div class="ga-card-text">
          <h3><span class="ga-card-ic">${f.icon}</span>${esc(f.title)}</h3>
          <p>${esc(f.text)}</p>
        </div>
      </article>`).join('')}
    </div>
  </section>

  <section class="ga-sec ga-tour" id="tour" aria-labelledby="ga-tour">
    <div class="container">
      <header class="ga-head ga-reveal">
        <p class="ga-kicker">Take a quick tour</p>
        <h2 id="ga-tour">Every screen, made to feel easy.</h2>
        <p>These are real screens from the app. Scroll through to see how it works.</p>
      </header>
      <div class="ga-tour-grid">
        <ol class="ga-steps" data-ga-steps>
          ${TOUR.map((t, i) => `<li class="ga-step" data-ga-step="${t.key}">
            <figure class="ga-step-shot">${phoneOf(t.key, 'ga-phone-sm')}</figure>
            <div class="ga-step-text">
              <span class="ga-step-n">${String(i + 1).padStart(2, '0')}</span>
              <h3>${esc(t.title)}</h3>
              <p>${esc(t.text)}</p>
            </div>
          </li>`).join('')}
        </ol>
        <div class="ga-tour-stage" aria-hidden="true">
          <div class="ga-tour-sticky">
            <div class="ga-phone ga-phone-tour" data-ga-tour-phone>
              <div class="ga-phone-screen">
                ${TOUR.filter((t) => !SHOTS[t.key].land).map((t, i) => shotImg(t.key, { on: i === 0 }).replace(/alt="[^"]*"/, 'alt=""')).join('')}
                ${shotImg('player', { cls: 'ga-shot ga-shot-land' }).replace(/alt="[^"]*"/, 'alt=""')}
                ${statusBar}
              </div>
            </div>
            <div class="ga-tour-dots">${TOUR.map((t) => `<i data-ga-dot="${t.key}"></i>`).join('')}</div>
          </div>
        </div>
      </div>
      <div class="ga-swipe-dots" data-ga-swipe-dots aria-hidden="true">${TOUR.map(() => '<i></i>').join('')}</div>
    </div>
  </section>

  <section class="ga-sec container" aria-labelledby="ga-compare">
    <header class="ga-head ga-reveal">
      <p class="ga-kicker">Website or app?</p>
      <h2 id="ga-compare">You choose. The app just does more.</h2>
      <p>The website stays free and open for everyone. The app adds the things only a phone can do.</p>
    </header>
    <div class="ga-compare ga-reveal" role="table" aria-label="Website and app compared">
      <div class="ga-row ga-row-head" role="row">
        <span role="columnheader"><span class="sr-only">Feature</span></span>
        <span role="columnheader">${I.globe}Website</span>
        <span role="columnheader" class="ga-col-app"><img src="/brand/logo-48.png" alt="" width="48" height="48" loading="lazy">App</span>
      </div>
      ${COMPARE.map(([label, web, appV], i) => `<div class="ga-row" role="row" style="--i:${i}">
        <span role="rowheader">${esc(label)}</span>
        <span role="cell">${cell(web)}</span>
        <span role="cell" class="ga-col-app">${cell(appV)}</span>
      </div>`).join('')}
    </div>
  </section>

  <section class="ga-sec container" id="install" aria-labelledby="ga-install">
    <header class="ga-head ga-reveal">
      <p class="ga-kicker">Install in about a minute</p>
      <h2 id="ga-install">Three steps and you’re watching.</h2>
      <p>The app comes straight from this website, so Android asks you to allow it once. Here’s exactly what you’ll see.</p>
    </header>
    <ol class="ga-install">
      <li class="ga-istep ga-reveal" style="--d:0" data-ga-istep="1">
        <div class="ga-iart ga-iart-dl" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="32"/><circle class="ga-ring" cx="40" cy="40" r="32"/></svg>${I.download}</div>
        <span class="ga-istep-n">Step 1</span>
        <h3>Download</h3>
        <p>Tap <b>Download for Android</b>. If your browser asks whether to keep the file, tap <b>Download anyway</b>.</p>
      </li>
      <li class="ga-istep ga-reveal" style="--d:1" data-ga-istep="2">
        <div class="ga-iart ga-iart-allow" aria-hidden="true"><span>Allow from this source</span><i class="ga-switch"><b></b></i></div>
        <span class="ga-istep-n">Step 2</span>
        <h3>Allow it once</h3>
        <p>Open the file. If your phone says it can’t install apps from this source, tap <b>Settings</b>, switch on <b>Allow from this source</b>, then go back.</p>
      </li>
      <li class="ga-istep ga-reveal" style="--d:2" data-ga-istep="3">
        <div class="ga-iart ga-iart-open" aria-hidden="true"><img src="/brand/logo-96.png" alt="" width="96" height="96" loading="lazy"><span>Open</span></div>
        <span class="ga-istep-n">Step 3</span>
        <h3>Install and open</h3>
        <p>Tap <b>Install</b>, then <b>Open</b>. Pick your languages and start watching.</p>
      </li>
    </ol>
  </section>

  <section class="ga-sec container ga-faq" aria-labelledby="ga-faq">
    <header class="ga-head ga-reveal">
      <p class="ga-kicker">Questions</p>
      <h2 id="ga-faq">Good to know</h2>
    </header>
    <div class="ga-qa-list ga-reveal">
      ${FAQ.map((f) => `<details class="ga-qa"><summary><span>${esc(f.q)}</span>${I.down}</summary><div class="ga-qa-a"><p>${f.a}</p></div></details>`).join('')}
    </div>
  </section>

  <section class="ga-final container" aria-labelledby="ga-final">
    <div class="ga-final-card ga-reveal">
      <div class="ga-final-bg" aria-hidden="true"><i></i><i></i></div>
      <div class="ga-final-logo" aria-hidden="true"><span></span><span></span><img src="/brand/logo-192.png" alt="" width="192" height="192" loading="lazy" decoding="async"></div>
      <h2 id="ga-final">Ready when you are.</h2>
      <p>It’s free, it takes about a minute, and the website will still be here whenever you want it.</p>
      <div class="ga-final-cta" data-ga-cta>${downloadButton('footer')}</div>
      ${iosNote}
      <a class="ga-web-link" href="/" data-link>Keep watching on the website ${I.arrow}</a>
    </div>
  </section>

  <div class="ga-toast" data-ga-toast role="status" aria-live="polite" hidden>
    <span class="ga-toast-ic">${I.download}</span>
    <p><b>Your download has started.</b> When it finishes, open it from your notifications and tap Install.</p>
    <a href="#install" data-ga-toast-how>How to install</a>
    <button type="button" class="ga-toast-x" data-ga-toast-close aria-label="Close"><svg class="ic" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke-width="2.4"/></svg></button>
  </div>
</div>`;
}

function appPage(ctx) {
  const base = ctx.base;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: APP.name,
      operatingSystem: `Android ${APP.minAndroid} or newer`,
      applicationCategory: 'EntertainmentApplication',
      softwareVersion: APP.version,
      fileSize: `${APP.sizeMB}MB`,
      downloadUrl: `${base}${DOWNLOAD_PATH}`,
      installUrl: `${base}/app`,
      url: `${base}/app`,
      image: `${base}/brand/logo-512.png`,
      screenshot: ['home', 'detail', 'player', 'continue', 'schedule', 'settings'].map((k) => `${base}${shotSrc(k)}`),
      description: 'Watch anime in Japanese, English or Hindi with a player made for your phone: swipe controls, a backup audio language, Enhance and a data saver. Free, with no sign-up.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    faqLd(FAQ),
  ];
  return {
    title: 'Download the AnimeVerse App for Android — Free Anime App',
    description: `Get the free AnimeVerse app for Android: anime in Japanese, English or Hindi with a smoother player, swipe controls and no sign-up. ${APP.sizeLabel}, Android ${APP.minAndroid} or newer.`,
    canonicalPath: '/app',
    image: '/app-shots/share.jpg',
    styles: ['/getapp.css?v=1'],
    scripts: ['/getapp.js?v=1'],
    jsonLd,
    main: pageHtml(),
    mode: 'static',
    cdnSeconds: 60 * 60,
  };
}

module.exports = { APP, DOWNLOAD_PATH, APK_PATH, downloadUrl, appPage };
