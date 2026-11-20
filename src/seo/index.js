// Server-side rendering for search engines, AI crawlers, link previews and
// visitors without JavaScript. Every page URL gets full HTML: real titles,
// descriptions, structured data and the page's content. The app then takes over
// in the browser exactly as before.

const fs = require('fs');
const path = require('path');
const { siteUrlFor } = require('./util');
const pages = require('./pages');
const landing = require('./landing');
const blog = require('./blog');
const sitemap = require('./sitemap');
const { renderHtml } = require('./head');

const TEMPLATE_FILE = path.join(__dirname, '..', 'views', 'index.html');
const WEEK = 7 * 24 * 60 * 60;

let template = '';
function getTemplate() {
  if (!template || process.env.NODE_ENV !== 'production') template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  return template;
}

const ANIME_RE = /^\/anime\/((?:al)?\d{1,9})$/;
const WATCH_RE = /^\/watch\/((?:al)?\d{1,9})$/;
const LIST_RE = /^\/anime-list\/(0-9|[a-z])(?:\/(\d{1,4}))?$/;
const BLOG_RE = /^\/blog\/([a-z0-9-]{1,80})$/;

async function resolve(ctx) {
  const p = ctx.path;
  let m;
  if (p === '/') return pages.homePage(ctx);
  if ((m = p.match(ANIME_RE))) return pages.animePage(ctx, m[1]);
  if ((m = p.match(WATCH_RE))) return pages.animePage(ctx, m[1], { watch: true });
  if (p === '/browse') return pages.browsePage(ctx);
  if (p === '/schedule') return pages.schedulePage(ctx);
  if (p === '/library') return pages.appShellPage('My List & Continue Watching — AnimeVerse', 'Your anime list and watch progress, saved on this device.', '/library');
  if (p === '/privacy') return pages.appShellPage('Privacy Policy & Terms — AnimeVerse', 'How AnimeVerse handles your data: no accounts, no tracking, and everything stored on your own device.', '/privacy', undefined);
  if (/^\/player\/[\w-]{1,40}$/.test(p)) return pages.appShellPage('Player — AnimeVerse', 'Video player.', null);
  if (landing.PAGES[p]) return landing.landingPage(ctx, p);
  if (p === '/anime-list') return landing.animeListHub(ctx);
  if ((m = p.match(LIST_RE))) return landing.animeListLetter(ctx, m[1], m[2] ? Number(m[2]) : 1) || pages.notFoundPage(ctx);
  if (p === '/blog') return blog.blogIndex(ctx);
  if ((m = p.match(BLOG_RE))) return blog.blogPost(ctx, m[1]) || pages.notFoundPage(ctx);
  return pages.notFoundPage(ctx);
}

const contextFor = (req) => ({
  base: siteUrlFor(req),
  path: req.path,
  query: new URLSearchParams(req.originalUrl.split('?')[1] || ''),
});

const cacheHeader = (seconds) => `public, max-age=0, s-maxage=${Math.max(0, seconds | 0)}, stale-while-revalidate=${WEEK}`;

// Express middleware for every page URL (GET/HEAD, not /api, not a static file).
async function pageHandler(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // One URL per page: /anime/20/ → /anime/20, /anime-list/a/1 → /anime-list/a.
  const tidy = req.path.length > 1 && req.path.endsWith('/') ? req.path.replace(/\/+$/, '') : req.path.replace(/^(\/anime-list\/(?:0-9|[a-z]))\/1$/, '$1');
  if (tidy !== req.path) {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, tidy + qs);
  }

  let html;
  let page;
  try {
    const shell = getTemplate();
    const ctx = contextFor(req);
    page = await resolve(ctx);
    html = renderHtml(shell, page, ctx);
  } catch (err) {
    console.warn(`[seo] render failed for ${req.path}: ${err.message}`);
    try {
      html = getTemplate();
    } catch {
      return next(err);
    }
    page = { status: 200, cdnSeconds: 60 };
  }
  res.status(page.status || 200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheHeader(page.cdnSeconds ?? 600));
  res.send(html);
}

function sendXml(res, xml, seconds = 6 * 60 * 60) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', cacheHeader(seconds));
  res.setHeader('X-Robots-Tag', 'noindex');
  res.send(xml);
}

function mount(app) {
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', cacheHeader(24 * 60 * 60));
    res.send(sitemap.robotsTxt(siteUrlFor(req)));
  });
  app.get('/sitemap.xml', (req, res) => sendXml(res, sitemap.sitemapIndex(siteUrlFor(req))));
  app.get('/sitemaps/pages.xml', (req, res) => sendXml(res, sitemap.pagesSitemap(siteUrlFor(req))));
  app.get(/^\/sitemaps\/anime-(\d{1,3})\.xml$/, (req, res) => {
    const n = Number(req.path.match(/anime-(\d+)/)[1]);
    const xml = sitemap.animeSitemap(siteUrlFor(req), n);
    if (!xml) return res.status(404).type('text/plain').send('Not found');
    return sendXml(res, xml, 24 * 60 * 60);
  });
}

module.exports = { mount, pageHandler, resolve };
