import test from 'node:test';
import assert from 'node:assert/strict';
import streamProxy from '../src/services/streamProxy.js';

test('rewritePlaylist proxies sub-playlists but preserves direct CDN URLs for media segments', () => {
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

  // Segment URLs must NOT be proxied through /api/stream/proxy; they must point directly to CDN
  assert.ok(rewrittenVariant.includes('https://hls1.drama1.cfd/s/test/1080/seg_000.ts.jpg'));
  assert.ok(rewrittenVariant.includes('https://hls1.drama1.cfd/s/test/1080/seg_001.ts.jpg'));
  assert.strictEqual(rewrittenVariant.includes('/api/stream/proxy?url='), false);
});
