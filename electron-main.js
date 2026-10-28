// Electron Main Process for AnimeVerse Desktop Proof-of-Concept
// Connects to / starts the local Express server and intercepts VidRift's 1x1 test window.

const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

// 1. Probe if Express server is already running to avoid port collisions
function isServerRunning(port = PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/status`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 2. Wait until server responds with 200 OK
async function waitForServer(port = PORT, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const running = await isServerRunning(port);
    if (running) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function startServerIfNeeded() {
  const alreadyRunning = await isServerRunning(PORT);
  if (alreadyRunning) {
    console.log(`[Electron] Connected to existing Express server on port ${PORT}`);
    return;
  }

  console.log(`[Electron] Starting Express server as child process on port ${PORT}...`);
  serverProcess = fork(path.join(__dirname, 'server.js'), [], {
    env: { ...process.env, PORT: String(PORT) },
    silent: false,
  });

  const ready = await waitForServer(PORT);
  if (!ready) {
    console.error('[Electron] Failed to connect to Express server in time.');
  } else {
    console.log(`[Electron] Express server ready on port ${PORT}`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    title: 'AnimeVerse',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  const wc = mainWindow.webContents;

  // 3. Register setWindowOpenHandler before loading the app with full diagnostic telemetry
  wc.setWindowOpenHandler((details) => {
    const features = details.features || '';
    const url = details.url || '';
    const frameName = details.frameName || '';
    const disposition = details.disposition || '';

    console.log('[DIAGNOSTIC:window-open] Request received:', {
      url,
      features,
      frameName,
      disposition,
      referrer: details.referrer || null,
      webContentsId: wc.id,
    });

    // Detect VidRift's off-screen 1x1 capability probe window
    const isVidriftProbe = (
      features.includes('width=1') &&
      (features.includes('left=-9999') || features.includes('height=1'))
    );

    if (isVidriftProbe) {
      console.log('[DIAGNOSTIC:window-open] MATCHED VidRift 1x1 probe. Action: ALLOW with hidden options.');
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          show: false,
          width: 1,
          height: 1,
          x: -9999,
          y: -9999,
          frame: false,
          transparent: true,
          opacity: 0,
          skipTaskbar: true,
          hasShadow: false,
          focusable: false,
          backgroundColor: '#00000000',
        },
      };
    }

    // Normal external HTTP/HTTPS links open in the system default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('[DIAGNOSTIC:window-open] Routing external link to system browser:', url);
      shell.openExternal(url);
    } else {
      console.log('[DIAGNOSTIC:window-open] DENIED unsolicited window request:', { url, features });
    }

    // Deny all other unsolicited popup windows
    return { action: 'deny' };
  });

  // 4. Comprehensive telemetry on child-window lifecycle
  wc.on('did-create-window', (childWindow, details) => {
    const initVisible = childWindow.isVisible();
    const initFocused = childWindow.isFocused();
    const initBounds = childWindow.getBounds();

    console.log('[DIAGNOSTIC:child-window] did-create-window fired:', {
      initVisible,
      initFocused,
      initBounds,
      features: details.features || '',
      url: details.url || '',
    });

    try {
      childWindow.webContents.setAudioMuted(true);
      childWindow.webContents.stop();

      childWindow.on('show', () => {
        console.warn('[DIAGNOSTIC:child-window] UNEXPECTED: show event fired! Bounds:', childWindow.getBounds());
      });

      childWindow.on('ready-to-show', () => {
        console.log('[DIAGNOSTIC:child-window] ready-to-show event fired');
      });

      childWindow.on('focus', () => {
        console.warn('[DIAGNOSTIC:child-window] UNEXPECTED: focus event fired!');
      });

      childWindow.on('blur', () => {
        console.log('[DIAGNOSTIC:child-window] blur event fired');
      });

      childWindow.on('hide', () => {
        console.log('[DIAGNOSTIC:child-window] hide event fired');
      });

      childWindow.on('close', () => {
        console.log('[DIAGNOSTIC:child-window] close event fired by opener');
      });

      // 5s fallback safety destroy in case opener close fails
      const safetyTimer = setTimeout(() => {
        if (!childWindow.isDestroyed()) {
          console.log('[DIAGNOSTIC:child-window] Safety timer: destroying orphaned child window');
          childWindow.destroy();
        }
      }, 5000);

      childWindow.once('closed', () => {
        clearTimeout(safetyTimer);
        console.log('[DIAGNOSTIC:child-window] childWindow closed event confirmed');
      });
    } catch (err) {
      console.warn('[DIAGNOSTIC:child-window] Error in lifecycle telemetry:', err);
    }
  });

  // 5. HTML5 Fullscreen synchronization
  wc.on('enter-html-full-screen', () => {
    console.log('[DIAGNOSTIC:fullscreen] enter-html-full-screen event. Synchronizing mainWindow.setFullScreen(true)');
    mainWindow.setFullScreen(true);
  });

  wc.on('leave-html-full-screen', () => {
    console.log('[DIAGNOSTIC:fullscreen] leave-html-full-screen event. Synchronizing mainWindow.setFullScreen(false)');
    mainWindow.setFullScreen(false);
  });

  // Desktop IPC fullscreen control (enables parent playerBox fullscreen with overlays intact)
  ipcMain.on('desktop:set-fullscreen', (event, on) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('[Electron] IPC desktop:set-fullscreen received:', on);
      mainWindow.setFullScreen(!!on);
    }
  });

  // Load the running application
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 6. Application lifecycle management
app.whenReady().then(async () => {
  await startServerIfNeeded();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    console.log('[Electron] Terminating Express child process...');
    serverProcess.kill('SIGTERM');
  }
});
