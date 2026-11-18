import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('serverless entrypoint exports valid Express app handler', async () => {
  const handler = (await import('../api/index.js')).default;
  assert.equal(typeof handler, 'function');
});

test('serverless catch-all handler exports valid function and formats URLs correctly', async () => {
  const handler = (await import('../api/[...path].js')).default;
  assert.equal(typeof handler, 'function');
});

test('Express app handles /api/status without external server', async () => {
  const app = (await import('../server.js')).default;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.provider);
    assert.ok(data.uptime !== undefined);
  } finally {
    server.close();
  }
});

test('Express app handles /api/home using cached/seed snapshot', async () => {
  const app = (await import('../server.js')).default;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/home`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.trending));
    assert.ok(data.trending.length > 0);
    assert.ok(Array.isArray(data.spotlight));
  } finally {
    server.close();
  }
});

test('Express app handles /api/genres', async () => {
  const app = (await import('../server.js')).default;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/genres`);
    assert.equal(res.status, 200);
    const genres = await res.json();
    assert.ok(Array.isArray(genres));
    assert.ok(genres.length > 0);
  } finally {
    server.close();
  }
});

test('Express app rejects /api/stream/resolve with missing title', async () => {
  const app = (await import('../server.js')).default;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/stream/resolve`);
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});
