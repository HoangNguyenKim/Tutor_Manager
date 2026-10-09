import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_HOST = process.env['BACKEND_HOST'] ?? '127.0.0.1';
const BACKEND_PORT = Number(process.env['BACKEND_PORT'] ?? '3001');
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const VITE_DEV_URL = process.env['VITE_DEV_URL'] ?? 'http://127.0.0.1:5173';
const START_BACKEND = process.env['START_BACKEND'] !== '0';
const BACKEND_WAIT_MS = Number(process.env['BACKEND_WAIT_MS'] ?? '30000');
// Install token: generated per launch, held in memory only, never written to disk.
// Renderer receives it via the sender-validated IPC bridge (ADR-0002).
const LOCAL_TOKEN = process.env['LOCAL_TOKEN'] ?? randomBytes(32).toString('hex');

let mainWindow: BrowserWindow | undefined;
let backend: ChildProcess | undefined;
let quitting = false;

function backendEntry(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  return path.join(__dirname, '..', '..', 'backend', 'dist', 'main.js');
}

function frontendDistDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'frontend', 'dist');
  return path.join(__dirname, '..', '..', 'frontend', 'dist');
}

function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol === 'file:') {
    try {
      return fileURLToPath(raw).startsWith(frontendDistDir());
    } catch {
      return false;
    }
  }
  if (app.isPackaged) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  try {
    return url.host === new URL(VITE_DEV_URL).host;
  } catch {
    return false;
  }
}

function assertTrustedSender(frame: { url: string } | null): void {
  if (!frame || !isAllowedUrl(frame.url)) throw new Error('untrusted IPC sender');
}

async function waitForBackend(timeoutMs: number): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // retry until timeout
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`backend not ready at ${BACKEND_URL} after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

function startBackend(): void {
  const entry = backendEntry();
  if (!fs.existsSync(entry)) {
    throw new Error(`backend entry not found: ${entry} (run pnpm build first)`);
  }
  // SQLite lives in the OS user-data dir — never inside the install dir.
  const dataDir = app.getPath('userData');
  backend = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: BACKEND_HOST,
      PORT: String(BACKEND_PORT),
      DATA_DIR: dataDir,
      LOCAL_TOKEN,
    },
    stdio: app.isPackaged ? 'ignore' : 'inherit',
    windowsHide: true,
  });
  backend.on('exit', (code) => {
    backend = undefined;
    if (!quitting && code !== 0 && mainWindow) {
      void handleBackendFailure(new Error(`backend exited with code ${String(code)}`));
    }
  });
}

function stopBackend(): void {
  quitting = true;
  backend?.kill();
  backend = undefined;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loadingPage(): string {
  const html = '<title>Tutor Manager</title><body style="font-family:system-ui;padding:40px"><h1>Tutor Manager</h1><p>Starting local backend...</p></body>';
  return `data:text/html,${encodeURIComponent(html)}`;
}

function errorPage(message: string): string {
  const html = `<title>Backend error</title><body style="font-family:system-ui;padding:40px"><h1>Backend failed to start</h1><p>${escapeHtml(message)}</p><p>Run pnpm build once, then relaunch.</p></body>`;
  return `data:text/html,${encodeURIComponent(html)}`;
}

async function handleBackendFailure(err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[desktop] backend failure:', message);
  stopBackend();
  const win = mainWindow;
  if (!win) {
    dialog.showErrorBox('Local backend failed to start', message);
    app.quit();
    return;
  }
  await win.loadURL(errorPage(message));
  const { response } = await dialog.showMessageBox(win, {
    type: 'error',
    buttons: ['Retry', 'Quit'],
    defaultId: 1,
    message: 'Local backend failed to start',
    detail: `${message}. No data was loaded.`,
  });
  if (response === 0) {
    app.relaunch();
    app.exit(0);
  } else {
    app.quit();
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      if (url.startsWith('https:')) void shell.openExternal(url);
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = undefined;
  });
  return win;
}

async function loadApp(): Promise<void> {
  if (!mainWindow) return;
  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(frontendDistDir(), 'index.html'));
    return;
  }
  try {
    const res = await fetch(VITE_DEV_URL, { method: 'HEAD' });
    if (res.ok || res.status < 500) {
      await mainWindow.loadURL(VITE_DEV_URL);
      return;
    }
  } catch {
    // dev server not running — fall through to built assets
  }
  await mainWindow.loadFile(path.join(frontendDistDir(), 'index.html'));
}

function registerIpc(): void {
  ipcMain.handle('tutor-manager:get-backend-url', (event) => {
    assertTrustedSender(event.senderFrame);
    return BACKEND_URL;
  });
  ipcMain.handle('tutor-manager:get-version', (event) => {
    assertTrustedSender(event.senderFrame);
    return app.getVersion();
  });
  ipcMain.handle('tutor-manager:get-auth-token', (event) => {
    assertTrustedSender(event.senderFrame);
    return LOCAL_TOKEN;
  });
  ipcMain.handle('tutor-manager:ping', async (event) => {
    assertTrustedSender(event.senderFrame);
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(async () => {
    registerIpc();
    mainWindow = createWindow();
    await mainWindow.loadURL(loadingPage());
    mainWindow.show();
    if (START_BACKEND) {
      try {
        startBackend();
        await waitForBackend(BACKEND_WAIT_MS);
      } catch (err) {
        await handleBackendFailure(err);
        return;
      }
    }
    try {
      await loadApp();
    } catch (err) {
      await handleBackendFailure(err);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === undefined) {
      mainWindow = createWindow();
      void loadApp();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', stopBackend);
}
