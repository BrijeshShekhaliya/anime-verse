// Server-rendered content for every URL. Each page returns:
//   status, title, description, canonicalPath, image, ogType, robots, jsonLd[],
//   main  (HTML put inside <main id="app">),
//   mode  'spa'    = the app replaces `main` once JavaScript runs (crawler/no-JS copy)
//         'static' = article pages (guides, blog, A–Z lists) the app keeps as they are
//   extra (HTML shown under the app page and kept for that URL: language guide, FAQ)
//   cdnSeconds (how long the CDN may keep the page)

const { SITE_NAME, esc, truncate, cleanSynopsis, paragraphs, unique, cap } = require('./util');
const catalog = require('./catalog');
const animeRoutes = require('../routes/anime');
const R = require('./render');

const DAY = 24 * 60 * 60;
const SPA_FALLBACK = 'seo-fallback';

const titleOf = (a) => a.title || a.titleEnglish || a.titleRomaji || `Anime ${a.id}`;

// ---------- Home ----------
function homePage(ctx) {
  const rows = [
    ['Trending anime right now', catalog.row('trending')],
    [`New this season`, catalog.row('seasonNow')],
    ['Most popular anime', catalog.row('popular')],
    ['Top rated anime of all time', catalog.row('topRated')],
    ['Anime movies', catalog.row('movies')],
    ['Upcoming anime', catalog.row('upcoming')],
  ].filter(([, items]) => items.length);
  const popular = catalog.evergreen().slice(0, 36);

  const main = `<div class="${SPA_FALLBACK} container page-top">
      <h1>Watch Anime Online Free</h1>
      <p>Stream anime in Japanese with English subtitles, in English dub, and in Hindi, Tamil or Telugu where a multi-audio source carries it. No sign-up, no tracking.</p>
      ${rows.map(([h, items]) => `<section><h2>${esc(h)}</h2>${R.linkList(items.slice(0, 24))}</section>`).join('')}
      <section><h2>Popular anime to watch</h2>${R.linkList(popular)}</section>
      <p><a href="/browse">Browse all anime</a> · <a href="/schedule">Weekly release schedule</a> · <a href="/anime-list">Anime list A–Z</a></p>
    </div>`;

  const extra = `<div class="container seo-wrap">
      <h2>Watch anime online free on AnimeVerse</h2>
      <p>AnimeVerse is a free, fast way to watch anime online. Every series page shows its episodes, characters, ratings, release dates and the languages it comes in, so you can press play in Japanese with English subtitles, switch to the English dub, or choose Hindi, Tamil or Telugu audio when a multi-audio source carries it.</p>
      <p>There is no account to create and nothing to install. Your list and Continue Watching row stay on your own device. The rows above refresh on their own every day from AniList and MyAnimeList data, and the schedule shows when each new episode airs in your time zone.</p>
      <h3>Popular anime</h3>
      ${R.chipLinks(popular.slice(0, 30))}
    </div>`;

  return {
    title: `Watch Anime Online Free — English Sub, Dub & Hindi | ${SITE_NAME}`,
    description: 'Watch anime online free in HD on AnimeVerse: new episodes, classics and movies in Japanese with English subtitles, English dub and Hindi. No sign-up, no tracking.',
    canonicalPath: '/',
    ogType: 'website',
    main,
    mode: 'spa',
    extra,
    cdnSeconds: 30 * 60,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${ctx.base}/#website`,
        name: SITE_NAME,
        alternateName: ['Anime Verse', 'Watch AnimeVerse'],
        url: `${ctx.base}/`,
        description: 'Watch anime online free in Japanese with English subtitles, English dub and Hindi.',
        inLanguage: 'en',
        publisher: { '@id': `${ctx.base}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${ctx.base}/browse?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${ctx.base}/#organization`,
        name: SITE_NAME,
        url: `${ctx.base}/`,
        logo: { '@type': 'ImageObject', url: `${ctx.base}/brand/logo-512.png`, width: 512, height: 512 },
      },
      R.itemListLd(catalog.row('trending'), ctx.base, 'Trending anime'),
    ],
  };
}

// ---------- Anime title page ----------
const STATUS_TEXT = {
  'finished airing': 'finished airing',
  finished: 'finished airing',
  'currently airing': 'currently airing',
  releasing: 'currently airing',
  'not yet aired': 'not aired yet',
  not_yet_released: 'not aired yet',
};
const statusText = (a) => STATUS_TEXT[String(a.status || '').toLowerCase()] || (a.airing ? 'currently airing' : String(a.status || '').toLowerCase());

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms).unref?.())]).catch(() => null);

