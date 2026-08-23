const express = require('express');
const router = express.Router();
const { scanModelsDirectory } = require('../engine/modelScanner');
const { llamaEngine } = require('../engine/llamaEngine');
const { MODELS_DIR } = require('../config');

// GET /api/models - List all available .gguf files
router.get('/', (req, res) => {
  try {
    const models = scanModelsDirectory(MODELS_DIR);
    const engineStatus = llamaEngine.getStatus();
    res.json({
      success: true,
      models,
      activeModel: engineStatus.activeModel,
      engine: engineStatus
    });
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
