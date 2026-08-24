/**
 * Unified Development Runner for Ptahn
 * Runs both Express Backend (Port 3001) and React Frontend (Port 3000)
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('======================================================');
console.log('   👑 PTAHN FULL-STACK DEV RUNNER (Frontend + Backend)');
console.log('======================================================\n');

// 1. Start Server on port 3001
const serverProc = spawn('node', ['server/index.js'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true
});

// 2. Start React App on port 3000
const clientProc = spawn('npx', ['react-scripts', 'start'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: '3000',
    BROWSER: process.env.BROWSER || 'true'
  }
});

function cleanup() {
  console.log('\n[DevRunner] Deteniendo frontend y backend...');
  try { serverProc.kill('SIGINT'); } catch (e) {}
  try { clientProc.kill('SIGINT'); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
serverProc.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[DevRunner] Servidor terminó con código ${code}`);
  }
});
clientProc.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[DevRunner] Cliente terminó con código ${code}`);
  }
});
