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

// GET /api/storage/app-data
router.get('/app-data', (req, res) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, 'appData.json');
  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, data: { scenarios: [], cards: [], narrators: [], tools: [] } });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/storage/app-data
router.post('/app-data', (req, res) => {
  ensureDataDir();
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: 'data payload is required' });
  }
  try {
    const filePath = path.join(DATA_DIR, 'appData.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/storage/chats
router.get('/chats', (req, res) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, 'chats.json');
  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, chats: [] });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const chats = JSON.parse(raw);
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
    fs.writeFileSync(filePath, JSON.stringify(chats, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

