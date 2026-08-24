const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { MODELS_DIR, DATA_DIR } = require('../config');
const { scanDiffusionModels } = require('./modelScanner');

class DiffusionEngine {
  constructor() {
    this.imagesDir = path.join(DATA_DIR, 'generated_images');
    this.activeModel = null;
    this.isGenerating = false;
    this.pythonPath = null;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  /**
   * Discovers available Python runtime with torch/diffusers
   */
  findPythonExecutable() {
    if (this.pythonPath && fs.existsSync(this.pythonPath)) {
      return this.pythonPath;
    }
    const localVenvWindows = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
    const localVenvUnix = path.join(__dirname, '..', '..', '.venv', 'bin', 'python');
    const candidates = [
      localVenvWindows,
      localVenvUnix,
      'python',
      'py'
    ];
    for (const cand of candidates) {
      try {
        if (path.isAbsolute(cand) && fs.existsSync(cand)) {
          this.pythonPath = cand;
          return cand;
        }
      } catch (e) {}
    }
    this.pythonPath = 'python';
    return 'python';
  }

  /**
   * Retrieves available diffusion models in ./models/
   */
  getAvailableModels() {
    return scanDiffusionModels(MODELS_DIR);
  }

  /**
   * Returns current status of the diffusion engine
   */
  getStatus() {
    const models = this.getAvailableModels();
    const defaultModel = models.find(m => m.subType === 'checkpoint') || models[0];
    return {
      ready: true,
      isGenerating: this.isGenerating,
      activeModel: this.activeModel || (defaultModel?.filename || null),
      availableModelsCount: models.length,
      models: models.map(m => ({ id: m.id, name: m.filename, size: m.formattedSize, type: m.subType || 'diffusion' })),
      pythonRuntime: this.findPythonExecutable(),
      storageDir: this.imagesDir
    };
  }

  /**
   * Generates a raw fallback 1x1 PNG for test suites (transparent)
   */
  createMinimalPngBuffer(width = 512, height = 768) {
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
  }

  /**
   * Executes the standalone native Python diffusion worker subprocess
   */
  async runNativeWorker(prompt, options = {}) {
    const {
      width = 512,
      height = 768,
      steps = 20,
      cfgScale = 7.0,
      seed = -1,
      modelPath,
      outputPath,
      negativePrompt = 'blurry, low quality, deformed, distorted, text, watermark, bad anatomy'
    } = options;

    const pythonExe = this.findPythonExecutable();
    const workerScript = path.join(__dirname, 'nativeDiffusionWorker.py');

    const args = [
      '-u',
      workerScript,
      '--prompt', prompt,
      '--negative_prompt', negativePrompt,
      '--model_path', modelPath,
      '--output_path', outputPath,
      '--width', String(width),
      '--height', String(height),
      '--steps', String(steps),
      '--cfg_scale', String(cfgScale),
      '--seed', String(seed)
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(pythonExe, args, {
        cwd: __dirname,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn Python diffusion worker: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            if (parsed.error) return reject(new Error(parsed.error));
          } catch (e) {}
          return reject(new Error(`Diffusion worker exited with code ${code}. ${stderrData || stdoutData || ''}`));
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (jsonErr) {
          reject(new Error(`Failed to parse worker output: ${stdoutData}`));
        }
      });
    });
  }

  /**
   * Generates an image natively given prompt and generation options
   * @param {string} prompt
   * @param {object} options
   * @returns {Promise<{success: boolean, url: string, base64: string, filename: string, model: string}>}
   */
  async generateImage(prompt, options = {}) {
    this.ensureDirectories();
    const {
      width = 512,
      height = 768,
      steps = 20,
      cfgScale = 7.0,
      seed = Math.floor(Math.random() * 1000000),
      model = null,
      negativePrompt = 'blurry, low quality, deformed, distorted, text, watermark, bad anatomy',
      _mockForTest = false
    } = options;

    this.isGenerating = true;
    const filename = `ptahn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
    const outputPath = path.join(this.imagesDir, filename);

    try {
      const models = this.getAvailableModels();
      if (!models || models.length === 0) {
        throw new Error('No se encontraron modelos de difusión (.safetensors / .gguf) en ./models/. Coloca un modelo en ./models/ para generar imágenes.');
      }

      // Prioritize selected checkpoint or find best checkpoint file in models
      let targetModelObj = models.find(m => m.filename === model || m.id === model);
      if (!targetModelObj) {
        // Find largest .safetensors (likely base model e.g. v6 or malaAnimeMix)
        targetModelObj = models.slice().sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))[0];
      }

      const modelPath = path.isAbsolute(targetModelObj.filename)
        ? targetModelObj.filename
        : path.join(MODELS_DIR, targetModelObj.filename);

      let generatedBase64 = null;

      // 1. Explicit mock for test suites if requested via _mockForTest
      if (_mockForTest) {
        const imageBuffer = this.createMinimalPngBuffer(width, height);
        fs.writeFileSync(outputPath, imageBuffer);
        generatedBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      } else {
        // 2. Primary: Execute Native Subprocess Worker via GPU PyTorch + Diffusers
        try {
          const workerRes = await this.runNativeWorker(prompt, {
            width,
            height,
            steps,
            cfgScale,
            seed,
            modelPath,
            outputPath,
            negativePrompt
          });
          if (workerRes && workerRes.success && workerRes.base64) {
            generatedBase64 = workerRes.base64;
          }
        } catch (workerErr) {
          console.warn('[Native Diffusion Worker Error]:', workerErr.message);
          
          // 3. Fallback: probe local bridge if running
          const localBridgeUrls = ['http://127.0.0.1:42016', 'http://127.0.0.1:7860', 'http://127.0.0.1:8188'];
          for (const bridgeUrl of localBridgeUrls) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1200);
              const testRes = await fetch(`${bridgeUrl}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt,
                  negative_prompt: negativePrompt,
                  steps,
                  width,
                  height,
                  seed
                }),
                signal: controller.signal
              }).catch(() => null);
              clearTimeout(timeoutId);

              if (testRes && testRes.ok) {
                const data = await testRes.json();
                if (data.images && data.images[0]) {
                  generatedBase64 = data.images[0].startsWith('data:') 
                    ? data.images[0] 
                    : `data:image/png;base64,${data.images[0]}`;
                  const pureB64 = data.images[0].replace(/^data:image\/[a-z]+;base64,/, '');
                  fs.writeFileSync(outputPath, Buffer.from(pureB64, 'base64'));
                  break;
                }
              }
            } catch (bridgeErr) {}
          }

          if (!generatedBase64) {
            throw workerErr;
          }
        }
      }

      this.activeModel = targetModelObj.filename;
      return {
        success: true,
        url: `/api/images/files/${filename}`,
        base64: generatedBase64,
        filename,
        outputPath,
        model: targetModelObj.filename
      };
    } finally {
      this.isGenerating = false;
    }
  }
}

const diffusionEngine = new DiffusionEngine();

module.exports = {
  DiffusionEngine,
  diffusionEngine
};
