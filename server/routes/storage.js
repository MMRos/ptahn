const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureImagesDir() {
  ensureDataDir();
  const imagesDir = path.join(DATA_DIR, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

/**
 * Saves a base64 DataURL directly as a binary image file in ptah-data/images/
 * Returns the permanent local URL: /api/storage/images/{filename}
 */
function saveBase64Image(dataUrl, entityPrefix = 'asset') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const imagesDir = ensureImagesDir();
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!match) return dataUrl;

    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext.includes('+')) ext = ext.split('+')[0];

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const cleanPrefix = String(entityPrefix || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(imagesDir, filename);

    fs.writeFileSync(filePath, buffer);
    return `/api/storage/images/${filename}`;
  } catch (error) {
    console.error('[Storage]: Failed to persist base64 image to disk:', error);
    return dataUrl;
  }
}

/**
 * Recursively converts all base64 data URLs in appData into persistent disk files
 */
function sanitizeAndPersistAssets(data) {
  if (!data || typeof data !== 'object') return data;

  const copy = { ...data };

  // Sanitize scenarios
  if (Array.isArray(copy.scenarios)) {
    copy.scenarios = copy.scenarios.map(s => {
      if (!s) return s;
      const updated = { ...s };
      if (updated.cover && updated.cover.startsWith('data:image/')) {
        updated.cover = saveBase64Image(updated.cover, `sc_${updated.id || 'scenario'}`);
      }
      return updated;
    });
  }

  // Sanitize cards & multi-expression images
  if (Array.isArray(copy.cards)) {
    copy.cards = copy.cards.map(c => {
      if (!c) return c;
      const updated = { ...c };
      if (updated.cover && updated.cover.startsWith('data:image/')) {
        updated.cover = saveBase64Image(updated.cover, `card_${updated.id || 'card'}`);
      }
      if (updated.avatar && updated.avatar.startsWith('data:image/')) {
        updated.avatar = saveBase64Image(updated.avatar, `avatar_${updated.id || 'card'}`);
      }
      if (Array.isArray(updated.images)) {
        updated.images = updated.images.map(img => {
          if (!img || !img.url || !img.url.startsWith('data:image/')) return img;
          return {
            ...img,
            url: saveBase64Image(img.url, `expr_${updated.id || 'card'}`)
          };
        });
      }
      return updated;
    });
  }

  // Sanitize narrators
  if (Array.isArray(copy.narrators)) {
    copy.narrators = copy.narrators.map(n => {
      if (!n) return n;
      const updated = { ...n };
      if (updated.avatar && updated.avatar.startsWith('data:image/')) {
        updated.avatar = saveBase64Image(updated.avatar, `narrator_${updated.id || 'narrator'}`);
      }
      return updated;
    });
  }

  return copy;
}

