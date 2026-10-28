'use strict';

// Parse HLS audio renditions from provider manifests. Labels and language codes
// come from actual EXT-X-MEDIA records; no language list is hard-coded.
function parseHlsAudioTracks(manifestText, manifestUrl) {
  const lines = String(manifestText || '').replace(/^\\uFEFF/, '').split(/\\r?\\n/);
  const tracks = [];
  for (const line of lines) {
    if (!/^#EXT-X-MEDIA:/i.test(line) || !/\\bTYPE=AUDIO\\b/i.test(line)) continue;
    const attrs = {};
    const raw = line.slice(line.indexOf(':') + 1);
    const re = /([A-Z0-9-]+)=(?:\"((?:[^\"]|\"\")*)\"|([^,]*))(?:,|$)/gi;
    let match;
    while ((match = re.exec(raw))) attrs[match[1].toUpperCase()] = (match[2] ?? match[3] ?? '').replace(/\"\"/g, '\"').trim();
    const name = attrs.NAME || attrs.LANGUAGE || `Audio ${tracks.length + 1}`;
    const language = attrs.LANGUAGE || '';
    const uri = attrs.URI ? new URL(attrs.URI, manifestUrl).href : null;
    const identity = [attrs['GROUP-ID'] || '', language.toLowerCase(), name.toLowerCase(), uri || ''].join('|');
    if (tracks.some((item) => item.identity === identity)) continue;
    tracks.push({ id: `hls-audio-${tracks.length}`, name, language, groupId: attrs['GROUP-ID'] || null, uri, isDefault: attrs.DEFAULT === 'YES', isAutoselect: attrs.AUTOSELECT === 'YES', channels: attrs.CHANNELS || null, identity });
  }
  return tracks.map(({ identity, ...track }) => track);
}

module.exports = { parseHlsAudioTracks };
