const fs = require('fs');
const path = require('path');

/**
 * Format raw byte count into human-readable representation
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(2)} ${units[i]}`;
}

const DIFFUSION_EXTENSIONS = ['.safetensors', '.ckpt', '.onnx', '.bin'];
const LLM_EXTENSIONS = ['.gguf'];

/**
 * Detect model category based on file extension and naming
 */
function detectModelType(filename) {
  const lower = filename.toLowerCase();
  if (DIFFUSION_EXTENSIONS.some(ext => lower.endsWith(ext))) {
    return 'diffusion';
  }
  if (LLM_EXTENSIONS.some(ext => lower.endsWith(ext))) {
    return 'llm';
  }
  return 'other';
}

/**
 * Scans a folder for all AI model files (.gguf, .safetensors, .onnx, etc.)
 * @param {string} directoryPath
 * @returns {Array<{id: string, filename: string, fullPath: string, sizeBytes: number, formattedSize: string, type: 'llm'|'diffusion'|'other'}>}
 */
function scanModelsDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  try {
    const files = fs.readdirSync(directoryPath);
    return files
      .filter(file => {
        const lower = file.toLowerCase();
        return LLM_EXTENSIONS.some(ext => lower.endsWith(ext)) || DIFFUSION_EXTENSIONS.some(ext => lower.endsWith(ext));
      })
      .map(file => {
        const fullPath = path.join(directoryPath, file);
        const stats = fs.statSync(fullPath);
        const modelType = detectModelType(file);
        let subType = modelType;
        if (modelType === 'diffusion') {
          // Base checkpoints (SD1.5, SDXL, Flux) are typically >= 1.5GB
          subType = stats.size >= 1.5 * 1024 * 1024 * 1024 ? 'checkpoint' : 'lora';
        }

        return {
          id: file,
          filename: file,
          fullPath,
          sizeBytes: stats.size,
          formattedSize: formatBytes(stats.size),
          type: modelType,
          subType
        };
      });
  } catch (error) {
    console.warn('[ModelScanner]: Error scanning models directory:', error);
    return [];
  }
}

/**
 * Scans exclusively for diffusion models (.safetensors, .onnx, etc.)
 * Checkpoint base models (>= 1.5GB) are placed first before LoRAs
 */
function scanDiffusionModels(directoryPath) {
  const models = scanModelsDirectory(directoryPath).filter(m => m.type === 'diffusion');
  return models.sort((a, b) => {
    if (a.subType === 'checkpoint' && b.subType !== 'checkpoint') return -1;
    if (b.subType === 'checkpoint' && a.subType !== 'checkpoint') return 1;
    return b.sizeBytes - a.sizeBytes;
  });
}

/**
 * Scans exclusively for LLM models (.gguf)
 */
function scanLlmModels(directoryPath) {
  return scanModelsDirectory(directoryPath).filter(m => m.type === 'llm');
}

module.exports = {
  scanModelsDirectory,
  scanDiffusionModels,
  scanLlmModels,
  detectModelType,
  formatBytes
};
