// ─── Vercel entry for every page URL, robots.txt and the sitemaps ───────────
// vercel.json rewrites them here as /api/ssr?__path=<original path>, so the
// Express app can answer with server-rendered HTML (see src/seo).

const app = require('../server');

module.exports = (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let pagePath = url.searchParams.get('__path');
  url.searchParams.delete('__path');

  if (pagePath == null) {
    // Some Vercel setups hand the function the original URL instead.
    const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'];
    pagePath = forwarded ? String(forwarded).split('?')[0] : url.pathname;
  }
  if (!pagePath.startsWith('/')) pagePath = `/${pagePath}`;
  if (pagePath === '/api/ssr') pagePath = '/';

  const qs = url.searchParams.toString();
  req.url = pagePath + (qs ? `?${qs}` : '');
  return app(req, res);
};
