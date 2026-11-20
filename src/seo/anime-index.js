// Every anime title the site can show (about 20k), for the sitemaps and the
// A–Z list pages. Built by scripts/build-anime-index.js from AniList; live home
// rows and the evergreen list are merged in so new titles appear between builds.

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog');

const FILE = path.join(__dirname, '..', 'data', 'anime-index.json');

let loaded = null;
let loadedAt = 0;
let images = {};

function readFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    images = raw.images || {};
    return (raw.items || []).map(([id, title, year, format, popularity, updatedAt]) => ({ id: String(id), title, year, format, popularity: popularity || 0, updatedAt }));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[seo] anime index unreadable: ${err.message}`);
    return [];
  }
}

// Title sort key: "The Apothecary Diaries" files under A, "86" under 0–9.
const sortKey = (title) => String(title || '').replace(/^(the|a|an)\s+/i, '').trim();
function letterOf(title) {
  const c = sortKey(title).charAt(0).toLowerCase();
  return /[a-z]/.test(c) ? c : '0-9';
}

function all() {
  // The file never changes while running; live rows are re-merged every 10 minutes.
  if (loaded && Date.now() - loadedAt < 10 * 60 * 1000) return loaded;
  const base = loaded?.base || readFile();
  const byId = new Map(base.map((a) => [a.id, a]));
  const updatedAt = Math.floor(Date.now() / 1000);
  for (const a of [...catalog.homeItems(), ...catalog.EVERGREEN]) {
    const id = String(a.id);
    if (byId.has(id)) continue;
    byId.set(id, { id, title: a.title, year: a.year || null, format: a.type || null, popularity: a.members || a.popularity || 0, updatedAt });
  }
  const list = [...byId.values()].filter((a) => a.title).sort((x, y) => y.popularity - x.popularity);
  loaded = Object.assign(list, { base });
  loadedAt = Date.now();
  return loaded;
}

const LETTERS = ['0-9', ...'abcdefghijklmnopqrstuvwxyz'.split('')];

const groups = new Map();
let groupsFor = null;
function byLetter(letter) {
  const list = all();
  if (groupsFor !== list) {
    groups.clear();
    for (const a of list) {
      const l = letterOf(a.title);
      if (!groups.has(l)) groups.set(l, []);
      groups.get(l).push(a);
    }
    for (const g of groups.values()) g.sort((x, y) => sortKey(x.title).localeCompare(sortKey(y.title), 'en', { sensitivity: 'base' }));
    groupsFor = list;
  }
  return groups.get(letter) || [];
}

// Cover image for one of the most popular titles (see scripts/build-anime-index.js).
function imageOf(id) {
  all();
  return images[String(id)] || null;
}

module.exports = { all, byLetter, letterOf, imageOf, LETTERS };
