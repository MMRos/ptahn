const path = require('path');
const fs = require('fs');
const { scanModelsDirectory, scanDiffusionModels, scanLlmModels, formatBytes } = require('../engine/modelScanner');

describe('ModelScanner Engine Module', () => {
  const testModelsDir = path.join(__dirname, 'temp_models');

  beforeAll(() => {
    if (!fs.existsSync(testModelsDir)) {
      fs.mkdirSync(testModelsDir, { recursive: true });
    }
    // Create mock LLM and Diffusion model files
    fs.writeFileSync(path.join(testModelsDir, 'Magnum-v4-12B.Q4_K_M.gguf'), Buffer.alloc(1024 * 100)); // 100KB LLM
    fs.writeFileSync(path.join(testModelsDir, 'Mistral-Nemo.gguf'), Buffer.alloc(1024 * 50)); // 50KB LLM
    fs.writeFileSync(path.join(testModelsDir, 'DreamShaperXL_Lightning.safetensors'), Buffer.alloc(1024 * 80)); // 80KB Diffusion
    fs.writeFileSync(path.join(testModelsDir, 'v6_anime.safetensors'), Buffer.alloc(1024 * 70)); // 70KB Diffusion
    fs.writeFileSync(path.join(testModelsDir, 'readme.txt'), 'Not a model file');
  });

  afterAll(() => {
    if (fs.existsSync(testModelsDir)) {
      fs.rmSync(testModelsDir, { recursive: true, force: true });
    }
  });

  test('scanModelsDirectory finds both .gguf and .safetensors files', () => {
    const models = scanModelsDirectory(testModelsDir);
    expect(models.length).toBe(4);
    expect(models.some(m => m.filename === 'DreamShaperXL_Lightning.safetensors' && m.type === 'diffusion')).toBe(true);
    expect(models.some(m => m.filename === 'Magnum-v4-12B.Q4_K_M.gguf' && m.type === 'llm')).toBe(true);
    expect(models.some(m => m.filename === 'readme.txt')).toBe(false);
  });

  test('scanDiffusionModels filters only image generation models', () => {
    const diffModels = scanDiffusionModels(testModelsDir);
    expect(diffModels.length).toBe(2);
    expect(diffModels.every(m => m.type === 'diffusion')).toBe(true);
  });

  test('scanLlmModels filters only language models', () => {
    const llmModels = scanLlmModels(testModelsDir);
    expect(llmModels.length).toBe(2);
    expect(llmModels.every(m => m.type === 'llm')).toBe(true);
  });

  test('formatBytes correctly formats various byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1024 * 1024 * 100)).toBe('100.00 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 4.5)).toBe('4.50 GB');
  });
});
