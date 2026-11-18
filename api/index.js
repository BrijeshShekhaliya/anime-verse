// ─── Vercel Serverless Function Entrypoint ──────────────────────────────────────
// Executes the AnimeVerse full-stack Express API serverlessly on Vercel without
// requiring any external AWS / EC2 proxy backend.

const app = require('../server');

module.exports = (req, res) => {
  // Always preserve full original client request URI on Vercel rewrites
  const clientUri = req.headers['x-forwarded-uri'] ||
                    req.headers['x-original-uri'] ||
                    req.originalUrl ||
                    req.url;

  if (clientUri && clientUri.startsWith('/api')) {
    req.url = clientUri;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
};
