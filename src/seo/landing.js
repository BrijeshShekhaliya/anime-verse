// Keyword landing pages ("watch anime in hindi", "watch anime free", ...) and the
// A–Z anime list. They aren't linked from the app's menus or footer: search
// engines find them through the sitemap and the links between these pages.

const { SITE_NAME, esc, unique } = require('./util');
const catalog = require('./catalog');
const index = require('./anime-index');
const R = require('./render');

const DAY = 24 * 60 * 60;

const dubbed = (list) => list.filter((a) => catalog.langInfo(a).dub);
const pick = (...lists) => unique(lists.flat().filter((a) => a && a.id), (a) => String(a.id));

// Titles widely known in India, many with official Hindi dubs.
const INDIA_FAVOURITES = ['20', '1735', '34566', '21', '30694', '813', '38000', '40748', '52299', '50265', '1535', '16498', '44511', '34572', '31964', '30276', '11061', '50594', '32281'];

const ALL_LINKS = [
  ['/watch-anime', 'Watch anime online'],
  ['/watch-anime-free', 'Watch anime free'],
  ['/watch-anime-in-hindi', 'Anime in Hindi'],
  ['/watch-anime-in-english', 'Anime in English (dub)'],
  ['/watch-anime-in-japanese', 'Anime in Japanese (sub)'],
  ['/watch-anime-in-tamil', 'Anime in Tamil'],
  ['/watch-anime-in-telugu', 'Anime in Telugu'],
  ['/watch-anime-movies', 'Anime movies'],
  ['/anime-list', 'Anime list A–Z'],
  ['/blog', 'Guides'],
];

const FAQ_NO_HOSTING = {
  q: 'Does AnimeVerse host the videos?',
  a: 'No. AnimeVerse is an index: it doesn’t host or upload video files, and every title page also lists the official streaming platforms we know about, such as Crunchyroll and Netflix.',
};

