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
