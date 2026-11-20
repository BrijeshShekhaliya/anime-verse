import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const app = require('../server.js');
const cache = require('../src/services/cache.js');
const { siteUrlFor, DEFAULT_SITE_URL } = require('../src/seo/util.js');
const ssrHandler = require('../api/ssr.js');

// A made-up title, seeded into the caches so no test needs the network.
const FAKE_ID = '999999901';
const FAKE = {
  id: FAKE_ID,
  // No MyAnimeList id, so the live dub list doesn't override the languages below.
  malId: null,
  title: 'Test Blade Chronicle',
  titleRomaji: 'Tesuto Bureedo',
  titleJapanese: 'テストブレード',
  synonyms: ['TBC'],
  image: 'https://example.com/poster.jpg',
  banner: 'https://example.com/banner.jpg',
  synopsis: 'A swordsman tests things. </script><script>alert(1)</script> (Source: Test)',
  score: 8.4,
  members: 1234,
  episodes: 12,
  status: 'Finished Airing',
  airing: false,
  type: 'TV',
  season: 'spring',
  year: 2020,
  genres: ['Action'],
  studios: ['Studio Test'],
  duration: '24 min per ep',
  streaming: [{ name: 'Crunchyroll', url: 'https://www.crunchyroll.com/test' }],
  relations: [],
  languages: { audio: ['Japanese', 'English'], subtitles: ['English'], sub: true, dub: 'full' },
};

