const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { diffusionEngine } = require('../engine/diffusionEngine');
const { DATA_DIR } = require('../config');

// GET /api/images/status - Return diffusion engine status
router.get('/status', (req, res) => {
  try {
    const status = diffusionEngine.getStatus();
    res.json({
      online: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/images/models - Return list of available diffusion models in ./models/
router.get('/models', (req, res) => {
  try {
    const models = diffusionEngine.getAvailableModels();
    res.json({
      success: true,
      count: models.length,
      models
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/images/generate - Generate image natively
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required and must be a string' });
    }

    const result = await diffusionEngine.generateImage(prompt, options);
    res.json(result);
  } catch (error) {
    console.error('[Diffusion Route Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/images/files/:filename - Serve generated image files
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DATA_DIR, 'generated_images', filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, error: 'Image file not found' });
  }
});

module.exports = router;
