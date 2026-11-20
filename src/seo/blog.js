// Guides at /blog and /blog/:slug. They aren't linked from the app's menus or
// footer; search engines reach them through the sitemap and the keyword pages.
// Posts are short Markdown: ## / ### headings, paragraphs, "- " and "1. " lists,
// **bold**, *italic*, [text](/path) and [[malId|Text]] links to anime pages.

const { SITE_NAME, esc, truncate } = require('./util');
const catalog = require('./catalog');
const R = require('./render');

const POSTS = [
  {
    slug: 'how-to-watch-anime-in-hindi',
    title: 'How to Watch Anime in Hindi Online Free (2026 Guide)',
    description: 'Where and how to watch anime in Hindi for free: switching to Hindi audio, which popular anime have Hindi dubs, and the official Indian platforms that carry them.',
    published: '2026-11-20',
    anime: ['20', '38000', '40748', '52299', '30694', '50265', '1735', '21'],
    body: `
Hindi dubs turned anime from a niche into a mainstream habit in India. A generation grew up with Doraemon, Shin-chan and Dragon Ball Z on TV, and today big series such as [[38000|Demon Slayer]], [[40748|Jujutsu Kaisen]] and [[52299|Solo Leveling]] get Hindi versions within months of their Japanese premiere.

This guide covers how to watch anime in Hindi on AnimeVerse, which shows are most likely to have Hindi audio, and the official platforms that carry Hindi dubs.

## Watch anime in Hindi on AnimeVerse

1. Search for the anime, or open it from the [Hindi anime list](/watch-anime-in-hindi).
2. Press **Play**, or choose an episode from the list.
3. Open the audio menu in the player and pick **Hindi**.

Hindi audio comes from multi-audio sources, so it depends on the title and even the episode. If Hindi isn't in the menu, that episode has no Hindi version yet; Japanese with English subtitles and the English dub are always worth trying. The same menu often lists Tamil and Telugu too.

## Which anime have Hindi dubs?

Action series get Hindi dubs first, because they draw the biggest audiences. Some of the best known:

- [[20|Naruto]] and [[1735|Naruto Shippuden]], the classic coming-of-age ninja story.
- [[30694|Dragon Ball Super]], which continues the Dragon Ball Z story many Indian viewers grew up with.
- [[38000|Demon Slayer]], with some of the most celebrated animation of the last decade.
- [[40748|Jujutsu Kaisen]], a dark, fast-paced curse-fighting series.
- [[52299|Solo Leveling]], the hit adaptation of the Korean web novel.

Films matter too: Makoto Shinkai's *Suzume* had a Hindi release in Indian cinemas, and studios increasingly dub big anime films for India.

## Official places with Hindi anime

If you want to support the studios, these services carry licensed Hindi dubs. What's available depends on your region and changes often, so check each one:

- **Crunchyroll** has the largest official Hindi dub library.
- **Sony YAY** shows anime in Hindi on TV and on its app.
- **Netflix** and **Amazon Prime Video** add Hindi audio to many of their anime.
- **Amazon MX Player** and the **Muse India** YouTube channel offer free, ad-supported Hindi and subtitled anime.

## Hindi, Japanese or English?

Hindi is the easiest way to get into anime if you don't want to read subtitles, and watching with family is simpler. Japanese audio gets new episodes first, often within hours of the broadcast in Japan. Many fans mix both: they keep up with an airing show in Japanese and rewatch favourites in Hindi. Read [sub vs dub](/blog/sub-vs-dub) for more on the trade-offs.
`,
  },
  {
    slug: 'sub-vs-dub',
    title: 'Sub vs Dub: Should You Watch Anime in Japanese or English?',
    description: 'Sub or dub? The real differences between watching anime in Japanese with English subtitles and watching the English (or Hindi) dub, and how to choose.',
    published: '2026-11-20',
    anime: ['1', '5114', '1535', '16498', '42310', '52991'],
    body: `
"Sub or dub?" is the oldest argument in anime. A **sub** keeps the original Japanese voices and adds English subtitles. A **dub** replaces the voices with actors in another language, usually English, and more and more often Hindi, Tamil or Telugu. Neither is the "right" way to watch. Here's what actually changes.

## Why people watch subbed anime

- **New episodes arrive first.** Subtitled episodes are usually up within hours of the Japanese broadcast. Dubs follow weeks later, if they come at all.
- **Every show is available.** Every anime has its Japanese audio; only part of the catalogue is ever dubbed.
- **The original performances.** The director cast and directed the Japanese voice actors, and jokes, honorifics and wordplay land as written.

## Why people watch dubbed anime

- **You can look at the animation.** Fast action scenes and detailed backgrounds are easier to enjoy when you aren't reading.
- **It's easier to share.** Watching with family or friends who don't like subtitles is simpler with a dub.
- **Some dubs are classics in their own right.** The English dubs of [[1|Cowboy Bebop]] and [[5114|Fullmetal Alchemist: Brotherhood]] are often praised as highly as the originals.

## A practical way to decide

1. **Airing shows: sub.** You'll be on the same episode as everyone else online, without spoilers.
2. **Finished shows with a strong dub: try both.** Watch the first episode each way and keep whichever feels natural.
3. **Comedy and wordplay: sub.** Puns rarely survive translation intact.
4. **Background watching or family time: dub.**

On AnimeVerse every title plays in Japanese with English subtitles, and titles with an English dub carry a **DUB** tag. You can switch audio in the player at any time. See the [English dubbed anime list](/watch-anime-in-english) or the [Japanese with subtitles list](/watch-anime-in-japanese).
`,
  },
  {
    slug: 'best-english-dubbed-anime',
    title: 'Best English Dubbed Anime You Can Watch Free',
    description: 'The best English dubbed anime to watch online free, from Cowboy Bebop and Fullmetal Alchemist: Brotherhood to Demon Slayer, Jujutsu Kaisen and Spy x Family.',
    published: '2026-11-20',
    anime: ['1', '5114', '1535', '16498', '38000', '40748', '50265', '30276', '11061', '42310', '32182', '1575'],
    body: `
A great dub doesn't just translate the script; it recasts the show so it feels written for the new language. These series are regularly named among the best English dubs, and all of them have a full English dub you can switch to in the AnimeVerse player.

## The classics

- [[1|Cowboy Bebop]]: a jazz-scored space western. Its English cast is often called the best dub ever made.
- [[5114|Fullmetal Alchemist: Brotherhood]]: two brothers, one terrible mistake and a 64-episode story that sticks the landing.
- [[1535|Death Note]]: a cat-and-mouse thriller between a student with a deadly notebook and the detective hunting him.
- [[1575|Code Geass]]: a prince-turned-rebel with the power to command anyone, and a famous ending.

## Modern hits

- [[16498|Attack on Titan]]: humanity behind walls, giants outside, and a story that keeps turning itself inside out.
- [[38000|Demon Slayer]]: a boy hunting demons to save his sister, with standout animation.
- [[40748|Jujutsu Kaisen]]: curses, sorcerers and some of the best fight choreography in anime.
- [[11061|Hunter x Hunter]]: an adventure that grows into one of the smartest battle series around.

## Comedy and something different

- [[50265|Spy x Family]]: a spy, an assassin and a telepath pretend to be a family. Great for watching together.
- [[30276|One-Punch Man]]: a hero who wins every fight with one punch and is bored stiff about it.
- [[32182|Mob Psycho 100]]: a shy psychic kid, a fraud of a mentor and wildly inventive animation.
- [[42310|Cyberpunk: Edgerunners]]: a ten-episode, self-contained story set in Night City.

## How to watch them dubbed

Open the series, start an episode and pick **English** in the player's audio menu. Posters with a **DUB** tag have an English dub; a DUB tag with an asterisk means the dub is still being released. Browse more on the [English dubbed anime](/watch-anime-in-english) page.
`,
  },
  {
    slug: 'naruto-watch-order',
    title: 'Naruto Watch Order: Naruto, Shippuden, Boruto and the Movies',
    description: 'The Naruto watch order explained: Naruto (220 episodes), Naruto Shippuden (500 episodes), Boruto, where the movies fit, and how to handle filler.',
    published: '2026-11-20',
    anime: ['20', '1735', '34566'],
    body: `
The Naruto franchise runs to more than 1,000 episodes, so it helps to know the order before you start. The short answer: **[[20|Naruto]] → [[1735|Naruto Shippuden]] → [[34566|Boruto: Naruto Next Generations]]**, with the movies slotted in as optional extras.

## 1. Naruto (2002, 220 episodes)

The original series follows Naruto Uzumaki from loud, lonely academy student to a genin determined to become Hokage. The main story ends with the Sasuke Retrieval arc in episode 135. **Episodes 136 to 220 are almost all filler**, original stories made while the manga moved ahead. Many viewers skip straight from episode 135 to Shippuden and miss nothing important.

## 2. Naruto Shippuden (2007, 500 episodes)

Shippuden picks up about two and a half years later and carries the story through the Akatsuki and the Fourth Great Ninja War. It also has filler arcs. Skipping them is fine if you only want the manga story, but some are fan favourites, such as the Kakashi ANBU arc (episodes 349 to 361).

**The Last: Naruto the Movie** (2014) is set two years after the war and leads into Naruto and Hinata's wedding, so watch it before Shippuden's final episode.

## 3. Boruto: Naruto Next Generations (2017, 293 episodes)

The next generation: Naruto is Hokage and his son Boruto wants nothing to do with his father's shadow. **Boruto: Naruto the Movie** (2015) covers the chunin exam story that the series later retells, so you can watch either one.

## Watching Naruto in Hindi, English or Japanese

All three series have full English dubs, and Naruto has a well-known Hindi dub. On AnimeVerse you can pick Japanese with English subtitles, English, or Hindi where a source carries it, from the player's audio menu. More in [how to watch anime in Hindi](/blog/how-to-watch-anime-in-hindi).
`,
  },
  {
    slug: 'demon-slayer-watch-order',
    title: 'Demon Slayer Watch Order: Every Season and Movie in Order',
    description: 'Demon Slayer in order: Season 1, Mugen Train, Entertainment District, Swordsmith Village, Hashira Training and the Infinity Castle films.',
    published: '2026-11-20',
    anime: ['38000', '40456', '47778'],
    body: `
[[38000|Demon Slayer: Kimetsu no Yaiba]] tells one continuous story, so release order is the right order. Every entry below follows straight on from the one before it.

## The order

1. **[[38000|Demon Slayer Season 1]]** (2019, 26 episodes). Tanjiro becomes a demon slayer to turn his sister Nezuko human again.
2. **[[40456|Demon Slayer: Mugen Train]]** (2020 film). Tanjiro's group joins the Flame Hashira on a train where people keep vanishing. It was also re-released as a seven-episode TV arc in 2021 with one new opening episode; watch either version.
3. **[[47778|Entertainment District Arc]]** (2021, 11 episodes). An undercover mission in the pleasure district with the Sound Hashira.
4. **Swordsmith Village Arc** (2023, 11 episodes). A trip to the hidden village where the slayers' swords are made.
5. **Hashira Training Arc** (2024, 8 episodes). The Hashira train the corps for the final battle.
6. **Infinity Castle** (film trilogy from 2025). The final battle against Muzan, told across three films.

## Do I need to watch the movie?

Yes. Mugen Train isn't a side story; its events carry straight into the Entertainment District Arc.

## Languages

Demon Slayer has a full English dub and an official Hindi dub. On AnimeVerse you can choose Japanese with English subtitles, English, or Hindi (and often Tamil and Telugu) in the player's audio menu where a source carries it.
`,
  },
  {
    slug: 'best-anime-for-beginners',
    title: '20 Best Anime for Beginners (and Where to Watch Them Free)',
    description: 'New to anime? 20 of the best anime for beginners, from Death Note and Attack on Titan to Spy x Family and Frieren, with episode counts and where to watch free.',
    published: '2026-11-20',
    anime: ['1535', '5114', '16498', '38000', '40748', '50265', '30276', '52991', '32281', '199'],
    body: `
The best first anime is one that hooks you fast and doesn't ask you to commit to 500 episodes. Every pick below is complete or close to it, has an English dub, and plays free on AnimeVerse.

## Short and gripping

- [[1535|Death Note]] (37 episodes): a genius student, a notebook that kills and a detective closing in.
- [[31043|Erased]] (12 episodes): a man sent back to his childhood to stop a string of kidnappings.
- [[42310|Cyberpunk: Edgerunners]] (10 episodes): a complete, heartbreaking story in Night City.
- [[30276|One-Punch Man]] (12 episodes): superhero parody with real stakes and stunning fights.

## Big action series

- [[16498|Attack on Titan]]: one of the most talked-about stories in anime; season one is 25 episodes.
- [[38000|Demon Slayer]] (26 episodes in season one): simple story, extraordinary animation.
- [[40748|Jujutsu Kaisen]] (24 episodes in season one): modern, stylish and fast.
- [[5114|Fullmetal Alchemist: Brotherhood]] (64 episodes): often called the best complete anime story.
- [[11061|Hunter x Hunter]] (148 episodes): long, but every arc is different.

## Feel-good and funny

- [[50265|Spy x Family]]: a fake family of spies and assassins. Great with family.
- [[20583|Haikyu!!]]: volleyball made more exciting than most action shows.
- [[32182|Mob Psycho 100]]: a psychic kid who just wants to be normal.

## Something deeper

- [[52991|Frieren: Beyond Journey's End]] (28 episodes): what happens after the heroes win.
- [[23273|Your Lie in April]] (22 episodes): music, grief and first love.
- [[33352|Violet Evergarden]] (13 episodes): a former soldier learns what "I love you" means.
- [[9253|Steins;Gate]] (24 episodes): a slow start, then one of the best time-travel stories anywhere.
- [[1575|Code Geass]] (25 episodes): rebellion, mind control and a famous twist.

## Start with a movie

- [[32281|Your Name.]]: two strangers who swap bodies, and the film that made Makoto Shinkai a household name.
- [[199|Spirited Away]]: Studio Ghibli's Oscar-winning classic.
- [[28851|A Silent Voice]]: a former bully tries to make amends.

Want more? The [anime list A–Z](/anime-list) has every title, and [sub vs dub](/blog/sub-vs-dub) helps you pick a language.
`,
  },
  {
    slug: 'how-to-watch-anime-free-safely',
    title: 'How to Watch Anime Free and Safely: A Practical Guide',
    description: 'How to watch anime for free without malware, scam pop-ups or fake downloads: warning signs, simple browser settings, and the official free options worth knowing.',
    published: '2026-11-20',
    anime: [],
    body: `
Free anime sites have a reputation for pop-ups, fake buttons and worse. You can avoid nearly all of it with a few habits. This guide covers the warning signs, the settings that help, and the official free options worth knowing.

## Warning signs to leave a site

- It asks you to **install** a "player", a codec, an app or a browser extension to watch. A browser plays video on its own; nothing needs installing.
- A pop-up says your phone or PC is **infected** or needs a "cleaner". That's a scam.
- It asks for permission to **send notifications**. Say no: that permission is how spam reaches your desktop.
- You're asked to **sign in with Google or Facebook**, or to enter card details, to watch a "free" episode.
- The Play button opens a new tab every time you click it.

## Simple settings that help

1. Keep your browser up to date; updates fix the holes that malicious ads use.
2. Turn off notification requests in your browser settings.
3. On Android, leave "install unknown apps" switched off and install apps only from the Play Store.
4. Never run a file you didn't mean to download, especially anything ending in .exe, .apk, .bat or .scr.

## Official free options

Several services offer free, ad-supported anime, depending on where you live. Check what's available in your region:

- **YouTube**: Muse India and Ani-One Asia post full episodes, with Hindi and English options on some shows.
- **Tubi** and **Pluto TV** carry free anime in many countries.
- **Amazon MX Player** has free Hindi and subtitled anime in India.

## How AnimeVerse handles this

AnimeVerse has no account, no sign-in and nothing to install. Your list and watch progress stay on your own device. Every title page also lists the official platforms we know about, so you can support the studios when you want to. Start with the [free anime page](/watch-anime-free).
`,
  },
  {
    slug: 'anime-seasons-and-simulcasts-explained',
    title: 'When Do New Anime Episodes Come Out? Seasons and Simulcasts Explained',
    description: 'How anime release seasons work: the four seasons, cours, simulcasts, why dubs arrive later, and how to know exactly when the next episode comes out.',
    published: '2026-11-20',
    anime: [],
    body: `
New anime don't arrive at random. Japanese TV anime are scheduled in four seasons a year, and once you know how they work it's easy to keep up.

## The four anime seasons

- **Winter** starts in **January**.
- **Spring** starts in **April**, usually the busiest season.
- **Summer** starts in **July**.
- **Fall** starts in **October**, often the strongest line-up of the year.

A season of TV is called a **cour**, about three months or 12 to 13 weekly episodes. Longer shows run for two cours (24 to 26 episodes) back to back, or split them with a break in between: a "split cour".

## What a simulcast is

A **simulcast** is an episode released outside Japan at almost the same time as the Japanese broadcast, usually with English subtitles. Many shows air late at night in Japan, so in India or Europe a new episode often lands in the evening or the next morning.

## Why dubs come later

Dubbing starts after the Japanese episode is finished, so even fast "simuldubs" trail by a few weeks. Hindi, Tamil and Telugu dubs of big series usually follow the English dub, though the gap keeps shrinking.

## How to know when the next episode is out

The AnimeVerse [release schedule](/schedule) lists every airing episode by weekday, converted to your own time zone, with a countdown to the next one. Each airing series page also shows when its next episode is due. See what's new on the [Japanese with subtitles](/watch-anime-in-japanese) page.
`,
  },
];

