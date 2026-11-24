// Мостик между игрой и окном: игра видит window.desktop только в настольной версии.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('quit'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.sendSync('is-fullscreen'),
  onFullscreen: cb => ipcRenderer.on('fullscreen', (_, v) => cb(v)),
});