// POST /api/storage/upload-image - Upload and persist image to disk
router.post('/upload-image', (req, res) => {
  try {
    const { image, entityId = 'upload' } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'image data is required' });
    }

    const localUrl = saveBase64Image(image, entityId);
    if (!localUrl || localUrl === image) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Expected data:image/...' });
    }

    res.json({
      success: true,
      url: localUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/images/:filename - Serve persistent image files from disk
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  
  // 1. Check in ptah-data/images/
  let filePath = path.join(DATA_DIR, 'images', safeFilename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // 2. Check in ptah-data/generated_images/
  filePath = path.join(DATA_DIR, 'generated_images', safeFilename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  res.status(404).json({ success: false, error: 'Image not found' });
});

const { writeAtomicJson, readJsonSafe, cloneCardEntity, cloneScenarioEntity } = require('../storage/atomicStorage');
const {
  assembleVirtualAppData,
  saveVirtualAppData,
  saveLibraryEntity,
  listCampaigns,
  createCampaign,
  branchCampaign,
  saveCampaignMemory,
  getCampaignMemories,
  mergeTemplateUpdates,
  listLibraryEntities,
  getLibraryEntity
} = require('../storage/documentEngine');

// GET /api/storage/app-data (Virtual Aggregator desde library/)
router.get('/app-data', (req, res) => {
  ensureDataDir();
  try {
    const data = assembleVirtualAppData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/app-data (Persistencia Modular Atómica en library/)
router.post('/app-data', (req, res) => {
  ensureDataDir();
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: 'data payload is required' });
  }
  try {
    const sanitizedData = sanitizeAndPersistAssets(data);
    saveVirtualAppData(sanitizedData);
    res.json({ success: true, data: sanitizedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/cards/:id/clone
router.post('/cards/:id/clone', (req, res) => {
  ensureDataDir();
  const { id } = req.params;
  const { creatorId, creatorName } = req.body;

  try {
    const virtualData = assembleVirtualAppData();
    const card = (virtualData.cards || []).find(c => c && c.id === id);

    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const clonedCard = cloneCardEntity(card, { creatorId, creatorName });
    const type = (clonedCard.type || '').toLowerCase();
    if (type === 'personaje' || clonedCard.characterRole) {
      saveLibraryEntity('characters', clonedCard);
    } else if (type === 'objeto' || type === 'item' || type === 'inventario') {
      saveLibraryEntity('items', clonedCard);
    } else {
      saveLibraryEntity('lore', clonedCard);
    }
    res.json({ success: true, card: clonedCard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/scenarios/:id/clone
router.post('/scenarios/:id/clone', (req, res) => {
  ensureDataDir();
  const { id } = req.params;
  const { creatorId, creatorName } = req.body;

  try {
    const virtualData = assembleVirtualAppData();
    const scenario = (virtualData.scenarios || []).find(s => s && s.id === id);

    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }

    const clonedScenario = cloneScenarioEntity(scenario, { creatorId, creatorName });
    saveLibraryEntity('scenarios', clonedScenario);
    res.json({ success: true, scenario: clonedScenario });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/chats
router.get('/chats', (req, res) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, 'chats.json');
  const chats = readJsonSafe(filePath, []);
  res.json({ success: true, chats: Array.isArray(chats) ? chats : [] });
});

// POST /api/storage/chats
router.post('/chats', (req, res) => {
  ensureDataDir();
  const { chats } = req.body;
  if (!Array.isArray(chats)) {
    return res.status(400).json({ success: false, error: 'chats array is required' });
  }
  try {
    const filePath = path.join(DATA_DIR, 'chats.json');
    const written = writeAtomicJson(filePath, chats, { createBackup: true });
    if (!written) {
      return res.status(500).json({ success: false, error: 'Failed to write chats atomically' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/settings
router.get('/settings', (req, res) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, 'settings.json');
  const settings = readJsonSafe(filePath, {});
  res.json({ success: true, settings });
});

// POST /api/storage/settings
router.post('/settings', (req, res) => {
  ensureDataDir();
  const { settings } = req.body;
  try {
    const filePath = path.join(DATA_DIR, 'settings.json');
    const payload = settings || req.body || {};
    const written = writeAtomicJson(filePath, payload, { createBackup: true });
    if (!written) {
      return res.status(500).json({ success: false, error: 'Failed to write settings atomically' });
    }
    res.json({ success: true, settings: payload });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const { appendJsonlLine, readJsonlPaginated, readJsonlTail } = require('../storage/jsonlStorage');

// --- DocumentEngine Library & Campaigns Endpoints ---

// GET /api/storage/campaigns - List all campaigns
router.get('/campaigns', (req, res) => {
  try {
    const campaigns = listCampaigns();
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/campaigns - Create a new isolated campaign
router.post('/campaigns', (req, res) => {
  try {
    const { scenarioId, title, activeEntities } = req.body;
    const campaign = createCampaign({ scenarioId, title, activeEntities });
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/campaigns/:id/branch - Branch a campaign at message K
router.post('/campaigns/:id/branch', (req, res) => {
  try {
    const { branchTurn, newTitle } = req.body;
    const branched = branchCampaign({
      sourceCampaignId: req.params.id,
      branchTurn: parseInt(branchTurn, 10) || 0,
      newTitle
    });
    if (!branched) {
      return res.status(404).json({ success: false, error: 'Source campaign not found' });
    }
    res.json({ success: true, campaign: branched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/campaigns/:id/chat - Read paginated chat messages from JSONL
router.get('/campaigns/:id/chat', (req, res) => {
  try {
    const { limit = 50, offset = 0, tail } = req.query;
    const chatFile = path.join(DATA_DIR, 'campaigns', req.params.id, 'chats', 'main.jsonl');
    if (tail) {
      const messages = readJsonlTail(chatFile, parseInt(tail, 10) || 10);
      return res.json({ success: true, messages });
    }
    const result = readJsonlPaginated(chatFile, {
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/campaigns/:id/chat/message - Append-only atomic message turn
router.post('/campaigns/:id/chat/message', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message payload required' });
    }
    const chatFile = path.join(DATA_DIR, 'campaigns', req.params.id, 'chats', 'main.jsonl');
    const written = appendJsonlLine(chatFile, message);
    if (!written) {
      return res.status(500).json({ success: false, error: 'Failed to append message turn' });
    }
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/campaigns/:id/memories - Get campaign episodic memories
router.get('/campaigns/:id/memories', (req, res) => {
  try {
    const memories = getCampaignMemories(req.params.id);
    res.json({ success: true, memories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/campaigns/:id/memories - Save or update memory with source context
router.post('/campaigns/:id/memories', (req, res) => {
  try {
    const { memory } = req.body;
    if (!memory || !memory.id) {
      return res.status(400).json({ success: false, error: 'Memory with id is required' });
    }
    const saved = saveCampaignMemory(req.params.id, memory);
    res.json({ success: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/campaigns/:id/sync-template - Git-Merge template update
router.post('/campaigns/:id/sync-template', (req, res) => {
  try {
    const { entityId } = req.body;
    const result = mergeTemplateUpdates(req.params.id, entityId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/library/:category - List entities in library
router.get('/library/:category', (req, res) => {
  try {
    const entities = listLibraryEntities(req.params.category);
    res.json({ success: true, entities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/library/:category - Save entity to library
router.post('/library/:category', (req, res) => {
  try {
    const { entity } = req.body;
    const saved = saveLibraryEntity(req.params.category, entity);
    res.json({ success: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


