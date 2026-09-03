const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { diffusionEngine } = require('../engine/diffusionEngine');
const { visionEngine } = require('../engine/visionEngine');
const { DATA_DIR } = require('../config');

// POST /api/images/vision-classify - Native GPU Vision pixel inspection
router.post('/vision-classify', async (req, res) => {
  try {
    const { imageUrl, imageBase64, entityTitle } = req.body;
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ success: false, error: 'imageUrl or imageBase64 is required' });
    }

    const result = await visionEngine.classifyImage({ imageUrl, imageBase64, entityTitle });
    res.json(result);
  } catch (error) {
    console.error('[Vision Route Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// GET /api/images/files/:filename - Serve generated image files (Path Traversal Protected)
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    return res.status(400).json({ success: false, error: 'Invalid filename or path traversal detected' });
  }

  const targetDir = path.resolve(DATA_DIR, 'generated_images');
  const filePath = path.resolve(targetDir, filename);

  if (!filePath.startsWith(targetDir)) {
    return res.status(400).json({ success: false, error: 'Access denied: path traversal attempt' });
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, error: 'Image file not found' });
  }
});

module.exports = router;
