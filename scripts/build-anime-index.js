#!/usr/bin/env node
// Builds src/data/anime-index.json: every non-adult anime on AniList (about 20k),
// used for the sitemaps and the A–Z list pages so search engines can reach every
// title page. Run it again now and then to pick up new titles:
//
//   node scripts/build-anime-index.js
//
// AniList stops any one listing at 5,000 results, so it walks one start year at a
// time, ~28 requests a minute (under AniList's rate limit): about 20 minutes. Live home rows are merged in at runtime,
// so brand-new seasonal titles show up even between runs.

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'data', 'anime-index.json');
const ENDPOINT = 'https://graphql.anilist.co';
const GAP_MS = 2150;
const SKIP_FORMATS = new Set(['MUSIC']);

const QUERY = `query ($page: Int, $from: FuzzyDateInt, $to: FuzzyDateInt) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(type: ANIME, isAdult: false, sort: ID, startDate_greater: $from, startDate_lesser: $to) {
      id idMal format seasonYear popularity updatedAt
      startDate { year }
      title { english romaji }
    }
  }
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(vars, attempt = 1) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'AnimeVerse-index-builder' },
    body: JSON.stringify({ query: QUERY, variables: vars }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 8) throw new Error(`AniList ${res.status} after ${attempt} tries`);
    const wait = Math.max(Number(res.headers.get('retry-after')) || 0, 10) * 1000;
    console.warn(`  AniList ${res.status}, waiting ${wait / 1000}s`);
    await sleep(wait);
    return page(vars, attempt + 1);
  }
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.Page;
}

function save(items, complete) {
  // Most popular first, so the first sitemap file holds the titles that matter most.
  const sorted = [...items.values()].sort((a, b) => b[4] - a[4]);
  const body = { updatedAt: new Date().toISOString(), complete, count: sorted.length, fields: ['id', 'title', 'year', 'format', 'popularity', 'updatedAt'], items: sorted };
  fs.writeFileSync(OUT, JSON.stringify(body));
}

// [from, to) start years; FuzzyDateInt is YYYYMMDD and a year-only date is YYYY0000.
function yearRanges() {
  const last = new Date().getFullYear() + 3;
  const ranges = [[1900, 1960]];
  for (let y = 1960; y <= last; y += 1) ranges.push([y, y + 1]);
  return ranges;
}

// Cover images for the most popular titles, so list and guide pages show posters
// even before a title's page has been opened. `--images-only` adds them to an
// existing index without rebuilding it.
const IMAGE_COUNT = 800;
const IMG_QUERY = `query ($mal: [Int], $al: [Int]) {
  mal: Page(perPage: 50) { media(idMal_in: $mal, type: ANIME) { idMal coverImage { large } } }
  al: Page(perPage: 50) { media(id_in: $al, type: ANIME) { id coverImage { large } } }
}`;

async function addImages() {
  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const top = data.items.slice(0, IMAGE_COUNT).map((row) => row[0]);
  const images = {};
  for (let i = 0; i < top.length; i += 50) {
    const batch = top.slice(i, i + 50);
    const mal = batch.filter((id) => !id.startsWith('al')).map(Number);
    const al = batch.filter((id) => id.startsWith('al')).map((id) => Number(id.slice(2)));
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'AnimeVerse-index-builder' },
      body: JSON.stringify({ query: IMG_QUERY, variables: { mal: mal.length ? mal : [0], al: al.length ? al : [0] } }),
    });
    if (!res.ok) throw new Error(`AniList ${res.status} while fetching covers`);
    const json = await res.json();
    for (const m of json.data?.mal?.media || []) if (m.coverImage?.large) images[String(m.idMal)] = m.coverImage.large;
    for (const m of json.data?.al?.media || []) if (m.coverImage?.large) images[`al${m.id}`] = m.coverImage.large;
    await sleep(GAP_MS);
  }
  data.images = images;
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log(`Added ${Object.keys(images).length} cover images`);
}

if (process.argv.includes('--images-only')) {
  addImages().catch((err) => {
    console.error(`Cover images failed: ${err.message}`);
    process.exit(1);
  });
  return;
}

(async () => {
  const items = new Map();
  let calls = 0;
  for (const [fromYear, toYear] of yearRanges()) {
    for (let n = 1; ; n += 1) {
      const p = await page({ page: n, from: fromYear * 10000 - 1, to: toYear * 10000 });
      calls += 1;
      for (const m of p.media) {
        if (SKIP_FORMATS.has(m.format)) continue;
        const id = m.idMal ? String(m.idMal) : `al${m.id}`;
        if (items.has(id)) continue;
        const title = (m.title.english || m.title.romaji || '').trim();
        if (!title) continue;
        items.set(id, [id, title, m.seasonYear || m.startDate?.year || null, m.format || null, m.popularity || 0, m.updatedAt || null]);
      }
      if (calls % 20 === 0) {
        console.log(`  ${calls} requests, ${items.size} titles, now at ${fromYear}`);
        save(items, false);
      }
      await sleep(GAP_MS);
      if (!p.pageInfo.hasNextPage || !p.media.length) break;
    }
  }
  save(items, true);
  console.log(`Done: ${items.size} titles written to ${path.relative(process.cwd(), OUT)}`);
  await addImages();
})().catch((err) => {
  console.error(`Index build failed: ${err.message}`);
  process.exit(1);
});
