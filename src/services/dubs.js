// English dub availability from the open-source MAL-Dubs project
// (https://github.com/MAL-Dubs/MAL-Dubs, AGPL-3.0). The list is keyed by
// MyAnimeList id and refreshed automatically every few hours.
const { fetchJson } = require('./http');

const DUB_URL = 'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json';
const REFRESH_MS = 6 * 60 * 60 * 1000;

const RETRY_MS = 60 * 1000;

let dubbed = new Set();
let incomplete = new Set();
let updatedAt = null;
let loading = null;
let lastAttempt = 0;

async function refresh() {
  lastAttempt = Date.now();
  try {
    const data = await fetchJson(DUB_URL, { timeoutMs: 15000 });
    dubbed = new Set(data.dubbed || []);
    incomplete = new Set(data.incomplete || []);
    updatedAt = new Date().toISOString();
    console.log(`[dubs] Loaded ${dubbed.size} dubbed titles (${incomplete.size} in progress)`);
  } catch (err) {
    console.warn(`[dubs] Refresh failed: ${err.message}`);
  }
}

// One load at a time; a failed or stale list is fetched again on the next use.
// (On Vercel a server is paused between requests, so a load started at boot
// can time out while paused and must not leave the list empty for 6 hours.)
function ensure() {
  const stale = updatedAt ? Date.now() - lastAttempt > REFRESH_MS : Date.now() - lastAttempt > RETRY_MS;
  if (!loading && stale) loading = refresh().finally(() => { loading = null; });
  return loading || Promise.resolve();
}

// Waits (at most `ms`) for the list before titles are labelled SUB/DUB, so a
// freshly started server doesn't mark dubbed shows as "no dub".
function ready(ms = 2500) {
  const pending = ensure();
  if (updatedAt) return Promise.resolve();
  return Promise.race([pending, new Promise((resolve) => setTimeout(resolve, ms).unref?.())]);
}

function start() {
  ensure();
  setInterval(ensure, REFRESH_MS).unref();
}

// Languages a title is available in. Every title has the original Japanese
// audio with subtitles; the English dub comes from the MAL-Dubs list.
function languagesFor(malId) {
  const id = Number(malId);
  let dub = null;
  if (incomplete.has(id)) dub = 'partial';
  else if (dubbed.has(id)) dub = 'full';
  return {
    audio: ['Japanese', ...(dub ? ['English'] : [])],
    subtitles: ['English'],
    sub: true,
    dub,
  };
}

function isDubbed(malId) {
  const id = Number(malId);
  return dubbed.has(id) || incomplete.has(id);
}

function status() {
  return { dubbed: dubbed.size, incomplete: incomplete.size, updatedAt };
}

module.exports = { start, ready, languagesFor, isDubbed, status };
