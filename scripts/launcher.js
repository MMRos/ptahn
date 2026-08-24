/**
 * Ptahn Native Server & Desktop Launcher Helper
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3001;
const URL = `http://localhost:${PORT}`;

function openBrowser(targetUrl) {
  const platform = process.platform;
  let cmd;

  if (platform === 'win32') {
    cmd = `start "" "${targetUrl}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${targetUrl}"`;
  } else {
    cmd = `xdg-open "${targetUrl}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`[Launcher] Por favor abre tu navegador en: ${targetUrl}`);
    }
  });
}

function waitForServer(targetUrl, maxRetries = 20, intervalMs = 600) {
  let retries = 0;
  const check = () => {
    http.get(targetUrl, (res) => {
      console.log(`[Launcher] Servidor listo. Abriendo interfaz en navegador...`);
      openBrowser(targetUrl);
    }).on('error', () => {
      retries++;
      if (retries < maxRetries) {
        setTimeout(check, intervalMs);
      } else {
        console.log(`[Launcher] Abriendo navegador: ${targetUrl}`);
        openBrowser(targetUrl);
      }
    });
  };
  check();
}

function launch() {
  console.log('======================================================');
  console.log('   🚀 INICIANDO PTAHN - MOTOR NATIVO IA Y APLICACIÓN');
  console.log('======================================================');

  const serverProc = spawn('node', ['server/index.js'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });

  serverProc.on('error', (err) => {
    console.error('[Launcher] Error al iniciar el servidor:', err);
  });

  waitForServer(URL);

  process.on('SIGINT', () => {
    console.log('\n[Launcher] Cerrando servidor...');
    serverProc.kill('SIGINT');
    process.exit(0);
  });
}

if (require.main === module) {
  launch();
}

module.exports = { launch, openBrowser, waitForServer };