// ---------- Tiny Markdown ----------
function inline(text) {
  let s = esc(text);
  s = s.replace(/\[\[([\w]+)\|([^\]]+)\]\]/g, (_, id, label) => `<a href="/anime/${id}">${label}</a>`);
  s = s.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

function markdown(src) {
  const out = [];
  let list = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of src.trim().split('\n')) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    let m;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      close();
      const tag = m[1].length === 2 ? 'h2' : 'h3';
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else if ((m = line.match(/^-\s+(.*)$/))) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join('\n');
}

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
const bySlug = new Map(POSTS.map((p) => [p.slug, p]));

function blogIndex(ctx) {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/blog' }];
  return {
    title: `Anime Guides: Watch Orders, Hindi & English Dubs, Tips | ${SITE_NAME}`,
    description: 'AnimeVerse guides: watch orders, how to watch anime in Hindi, English or Japanese, the best dubbed anime, beginner picks and how to watch free safely.',
    canonicalPath: '/blog',
    main: `<article class="seo-page container page-top">
        ${R.breadcrumbHtml(crumbs)}
        <header class="seo-head"><h1>Anime guides</h1><p>Watch orders, language guides and recommendations from the AnimeVerse team.</p></header>
        <ul class="seo-posts">${POSTS.map((p) => `<li><a href="/blog/${p.slug}"><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><time datetime="${p.published}">${p.published}</time></a></li>`).join('')}</ul>
      </article>`,
    mode: 'static',
    cdnSeconds: 24 * 60 * 60,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${SITE_NAME} guides`,
        url: `${ctx.base}/blog`,
        blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${ctx.base}/blog/${p.slug}`, datePublished: p.published })),
      },
      R.breadcrumbLd(crumbs, ctx.base),
    ],
  };
}