const PAGES = {
  '/watch-anime': {
    title: 'Watch Anime Online Free — English Sub, Dub & Hindi',
    h1: 'Watch Anime Online Free',
    description: 'Watch anime online free on AnimeVerse: new episodes, classics and movies in Japanese with English subtitles, English dub and Hindi. No sign-up, no tracking.',
    intro: [
      'AnimeVerse is a free place to watch anime online. Every series page lists its episodes, characters, ratings, release dates and the languages it comes in, so you can press play in Japanese with English subtitles, switch to the English dub, or pick Hindi, Tamil or Telugu audio when a multi-audio source carries it.',
      'There is no account to create and nothing to install. Your list and the Continue Watching row are saved on your own device, and nothing about what you watch leaves it.',
    ],
    sections: () => [
      ['Trending anime this week', catalog.row('trending')],
      ['Popular anime to start with', catalog.evergreen().slice(0, 24)],
      ['New this season', catalog.row('seasonNow')],
      ['Anime movies', pick(catalog.row('movies'), catalog.evergreen(catalog.EVERGREEN_MOVIES))],
    ],
    steps: [
      'Search for a title with the search button, or open Browse and filter by genre, season or English dub.',
      'Open the series page to see its episodes, characters, rating and languages.',
      'Press Play or pick an episode. Choose the audio (Japanese, English, Hindi and more) and subtitles in the player.',
      'Add it to My List. Continue Watching remembers where you stopped, on your device only.',
    ],
    faq: [
      { q: 'Is AnimeVerse free?', a: 'Yes. Every page and episode on AnimeVerse is free to open, with no sign-up and no subscription.' },
      { q: 'Can I watch anime in English dub?', a: 'Yes. Titles with an English dub carry a DUB tag. See <a href="/watch-anime-in-english">anime in English</a> for the most popular dubs.' },
      { q: 'Can I watch anime in Hindi?', a: 'Yes, for titles where a multi-audio source carries Hindi; pick it in the player’s audio menu. See <a href="/watch-anime-in-hindi">anime in Hindi</a>.' },
      { q: 'Do I need an account?', a: 'No. Your list and watch progress are stored in your browser, so there is nothing to sign up for.' },
      FAQ_NO_HOSTING,
    ],
  },

  '/watch-anime-free': {
    title: 'Watch Anime Free — Full Episodes Online, No Sign-up',
    h1: 'Watch Anime Free',
    description: 'Watch anime free online: full episodes and movies in English sub, English dub and Hindi, with no account, no subscription and no tracking. Updated every day.',
    intro: [
      'Looking for anime you can watch free without signing up? On AnimeVerse every series page and episode opens with no account and no subscription. The lists below refresh on their own every day from AniList and MyAnimeList data, so new episodes show up as they air.',
      'Free shouldn’t mean messy. AnimeVerse keeps pages fast and clean, remembers where you stopped on your own device, and shows which titles have an English dub before you press play.',
    ],
    sections: () => [
      ['Free anime trending right now', catalog.row('trending')],
      ['Classics everyone recommends', catalog.evergreen().slice(0, 30)],
      ['Top rated anime', catalog.row('topRated')],
    ],
    faq: [
      { q: 'Is it really free?', a: 'Yes. There is no paywall, no trial and no account on AnimeVerse.' },
      { q: 'Can I watch on my phone?', a: 'Yes. The site works in any phone browser and has a bottom tab bar like an app.' },
      { q: 'Are there official free options too?', a: 'Some studios post episodes free on YouTube (for example Muse India and Ani-One), and services such as Tubi, Pluto TV and MX Player carry free, ad-supported anime in some countries. Each AnimeVerse title page lists the official platforms we know about.' },
      { q: 'How do I stay safe on free anime sites?', a: 'Never install “players” or browser extensions a site asks for, ignore fake download buttons and pop-ups, and keep your browser updated. Our <a href="/blog/how-to-watch-anime-free-safely">safety guide</a> has more.' },
      FAQ_NO_HOSTING,
    ],
  },

  '/watch-anime-in-hindi': {
    title: 'Watch Anime in Hindi Free — Hindi Dubbed Anime Online',
    h1: 'Watch Anime in Hindi',
    description: 'Watch anime in Hindi free: popular Hindi dubbed anime such as Naruto, Demon Slayer, Jujutsu Kaisen and Solo Leveling, plus Japanese audio and English dubs.',
    intro: [
      'Hindi dubs made anime huge in India: Naruto, Dragon Ball and Doraemon on TV first, and now Demon Slayer, Jujutsu Kaisen and Solo Leveling getting Hindi versions within months of Japan. AnimeVerse lets you watch anime in Hindi free in your browser: open a series, start an episode and choose Hindi in the player’s audio menu.',
      'Hindi audio comes from multi-audio sources, so it depends on the title and the episode. When Hindi isn’t available yet, the same player offers Japanese audio with English subtitles or the English dub. Many of these sources carry Tamil and Telugu too.',
    ],
    sections: () => [
      ['Popular anime to watch in Hindi', catalog.evergreen(INDIA_FAVOURITES)],
      ['Trending anime this week', catalog.row('trending')],
    ],
    label: (a) => `${a.title} in Hindi`,
    steps: [
      'Open the anime’s page and press Play, or choose an episode.',
      'Open the audio menu in the player.',
      'Pick Hindi. If it isn’t listed, that episode has no Hindi version yet: try Japanese with English subtitles.',
    ],
    faq: [
      { q: 'Can I watch anime in Hindi for free?', a: 'Yes. AnimeVerse is free, and Hindi audio is offered for the titles and episodes where a multi-audio source carries it.' },
      { q: 'Which anime are dubbed in Hindi?', a: 'Big action series get Hindi dubs most often. Naruto, Dragon Ball Super, Demon Slayer, Jujutsu Kaisen and Solo Leveling are among the best known, and films such as Suzume had Hindi releases in Indian cinemas.' },
      { q: 'How do I switch to Hindi audio?', a: 'Start an episode, open the audio menu in the player and pick Hindi. If it isn’t listed, that episode has no Hindi source yet.' },
      { q: 'Is Tamil or Telugu available?', a: 'Often, yes. They appear in the same audio menu. See <a href="/watch-anime-in-tamil">anime in Tamil</a> and <a href="/watch-anime-in-telugu">anime in Telugu</a>.' },
      { q: 'Where else can I watch Hindi dubbed anime legally?', a: 'Crunchyroll has the largest official Hindi dub library, and Sony YAY, Netflix, Amazon MX Player and the Muse India YouTube channel carry Hindi anime as well. Check each service for what’s available in your region.' },
    ],
  },

  '/watch-anime-in-english': {
    title: 'Watch Anime in English Free — English Dubbed Anime Online',
    h1: 'Watch Anime in English',
    description: 'Watch English dubbed anime free online. Titles marked DUB have a full or partial English dub: Demon Slayer, Jujutsu Kaisen, Attack on Titan, One Piece and more.',
    intro: [
      'Prefer to watch anime in English? AnimeVerse tracks English dubs for thousands of titles using the community-run MAL-Dubs list, refreshed every six hours. A DUB tag on a poster means the series has an English dub; DUB* means the dub is still catching up with the Japanese release.',
      'Dubbed episodes of simulcast shows usually arrive a few weeks after Japan. Until the dub catches up, the newest episodes play in Japanese with English subtitles in the same player.',
    ],
    sections: () => [
      ['Popular English dubbed anime', dubbed(pick(catalog.evergreen(), catalog.row('popular')))],
      ['New English dubs this season', dubbed(catalog.row('seasonNow'))],
      ['Dubbed anime movies', dubbed(pick(catalog.row('movies'), catalog.evergreen(catalog.EVERGREEN_MOVIES)))],
    ],
    label: (a) => `${a.title} English Dub`,
    faq: [
      { q: 'Where can I watch anime in English for free?', a: 'On AnimeVerse, free and with no sign-up. Titles with an English dub carry a DUB tag; pick English in the player’s audio menu.' },
      { q: 'How do I know if an anime is dubbed?', a: 'Look for the DUB tag on its poster or on its page. DUB* means the dub is still being released.' },
      { q: 'What’s the difference between sub and dub?', a: 'A sub keeps the original Japanese voices with English subtitles; a dub replaces the voices with English voice actors. Read <a href="/blog/sub-vs-dub">sub vs dub</a> for the trade-offs.' },
      { q: 'Why are only some episodes dubbed?', a: 'Dubs are recorded after the Japanese release, so airing shows are dubbed a few weeks behind. Older shows sometimes only had part of their run dubbed.' },
    ],
  },

  '/watch-anime-in-japanese': {
    title: 'Watch Anime in Japanese with English Subtitles — Free',
    h1: 'Watch Anime in Japanese',
    description: 'Watch anime in Japanese with English subtitles free: new episodes hours after they air in Japan, plus classics and movies in the original audio.',
    intro: [
      'Watching anime in Japanese means hearing the original cast the director worked with, and getting new episodes first: subtitled episodes are usually up within hours of airing in Japan, weeks before any dub.',
      'Every series on AnimeVerse plays in Japanese with English subtitles by default. The weekly schedule shows when each episode airs in your own time zone, so you know when the next one lands.',
    ],
    sections: () => [
      ['Airing now: new subtitled episodes', catalog.row('seasonNow')],
      ['Top rated anime in Japanese', catalog.row('topRated')],
      ['Anime movies in Japanese', pick(catalog.row('movies'), catalog.evergreen(catalog.EVERGREEN_MOVIES))],
    ],
    label: (a) => `${a.title} (English Sub)`,
    faq: [
      { q: 'Can I watch anime in Japanese with English subtitles for free?', a: 'Yes. Every title on AnimeVerse plays in Japanese with English subtitles, free and with no sign-up.' },
      { q: 'When do new subtitled episodes come out?', a: 'Usually within hours of the Japanese broadcast. The <a href="/schedule">release schedule</a> shows each episode’s air time in your time zone.' },
      { q: 'Is sub or dub better?', a: 'It’s a matter of taste: subs keep the original performances and arrive first; dubs let you watch without reading. See <a href="/blog/sub-vs-dub">sub vs dub</a>.' },
      { q: 'Can I learn Japanese by watching anime?', a: 'It helps with listening and everyday phrases, especially with Japanese audio and English subtitles together, but anime speech is stylised, so pair it with a course.' },
    ],
  },

  '/watch-anime-in-tamil': {
    title: 'Watch Anime in Tamil Free — Tamil Dubbed Anime Online',
    h1: 'Watch Anime in Tamil',
    description: 'Watch anime in Tamil free on AnimeVerse. Pick Tamil in the player’s audio menu where a multi-audio source carries it, or watch in Japanese, English or Hindi.',
    intro: [
      'Tamil dubs of popular anime have grown fast, with big action series leading the way. On AnimeVerse you can watch anime in Tamil free: start an episode and choose Tamil in the player’s audio menu.',
      'Tamil audio depends on the title and episode, because it comes from multi-audio sources. When it isn’t available, the same player offers Hindi, Japanese with English subtitles, or the English dub.',
    ],
    sections: () => [['Popular anime to try in Tamil', catalog.evergreen(INDIA_FAVOURITES)], ['Trending this week', catalog.row('trending')]],
    label: (a) => `${a.title} in Tamil`,
    faq: [
      { q: 'Can I watch anime in Tamil for free?', a: 'Yes, for titles and episodes where a multi-audio source carries Tamil. Pick it in the player’s audio menu.' },
      { q: 'What if Tamil isn’t in the audio menu?', a: 'That episode has no Tamil version yet. Try Hindi, or Japanese with English subtitles.' },
      { q: 'Is there Telugu too?', a: 'Often, yes, in the same menu. See <a href="/watch-anime-in-telugu">anime in Telugu</a>.' },
    ],
  },

  '/watch-anime-in-telugu': {
    title: 'Watch Anime in Telugu Free — Telugu Dubbed Anime Online',
    h1: 'Watch Anime in Telugu',
    description: 'Watch anime in Telugu free on AnimeVerse. Choose Telugu in the player’s audio menu where a multi-audio source carries it, or switch to Hindi, Japanese or English.',
    intro: [
      'More big anime now get Telugu dubs, especially the biggest action series. On AnimeVerse you can watch anime in Telugu free: open a series, start an episode and choose Telugu in the player’s audio menu.',
      'Telugu audio comes from multi-audio sources, so it varies by title and episode. When it isn’t listed, you can watch in Hindi, in Japanese with English subtitles, or with the English dub.',
    ],
    sections: () => [['Popular anime to try in Telugu', catalog.evergreen(INDIA_FAVOURITES)], ['Trending this week', catalog.row('trending')]],
    label: (a) => `${a.title} in Telugu`,
    faq: [
      { q: 'Can I watch anime in Telugu for free?', a: 'Yes, for titles and episodes where a multi-audio source carries Telugu. Pick it in the player’s audio menu.' },
      { q: 'What if Telugu isn’t in the audio menu?', a: 'That episode has no Telugu version yet. Try Hindi or Tamil, or Japanese with English subtitles.' },
      { q: 'Which languages can I watch anime in?', a: 'Japanese with English subtitles for every title, English dubs for thousands, and Hindi, Tamil and Telugu where a source carries them.' },
    ],
  },

  '/watch-anime-movies': {
    title: 'Watch Anime Movies Online Free — Sub & Dub',
    h1: 'Watch Anime Movies',
    description: 'Watch anime movies online free: Your Name, Suzume, Spirited Away, A Silent Voice, Demon Slayer: Mugen Train and new releases, in sub, dub and Hindi where available.',
    intro: [
      'Anime films are where studios spend the most on animation: Makoto Shinkai’s Your Name and Suzume, Studio Ghibli’s Spirited Away, Kyoto Animation’s A Silent Voice, and series films like Demon Slayer: Mugen Train that break box-office records.',
      'Every film page on AnimeVerse shows its running time, rating, languages and where to watch, and plays free in Japanese with English subtitles, plus English and Hindi audio where available.',
    ],
    sections: () => [
      ['Anime movies everyone recommends', catalog.evergreen(catalog.EVERGREEN_MOVIES)],
      ['Popular and new anime movies', catalog.row('movies')],
    ],
    faq: [
      { q: 'Can I watch anime movies for free?', a: 'Yes. Movie pages on AnimeVerse are free to open and play, with no sign-up.' },
      { q: 'Are anime movies dubbed in English?', a: 'Most major films are. The DUB tag on a poster shows that an English dub exists.' },
      { q: 'Which anime movie should I watch first?', a: 'Your Name and Spirited Away are the usual first picks: both are self-contained and need no series knowledge.' },
    ],
  },
};

