const {
  estimateModelMemory,
  calculateHardwareFit,
  getSystemHardwareSpecs,
  getCuratedModelsCatalog
} = require('../engine/hardwareAdvisor');

describe('HardwareAdvisor & Model Compatibility Engine', () => {
  describe('estimateModelMemory', () => {
    test('accurately estimates memory for 7B Q4 model (~5.5GB)', () => {
      const mem = estimateModelMemory({ parameterSizeB: 7, quantization: 'Q4_K_M', type: 'llm' });
      expect(mem.estimatedVramGb).toBeGreaterThanOrEqual(4.5);
      expect(mem.estimatedVramGb).toBeLessThanOrEqual(6.5);
    });

    test('accurately estimates memory for 12B Q4 model (~7.5GB)', () => {
      const mem = estimateModelMemory({ parameterSizeB: 12, quantization: 'Q4_K_M', type: 'llm' });
      expect(mem.estimatedVramGb).toBeGreaterThanOrEqual(6.8);
      expect(mem.estimatedVramGb).toBeLessThanOrEqual(8.5);
    });

    test('accurately estimates memory for SDXL / Pony Diffusion (~7.0GB)', () => {
      const mem = estimateModelMemory({ type: 'diffusion', subType: 'checkpoint' });
      expect(mem.estimatedVramGb).toBeGreaterThanOrEqual(6.0);
      expect(mem.estimatedVramGb).toBeLessThanOrEqual(8.5);
    });
  });

  describe('calculateHardwareFit', () => {
    const mockHardware = {
      vramGb: 12,
      ramGb: 32,
      gpuName: 'NVIDIA RTX 4070'
    };

    test('marks 12B Q4 model as optimal for 12GB VRAM', () => {
      const model = { parameterSizeB: 12, quantization: 'Q4_K_M', type: 'llm' };
      const fit = calculateHardwareFit(model, mockHardware);

      expect(fit.status).toBe('optimal');
      expect(fit.badgeText).toContain('Óptimo');
      expect(fit.fitPercent).toBeGreaterThanOrEqual(90);
    });

    test('marks 31B Q3 model as partial (VRAM + RAM offload) for 12GB VRAM', () => {
      const model = { parameterSizeB: 31, quantization: 'Q3_K_S', type: 'llm' };
      const fit = calculateHardwareFit(model, mockHardware);

      expect(['partial', 'heavy']).toContain(fit.status);
      expect(fit.badgeText).toBeDefined();
    });

    test('marks 70B model as incompatible if system memory is insufficient', () => {
      const smallHardware = { vramGb: 6, ramGb: 16 };
      const model = { parameterSizeB: 70, quantization: 'Q8_0', type: 'llm' };
      const fit = calculateHardwareFit(model, smallHardware);

      expect(fit.status).toBe('incompatible');
    });
  });

  describe('getCuratedModelsCatalog', () => {
    test('returns curated catalog of recommended models with direct Hugging Face links', () => {
      const catalog = getCuratedModelsCatalog({ vramGb: 16, ramGb: 32 });
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(3);

      const mistralNemo = catalog.find(m => m.id.includes('mistral-nemo'));
      expect(mistralNemo).toBeDefined();
      expect(mistralNemo.category).toBe('slm');
      expect(mistralNemo.downloadUrl).toBeDefined();
      expect(mistralNemo.downloadUrl).toMatch(/^https:\/\/huggingface\.co\//);
      expect(mistralNemo.hardwareFit).toBeDefined();
    });
  });
});