function airDate(ep) {
  const d = ep.air_date && /^\d{4}-\d{2}-\d{2}/.test(ep.air_date) ? ep.air_date.slice(0, 10) : null;
  return d;
}

function languageGuide(a) {
  const t = titleOf(a);
  const l = catalog.langInfo(a);
  const movie = catalog.isMovie(a);
  const what = movie ? 'the film' : 'every episode';
  const airing = statusText(a) === 'currently airing';
  const dubText =
    l.dub === 'full'
      ? `${esc(t)} has a full English dub. Open ${what} and choose English in the player's audio menu to watch ${esc(t)} dubbed.`
      : l.dub === 'partial'
        ? `${esc(t)} has an English dub that is still being released. Dubbed episodes are added as they come out; the rest play in Japanese with English subtitles.`
        : `No English dub of ${esc(t)} is listed yet. Watch it in Japanese with English subtitles for now; a DUB tag appears on this page once a dub is released.`;
  return [
    {
      id: 'japanese',
      h: `${t} in Japanese with English subtitles`,
      p: `${cap(what)} of ${esc(t)} plays in the original Japanese audio with English subtitles.${airing ? ' New episodes are usually subtitled within hours of airing in Japan.' : ''}`,
    },
    { id: 'english', h: `${t} English dub`, p: dubText },
    {
      id: 'hindi',
      h: `${t} in Hindi`,
      p: `Hindi audio for ${esc(t)} is offered when a multi-audio source carries it. Start ${movie ? 'the film' : 'an episode'} and pick Hindi in the player's audio menu; Tamil and Telugu are often listed the same way. If Hindi isn't in the menu, that ${movie ? 'film has' : 'episode has'} no Hindi version yet.`,
    },
  ];
}