function relatedLinks(current) {
  return `<nav class="seo-related" aria-label="More guides"><h2>More ways to watch</h2><ul>${ALL_LINKS.filter(([p]) => p !== current)
    .map(([p, n]) => `<li><a href="${p}">${esc(n)}</a></li>`)
    .join('')}</ul></nav>`;
}

function landingPage(ctx, path) {
  const def = PAGES[path];
  if (!def) return null;
  const sections = def.sections().filter(([, items]) => items.length);
  const crumbs = [{ name: 'Home', path: '/' }, { name: def.h1, path }];
  const listItems = sections.flatMap(([, items]) => items);
  const main = `<article class="seo-page container page-top">
      ${R.breadcrumbHtml(crumbs)}
      <header class="seo-head"><h1>${esc(def.h1)}</h1>${def.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</header>
      ${sections.map(([h, items]) => `<section class="seo-section"><h2>${esc(h)}</h2>${R.cardGrid(items.slice(0, 24), { label: def.label })}</section>`).join('')}
      ${def.steps ? `<section class="seo-section"><h2>How to ${esc(def.h1.toLowerCase())}</h2><ol class="seo-steps">${def.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
      ${R.faqHtml(def.faq)}
      ${relatedLinks(path)}
    </article>`;
  return {
    title: `${def.title} | ${SITE_NAME}`,
    description: def.description,
    canonicalPath: path,
    image: listItems.find((a) => a.image)?.image,
    main,
    mode: 'static',
    cdnSeconds: 6 * 60 * 60,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: def.h1, description: def.description, url: `${ctx.base}${path}`, isPartOf: { '@id': `${ctx.base}/#website` } },
      R.itemListLd(listItems, ctx.base, def.h1),
      R.breadcrumbLd(crumbs, ctx.base),
      R.faqLd(def.faq),
    ].filter(Boolean),
  };
}