let base;
let server;
before(async () => {
  cache.set(`detail:${FAKE_ID}`, FAKE, 3600);
  cache.set(`episodes:${FAKE_ID}:s1`, { episodes: [{ episode_number: 1, season_number: 1, name: 'The First Cut', air_date: '2020-04-01' }] }, 3600);
  cache.set(`extras:${FAKE_ID}`, { characters: [{ name: 'Ken Test', role: 'Main', voiceActor: 'Aoi Voice' }], recommendations: [] }, 3600);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (path) => {
  const res = await fetch(base + path, { redirect: 'manual' });
  return { status: res.status, type: res.headers.get('content-type') || '', cacheControl: res.headers.get('cache-control') || '', location: res.headers.get('location'), body: await res.text() };
};
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('canonical address: SITE_URL, then local host, then the live domain', () => {
  const saved = process.env.SITE_URL;
  delete process.env.SITE_URL;
  assert.equal(siteUrlFor({ headers: { host: 'localhost:3001' } }), 'http://localhost:3001');
  assert.equal(siteUrlFor({ headers: { host: 'evil.example' } }), DEFAULT_SITE_URL);
  assert.equal(siteUrlFor({ headers: { host: 'stream-aggregator-abc.vercel.app' } }), DEFAULT_SITE_URL);
  process.env.SITE_URL = 'https://example.org/';
  assert.equal(siteUrlFor({ headers: { host: 'localhost' } }), 'https://example.org');
  if (saved === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = saved;
});

test('home page is server-rendered with keyword title and structured data', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.body, /<title>AnimeVerse: Watch Anime Online Free — English Sub, Dub &amp; Hindi<\/title>/);
  assert.match(r.body, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/">/);
  assert.match(r.body, /<main id="app" tabindex="-1" data-ssr="spa">/);
  assert.match(r.body, /id="seoExtra" data-path="\/"/);
  assert.deepEqual(ldOf(r.body).slice(0, 2).map((l) => l['@type']), ['WebSite', 'Organization']);
  assert.match(r.cacheControl, /s-maxage=\d+/);
});

test('favicon and site name meet Google’s requirements', async () => {
  const home = await get('/');
  // Google only shows favicons that are a multiple of 48px square; the first icon must qualify.
  const firstIcon = home.body.match(/<link rel="icon"[^>]*>/)[0];
  assert.match(firstIcon, /href="\/favicon\.ico"/);
  assert.match(firstIcon, /48x48/);
  assert.match(home.body, /<link rel="manifest" href="\/site\.webmanifest">/);
  assert.match(home.body, /<meta property="og:site_name" content="AnimeVerse">/);

  const ico = await fetch(`${base}/favicon.ico`);
  assert.equal(ico.status, 200);
  const bytes = Buffer.from(await ico.arrayBuffer());
  assert.equal(bytes.readUInt16LE(2), 1, 'ICO header');
  const sizes = Array.from({ length: bytes.readUInt16LE(4) }, (_, i) => bytes[6 + i * 16] || 256);
  assert.ok(sizes.includes(48), `favicon.ico has a 48px image (has ${sizes})`);

  const manifest = await (await fetch(`${base}/site.webmanifest`)).json();
  assert.equal(manifest.short_name, 'AnimeVerse');

  // Google picks the site name shown in results from these; they must all say AnimeVerse.
  const site = ldOf(home.body).find((l) => l['@type'] === 'WebSite');
  assert.equal(site.name, 'AnimeVerse');
  assert.match(site.url, /\/$/);
  assert.match(home.body, /<title>AnimeVerse: /);
  assert.match(home.body, /<h1>AnimeVerse: /);
  const org = ldOf(home.body).find((l) => l['@type'] === 'Organization');
  assert.match(org.logo.url, /\/brand\/logo-512\.png$/);
});

test('anime page carries episodes, cast, language guide and valid structured data', async () => {
  const r = await get(`/anime/${FAKE_ID}`);
  assert.equal(r.status, 200);
  assert.match(r.body, /<title>Watch Test Blade Chronicle Online Free — English Sub &amp; Dub \| AnimeVerse<\/title>/);
  assert.match(r.body, /Episode 1: The First Cut/);
  assert.match(r.body, /<strong>Ken Test<\/strong> \(Main\) voiced by Aoi Voice/);
  assert.match(r.body, /Test Blade Chronicle in Hindi/);
  assert.match(r.body, /Where to watch Test Blade Chronicle/);
  // Synopsis HTML is escaped, never executed.
  assert.doesNotMatch(r.body, /<script>alert\(1\)<\/script>/);
  const ld = ldOf(r.body);
  assert.deepEqual(ld.map((l) => l['@type']), ['TVSeries', 'BreadcrumbList', 'FAQPage']);
  assert.equal(ld[0].numberOfEpisodes, 12);
  assert.equal(ld[0].aggregateRating, undefined, 'third-party scores must not be marked up as ratings');
  assert.equal(ld[0].episode[0].name, 'The First Cut');
});

test('watch page points its canonical at the title page', async () => {
  const r = await get(`/watch/${FAKE_ID}?season=1&ep=1`);
  assert.equal(r.status, 200);
  assert.match(r.body, new RegExp(`<link rel="canonical" href="[^"]+/anime/${FAKE_ID}">`));
  assert.match(r.body, /Episode 1 — English Sub &amp; Dub/);
});

test('keyword pages, A–Z lists and guides render as static article pages', async () => {
  for (const path of ['/watch-anime', '/watch-anime-free', '/watch-anime-in-hindi', '/watch-anime-in-english', '/watch-anime-in-japanese', '/watch-anime-movies', '/anime-list', '/anime-list/n', '/blog', '/blog/naruto-watch-order']) {
    const r = await get(path);
    assert.equal(r.status, 200, path);
    assert.match(r.body, /data-ssr="static"/, path);
    assert.match(r.body, /<h1>/, path);
    assert.doesNotMatch(r.body, /<meta name="robots" content="noindex/, path);
  }
  const hindi = await get('/watch-anime-in-hindi');
  assert.ok(ldOf(hindi.body).some((l) => l['@type'] === 'FAQPage'));
});

test('the "Get the app" page is fully server-rendered with its own styles, script and app data', async () => {
  const r = await get('/app');
  assert.equal(r.status, 200);
  assert.match(r.body, /data-ssr="static"/);
  assert.match(r.body, /<title>Download the AnimeVerse App for Android/);
  assert.match(r.body, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/app">/);
  assert.doesNotMatch(r.body, /<meta name="robots" content="noindex/);
  assert.match(r.body, /<link rel="stylesheet" href="\/getapp\.css\?v=\d+">/);
  assert.match(r.body, /<script src="\/getapp\.js\?v=\d+" defer><\/script>/);
  assert.match(r.body, /<h1 class="ga-title[^"]*" id="ga-title"[^>]*>AnimeVerse is/);
  // Every download button goes through the redirect, so the file can move freely.
  const downloads = [...r.body.matchAll(/data-ga-download="[^"]+"/g)].length;
  const directLinks = [...r.body.matchAll(/href="\/download\/android"/g)].length;
  assert.ok(downloads >= 2 && downloads === directLinks, 'all download buttons use /download/android');
  for (const shot of ['home', 'detail', 'player', 'settings']) assert.match(r.body, new RegExp(`/app-shots/${shot}\\.webp`));
  const ld = ldOf(r.body);
  const appLd = ld.find((l) => l['@type'] === 'MobileApplication');
  assert.ok(appLd, 'MobileApplication structured data');
  assert.equal(appLd.offers.price, '0');
  assert.match(appLd.downloadUrl, /\/download\/android$/);
  assert.ok(ld.some((l) => l['@type'] === 'FAQPage'));
  // Plain words for visitors: no file-type jargon on the page.
  const text = r.body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\bAPK\b|sideload|\.apk/i);
});

test('/download/android redirects to the app file, which APP_DOWNLOAD_URL can move', async () => {
  const saved = process.env.APP_DOWNLOAD_URL;
  try {
    delete process.env.APP_DOWNLOAD_URL;
    const r = await get('/download/android');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/download/AnimeVerse.apk');
    assert.match(r.cacheControl, /s-maxage=300/);

    process.env.APP_DOWNLOAD_URL = 'https://files.example.com/AnimeVerse-1.0.1.apk';
    assert.equal((await get('/download/android')).location, 'https://files.example.com/AnimeVerse-1.0.1.apk');
    process.env.APP_DOWNLOAD_URL = 'javascript:alert(1)';
    assert.equal((await get('/download/android')).location, '/download/AnimeVerse.apk', 'only web addresses are accepted');

    const short = await get('/download');
    assert.equal(short.status, 301);
    assert.equal(short.location, '/app');
  } finally {
    if (saved === undefined) delete process.env.APP_DOWNLOAD_URL;
    else process.env.APP_DOWNLOAD_URL = saved;
  }
});

test('the app file ships with the site, downloads as a file, and the page states its real size', async () => {
  const fs = require('node:fs');
  const { APP } = require('../src/seo/app-page.js');
  const bytes = fs.statSync(fileURLToPath(new URL('../public/download/AnimeVerse.apk', import.meta.url))).size;
  assert.equal(Math.round(bytes / 1e6), APP.sizeMB, 'update APP.sizeMB in src/seo/app-page.js after replacing the file');

  const res = await fetch(`${base}/download/AnimeVerse.apk`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="AnimeVerse.apk"');
  assert.equal(Number(res.headers.get('content-length')), bytes);

  // Vercel serves the same file with the same headers.
  const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rule = vercel.headers.find((h) => h.source.startsWith('/download/'));
  const header = (k) => rule.headers.find((h) => h.key === k)?.value;
  assert.equal(header('Content-Type'), 'application/vnd.android.package-archive');
  assert.equal(header('Content-Disposition'), 'attachment; filename="AnimeVerse.apk"');
});

test('every page links to the app page from the top bar and footer', async () => {
  const r = await get('/browse');
  assert.match(r.body, /<a class="app-pill" href="\/app"/);
  assert.match(r.body, /<a class="footer-app" href="\/app">/);
});

test('unknown pages are real 404s and trailing slashes redirect', async () => {
  const missing = await get('/no-such-page');
  assert.equal(missing.status, 404);
  assert.match(missing.body, /<meta name="robots" content="noindex, follow">/);
  assert.equal((await get('/blog/no-such-post')).status, 404);
  const slash = await get('/anime-list/');
  assert.equal(slash.status, 301);
  assert.equal(slash.location, '/anime-list');
});

test('robots.txt and sitemaps are generated and well-formed', async () => {
  const robots = await get('/robots.txt');
  assert.match(robots.type, /text\/plain/);
  assert.match(robots.body, /Sitemap: http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml/);
  assert.doesNotMatch(robots.body, /Disallow: \/api\/\n/, 'page data must stay crawlable for rendering');
  assert.match(robots.body, /Disallow: \/download\//);

  const index = await get('/sitemap.xml');
  assert.match(index.type, /application\/xml/);
  assert.match(index.body, /<sitemapindex/);
  assert.match(index.body, /\/sitemaps\/pages\.xml/);
  assert.match(index.body, /\/sitemaps\/anime-1\.xml/);

  const pages = await get('/sitemaps/pages.xml');
  assert.match(pages.body, /\/watch-anime-in-hindi<\/loc>/);
  assert.match(pages.body, /\/blog\/naruto-watch-order<\/loc>/);
  assert.match(pages.body, /\/anime-list\/a<\/loc>/);
  assert.match(pages.body, /\/app<\/loc>/);

  const anime = await get('/sitemaps/anime-1.xml');
  assert.match(anime.body, /<urlset/);
  assert.match(anime.body, /\/anime\/20<\/loc>/, 'evergreen titles are always listed');
  assert.equal((await get('/sitemaps/anime-999.xml')).status, 404);
});

test('Vercel page entry maps the rewritten URL back to the original path', async () => {
  const s = http.createServer(ssrHandler);
  await new Promise((resolve) => s.listen(0, resolve));
  try {
    const port = s.address().port;
    const r = await fetch(`http://127.0.0.1:${port}/api/ssr?__path=/blog&utm=x`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /<title>Anime Guides/);
    const robots = await fetch(`http://127.0.0.1:${port}/api/ssr?__path=/robots.txt`);
    assert.match(await robots.text(), /Sitemap:/);
  } finally {
    s.close();
  }
});
