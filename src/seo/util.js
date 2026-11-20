// Small helpers shared by the server-rendered (crawlable) pages.

const SITE_NAME = 'AnimeVerse';

function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const stripHtml = (str) => String(str || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Cuts at a word boundary so snippets never end mid-word.
function truncate(str, max = 158) {
  const clean = stripHtml(str);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

// Synopses from AniList/MAL end with "(Source: ...)" or "[Written by MAL Rewrite]".
const cleanSynopsis = (str) =>
  stripHtml(str)
    .replace(/\s*[([](?:source|written by)[^)\]]*[)\]]\s*$/i, '')
    .trim();

const paragraphs = (str) =>
  String(str || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n+/)
    .map(cleanSynopsis)
    .filter(Boolean);

// The one public address every canonical link, sitemap entry and social card
// names, so Vercel preview URLs and other hosts all point Google at the real site.
// Override with the SITE_URL environment variable if the domain changes.
const DEFAULT_SITE_URL = 'https://watchanimeverse.dpdns.org';
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i;

function siteUrlFor(req) {
  const fromEnv = String(process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[^/\s]+$/i.test(fromEnv)) return fromEnv;
  // Local development links to itself so pages can be clicked through.
  const host = String(req.headers.host || '').trim();
  if (LOCAL_HOST_RE.test(host)) return `http://${host}`;
  return DEFAULT_SITE_URL;
}

const slugify = (str) =>
  String(str || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const unique = (list, key = (x) => x) => {
  const seen = new Set();
  return list.filter((item) => {
    const k = key(item);
    if (k == null || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

module.exports = { SITE_NAME, DEFAULT_SITE_URL, esc, stripHtml, truncate, cleanSynopsis, paragraphs, siteUrlFor, slugify, unique, cap };
