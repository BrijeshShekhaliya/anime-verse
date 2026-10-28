import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseHlsAudioTracks } = require('../src/services/hlsAudioTracks.js');

test('parses audio names and languages dynamically from HLS master manifest', () => {
  const manifest = [
    '#EXTM3U',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Japanese",LANGUAGE="ja",DEFAULT=YES,AUTOSELECT=YES,URI="audio/ja.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English Dub",LANGUAGE="en",DEFAULT=NO,AUTOSELECT=YES,URI="audio/en.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Hindi",LANGUAGE="hi",DEFAULT=NO,AUTOSELECT=YES,URI="audio/hi.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=1200000,AUDIO="audio"',
    'video/720p.m3u8',
  ].join('\n');
  const tracks = parseHlsAudioTracks(manifest, 'https://cdn.example/master.m3u8');
  assert.equal(tracks.length, 3);
  assert.deepEqual(tracks.map((track) => track.name), ['Japanese', 'English Dub', 'Hindi']);
  assert.deepEqual(tracks.map((track) => track.language), ['ja', 'en', 'hi']);
  assert.equal(tracks[0].isDefault, true);
  assert.equal(tracks[2].uri, 'https://cdn.example/audio/hi.m3u8');
});

test('returns no fabricated audio choices when manifest has no audio renditions', () => {
  assert.deepEqual(parseHlsAudioTracks('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n720p.m3u8', 'https://cdn.example/master.m3u8'), []);
});

test('deduplicates duplicate audio metadata', () => {
  const line = '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="English",LANGUAGE="en",URI="en.m3u8"';
  assert.equal(parseHlsAudioTracks(`${line}\n${line}`, 'https://cdn.example/master.m3u8').length, 1);
});
