// Groups AniList's per-season entries into one series, without any extra API
// calls. AniList stores every season, movie, OVA and recap as its own entry;
// list queries already return each entry's relations, so entries are joined
// when they're linked as prequel/sequel/parent/side story/recap, or share the
// same series title once "Season 2", "Part 2", "Final Season" are stripped.
const { seriesTitle } = require('./artwork');

// Relations that mean "the same show". ALTERNATIVE (remakes such as FMA vs
// FMA: Brotherhood) and CHARACTER/OTHER (crossovers) stay separate.
const FAMILY = new Set(['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SUMMARY', 'COMPILATION', 'CONTAINS']);
const MAIN_TYPES = new Set(['TV', 'TV Short', 'ONA']);

const groupKey = (title) => seriesTitle(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function unionFind() {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    parent.set(x, root);
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  return { find, union };
}

// A film that continues the story: linked as prequel/sequel to a TV season.
// Recaps link through PARENT/SUMMARY/ALTERNATIVE or only to other films.
const MAIN_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);
const isStoryMovie = (a) =>
  a.type === 'Movie' && (a.family || []).some((e) => (e.rel === 'PREQUEL' || e.rel === 'SEQUEL') && MAIN_FORMATS.has(e.format));

// The entry that best stands for the whole series: its first TV season.
function pickRepresentative(members) {
  const rank = (a) => (MAIN_TYPES.has(a.type) ? 0 : 1) * 1e5 + (a.year || 9999);
  return members.reduce((best, a) => (rank(a) < rank(best) ? a : best));
}

// mode "series": one entry per series, shown as its first season (search, catalogue lists).
// mode "dedupe": keep the listed season (airing rows), but only once per series.
// Promo clips and music videos aren't shows anyone is looking for.
const isPromo = (a) => a.type === 'Music' || /(^|[\s(])(PV|CM|MV)(\s*\d+)?($|[\s)])|\b(trailer|teaser|promotional)\b/i.test(a.title || '');

function collapse(items, mode = 'series') {
  if (mode === 'series') items = items.filter((a) => !isPromo(a));
  if (items.length < 2) return items.map((a) => ({ ...a, group: groupKey(a.title) }));
  const uf = unionFind();
  const node = (i) => `i:${i}`;
  items.forEach((a, i) => {
    if (a.anilistId) uf.union(node(i), `a:${a.anilistId}`);
    for (const e of a.family || []) if (FAMILY.has(e.rel)) uf.union(node(i), `a:${e.id}`);
    uf.union(node(i), `t:${groupKey(a.title)}`);
  });

  const groups = new Map(); // root -> member indexes, in list order
  items.forEach((_, i) => {
    const root = uf.find(node(i));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });

  const out = [];
  for (const members of groups.values()) {
    const list = members.map((i) => items[i]);
    const rep = pickRepresentative(list);
    const chosen = mode === 'series' ? rep : list[0];
    out.push({ at: members[0], item: { ...chosen, group: groupKey(rep.title) } });
    // Story movies (Mugen Train, JJK 0) are results of their own, like on
    // TMDB/Streambert; recap films and OVAs stay folded into the series.
    if (mode === 'series') {
      members.forEach((i) => {
        const a = items[i];
        if (a !== chosen && isStoryMovie(a)) out.push({ at: i, item: { ...a, group: `movie:${a.id}` } });
      });
    }
  }
  return out.sort((x, y) => x.at - y.at).map((x) => x.item);
}

module.exports = { collapse, groupKey };
