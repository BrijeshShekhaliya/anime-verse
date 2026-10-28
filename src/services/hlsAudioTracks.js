'use strict';

// Parse actual audio renditions from an HLS master manifest. Do not fabricate
// languages: a track is returned only when the manifest declares TYPE=AUDIO.
function parseHlsAudioTracks(manifestText, manifestUrl) {
  const lines = String(manifestText || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const tracks = [];
  const seen = new Set();

  for (const line of lines) {
    if (!/^#EXT-X-MEDIA:/i.test(line)) continue;

    const raw = line.slice(line.indexOf(':') + 1);
    const attrs = {};
    // Quoted attributes may contain commas; unquoted values end at a comma.
    const attributePattern = /([A-Z0-9-]+)=(?:"((?:[^"]|"")*)"|([^,]*))(?:,|$)/gi;
    let match;
    while ((match = attributePattern.exec(raw))) {
      attrs[match[1].toUpperCase()] = (match[2] ?? match[3] ?? '')
        .replace(/""/g, '"')
        .trim();
    }

    if ((attrs.TYPE || '').toUpperCase() !== 'AUDIO') continue;

    const name = attrs.NAME || attrs.LANGUAGE || 'Audio';
    const language = attrs.LANGUAGE || '';
    let uri = null;
    if (attrs.URI) {
      try {
        uri = new URL(attrs.URI, manifestUrl).href;
      } catch {
        // Ignore malformed URI metadata instead of failing stream resolution.
        continue;
      }
    }

    const groupId = attrs['GROUP-ID'] || null;
    const identity = [groupId || '', language.toLowerCase(), name.toLowerCase(), uri || ''].join('|');
    if (seen.has(identity)) continue;
    seen.add(identity);

    tracks.push({
      id: 'hls-audio-' + tracks.length,
      name,
      language,
      groupId,
      uri,
      isDefault: attrs.DEFAULT === 'YES',
      isAutoselect: attrs.AUTOSELECT === 'YES',
      channels: attrs.CHANNELS || null,
    });
  }

  return tracks;
}

module.exports = { parseHlsAudioTracks };
