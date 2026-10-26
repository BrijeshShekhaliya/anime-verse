const express = require('express');
const router = express.Router();
const db = require('../data/database');
const cache = require('../services/cache');

// Step 2: GET /api/v2/episode/:episodeId/servers
// Exact specification from Section 4 Step 2 of the report
router.get('/episode/:episodeId/servers', (req, res) => {
  const episodeId = req.params.episodeId;
  const cacheKey = `episode:servers:${episodeId}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', ...cached });
  }

  const episodeExists = Object.values(db.episodes).flat().some((episode) => episode.id === episodeId);
  if (!episodeExists) {
    return res.status(404).json({ error: `Episode '${episodeId}' was not found.` });
  }

  // The default is an approved demo source used for this reference app. In a
  // production deployment, populate a distinct entry only after obtaining
  // distribution and playback rights for that episode.
  const serverData = db.servers[episodeId] || db.servers.default;

  const responsePayload = {
    episodeId: episodeId,
    sub: serverData.sub.map(s => ({
      serverId: s.serverId,
      serverName: s.serverName,
      quality: s.quality,
      latency: s.latency
    })),
    dub: serverData.dub.map(s => ({
      serverId: s.serverId,
      serverName: s.serverName,
      quality: s.quality,
      latency: s.latency
    }))
  };

  cache.set(cacheKey, responsePayload, 60);
  res.json({ source: 'live', ...responsePayload });
});

module.exports = router;
