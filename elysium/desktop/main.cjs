// ЭЛИЗИУМ · настольная версия: окно Electron вокруг собранного файла игры (один HTML).
// Название окна и программы берётся из package.json (productName).
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// звук без первого клика: музыка играет уже на титульном экране
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// игре нужна видеокарта: не даём Chromium уйти на программную отрисовку из-за «чёрного списка» драйверов
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// настройки (громкость, пиксели, тени и т. д.) лежат в профиле программы:
// %APPDATA%\<productName> — не зависят от браузера и переживают обновления игры
const NAME = require('./package.json').productName;
app.setName(NAME);

let win = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    title: NAME,
    icon: path.join(__dirname, 'build', 'icon.png'),
    width: Math.min(1600, width), height: Math.min(900, height),
    minWidth: 800, minHeight: 500,
    fullscreen: true,              // запускаемся во весь экран; F11 — в окно и обратно
    backgroundColor: '#0b0607',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // музыка не замирает, пока окно свёрнуто на секунду
    },
  });
  win.setMenu(null);
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen', false));
  // ссылки (например, «источник» у картины) открываются в обычном браузере, а не внутри игры
  win.webContents.setWindowOpenHandler(({ url }) => { require('electron').shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

ipcMain.on('quit', () => app.quit());
ipcMain.on('toggle-fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on('is-fullscreen', e => { e.returnValue = !!(win && win.isFullScreen()); });

// одна копия игры: второй запуск просто поднимает уже открытое окно
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
