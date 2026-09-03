const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { DATA_DIR } = require('../config');

class VisionEngine {
  constructor() {
    this.pythonPath = null;
    this.workerPath = path.join(__dirname, 'nativeVisionWorker.py');
  }

  findPythonExecutable() {
    if (this.pythonPath && fs.existsSync(this.pythonPath)) {
      return this.pythonPath;
    }
    const localVenvWindows = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(localVenvWindows)) {
      this.pythonPath = localVenvWindows;
      return localVenvWindows;
    }
    return 'python';
  }

  resolveLocalImagePath(imageUrl) {
    if (!imageUrl) return null;
    // Si ya es una ruta absoluta en disco
    if (path.isAbsolute(imageUrl) && fs.existsSync(imageUrl)) {
      return imageUrl;
    }

    // Si es una URL interna tipo /api/storage/images/nombre.jpg
    if (typeof imageUrl === 'string' && imageUrl.includes('/api/storage/images/')) {
      const filename = imageUrl.split('/api/storage/images/').pop().split('?')[0];
      const targetDisk = path.join(DATA_DIR, 'images', filename);
      if (fs.existsSync(targetDisk)) {
        return targetDisk;
      }
    }

    // Si está en ptah-data/images directamente
    const cand = path.join(DATA_DIR, 'images', path.basename(imageUrl));
    if (fs.existsSync(cand)) {
      return cand;
    }

    return null;
  }

  async classifyImage({ imageUrl = '', imageBase64 = '', entityTitle = '' }) {
    const python = this.findPythonExecutable();
    const diskPath = this.resolveLocalImagePath(imageUrl);

    const args = [this.workerPath];
    if (diskPath) {
      args.push('--image_path', diskPath);
    } else if (imageUrl && imageUrl.startsWith('data:image/')) {
      args.push('--image_base64', imageUrl);
    } else if (imageBase64) {
      args.push('--image_base64', imageBase64);
    } else {
      throw new Error('No valid local image path or base64 provided for vision classification');
    }

    if (entityTitle) {
      args.push('--entity_title', entityTitle);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(python, args, {
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', chunk => stdout += chunk.toString('utf-8'));
      proc.stderr.on('data', chunk => stderr += chunk.toString('utf-8'));

      proc.on('close', code => {
        // Encontrar la línea JSON en la salida
        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
        let result = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            if (lines[i].startsWith('{') && lines[i].endsWith('}')) {
              result = JSON.parse(lines[i]);
              break;
            }
          } catch (e) {}
        }

        if (result && result.success) {
          resolve(result);
        } else {
          const errDetail = result?.error || stderr || stdout || `Worker exited with code ${code}`;
          reject(new Error(`Visual classification failed: ${errDetail}`));
        }
      });

      proc.on('error', err => reject(err));
    });
  }
}

const visionEngine = new VisionEngine();
module.exports = { VisionEngine, visionEngine };
