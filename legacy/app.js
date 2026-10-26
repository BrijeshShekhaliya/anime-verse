// Nexus Stream - Frontend Engine Implementation
(function () {
  let hlsInstance = null;
  let currentCatalog = [];
  let currentAnimeId = null;
  let currentEpisodeId = null;
  let currentAudioType = 'sub'; // 'sub' or 'dub'
  let currentServers = { sub: [], dub: [] };
  let currentSelectedServerId = null;
  let allEpisodes = [];

  // DOM Elements
  const seriesSelect = document.getElementById('seriesSelect');
  const videoPlayer = document.getElementById('videoPlayer');
  const playerLoader = document.getElementById('playerLoader');
  const loaderMessage = document.getElementById('loaderMessage');
  const currentEpisodeBadge = document.getElementById('currentEpisodeBadge');
  const currentEpisodeTitle = document.getElementById('currentEpisodeTitle');
  const currentSeriesTitle = document.getElementById('currentSeriesTitle');
  const statServer = document.getElementById('statServer');
  const statResolution = document.getElementById('statResolution');
  const audioTypeTabs = document.getElementById('audioTypeTabs');
  const serversList = document.getElementById('serversList');
  const episodesList = document.getElementById('episodesList');
  const episodeCountBadge = document.getElementById('episodeCountBadge');
  const episodeSearchInput = document.getElementById('episodeSearchInput');
  const consoleLogs = document.getElementById('consoleLogs');
  const toggleInspectorBtn = document.getElementById('toggleInspectorBtn');
  const inspectorDrawer = document.getElementById('inspectorDrawer');

  // Step Status Indicators
  const step1Card = document.getElementById('step1Card');
  const step2Card = document.getElementById('step2Card');
  const step3Card = document.getElementById('step3Card');
  const step4Card = document.getElementById('step4Card');
  const step1Status = document.getElementById('step1Status');
  const step2Status = document.getElementById('step2Status');
  const step3Status = document.getElementById('step3Status');
  const step4Status = document.getElementById('step4Status');

  // Utility Logger
  function logTrace(action, payload) {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${action}\n` + JSON.stringify(payload, null, 2) + '\n\n';
    consoleLogs.textContent = formatted + consoleLogs.textContent;
  }

  function resetStepCards() {
    [step1Card, step2Card, step3Card, step4Card].forEach(c => {
      c.className = 'step-card';
    });
    step1Status.textContent = 'Waiting';
    step2Status.textContent = 'Waiting';
    step3Status.textContent = 'Waiting';
    step4Status.textContent = 'Waiting';
  }

  function showLoader(msg) {
    loaderMessage.textContent = msg;
    playerLoader.classList.remove('hidden');
  }

  function hideLoader() {
    playerLoader.classList.add('hidden');
  }

  // Lifecycle Initialization
  async function init() {
    logTrace('SYSTEM_INIT', { message: 'Connecting to Meta-API Gateway...' });

    try {
      const res = await fetch('/api/v2/catalog');
      const data = await res.json();
      currentCatalog = data.data || [];

      // Populate Dropdown
      seriesSelect.innerHTML = currentCatalog.map(series => 
        `<option value="${series.id}">${series.title}</option>`
      ).join('');

      if (currentCatalog.length > 0) {
        loadAnime(currentCatalog[0].id);
      }
    } catch (err) {
      logTrace('INIT_ERROR', { error: err.message });
    }
  }

  // STEP 1: Episode Discovery (/api/v2/anime/:id/episodes)
  async function loadAnime(animeId) {
    resetStepCards();
    currentAnimeId = animeId;
    const series = currentCatalog.find(s => s.id === animeId);
    if (series) {
      currentSeriesTitle.textContent = series.title;
    }

    step1Card.classList.add('active');
    step1Status.textContent = 'Querying Gateway...';
    step1Status.className = 'step-status loading';
    showLoader('Step 1: Discovering Episodes...');

    try {
      const res = await fetch(`/api/v2/anime/${animeId}/episodes`);
      const payload = await res.json();

      step1Card.className = 'step-card success';
      step1Status.textContent = `200 OK (${payload.totalEpisodes} eps)`;
      step1Status.className = 'step-status done';
      logTrace('STEP_1_EPISODE_DISCOVERY', payload);

      allEpisodes = payload.episodes || [];
      renderEpisodes(allEpisodes);

      if (allEpisodes.length > 0) {
        selectEpisode(allEpisodes[0].id, allEpisodes[0].title, allEpisodes[0].number);
      }
    } catch (err) {
      step1Status.textContent = 'Failed';
      logTrace('STEP_1_ERROR', { error: err.message });
      hideLoader();
    }
  }

  function renderEpisodes(list) {
    episodeCountBadge.textContent = list.length;
    episodesList.innerHTML = list.map(ep => `
      <div class="episode-card ${ep.id === currentEpisodeId ? 'active' : ''}" data-id="${ep.id}" data-title="${ep.title}" data-number="${ep.number}">
        <div class="episode-thumb-wrap">
          <img src="${ep.thumbnail || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80'}" alt="${ep.title}" loading="lazy">
          <div class="episode-play-icon">▶</div>
        </div>
        <div class="episode-info">
          <span class="episode-number">EPISODE ${ep.number}</span>
          <span class="episode-title">${ep.title}</span>
          <span class="episode-duration">${ep.duration || '24m'}</span>
        </div>
      </div>
    `).join('');
  }

  // STEP 2: Server Selection (/api/v2/episode/:episodeId/servers)
  async function selectEpisode(episodeId, title, epNumber) {
    currentEpisodeId = episodeId;
    currentEpisodeBadge.textContent = `EPISODE ${epNumber}`;
    currentEpisodeTitle.textContent = title;

    // Highlight active episode card
    document.querySelectorAll('.episode-card').forEach(card => {
      card.classList.toggle('active', card.dataset.id === episodeId);
    });

    step2Card.classList.add('active');
    step2Status.textContent = 'Loading approved sources...';
    step2Status.className = 'step-status loading';
    showLoader('Step 2: Loading approved playback sources...');

    try {
      const res = await fetch(`/api/v2/episode/${episodeId}/servers`);
      const payload = await res.json();

      step2Card.className = 'step-card success';
      step2Status.textContent = '200 OK (Sources Ready)';
      step2Status.className = 'step-status done';
      logTrace('STEP_2_SERVER_SELECTION', payload);

      currentServers = {
        sub: payload.sub || [],
        dub: payload.dub || []
      };

      renderServers();
    } catch (err) {
      step2Status.textContent = 'Failed';
      logTrace('STEP_2_ERROR', { error: err.message });
      hideLoader();
    }
  }

  function renderServers() {
    const list = currentServers[currentAudioType] || [];
    if (list.length === 0) {
      serversList.innerHTML = `<span style="font-size:0.8rem;color:var(--text-muted)">No ${currentAudioType.toUpperCase()} servers available.</span>`;
      return;
    }

    serversList.innerHTML = list.map((s, idx) => `
      <button class="server-btn ${idx === 0 ? 'active' : ''}" data-server-id="${s.serverId}" data-server-name="${s.serverName}">
        <span>${s.serverName}</span>
        <span class="server-ping">${s.latency || '28ms'}</span>
      </button>
    `).join('');

    // Auto-resolve first server
    if (list.length > 0) {
      resolveSource(list[0].serverId, list[0].serverName);
    }
  }

  // STEP 3: Source Resolver (/api/v2/source/:serverId)
  async function resolveSource(serverId, serverName) {
    currentSelectedServerId = serverId;
    statServer.textContent = serverName;

    // Highlight active server button
    document.querySelectorAll('.server-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.serverId === serverId);
    });

    step3Card.classList.add('active');
    step3Status.textContent = 'Resolving Source Link...';
    step3Status.className = 'step-status loading';
    showLoader(`Step 3: Resolving stream via ${serverName}...`);

    try {
      const res = await fetch(`/api/v2/source/${serverId}`);
      const payload = await res.json();

      step3Card.className = 'step-card success';
      step3Status.textContent = '200 OK (Source approved)';
      step3Status.className = 'step-status done';
      logTrace('STEP_3_SOURCE_RESOLVER', payload);

      // STEP 4: HLS Stream Delivery Handshake
      loadHlsStream(payload.link, payload.tracks || []);
    } catch (err) {
      step3Status.textContent = 'Failed';
      logTrace('STEP_3_ERROR', { error: err.message });
      hideLoader();
    }
  }

  // STEP 4: HLS Stream Delivery via Hls.js
  function loadHlsStream(streamUrl, tracks) {
    step4Card.classList.add('active');
    step4Status.textContent = 'Negotiating HLS Manifest...';
    step4Status.className = 'step-status loading';

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    // Remove any previous subtitle tracks
    while (videoPlayer.getElementsByTagName('track').length > 0) {
      videoPlayer.getElementsByTagName('track')[0].remove();
    }

    // Add VTT subtitle tracks if available
    if (tracks && tracks.length > 0) {
      tracks.forEach(tr => {
        const trackEl = document.createElement('track');
        trackEl.kind = tr.kind || 'subtitles';
        trackEl.label = tr.label || 'English';
        trackEl.srclang = 'en';
        trackEl.src = tr.file;
        if (tr.default) trackEl.default = true;
        videoPlayer.appendChild(trackEl);
      });
    }

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(videoPlayer);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        hideLoader();
        step4Card.className = 'step-card success';
        step4Status.textContent = `Streaming (${data.levels.length} Bitrates)`;
        step4Status.className = 'step-status done';

        logTrace('STEP_4_HLS_MANIFEST_PARSED', {
          levelsFound: data.levels.map(l => `${l.height}p @ ${(l.bitrate / 1000).toFixed(0)}kbps`),
          codecs: data.levels[0]?.videoCodec || 'h.264'
        });

        const activeLevel = data.levels[data.firstLevel];
        if (activeLevel) {
          statResolution.textContent = `${activeLevel.height}p (Auto)`;
        }

        // Auto-play (muted if browser requires user gesture)
        videoPlayer.play().catch(() => {
          videoPlayer.muted = true;
          videoPlayer.play();
        });
      });

      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hlsInstance.levels[data.level];
        if (level) {
          statResolution.textContent = `${level.height}p`;
        }
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          step4Status.textContent = `HLS Fatal: ${data.type}`;
          step4Status.className = 'step-status loading';
          logTrace('STEP_4_HLS_ERROR', { fatal: true, type: data.type, details: data.details });
          hideLoader();
        }
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari fallback
      videoPlayer.src = streamUrl;
      videoPlayer.addEventListener('loadedmetadata', () => {
        hideLoader();
        step4Card.className = 'step-card success';
        step4Status.textContent = 'Native HLS Ready';
        step4Status.className = 'step-status done';
        videoPlayer.play();
      });
    } else {
      hideLoader();
      step4Status.textContent = 'HLS Not Supported in this browser';
      alert('Your browser does not support HLS streaming.');
    }
  }

  // Event Listeners
  seriesSelect.addEventListener('change', (e) => {
    loadAnime(e.target.value);
  });

  audioTypeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('#audioTypeTabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAudioType = btn.dataset.type;
    renderServers();
  });

  serversList.addEventListener('click', (e) => {
    const btn = e.target.closest('.server-btn');
    if (!btn) return;
    resolveSource(btn.dataset.serverId, btn.dataset.serverName);
  });

  episodesList.addEventListener('click', (e) => {
    const card = e.target.closest('.episode-card');
    if (!card) return;
    selectEpisode(card.dataset.id, card.dataset.title, card.dataset.number);
  });

  episodeSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allEpisodes.filter(ep => 
      ep.title.toLowerCase().includes(q) || ep.number.toString().includes(q)
    );
    renderEpisodes(filtered);
  });

  toggleInspectorBtn.addEventListener('click', () => {
    inspectorDrawer.style.display = inspectorDrawer.style.display === 'none' ? 'flex' : 'none';
  });

  // Start app
  init();
})();
