const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const https = require('https');
const { scanModelsDirectory, scanLlmModels, scanDiffusionModels } = require('../engine/modelScanner');
const { llamaEngine } = require('../engine/llamaEngine');
const { MODELS_DIR } = require('../config');
const {
  getSystemHardwareSpecs,
  calculateHardwareFit,
  getCuratedModelsCatalog
} = require('../engine/hardwareAdvisor');
const {
  startModelDownload,
  getDownloadTasks,
  cancelDownloadTask
} = require('../engine/modelDownloader');

// GET /api/models - List all available models and hardware status
router.get('/', (req, res) => {
  try {
    const allModels = scanModelsDirectory(MODELS_DIR);
    const engineStatus = llamaEngine.getStatus();
    const hardware = getSystemHardwareSpecs();

    const enrichedModels = allModels.map(m => ({
      ...m,
      hardwareFit: calculateHardwareFit(m, hardware)
    }));

    res.json({
      success: true,
      models: enrichedModels,
      activeModel: engineStatus.activeModel,
      engine: engineStatus,
      hardware
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Query live models from Hugging Face Hub API
 */
async function queryHuggingFaceHub({ search = '', filter = 'gguf', sort = 'likes7d', limit = 15 } = {}) {
  try {
    let url = `https://huggingface.co/api/models?limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}&direction=-1`;

    const data = await new Promise((resolve) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Ptahn-Desktop-Client/1.0' }, timeout: 4500 }, (res) => {
        if (res.statusCode !== 200) return resolve([]);
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
    });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// GET /api/models/search - Search Hugging Face & Curated Catalog with hardware suitability
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    const category = req.query.category || 'all'; // 'all', 'roleplay', 'slm', 'diffusion'
    const hardware = getSystemHardwareSpecs();

    const curated = getCuratedModelsCatalog(hardware);

    // 1. Filter curated catalog
    let filteredCurated = curated;
    if (category !== 'all') {
      filteredCurated = filteredCurated.filter(m => m.category === category || m.type === category);
    }
    if (query) {
      filteredCurated = filteredCurated.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    // 2. Perform live Hugging Face Hub search based on category and query
    let hfSearchTerm = query;
    let hfFilter = category === 'diffusion' ? 'safetensors' : 'gguf';
    if (!hfSearchTerm) {
      if (category === 'roleplay') hfSearchTerm = 'roleplay';
      else if (category === 'slm') hfSearchTerm = 'instruct';
      else if (category === 'diffusion') hfSearchTerm = 'pony';
      else hfSearchTerm = 'uncensored';
    }

    const rawHfModels = await queryHuggingFaceHub({
      search: hfSearchTerm,
      filter: hfFilter,
      sort: query ? 'likes7d' : 'downloads',
      limit: 15
    });

    const hfResults = rawHfModels.map(item => {
      const modelName = item.id || item.modelId || 'huggingface-model';
      const cleanName = modelName.split('/').pop() || modelName;
      const paramSizeMatch = cleanName.match(/(\d+)b/i);
      const paramSizeB = paramSizeMatch ? parseInt(paramSizeMatch[1], 10) : 12;
      const isDiff = category === 'diffusion' || cleanName.toLowerCase().includes('safetensors') || cleanName.toLowerCase().includes('pony');

      const dummyModel = {
        id: isDiff ? `${cleanName}.safetensors` : `${cleanName}.gguf`,
        name: modelName,
        category: category === 'all' ? (isDiff ? 'diffusion' : 'roleplay') : category,
        categoryLabel: isDiff ? 'Difusión Hugging Face' : 'Modelo Hugging Face',
        description: `Modelo comunitario de Hugging Face (${item.likes || 0} ❤️, ${(item.downloads || 0).toLocaleString()} descargas).`,
        parameterSizeB: paramSizeB,
        quantization: 'Q4_K_M',
        type: isDiff ? 'diffusion' : 'llm',
        subType: isDiff ? 'checkpoint' : undefined,
        sizeBytes: Math.round(paramSizeB * 0.6 * 1024 * 1024 * 1024),
        formattedSize: isDiff ? '~6.9 GB' : `~${(paramSizeB * 0.6).toFixed(1)} GB`,
        downloadUrl: isDiff
          ? `https://huggingface.co/${modelName}/resolve/main/${cleanName}.safetensors`
          : `https://huggingface.co/${modelName}/resolve/main/${cleanName}.Q4_K_M.gguf`,
        tags: item.tags ? item.tags.slice(0, 5) : ['HuggingFace', isDiff ? 'Safetensors' : 'GGUF']
      };

      return {
        ...dummyModel,
        hardwareFit: calculateHardwareFit(dummyModel, hardware)
      };
    });

    // 3. Combine and deduplicate
    const seenIds = new Set();
    const combined = [];

    [...filteredCurated, ...hfResults].forEach(m => {
      const key = (m.name || m.id).toLowerCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        combined.push(m);
      }
    });

    res.json({
      success: true,
      hardware,
      results: combined
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/download - Start downloading a model in streaming
router.post('/download', (req, res) => {
  try {
    const { url, filename, category = 'llm' } = req.body;
    if (!url || !filename) {
      return res.status(400).json({ success: false, error: 'url y filename son requeridos' });
    }

    const task = startModelDownload({
      url,
      filename,
      targetDir: MODELS_DIR,
      category
    });

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/models/downloads - Return active download tasks and progress
router.get('/downloads', (req, res) => {
  try {
    const tasks = getDownloadTasks();
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/download/:id/cancel - Cancel active download
router.post('/download/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = cancelDownloadTask(id);
    res.json({ success: cancelled });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/import-local - Import an existing model file from local disk
router.post('/import-local', (req, res) => {
  try {
    const { sourcePath } = req.body;
    if (!sourcePath || typeof sourcePath !== 'string') {
      return res.status(400).json({ success: false, error: 'sourcePath es requerido' });
    }

    const normalizedSource = path.normalize(sourcePath.trim().replace(/^["']|["']$/g, ''));
    if (!fs.existsSync(normalizedSource)) {
      return res.status(404).json({ success: false, error: 'El archivo de origen no existe en la ruta proporcionada' });
    }

    const filename = path.basename(normalizedSource);
    const destPath = path.join(MODELS_DIR, filename);

    if (fs.existsSync(destPath)) {
      return res.json({ success: true, message: 'El modelo ya se encuentra en la carpeta de modelos', filename });
    }

    // Try creating a hardlink for instant 0-second import, fallback to copy
    try {
      fs.linkSync(normalizedSource, destPath);
    } catch (linkErr) {
      fs.copyFileSync(normalizedSource, destPath);
    }

    res.json({ success: true, message: 'Modelo importado con éxito', filename });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/models/:filename - Delete a model from ./models/
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const cleanName = path.basename(filename);
    const filePath = path.join(MODELS_DIR, cleanName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'El modelo no existe en la carpeta' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Modelo ${cleanName} eliminado con éxito` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/load - Load a specific model into VRAM
router.post('/load', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ success: false, error: 'modelName parameter is required' });
    }
    const result = await llamaEngine.loadModel(modelName);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