function blogPost(ctx, slug) {
  const p = bySlug.get(slug);
  if (!p) return null;
  const path = `/blog/${p.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/blog' }, { name: p.title, path }];
  const anime = catalog.evergreen(p.anime);
  const image = anime.find((a) => a.banner || a.image);
  const others = POSTS.filter((x) => x.slug !== p.slug).slice(0, 4);
  const updated = p.updated || p.published;
  return {
    title: `${p.title} | ${SITE_NAME}`,
    description: truncate(p.description, 158),
    canonicalPath: path,
    image: image ? image.banner || image.image : undefined,
    ogType: 'article',
    main: `<article class="seo-page seo-article container page-top">
        ${R.breadcrumbHtml(crumbs)}
        <header class="seo-head"><h1>${esc(p.title)}</h1><p class="seo-byline">By the ${SITE_NAME} team · <time datetime="${p.published}">${p.published}</time>${updated !== p.published ? ` · updated <time datetime="${updated}">${updated}</time>` : ''}</p></header>
        <div class="seo-prose">${markdown(p.body)}</div>
        ${anime.length ? `<section class="seo-section"><h2>Anime in this guide</h2>${R.cardGrid(anime)}</section>` : ''}
        <nav class="seo-related" aria-label="More guides"><h2>More guides</h2><ul>${others.map((x) => `<li><a href="/blog/${x.slug}">${esc(x.title)}</a></li>`).join('')}</ul></nav>
      </article>`,
    mode: 'static',
    cdnSeconds: 24 * 60 * 60,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        url: `${ctx.base}${path}`,
        mainEntityOfPage: `${ctx.base}${path}`,
        datePublished: p.published,
        dateModified: updated,
        wordCount: wordCount(p.body),
        image: image ? image.banner || image.image : `${ctx.base}/brand/logo-192.png`,
        author: { '@type': 'Organization', name: `${SITE_NAME} team`, url: `${ctx.base}/` },
        publisher: { '@id': `${ctx.base}/#organization` },
        about: anime.slice(0, 6).map((a) => ({ '@type': 'CreativeWork', name: a.title, url: `${ctx.base}/anime/${a.id}` })),
      },
      R.breadcrumbLd(crumbs, ctx.base),
    ],
  };
}

module.exports = { POSTS, blogIndex, blogPost, markdown };
