const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.join(__dirname, '..', '..');
const backendEntry = path.join(root, 'apps', 'backend', 'dist', 'main.js');
const frontendIndex = path.join(root, 'apps', 'frontend', 'dist', 'index.html');
const mainJs = path.join(__dirname, 'electron-dist', 'main.js');
const preloadJs = path.join(__dirname, 'electron-dist', 'preload.js');
const mainSrc = fs.readFileSync(path.join(__dirname, 'src', 'main.ts'), 'utf8');

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  if (!cond) failures += 1;
}

check('backend dist exists', fs.existsSync(backendEntry));
check('frontend dist exists', fs.existsSync(frontendIndex));
check('desktop main.js exists', fs.existsSync(mainJs));
check('desktop preload.js exists', fs.existsSync(preloadJs));
check('contextIsolation true', mainSrc.includes('contextIsolation: true'));
check('sandbox true', mainSrc.includes('sandbox: true'));
check('nodeIntegration false', mainSrc.includes('nodeIntegration: false'));
check('single instance lock', mainSrc.includes('requestSingleInstanceLock'));
check('nav guard', mainSrc.includes('will-navigate'));
check('window open denied', mainSrc.includes('setWindowOpenHandler'));
check('backend readiness wait', mainSrc.includes('waitForBackend'));
check('backend failure path', mainSrc.includes('handleBackendFailure'));
check('clean shutdown', mainSrc.includes('before-quit') && mainSrc.includes('stopBackend'));
check('production frontend path', mainSrc.includes('resourcesPath') && mainSrc.includes('loadFile'));
check('IPC sender validation', mainSrc.includes('assertTrustedSender'));

const child = spawn(process.execPath, [backendEntry], { stdio: 'ignore', windowsHide: true });
setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/health');
    check('backend health 200', res.ok);
    child.kill();
    process.exit(failures === 0 ? 0 : 1);
  } catch (e) {
    check(`backend health reachable (${e.message})`, false);
    child.kill();
    process.exit(1);
  }
}, 6000);
