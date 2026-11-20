// Puts a page's head tags and server-rendered content into the app shell
// (src/views/index.html), at its <!--SEO_HEAD-->, <!--SSR_MAIN--> and
// <!--SSR_EXTRA--> markers.

const { SITE_NAME, esc } = require('./util');

const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

// JSON inside <script> must never contain "</script>" or HTML comment openers.
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const absolute = (url, base) => (!url ? `${base}/brand/logo-192.png` : /^https?:\/\//.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`);

function headTags(page, ctx) {
  const title = esc(page.title || SITE_NAME);
  const desc = esc(page.description || '');
  const canonical = page.canonicalPath ? `${ctx.base}${page.canonicalPath}` : null;
  const image = esc(absolute(page.image, ctx.base));
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}">`,
    `<meta name="robots" content="${esc(page.robots || DEFAULT_ROBOTS)}">`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:type" content="${esc(page.ogType || 'website')}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
    `<meta property="og:image" content="${image}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${image}">`,
    // Tells the app these tags already match this URL, so it leaves them alone on first load.
    `<meta name="ssr-path" content="${esc(ctx.path)}">`,
  ].filter(Boolean);
  (page.jsonLd || []).filter(Boolean).forEach((ld, i) => {
    tags.push(`<script type="application/ld+json"${i === 0 ? ' id="seoStructuredData"' : ' class="seo-ld"'}>${safeJson(ld)}</script>`);
  });
  return tags.join('\n  ');
}

function renderHtml(template, page, ctx) {
  const extra = page.extra
    ? `<section class="seo-extra" id="seoExtra" data-path="${esc(ctx.path)}" aria-label="About this page">${page.extra}</section>`
    : '';
  return template
    .replace('<!--SEO_HEAD-->', () => headTags(page, ctx))
    .replace('<!--SSR_MAIN-->', () => page.main || '')
    .replace('data-ssr=""', () => `data-ssr="${page.mode === 'static' ? 'static' : 'spa'}"`)
    .replace('<!--SSR_EXTRA-->', () => extra);
}

module.exports = { renderHtml, headTags, safeJson };