// ---------- A–Z list: /anime-list, /anime-list/a, /anime-list/a/2 ----------
const PER_PAGE = 150;

function letterNav(current) {
  return `<nav class="seo-az" aria-label="Anime by letter"><ul>${index.LETTERS.map((l) =>
    `<li><a href="/anime-list/${l}"${l === current ? ' aria-current="page"' : ''}>${l === '0-9' ? '0–9' : l.toUpperCase()}</a></li>`
  ).join('')}</ul></nav>`;
}

function animeListHub(ctx) {
  const all = index.all();
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Anime list', path: '/anime-list' }];
  const top = all.slice(0, 60).map((a) => catalog.known(a.id) || a);
  return {
    title: `Anime List A–Z — ${all.length.toLocaleString('en-US')} Anime to Watch Online Free | ${SITE_NAME}`,
    description: `Every anime on AnimeVerse from A to Z: ${all.length.toLocaleString('en-US')} series and movies, each with episodes, characters, ratings and sub, dub and Hindi options.`,
    canonicalPath: '/anime-list',
    main: `<article class="seo-page container page-top">
        ${R.breadcrumbHtml(crumbs)}
        <header class="seo-head"><h1>Anime list A–Z</h1><p>Every anime on AnimeVerse, ${all.length.toLocaleString('en-US')} series and movies. Each title links to its own page with episodes, characters, ratings and the languages it comes in.</p></header>
        ${letterNav(null)}
        <section class="seo-section"><h2>Most popular anime</h2>${R.cardGrid(top.slice(0, 24))}${R.linkList(top.slice(24))}</section>
        ${relatedLinks('/anime-list')}
      </article>`,
    mode: 'static',
    cdnSeconds: DAY,
    jsonLd: [R.breadcrumbLd(crumbs, ctx.base), R.itemListLd(top, ctx.base, 'Most popular anime')],
  };
}

