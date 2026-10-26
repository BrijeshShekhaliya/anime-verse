const express = require('express');
const router = express.Router();
const db = require('../data/database');
const cache = require('../services/cache');

// GET /api/v2/catalog - Browse available media
router.get('/catalog', (req, res) => {
  const cacheKey = 'catalog:all';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  const result = db.catalog;
  cache.set(cacheKey, result, 60);
  res.json({ source: 'live', data: result });
});

// Step 1: GET /api/v2/anime/:id/episodes
// Exact specification from Section 4 Step 1 of the report
router.get('/anime/:id/episodes', (req, res) => {
  const animeId = req.params.id;
  const cacheKey = `anime:episodes:${animeId}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', ...cached });
  }

  const series = db.catalog.find(c => c.id === animeId);
  if (!series) {
    return res.status(404).json({ error: `Anime with id '${animeId}' not found.` });
  }

  const episodeList = db.episodes[animeId] || [];

  const responsePayload = {
    animeId: series.id,
    animeTitle: series.title,
    totalEpisodes: episodeList.length,
    episodes: episodeList.map(ep => ({
      number: ep.number,
      id: ep.id,
      title: ep.title,
      duration: ep.duration,
      thumbnail: ep.thumbnail
    }))
  };

  cache.set(cacheKey, responsePayload, 120);
  res.json({ source: 'live', ...responsePayload });
});

module.exports = router;
