// HTML pieces for the server-rendered pages. Plain links only (no data-link):
// these pages are full page loads, so they work without JavaScript too.

const { esc, stripHtml } = require('./util');
const { langInfo, isMovie } = require('./catalog');
const index = require('./anime-index');

const factsOf = (a) =>
  [a.type || a.format, a.year, a.episodes && !isMovie(a) ? `${a.episodes} eps` : null].filter(Boolean);

function langChips(a) {
  const l = langInfo(a);
  const chips = [];
  if (l.sub) chips.push('<span class="seo-chip sub">SUB</span>');
  if (l.dub === 'full') chips.push('<span class="seo-chip dub">DUB</span>');
  if (l.dub === 'partial') chips.push('<span class="seo-chip dub">DUB*</span>');
  return chips.join('');
}

// Poster card for the article-style pages (landing pages and the blog).
function card(a, { label = null } = {}) {
  const title = a.title || a.titleRomaji || 'Anime';
  const src = a.image || index.imageOf(a.id);
  const img = src
    ? `<img src="${esc(src)}" alt="${esc(title)} poster" width="200" height="300" loading="lazy" decoding="async">`
    : `<span class="seo-noimg">${esc(title)}</span>`;
  const facts = factsOf(a).join(' · ');
  return `<li class="seo-card"><a href="/anime/${esc(a.id)}">
      <span class="seo-poster">${img}</span>
      <span class="seo-card-title">${esc(label ? label(a) : title)}</span>
      <span class="seo-card-meta">${a.languages ? langChips(a) : ''}${facts ? `<span>${esc(facts)}</span>` : ''}</span>
    </a></li>`;
}

const cardGrid = (items, opts) => (items.length ? `<ul class="seo-grid">${items.map((a) => card(a, opts)).join('')}</ul>` : '');

// Text-only list for the no-JavaScript fallback of app pages.
const linkList = (items, { label = null } = {}) =>
  items.length
    ? `<ul class="seo-links">${items
        .map((a) => {
          const facts = factsOf(a).join(' · ');
          return `<li><a href="/anime/${esc(a.id)}">${esc(label ? label(a) : a.title)}</a>${facts ? ` <span>${esc(facts)}</span>` : ''}</li>`;
        })
        .join('')}</ul>`
    : '';

const chipLinks = (items) =>
  items.length
    ? `<ul class="seo-chiplinks">${items.map((a) => `<li><a href="/anime/${esc(a.id)}">${esc(a.title)}</a></li>`).join('')}</ul>`
    : '';

// Questions are written out on the page (not collapsed), answers may hold links.
function faqHtml(faq, heading = 'Frequently asked questions') {
  if (!faq || !faq.length) return '';
  return `<section class="seo-faq" aria-labelledby="faq-h">
      <h2 id="faq-h">${esc(heading)}</h2>
      ${faq.map((f) => `<div class="seo-qa"><h3>${esc(f.q)}</h3><p>${f.a}</p></div>`).join('')}
    </section>`;
}

const faqLd = (faq) =>
  faq && faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.a) } })),
      }
    : null;

// trail: [{ name, path }]; the last item is the current page.
function breadcrumbHtml(trail) {
  return `<nav class="seo-crumbs" aria-label="Breadcrumb"><ol>${trail
    .map((t, i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(t.name)}</li>` : `<li><a href="${esc(t.path)}">${esc(t.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

const breadcrumbLd = (trail, base) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: `${base}${t.path}` })),
});

const itemListLd = (items, base, name) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.slice(0, 50).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/anime/${a.id}`, name: a.title })),
});

module.exports = { factsOf, langChips, card, cardGrid, linkList, chipLinks, faqHtml, faqLd, breadcrumbHtml, breadcrumbLd, itemListLd };
