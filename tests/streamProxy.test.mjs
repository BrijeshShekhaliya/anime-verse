import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import streamProxy from '../src/services/streamProxy.js';

test('rewritePlaylist proxies both sub-playlists and media segments with Referer and CORS', () => {
  const masterManifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="Japanese",DEFAULT=YES,URI="aud/a0/index.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=5300000,RESOLUTION=1920x1080,AUDIO="aud"
1080/index.m3u8`;

  const rewrittenMaster = streamProxy.rewritePlaylist(
    masterManifest,
    'https://hls.dramahot.top/p/test/master.m3u8',
    'https://zokoanime.video/'
  );

  // Sub-playlists must be proxied
  assert.ok(rewrittenMaster.includes('/api/stream/proxy?url=https%3A%2F%2Fhls.dramahot.top%2Fp%2Ftest%2F1080%2Findex.m3u8'));
  assert.ok(rewrittenMaster.includes('URI="/api/stream/proxy?url=https%3A%2F%2Fhls.dramahot.top%2Fp%2Ftest%2Faud%2Fa0%2Findex.m3u8'));

  // Variant media playlist with TS segments
  const variantManifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXTINF:5.005000,
https://hls1.drama1.cfd/s/test/1080/seg_000.ts.jpg
#EXTINF:5.005000,
https://hls1.drama1.cfd/s/test/1080/seg_001.ts.jpg`;

  const rewrittenVariant = streamProxy.rewritePlaylist(
    variantManifest,
    'https://hls.dramahot.top/p/test/1080/index.m3u8',
    'https://zokoanime.video/'
  );

  // Segment URLs MUST be proxied with Referer to avoid 403 Forbidden on CDNs
  assert.ok(rewrittenVariant.includes('/api/stream/proxy?url=https%3A%2F%2Fhls1.drama1.cfd%2Fs%2Ftest%2F1080%2Fseg_000.ts.jpg'));
  assert.ok(rewrittenVariant.includes('/api/stream/proxy?url=https%3A%2F%2Fhls1.drama1.cfd%2Fs%2Ftest%2F1080%2Fseg_001.ts.jpg'));
});

// ── STREAM_PROXY_BASE: proxied URLs on a separate video proxy server ─────────

const SEG = 'https://hls1.drama1.cfd/s/test/1080/seg_000.ts.jpg';
const REF = 'https://zokoanime.video/';
const QUERY = `url=${encodeURIComponent(SEG)}&ref=${encodeURIComponent(REF)}&v=2`;

function withBase(value, fn) {
  const saved = process.env.STREAM_PROXY_BASE;
  if (value === undefined) delete process.env.STREAM_PROXY_BASE;
  else process.env.STREAM_PROXY_BASE = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.STREAM_PROXY_BASE;
    else process.env.STREAM_PROXY_BASE = saved;
  }
}

test('without STREAM_PROXY_BASE, proxied URLs stay same-origin exactly as before', () => {
  withBase(undefined, () => {
    assert.equal(streamProxy.proxyBase(), '');
    assert.equal(streamProxy.proxiedUrl(SEG, REF), `/api/stream/proxy?${QUERY}`);
    assert.equal(streamProxy.proxiedUrl(SEG), `/api/stream/proxy?url=${encodeURIComponent(SEG)}&v=2`);
  });
  withBase('   ', () => {
    assert.equal(streamProxy.proxiedUrl(SEG, REF), `/api/stream/proxy?${QUERY}`);
  });
});

test('with STREAM_PROXY_BASE, proxied URLs point at that origin', () => {
  for (const base of ['https://stream.example.com', 'https://stream.example.com/', ' https://stream.example.com// ']) {
    withBase(base, () => {
      assert.equal(streamProxy.proxyBase(), 'https://stream.example.com', base);
      assert.equal(streamProxy.proxiedUrl(SEG, REF), `https://stream.example.com/api/stream/proxy?${QUERY}`, base);
    });
  }
  // A port and a path prefix (proxy mounted under a sub-path) are kept.
  withBase('http://203.0.113.7:8080/video/', () => {
    assert.equal(streamProxy.proxiedUrl(SEG, REF), `http://203.0.113.7:8080/video/api/stream/proxy?${QUERY}`);
  });
});

test('an invalid STREAM_PROXY_BASE is ignored and falls back to same-origin', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const base of ['stream.example.com', 'ftp://stream.example.com', 'https://stream.example.com/?x=1', 'https://u:p@stream.example.com']) {
      withBase(base, () => {
        assert.equal(streamProxy.proxyBase(), '', base);
        assert.equal(streamProxy.proxiedUrl(SEG, REF), `/api/stream/proxy?${QUERY}`, base);
      });
    }
  } finally {
    console.warn = warn;
  }
});

