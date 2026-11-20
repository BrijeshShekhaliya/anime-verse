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

## Video proxy on a VPS

The player fetches every playlist and video segment through `/api/stream/proxy`, which adds the Referer the video hosts require and the CORS headers the browser needs. On Vercel every byte of video then passes through a function. An episode is a few hundred MB, so a few dozen views can use up a Hobby plan's monthly data transfer. `stream-server.js` runs just that proxy as a small standalone server, so the video can go through a VPS with plenty of included bandwidth while the site and its API stay on Vercel.

- **On Vercel**, set `STREAM_PROXY_BASE` to the proxy's address (for example `https://stream.example.com`). `/api/stream/resolve` then returns stream, subtitle and audio-track URLs on that host. Without it, they stay on the same site (`/api/stream/proxy`), exactly as before.
- **On the VPS**, `stream-server.js` serves `/api/stream/proxy` and `/health`, nothing else. The playlists it rewrites use relative URLs, so the player keeps fetching segments from the VPS, and the VPS needs no `STREAM_PROXY_BASE` of its own. It answers the site's origin with CORS headers and refuses (403) requests from players on other websites.

| Variable (VPS) | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | Port to listen on |
| `HOST` | `0.0.0.0` (`127.0.0.1` in the systemd unit) | Address to listen on |
| `ALLOWED_ORIGINS` | `https://watchanimeverse.dpdns.org` | Comma-separated origins the player runs on; `*` allows any |

Try it on your computer first. The proxy must allow the local site's origin:

```powershell
$env:ALLOWED_ORIGINS="http://localhost:3000"; npm run stream
```

Then, in a second terminal, start the site pointed at it and play an episode. In the browser's Network tab, the `.m3u8` and segment requests go to `localhost:8080`:

```powershell
$env:STREAM_PROXY_BASE="http://localhost:8080"; npm start
```

### Deploy to a Linux VPS (any provider)

1. **Pick a plan by outbound bandwidth.** Monthly outbound traffic is roughly views × episode size: 1,000 views of a 300 MB episode is about 300 GB. Traffic coming in from the video hosts is usually free, but check the provider's terms.
2. **Point a hostname at the VPS** with an A (and AAAA) record, for example `stream.<your domain>`. Open ports 80 and 443 (Caddy needs both to get the HTTPS certificate). Keep port 8080 closed.
3. **Install Node.js 22 and Caddy.** On Debian 12+ or Ubuntu 24.04+ (other systems: [nodejs.org](https://nodejs.org/en/download), [caddyserver.com/docs/install](https://caddyserver.com/docs/install)):

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs caddy
   ```

4. **Copy the proxy files from your computer**, not from GitHub. In this repository on your computer (it packs the last commit):

   ```powershell
   git archive --format=tar.gz -o stream-proxy.tgz HEAD package.json package-lock.json stream-server.js src/services deploy/stream-proxy
   scp stream-proxy.tgz you@your-vps:
   ```

5. **Install and start the service** on the VPS:

   ```bash
   sudo useradd --system --home /opt/animeverse-stream --shell /usr/sbin/nologin animeverse
   sudo mkdir -p /opt/animeverse-stream
   sudo tar -xzf ~/stream-proxy.tgz -C /opt/animeverse-stream
   cd /opt/animeverse-stream && sudo npm ci --omit=dev
   sudo cp deploy/stream-proxy/animeverse-stream.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now animeverse-stream
   curl http://127.0.0.1:8080/health
   ```

   Change `ALLOWED_ORIGINS` (or the Node path, see `command -v node`) in `/etc/systemd/system/animeverse-stream.service`, then run `sudo systemctl daemon-reload && sudo systemctl restart animeverse-stream`. Logs: `journalctl -u animeverse-stream -f`.

6. **Add HTTPS.** The site is HTTPS, so browsers only load video from an HTTPS address. Put your hostname in place of `stream.example.com`:

   ```bash
   sudo cp deploy/stream-proxy/Caddyfile /etc/caddy/Caddyfile
   sudo nano /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   curl https://stream.example.com/health
   ```

**Docker instead of systemd:** after step 4, extract the archive on the VPS and, in that folder, build and run the image (then do step 6 as above):

```bash
sudo docker build -f deploy/stream-proxy/Dockerfile -t animeverse-stream .
sudo docker run -d --name animeverse-stream --restart unless-stopped -p 127.0.0.1:8080:8080 -e ALLOWED_ORIGINS=https://watchanimeverse.dpdns.org animeverse-stream
```

**Updating:** pack and copy a new archive as in step 4, extract it over `/opt/animeverse-stream`, run `sudo npm ci --omit=dev` there, then `sudo systemctl restart animeverse-stream`.

### Switch the site to the VPS proxy (Vercel)

1. In the Vercel dashboard, open the project's **Settings → Environment Variables** and add `STREAM_PROXY_BASE` with the proxy's HTTPS address, for example `https://stream.example.com` (no path, no trailing slash needed). Choose **Production**. From the CLI: `vercel env add STREAM_PROXY_BASE production`.
2. **Redeploy** (Deployments → the latest one → ⋯ → Redeploy). Changed variables only reach new deployments.
3. Check it: play an episode with the browser's Network tab open. The `.m3u8` and segment requests go to the stream host, and no video goes to `/api/stream/proxy` on the site. The project's Usage page should stop climbing with every view.

Preview deployments run on their own `*.vercel.app` address. Either leave `STREAM_PROXY_BASE` set for Production only, so previews keep the built-in proxy, or add the preview address to `ALLOWED_ORIGINS`.

To roll back, delete the variable and redeploy. The built-in `/api/stream/proxy` route stays on Vercel either way, so stream links a browser cached before the switch (for up to 30 minutes) still play.

Like the Vercel route, the proxy fetches any public http(s) address it is given (private and local addresses are blocked). The origin check stops other websites' players, not scripts calling it directly, so keep an eye on the VPS's traffic graph.

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
