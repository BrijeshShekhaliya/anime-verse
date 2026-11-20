// Anime data for the server-rendered pages. Everything reads the caches the API
// already fills, so a crawler visit never waits on a slow upstream for long.

const cache = require('../services/cache');
const animeRoutes = require('../routes/anime');
const dubs = require('../services/dubs');
const { unique } = require('./util');

// Titles people search for by name ("watch naruto in hindi"), so they always
// have a crawlable page even when they're not on the home rows. MyAnimeList ids,
// checked against AniList on 2026-11-20.
const EVERGREEN = [
  ['20', 'Naruto'],
  ['1735', 'Naruto: Shippuden'],
  ['34566', 'Boruto: Naruto Next Generations'],
  ['21', 'One Piece'],
  ['16498', 'Attack on Titan'],
  ['40028', 'Attack on Titan Final Season'],
  ['38000', 'Demon Slayer: Kimetsu no Yaiba'],
  ['47778', 'Demon Slayer: Entertainment District Arc'],
  ['40456', 'Demon Slayer: Mugen Train'],
  ['40748', 'Jujutsu Kaisen'],
  ['51009', 'Jujutsu Kaisen Season 2'],
  ['1535', 'Death Note'],
  ['52299', 'Solo Leveling'],
  ['58567', 'Solo Leveling Season 2: Arise from the Shadow'],
  ['30276', 'One-Punch Man'],
  ['31964', 'My Hero Academia'],
  ['36456', 'My Hero Academia Season 3'],
  ['11061', 'Hunter x Hunter (2011)'],
  ['5114', 'Fullmetal Alchemist: Brotherhood'],
  ['269', 'Bleach'],
  ['41467', 'Bleach: Thousand-Year Blood War'],
  ['223', 'Dragon Ball'],
  ['813', 'Dragon Ball Z'],
  ['30694', 'Dragon Ball Super'],
  ['22319', 'Tokyo Ghoul'],
  ['34572', 'Black Clover'],
  ['44511', 'Chainsaw Man'],
  ['50265', 'Spy x Family'],
  ['52991', 'Frieren: Beyond Journey’s End'],
  ['57334', 'Dan Da Dan'],
  ['52588', 'Kaiju No. 8'],
  ['49596', 'Blue Lock'],
  ['52034', 'Oshi no Ko'],
  ['42249', 'Tokyo Revengers'],
  ['11757', 'Sword Art Online'],
  ['20583', 'Haikyu!!'],
  ['37521', 'Vinland Saga'],
  ['32182', 'Mob Psycho 100'],
  ['38691', 'Dr. Stone'],
  ['42310', 'Cyberpunk: Edgerunners'],
  ['1575', 'Code Geass: Lelouch of the Rebellion'],
  ['9253', 'Steins;Gate'],
  ['31240', 'Re:Zero − Starting Life in Another World'],
  ['37430', 'That Time I Got Reincarnated as a Slime'],
  ['39535', 'Mushoku Tensei: Jobless Reincarnation'],
  ['20507', 'Noragami'],
  ['6702', 'Fairy Tail'],
  ['31043', 'Erased'],
  ['35849', 'Darling in the Franxx'],
  ['23273', 'Your Lie in April'],
  ['33352', 'Violet Evergarden'],
  ['4224', 'Toradora!'],
  ['47917', 'Bocchi the Rock!'],
  ['58514', 'The Apothecary Diaries Season 2'],
  ['1', 'Cowboy Bebop'],
  ['19', 'Monster'],
  ['28851', 'A Silent Voice'],
  ['32281', 'Your Name.'],
  ['199', 'Spirited Away'],
  ['38826', 'Weathering With You'],
  ['50594', 'Suzume'],
].map(([id, title]) => ({ id, title }));

const EVERGREEN_MOVIES = ['28851', '32281', '199', '38826', '50594', '40456'];

const HOME_ROWS = ['spotlight', 'trending', 'seasonNow', 'popular', 'topRated', 'upcoming', 'movies'];

function home() {
  return cache.get('home') || cache.snapshot.read('home') || {};
}

const row = (key) => (Array.isArray(home()[key]) ? home()[key].filter((a) => a && a.id) : []);

function homeItems() {
  const h = home();
  return unique(
    HOME_ROWS.flatMap((k) => (Array.isArray(h[k]) ? h[k] : [])),
    (a) => (a && a.id ? String(a.id) : null)
  );
}

// Cached detail, else a home-row entry, else the bare evergreen name.
function known(id) {
  const key = String(id);
  return (
    cache.get(`detail:${key}`) ||
    cache.snapshot.read(`detail_${key}`) ||
    homeItems().find((a) => String(a.id) === key) ||
    EVERGREEN.find((a) => a.id === key) ||
    null
  );
}

const evergreen = (ids = null) => (ids ? ids : EVERGREEN.map((a) => a.id)).map(known).filter(Boolean);

// Full detail for one title. Waits at most `timeoutMs`; a slow answer keeps
// loading in the background so the next visit is instant.
async function detail(id, timeoutMs = 4500) {
  const quick = cache.get(`detail:${id}`) || cache.snapshot.read(`detail_${id}`);
  if (quick) return { anime: quick };
  let timer;
  try {
    const anime = await Promise.race([
      animeRoutes.getDetail(id),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { timeout: true })), timeoutMs);
      }),
    ]);
    return anime ? { anime } : { notFound: true };
  } catch (err) {
    if (err && err.status === 404) return { notFound: true };
    return { unavailable: true };
  } finally {
    clearTimeout(timer);
  }
}

// Dub status is read from the live MAL-Dubs list when it's loaded, so a title
// cached before the list arrived isn't stuck showing "no dub".
function langInfo(a) {
  const live = a && a.malId && dubs.status().updatedAt ? dubs.languagesFor(a.malId) : null;
  const l = live || (a && a.languages) || {};
  return {
    sub: l.sub !== false,
    dub: l.dub === 'full' ? 'full' : l.dub === 'partial' ? 'partial' : null,
    audio: Array.isArray(l.audio) && l.audio.length ? l.audio : ['Japanese'],
    subtitles: Array.isArray(l.subtitles) && l.subtitles.length ? l.subtitles : ['English'],
  };
}

const isMovie = (a) => /movie/i.test(String((a && (a.type || a.format)) || ''));

module.exports = { EVERGREEN, EVERGREEN_MOVIES, home, row, homeItems, known, evergreen, detail, langInfo, isMovie };