function animeListLetter(ctx, letter, pageNo) {
  if (!index.LETTERS.includes(letter)) return null;
  const list = index.byLetter(letter);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (pageNo < 1 || pageNo > pages) return null;
  const slice = list.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const label = letter === '0-9' ? '0–9' : letter.toUpperCase();
  const path = `/anime-list/${letter}${pageNo > 1 ? `/${pageNo}` : ''}`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Anime list', path: '/anime-list' },
    { name: `${label}${pageNo > 1 ? ` (page ${pageNo})` : ''}`, path },
  ];
  const pager = pages > 1
    ? `<nav class="seo-pager" aria-label="Pages"><ul>${Array.from({ length: pages }, (_, i) => i + 1)
        .map((n) => `<li><a href="/anime-list/${letter}${n > 1 ? `/${n}` : ''}"${n === pageNo ? ' aria-current="page"' : ''}>${n}</a></li>`)
        .join('')}</ul></nav>`
    : '';
  return {
    title: `Anime Starting with ${label}${pageNo > 1 ? ` — Page ${pageNo}` : ''} | Anime List | ${SITE_NAME}`,
    description: `Anime titles starting with ${label}${pageNo > 1 ? ` (page ${pageNo} of ${pages})` : ''}: ${slice.slice(0, 6).map((a) => a.title).join(', ')} and more. Watch online free in sub, dub and Hindi.`,
    canonicalPath: path,
    main: `<article class="seo-page container page-top">
        ${R.breadcrumbHtml(crumbs)}
        <header class="seo-head"><h1>Anime starting with ${esc(label)}${pageNo > 1 ? ` <small>page ${pageNo}</small>` : ''}</h1><p>${list.length.toLocaleString('en-US')} titles${pages > 1 ? `, page ${pageNo} of ${pages}` : ''}.</p></header>
        ${letterNav(letter)}
        <ul class="seo-az-list">${slice
          .map((a) => `<li><a href="/anime/${esc(a.id)}">${esc(a.title)}</a> <span>${esc([a.format && a.format.replace(/_/g, ' '), a.year].filter(Boolean).join(' · '))}</span></li>`)
          .join('')}</ul>
        ${pager}
      </article>`,
    mode: 'static',
    cdnSeconds: DAY,
    jsonLd: [R.breadcrumbLd(crumbs, ctx.base)],
  };
}

// Every A–Z page path, for the sitemap.
function animeListPaths() {
  const paths = ['/anime-list'];
  for (const l of index.LETTERS) {
    const pages = Math.max(1, Math.ceil(index.byLetter(l).length / PER_PAGE));
    for (let n = 1; n <= pages; n += 1) paths.push(`/anime-list/${l}${n > 1 ? `/${n}` : ''}`);
  }
  return paths;
}

module.exports = { PAGES, landingPage, animeListHub, animeListLetter, animeListPaths, ALL_LINKS };
