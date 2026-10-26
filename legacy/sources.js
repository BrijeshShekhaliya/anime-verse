const express = require('express');
const router = express.Router();
const db = require('../data/database');
const cache = require('../services/cache');

// Step 3: GET /api/v2/source/:serverId
// Exact specification from Section 4 Step 3 of the report
router.get('/source/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  const cacheKey = `source:server:${serverId}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', ...cached });
  }

  const resolvedSource = db.sources[serverId];
  if (!resolvedSource) {
    return res.status(404).json({ error: `Approved source '${serverId}' was not found.` });
  }

  const responsePayload = {
    serverId: serverId,
    serverName: resolvedSource.serverName || "Default CDN",
    type: resolvedSource.type, // 'hls' or 'iframe'
    link: resolvedSource.link,
    tracks: resolvedSource.tracks || [],
    requiresProxy: resolvedSource.requiresProxy || false,
    headers: resolvedSource.headers || {},
    resolvedAt: new Date().toISOString()
  };

  cache.set(cacheKey, responsePayload, 60);
  res.json({ source: 'live', ...responsePayload });
});

module.exports = router;
