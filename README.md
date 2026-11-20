# AnimeVerse: anime discovery site

A Crunchyroll-style anime discovery website. It shows trending and seasonal anime, ratings, release schedules, and which titles are available **subbed** or **dubbed in English**. It does not host or stream video. Each title links to its official streaming platforms instead.

Everything updates automatically from free, keyless data sources. There is no database to fill and no manual content entry.

## Run it

```powershell
npm install
npm start
```

Then open **http://localhost:3000**. Opening `public/index.html` directly from disk will not work, because the page needs the server's `/api`.

Use a different port with `$env:PORT=3001; npm start`.

## Data sources (all free)

| Source | Used for | Key needed |
|---|---|---|
| [Jikan](https://jikan.moe) (MyAnimeList API) | Primary catalogue, MAL scores, rank, members, characters, recommendations | No |
| [AniList GraphQL](https://anilist.co) | Banner artwork, next-episode countdowns, and an **automatic fallback** when Jikan is down | No |
| [MAL-Dubs](https://github.com/MAL-Dubs/MAL-Dubs) (GitHub) | English dub availability for ~5,800 titles, refreshed every 6 hours | No |
| [OMDb](https://www.omdbapi.com/apikey.aspx) | IMDb ratings (optional) | Free key |

IMDb has no free public API. To show IMDb ratings on detail pages, get a free OMDb key and start the server with it:

```powershell
$env:OMDB_API_KEY="your-key"; npm start
```

Set `PROVIDER=anilist` to skip Jikan entirely.

## What's automated

- Home rows (Top 10 airing, this season, dubbed, top rated, popular, next season, movies) are cached for 30 minutes and then rebuilt from live data. The open page refreshes itself as well.
- The current and next season are worked out from today's date.
- The dub list is pulled from GitHub on startup and every 6 hours.
- If Jikan fails, the server switches to AniList and checks in the background every 2 minutes until Jikan recovers.
- Requests are throttled to stay inside each API's rate limits, and identical requests share one upstream call.

## Pages

- `/`: auto-rotating spotlight carousel and scrolling rows
- `/anime/:id`: ratings, languages (audio, subtitles, dub status), info, trailer, where to watch, cast, recommendations
- `/browse`: filters for title, genre, format, status, sort and "English dub only", with infinite scroll
- `/schedule`: this week's episodes in your local time, with live countdowns
- Search overlay: press `/` anywhere

## API

| Route | Returns |
|---|---|
| `GET /api/home` | All home rows plus spotlight |
| `GET /api/anime/:id` | Title detail (`id` is a MyAnimeList id) |
| `GET /api/anime/:id/extras` | Characters and recommendations |
| `GET /api/search?q=&genre=&type=&status=&order=&dub=1&page=` | Paged results |
| `GET /api/schedule/:day` | Episodes airing that weekday |
| `GET /api/genres` | Genre names |
| `GET /api/status` | Active provider, dub list size, IMDb status |

The earlier HLS player prototype is kept in `legacy/` for reference and is no longer served.

## SEO (search engines and AI crawlers)

Every page URL is rendered on the server (`src/seo/`) with its own title, description, canonical link, Open Graph tags, JSON-LD structured data and the page's content, so Google, Bing and AI crawlers see the full page without running JavaScript. The app then takes over in the browser exactly as before. On Vercel, page URLs, `robots.txt` and the sitemaps are routed through `api/ssr.js` (see `vercel.json`).

- **Site address:** canonical links use `https://watchanimeverse.dpdns.org`. Set the `SITE_URL` environment variable to change it.
- **Anime pages** (`/anime/:id`): synopsis, details, episode names, characters and voice cast, where to watch, related titles, a language guide (Japanese / English dub / Hindi) and FAQs, plus `TVSeries`/`Movie`, `BreadcrumbList` and `FAQPage` data.
- **Keyword pages:** `/watch-anime`, `/watch-anime-free`, `/watch-anime-in-hindi`, `/watch-anime-in-english`, `/watch-anime-in-japanese`, `/watch-anime-in-tamil`, `/watch-anime-in-telugu`, `/watch-anime-movies`.
- **Anime list A–Z:** `/anime-list`, `/anime-list/:letter`, `/anime-list/:letter/:page`, linking every title.
- **Guides:** `/blog` and `/blog/:slug` (posts live in `src/seo/blog.js`).
- Keyword pages, the A–Z list and the guides are deliberately not linked from the menus or footer; search engines find them through the sitemap and the links between them.
- **Sitemaps:** `/sitemap.xml` is an index of `/sitemaps/pages.xml` and `/sitemaps/anime-N.xml` (5,000 titles each).

The full title list comes from `src/data/anime-index.json`. Rebuild it every month or two to pick up new titles (about 20 minutes, kept under AniList's rate limit; don't run the tests at the same time):

```powershell
node scripts/build-anime-index.js
```

After deploying, submit `https://watchanimeverse.dpdns.org/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