test('rewritePlaylist points sub-playlists, segments and URI attributes at STREAM_PROXY_BASE', () => {
  const master = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="Japanese",DEFAULT=YES,URI="aud/a0/index.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=5300000,RESOLUTION=1920x1080,AUDIO="aud"
1080/index.m3u8`;
  const variant = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://keys.example.net/k.bin"
#EXTINF:5.005000,
${SEG}`;

  withBase('https://stream.example.com', () => {
    const m = streamProxy.rewritePlaylist(master, 'https://hls.dramahot.top/p/test/master.m3u8', REF);
    assert.ok(m.includes(`URI="https://stream.example.com/api/stream/proxy?url=${encodeURIComponent('https://hls.dramahot.top/p/test/aud/a0/index.m3u8')}`));
    assert.ok(
      m.split('\n').includes(
        `https://stream.example.com/api/stream/proxy?url=${encodeURIComponent('https://hls.dramahot.top/p/test/1080/index.m3u8')}&ref=${encodeURIComponent(REF)}&v=2`
      )
    );

    const v = streamProxy.rewritePlaylist(variant, 'https://hls.dramahot.top/p/test/1080/index.m3u8', REF);
    assert.ok(v.includes(`URI="https://stream.example.com/api/stream/proxy?url=${encodeURIComponent('https://keys.example.net/k.bin')}`));
    assert.ok(v.split('\n').includes(`https://stream.example.com/api/stream/proxy?${QUERY}`));
    // Tags without URLs are left alone, and no URL line points anywhere else.
    assert.ok(v.includes('#EXTINF:5.005000,'));
    for (const line of v.split('\n').filter((l) => l && !l.startsWith('#'))) {
      assert.ok(line.startsWith('https://stream.example.com/api/stream/proxy?url='), line);
    }
  });

  withBase(undefined, () => {
    const v = streamProxy.rewritePlaylist(variant, 'https://hls.dramahot.top/p/test/1080/index.m3u8', REF);
    assert.ok(v.split('\n').includes(`/api/stream/proxy?${QUERY}`));
    assert.ok(!v.includes('stream.example.com'));
  });
});

test('CORS headers allow any origin by default and a chosen origin on the standalone proxy', () => {
  assert.equal(streamProxy.corsHeaders({})['Access-Control-Allow-Origin'], '*');
  assert.equal(streamProxy.corsHeaders({ locals: {} }).Vary, undefined);
  const h = streamProxy.corsHeaders({ locals: { corsOrigin: 'https://watchanimeverse.dpdns.org' } });
  assert.equal(h['Access-Control-Allow-Origin'], 'https://watchanimeverse.dpdns.org');
  assert.equal(h.Vary, 'Origin');
});

// ── stream-server.js: the standalone proxy for a VPS ─────────────────────────

const SITE = 'https://watchanimeverse.dpdns.org';

async function withStreamServer(options, fn) {
  const { createApp } = (await import('../stream-server.js')).default;
  const server = http.createServer(createApp(options));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('stream server: allows the live site by default', async () => {
  const { parseOrigins } = (await import('../stream-server.js')).default;
  assert.deepEqual(parseOrigins(' https://a.example/ , https://b.example ,, '), ['https://a.example', 'https://b.example']);
  const saved = process.env.ALLOWED_ORIGINS;
  delete process.env.ALLOWED_ORIGINS;
  try {
    await withStreamServer(undefined, async (url) => {
      const res = await fetch(`${url}/api/stream/proxy`, { method: 'OPTIONS', headers: { Origin: SITE } });
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('access-control-allow-origin'), SITE);
    });
  } finally {
    if (saved !== undefined) process.env.ALLOWED_ORIGINS = saved;
  }
});

test('stream server: health route, CORS preflight, origin check and 404s', async () => {
  await withStreamServer({ allowedOrigins: [SITE, 'http://localhost:3000'] }, async (url) => {
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    // Preflight from an allowed origin: 204 with CORS headers naming that origin.
    const pre = await fetch(`${url}/api/stream/proxy?url=x`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range' },
    });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.match(pre.headers.get('access-control-allow-headers'), /Range/);
    assert.match(pre.headers.get('vary'), /Origin/);

    // Errors still carry CORS headers, so the player can read them.
    const missing = await fetch(`${url}/api/stream/proxy`, { headers: { Origin: SITE } });
    assert.equal(missing.status, 400);
    assert.equal(missing.headers.get('access-control-allow-origin'), SITE);

    // Private and local addresses are still refused.
    const local = await fetch(`${url}/api/stream/proxy?url=${encodeURIComponent('http://127.0.0.1/secret.m3u8')}`, {
      headers: { Origin: SITE },
    });
    assert.equal(local.status, 403);

    // A player on another website is refused before anything is fetched.
    const other = await fetch(`${url}/api/stream/proxy?url=${encodeURIComponent(SEG)}`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(other.status, 403);
    assert.equal(other.headers.get('access-control-allow-origin'), null);

    // Requests without an Origin (native players, curl) are answered for the site's origin.
    const noOrigin = await fetch(`${url}/api/stream/proxy`);
    assert.equal(noOrigin.status, 400);
    assert.equal(noOrigin.headers.get('access-control-allow-origin'), SITE);

    // Only the proxy is served.
    assert.equal((await fetch(`${url}/api/home`)).status, 404);
    assert.equal((await fetch(`${url}/`)).status, 404);
    assert.match(await (await fetch(`${url}/robots.txt`)).text(), /Disallow: \//);
  });
});

test('stream server: ALLOWED_ORIGINS=* allows any origin', async () => {
  await withStreamServer({ allowedOrigins: ['*'] }, async (url) => {
    const res = await fetch(`${url}/api/stream/proxy`, { headers: { Origin: 'https://anything.example' } });
    assert.equal(res.status, 400);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });
});