function animeFaq(a, { streaming }) {
  const t = titleOf(a);
  const l = catalog.langInfo(a);
  const movie = catalog.isMovie(a);
  const faq = [];
  if (movie) {
    faq.push({ q: `How long is ${t}?`, a: `${esc(t)} is ${a.year ? `a ${a.year} ` : 'an '}anime film${a.duration ? ` with a running time of ${esc(a.duration.replace(/ per ep$/, ''))}` : ''}.` });
  } else if (a.episodes) {
    faq.push({ q: `How many episodes does ${t} have?`, a: `${esc(t)} has ${a.episodes} episodes${a.duration ? `, about ${esc(a.duration.replace(/ per ep$/, ''))} each` : ''}${statusText(a) === 'currently airing' ? ' and is still airing' : ''}.` });
  }
  const official = streaming.length ? ` It is also on ${esc(unique(streaming.map((s) => s.name)).slice(0, 4).join(', '))}.` : '';
  faq.push({ q: `Where can I watch ${t} for free?`, a: `You can watch ${esc(t)} free on AnimeVerse, with no sign-up.${official}` });
  faq.push({
    q: `Is ${t} dubbed in English?`,
    a: l.dub === 'full' ? `Yes, ${esc(t)} has a full English dub.` : l.dub === 'partial' ? `Partly: the English dub of ${esc(t)} is still being released.` : `Not yet. ${esc(t)} is available in Japanese with English subtitles.`,
  });
  faq.push({ q: `Can I watch ${t} in Hindi?`, a: `When a multi-audio source carries a Hindi version, it appears in the player's audio menu next to Japanese and English. Tamil and Telugu are often available the same way.` });
  const st = statusText(a);
  if (st) faq.push({ q: `Is ${t} finished?`, a: `${esc(t)} ${st === 'currently airing' ? 'is currently airing' : st === 'not aired yet' ? 'has not aired yet' : 'has finished airing'}${a.aired ? ` (${esc(a.aired)})` : ''}.` });
  if (a.score) faq.push({ q: `Is ${t} worth watching?`, a: `Fans rate ${esc(t)} ${Number(a.score).toFixed(1)} out of 10${a.members ? ` across ${Number(a.members).toLocaleString('en-US')} members` : ''} on AniList and MyAnimeList${a.genres?.length ? `. It's a ${esc(a.genres.slice(0, 3).join(', ').toLowerCase())} anime` : ''}.` });
  return faq;
}

async function animePage(ctx, id, { watch = false } = {}) {
  const { anime, notFound, unavailable } = await catalog.detail(id);
  if (notFound) return notFoundPage(ctx);
  if (!anime) {
    // Upstream is slow or down: a minimal page now, cached briefly, full page on the next visit.
    const stub = catalog.known(id);
    return {
      title: stub ? `Watch ${stub.title} Online Free | ${SITE_NAME}` : `Anime — ${SITE_NAME}`,
      description: stub ? `Watch ${stub.title} online free on AnimeVerse in English sub, English dub and Hindi where available.` : 'Watch anime online free on AnimeVerse.',
      canonicalPath: `/anime/${id}`,
      main: `<div class="${SPA_FALLBACK} container page-top"><h1>${esc(stub ? stub.title : 'Anime')}</h1><p>This page is loading.</p></div>`,
      mode: 'spa',
      cdnSeconds: unavailable ? 60 : 300,
    };
  }

  const a = anime;
  const t = titleOf(a);
  const l = catalog.langInfo(a);
  const movie = catalog.isMovie(a);
  const [eps, extras] = await Promise.all([
    movie ? null : withTimeout(animeRoutes.getEpisodes(a.id || id), 3500),
    withTimeout(animeRoutes.getExtras(a.id || id), 3000),
  ]);
  const episodes = Array.isArray(eps?.episodes) ? eps.episodes : [];
  const characters = Array.isArray(extras?.characters) ? extras.characters : [];
  const recs = Array.isArray(extras?.recommendations) ? extras.recommendations.filter((r) => r && r.id) : [];
  const relations = Array.isArray(a.relations) ? a.relations.filter((r) => r && r.id && (!r.kind || r.kind === 'anime')) : [];
  const streaming = unique((a.streaming || []).filter((s) => s && s.url && /^https?:\/\//.test(s.url)), (s) => s.url);
  const synopsis = paragraphs(a.synopsis);
  const aka = unique([a.titleRomaji, a.titleJapanese, ...(a.synonyms || [])].filter((x) => x && x !== t)).slice(0, 8);
  const image = a.banner || a.image;
  const ep = Number(ctx.query.get('ep')) || null;

  const dubPart = l.dub ? ' & Dub' : '';
  const title = watch && ep
    ? `Watch ${t} Episode ${ep} — English Sub${dubPart} | ${SITE_NAME}`
    : `Watch ${t} Online Free — English Sub${dubPart} | ${SITE_NAME}`;
  const langs = l.dub ? 'Japanese with English subtitles, English dub and Hindi (where available)' : 'Japanese with English subtitles and Hindi (where available)';
  const count = movie ? 'The full movie' : a.episodes ? `${a.episodes} episodes` : 'Every episode';
  const description = truncate(`Watch ${t}${a.year ? ` (${a.year})` : ''} online free in HD on AnimeVerse. ${count} in ${langs}. ${cleanSynopsis(a.synopsis)}`, 158);

  const facts = [
    ['Type', a.type],
    ['Episodes', !movie && a.episodes ? a.episodes : null],
    ['Status', a.status],
    ['Aired', a.aired],
    ['Season', a.season && a.year ? `${cap(a.season)} ${a.year}` : a.year],
    ['Studios', (a.studios || []).join(', ')],
    ['Source', a.sourceMaterial],
    ['Duration', a.duration],
    ['Rating', a.ageRating],
    ['Genres', (a.genres || []).join(', ')],
    ['Score', a.score ? `${Number(a.score).toFixed(1)} / 10${a.members ? ` (${Number(a.members).toLocaleString('en-US')} members)` : ''}` : null],
    ['Audio', l.audio.join(', ') + ', Hindi (where available)'],
    ['Subtitles', l.subtitles.join(', ')],
  ].filter(([, v]) => v);

  const shownEps = episodes.slice(0, 150);
  const watchBase = `/watch/${encodeURIComponent(a.id || id)}`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Anime list', path: '/anime-list' },
    { name: t, path: `/anime/${a.id || id}` },
  ];

  const main = `<article class="${SPA_FALLBACK} container page-top">
      ${R.breadcrumbHtml(crumbs)}
      ${a.image ? `<img src="${esc(a.image)}" alt="${esc(t)} poster" width="230" height="345">` : ''}
      <h1>${esc(t)}</h1>
      <p>${esc([a.type, a.year, !movie && a.episodes ? `${a.episodes} episodes` : null, a.status].filter(Boolean).join(' · '))}</p>
      <p><a href="${watchBase}${movie ? '' : '?season=1&amp;ep=1'}">Watch ${esc(t)}${movie ? '' : ' episode 1'} free</a></p>
      <section><h2>${esc(t)} synopsis</h2>${synopsis.map((p) => `<p>${esc(p)}</p>`).join('') || '<p>No synopsis yet.</p>'}</section>
      <section><h2>${esc(t)} details</h2><dl class="seo-facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>
      ${shownEps.length ? `<section><h2>${esc(t)} episodes</h2><ol class="seo-episodes">${shownEps
        .map((e) => {
          const n = Number(e.episode_number) || 0;
          const name = e.name && !/^episode \d+$/i.test(e.name) ? `: ${e.name}` : '';
          const d = airDate(e);
          return `<li><a href="${watchBase}?season=${Number(e.season_number) || 1}&amp;ep=${n}">Episode ${n}${esc(name)}</a>${d ? ` <time datetime="${d}">${d}</time>` : ''}${e.hasDub ? ' <span>DUB</span>' : ''}</li>`;
        })
        .join('')}</ol>${episodes.length > shownEps.length ? `<p>And ${episodes.length - shownEps.length} more episodes.</p>` : ''}</section>` : ''}
      ${characters.length ? `<section><h2>${esc(t)} characters and voice cast</h2><ul class="seo-cast">${characters
        .map((c) => `<li><strong>${esc(c.name)}</strong> (${esc(c.role)})${c.voiceActor ? ` voiced by ${esc(c.voiceActor)}` : ''}</li>`)
        .join('')}</ul></section>` : ''}
      ${streaming.length ? `<section><h2>Where to watch ${esc(t)}</h2><p>Official platforms:</p><ul>${streaming
        .map((s) => `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.name)}</a></li>`)
        .join('')}</ul></section>` : ''}
      ${a.trailer ? `<p><a href="https://www.youtube.com/watch?v=${esc(a.trailer)}" rel="noopener" target="_blank">Watch the ${esc(t)} trailer</a></p>` : ''}
      ${relations.length ? `<section><h2>Related to ${esc(t)}</h2><ul>${relations
        .map((r) => `<li><a href="/anime/${esc(r.id)}">${esc(r.title)}</a> <span>${esc([r.relation, r.format, r.year].filter(Boolean).join(' · '))}</span></li>`)
        .join('')}</ul></section>` : ''}
      ${recs.length ? `<section><h2>Anime like ${esc(t)}</h2>${R.linkList(recs)}</section>` : ''}
    </article>`;

  const guide = languageGuide(a);
  const faq = animeFaq(a, { streaming });
  const extra = `<div class="container seo-wrap">
      <h2>Watch ${esc(t)} online free</h2>
      <p>${esc(t)} is ${a.year ? `a ${a.year} ` : 'an '}${movie ? 'anime film' : `${esc(a.type || 'TV')} anime`}${a.studios?.length ? ` from ${esc(a.studios[0])}` : ''}${!movie && a.episodes ? ` with ${a.episodes} episodes` : ''}. On AnimeVerse you can watch it free in ${esc(langs)}, with no sign-up.</p>
      <div class="seo-langs">${guide.map((g) => `<div class="seo-lang" id="lang-${g.id}"><h3>${esc(g.h)}</h3><p>${g.p}</p></div>`).join('')}</div>
      ${R.faqHtml(faq, `${t}: common questions`)}
      ${aka.length ? `<p class="seo-aka"><strong>Also known as:</strong> ${esc(aka.join(' · '))}</p>` : ''}
    </div>`;

  const canonical = `${ctx.base}/anime/${a.id || id}`;
  const showLd = {
    '@context': 'https://schema.org',
    '@type': movie ? 'Movie' : 'TVSeries',
    '@id': `${canonical}#anime`,
    name: t,
    alternateName: aka.length ? aka : undefined,
    url: canonical,
    description: truncate(cleanSynopsis(a.synopsis), 480) || undefined,
    image: a.image || undefined,
    genre: a.genres?.length ? a.genres : undefined,
    keywords: (a.tags || []).slice(0, 10).map((x) => x.name).join(', ') || undefined,
    inLanguage: 'ja',
    isAccessibleForFree: true,
    startDate: !movie && a.year ? String(a.year) : undefined,
    datePublished: movie && a.year ? String(a.year) : undefined,
    numberOfEpisodes: !movie && a.episodes ? a.episodes : undefined,
    productionCompany: a.studios?.length ? a.studios.map((name) => ({ '@type': 'Organization', name })) : undefined,
    countryOfOrigin: { '@type': 'Country', name: a.country === 'CN' ? 'China' : a.country === 'KR' ? 'South Korea' : 'Japan' },
    actor: characters.filter((c) => c.voiceActor).slice(0, 8).map((c) => ({ '@type': 'Person', name: c.voiceActor })),
    character: characters.slice(0, 12).map((c) => ({ '@type': 'Person', name: c.name })),
    sameAs: [a.malUrl, a.anilistUrl].filter(Boolean),
    episode: shownEps.length
      ? shownEps.slice(0, 50).map((e) => ({
          '@type': 'TVEpisode',
          episodeNumber: Number(e.episode_number) || undefined,
          name: e.name || `Episode ${e.episode_number}`,
          datePublished: airDate(e) || undefined,
          url: `${ctx.base}${watchBase}?season=${Number(e.season_number) || 1}&ep=${Number(e.episode_number) || 1}`,
        }))
      : undefined,
    potentialAction: { '@type': 'WatchAction', target: `${ctx.base}${watchBase}` },
  };
  if (!showLd.actor.length) delete showLd.actor;
  if (!showLd.character.length) delete showLd.character;
  if (!showLd.sameAs.length) delete showLd.sameAs;

  return {
    title,
    description,
    canonicalPath: `/anime/${a.id || id}`,
    image,
    ogType: movie ? 'video.movie' : 'video.tv_show',
    main,
    mode: 'spa',
    extra: watch ? '' : extra,
    cdnSeconds: a.airing ? 2 * 60 * 60 : DAY,
    jsonLd: [showLd, R.breadcrumbLd(crumbs, ctx.base), R.faqLd(faq)].filter(Boolean),
  };
}

// ---------- App pages ----------
function browsePage(ctx) {
  const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Psychological', 'Mecha', 'Music'];
  return {
    title: `Browse Anime — Filter by Genre, Season & English Dub | ${SITE_NAME}`,
    description: 'Browse thousands of anime series and movies. Filter by genre, format, airing status and English dub, and sort by popularity or score.',
    canonicalPath: '/browse',
    main: `<div class="${SPA_FALLBACK} container page-top">
        <h1>Browse anime</h1>
        <h2>Genres</h2><ul class="seo-links">${genres.map((g) => `<li><a href="/browse?genre=${encodeURIComponent(g)}">${esc(g)} anime</a></li>`).join('')}</ul>
        <h2>Popular right now</h2>${R.linkList(catalog.row('popular').slice(0, 24))}
        <p><a href="/anime-list">Full anime list A–Z</a></p>
      </div>`,
    mode: 'spa',
    cdnSeconds: 60 * 60,
  };
}

function schedulePage() {
  const airing = catalog.row('seasonNow').concat(catalog.row('trending'));
  const items = unique(airing.filter((a) => a.nextEpisode && a.nextEpisode.airingAt), (a) => String(a.id)).sort((x, y) => x.nextEpisode.airingAt - y.nextEpisode.airingAt);
  return {
    title: `Anime Release Schedule — New Episodes This Week | ${SITE_NAME}`,
    description: 'The weekly anime release schedule: which episodes air each day, with countdowns in your own time zone for every simulcast this season.',
    canonicalPath: '/schedule',
    main: `<div class="${SPA_FALLBACK} container page-top">
        <h1>Anime release schedule</h1>
        <p>New anime episodes airing this week, in your local time.</p>
        <ul class="seo-links">${items
          .slice(0, 60)
          .map((a) => {
            const at = new Date(a.nextEpisode.airingAt * 1000).toISOString();
            return `<li><a href="/anime/${esc(a.id)}">${esc(a.title)}</a> episode ${Number(a.nextEpisode.episode) || ''} airs <time datetime="${at}">${at.slice(0, 16).replace('T', ' ')} UTC</time></li>`;
          })
          .join('')}</ul>
      </div>`,
    mode: 'spa',
    cdnSeconds: 30 * 60,
  };
}

const appShellPage = (title, description, canonicalPath, robots = 'noindex, follow') => ({
  title,
  description,
  canonicalPath,
  robots,
  main: `<div class="${SPA_FALLBACK} container page-top"><h1>${esc(title.split(' — ')[0].split(' | ')[0])}</h1><p>${esc(description)}</p></div>`,
  mode: 'spa',
  cdnSeconds: DAY,
});

function notFoundPage() {
  return {
    status: 404,
    title: `Page not found — ${SITE_NAME}`,
    description: 'This page does not exist.',
    canonicalPath: null,
    robots: 'noindex, follow',
    main: `<div class="seo-page container page-top"><div class="state"><div class="empty-art" aria-hidden="true">404</div><h1>Page not found</h1><p>That page doesn’t exist.</p><a class="btn btn-primary" href="/">Go home</a></div></div>`,
    mode: 'static',
    cdnSeconds: 10 * 60,
  };
}

module.exports = { homePage, animePage, browsePage, schedulePage, appShellPage, notFoundPage, SPA_FALLBACK };
