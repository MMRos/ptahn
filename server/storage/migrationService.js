const fs = require('fs');
const path = require('path');
const { writeAtomicJson, readJsonSafe } = require('./atomicStorage');
const { initDocumentEngine, saveLibraryEntity, createCampaign } = require('./documentEngine');
const { appendJsonlLine } = require('./jsonlStorage');
const { DATA_DIR } = require('../config');

function createImmutableBackup(sourceFile, backupsDir) {
  if (!fs.existsSync(sourceFile)) return null;
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `legacy_appData_pre_f038_${timestamp}.json.bak`;
  const backupPath = path.join(backupsDir, backupName);
  fs.copyFileSync(sourceFile, backupPath);
  return backupPath;
}

function migrateCards(cards = []) {
  cards.forEach(card => {
    if (!card || !card.id) return;
    const type = (card.type || '').toLowerCase();
    if (type === 'personaje' || card.characterRole) {
      saveLibraryEntity('characters', card);
    } else if (type === 'objeto' || type === 'item' || type === 'inventario') {
      saveLibraryEntity('items', card);
    } else {
      saveLibraryEntity('lore', card);
    }
  });
}

function migrateChats(chats = [], dataDir) {
  chats.forEach(chat => {
    if (!chat || !chat.id) return;
    const campaignId = chat.id;
    const campDir = path.join(dataDir, 'campaigns', campaignId);
    fs.mkdirSync(path.join(campDir, 'chats'), { recursive: true });
    fs.mkdirSync(path.join(campDir, 'states'), { recursive: true });
    fs.mkdirSync(path.join(campDir, 'memories'), { recursive: true });

    const manifest = {
      id: campaignId,
      scenarioId: chat.scenarioId || 'migrated',
      title: chat.title || 'Campaña Migrada',
      createdAt: chat.createdAt || new Date().toISOString()
    };
    writeAtomicJson(path.join(campDir, 'scenario.json'), manifest, { createBackup: false });

    // Migrate messages into append-only main.jsonl
    const chatFile = path.join(campDir, 'chats', 'main.jsonl');
    if (Array.isArray(chat.messages)) {
      chat.messages.forEach((msg, idx) => {
        appendJsonlLine(chatFile, {
          id: msg.id || `msg_${idx + 1}`,
          turn: idx + 1,
          role: msg.role || 'user',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp || Date.now()
        });
      });
    }
  });
}

function runMigrationIfNeeded(options = {}) {
  const dataDir = options.dataDir || DATA_DIR;
  const flagFile = path.join(dataDir, '.f038_migrated');
  if (fs.existsSync(flagFile)) {
    return { migrated: false, reason: 'already_migrated' };
  }

  const appDataFile = path.join(dataDir, 'appData.json');
  if (!fs.existsSync(appDataFile)) {
    return { migrated: false, reason: 'no_legacy_data' };
  }

  const legacyData = readJsonSafe(appDataFile);
  if (!legacyData) {
    return { migrated: false, reason: 'empty_or_corrupt_data' };
  }

  // 1. Create immutable safety backup before touching anything
  const backupsDir = path.join(dataDir, 'backups');
  createImmutableBackup(appDataFile, backupsDir);

  // 2. Initialize DocumentEngine hierarchy
  initDocumentEngine({ dataDir });

  // 3. Migrate library entities
  (legacyData.scenarios || []).forEach(sc => saveLibraryEntity('scenarios', sc));
  migrateCards(legacyData.cards || []);
  (legacyData.narrators || []).forEach(n => saveLibraryEntity('narrators', n));
  (legacyData.tools || []).forEach(t => saveLibraryEntity('narrators', { ...t, isTool: true }));

  // 4. Migrate chats if present
  const chatsFile = path.join(dataDir, 'chats.json');
  if (fs.existsSync(chatsFile)) {
    const legacyChats = readJsonSafe(chatsFile, []);
    if (Array.isArray(legacyChats)) {
      migrateChats(legacyChats, dataDir);
    }
  }

  // 5. Mark as successfully migrated
  const migrationMetadata = {
    timestamp: new Date().toISOString(),
    scenariosCount: (legacyData.scenarios || []).length,
    cardsCount: (legacyData.cards || []).length
  };
  fs.writeFileSync(flagFile, JSON.stringify(migrationMetadata, null, 2), 'utf-8');

  return { migrated: true, metadata: migrationMetadata };
}

module.exports = {
  runMigrationIfNeeded
};
