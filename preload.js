// Preload script for AnimeVerse desktop
// Sandboxed, safe bridge between desktop runtime and renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  setFullScreen: (on) => ipcRenderer.send('desktop:set-fullscreen', !!on),
  isDesktop: true,
});

window.addEventListener('DOMContentLoaded', () => {
  // Desktop shell marker
  window.__isDesktopApp = true;
});
