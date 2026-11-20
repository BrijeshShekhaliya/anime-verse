// /sitemap.xml is a sitemap index pointing at:
//   /sitemaps/pages.xml      home, app pages, keyword pages, A–Z lists, guides
//   /sitemaps/anime-N.xml    every anime title page, 5,000 per file, most popular first

const { esc } = require('./util');
const index = require('./anime-index');
const landing = require('./landing');
const blog = require('./blog');

const PER_FILE = 5000;

const today = () => new Date().toISOString().slice(0, 10);
const isoDate = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000).toISOString().slice(0, 10) : null);

const urlset = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;

const animeFileCount = () => Math.max(1, Math.ceil(index.all().length / PER_FILE));

function sitemapIndex(base) {
  const files = ['/sitemaps/pages.xml', ...Array.from({ length: animeFileCount() }, (_, i) => `/sitemaps/anime-${i + 1}.xml`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((f) => `<sitemap><loc>${esc(base + f)}</loc><lastmod>${today()}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
}

function pagesSitemap(base) {
  const d = today();
  const urls = [
    { loc: `${base}/`, lastmod: d },
    { loc: `${base}/browse`, lastmod: d },
    { loc: `${base}/schedule`, lastmod: d },
    ...Object.keys(landing.PAGES).map((p) => ({ loc: base + p, lastmod: d })),
    ...landing.animeListPaths().map((p) => ({ loc: base + p, lastmod: d })),
    { loc: `${base}/blog`, lastmod: blog.POSTS.map((p) => p.updated || p.published).sort().pop() },
    ...blog.POSTS.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updated || p.published })),
    { loc: `${base}/privacy` },
  ];
  return urlset(urls);
}

// n is 1-based; null when out of range.
function animeSitemap(base, n) {
  if (!Number.isInteger(n) || n < 1 || n > animeFileCount()) return null;
  const slice = index.all().slice((n - 1) * PER_FILE, n * PER_FILE);
  return urlset(slice.map((a) => ({ loc: `${base}/anime/${a.id}`, lastmod: isoDate(a.updatedAt) })));
}

function robotsTxt(base) {
  return `# AnimeVerse
User-agent: *
Allow: /
# Page data the app loads (search engines need it to render pages).
Allow: /api/
# Video segments and the raw player: nothing to index there.
Disallow: /api/stream
Disallow: /player/

Sitemap: ${base}/sitemap.xml
`;
}

const totalUrls = () => index.all().length + landing.animeListPaths().length + Object.keys(landing.PAGES).length + blog.POSTS.length + 5;

module.exports = { sitemapIndex, pagesSitemap, animeSitemap, robotsTxt, totalUrls, PER_FILE };
