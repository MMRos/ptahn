const fs = require('fs');
const path = require('path');
const { writeAtomicJson, readJsonSafe } = require('./atomicStorage');
const { sliceJsonl } = require('./jsonlStorage');
const { DATA_DIR } = require('../config');

let currentDataDir = DATA_DIR;

function getPaths() {
  return {
    libraryDir: path.join(currentDataDir, 'library'),
    campaignsDir: path.join(currentDataDir, 'campaigns')
  };
}

function initDocumentEngine(options = {}) {
  if (options.dataDir) {
    currentDataDir = options.dataDir;
  }
  const { libraryDir, campaignsDir } = getPaths();
  const subdirs = ['characters', 'scenarios', 'lore', 'items', 'narrators'];
  subdirs.forEach(sub => {
    const dir = path.join(libraryDir, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(campaignsDir)) {
    fs.mkdirSync(campaignsDir, { recursive: true });
  }
}

function saveLibraryEntity(category, entity) {
  if (!entity || !entity.id) return false;
  const { libraryDir } = getPaths();
  const filePath = path.join(libraryDir, category, `${entity.id}.json`);
  return writeAtomicJson(filePath, entity, { createBackup: false });
}

function getLibraryEntity(category, id) {
  const { libraryDir } = getPaths();
  const filePath = path.join(libraryDir, category, `${id}.json`);
  return readJsonSafe(filePath, null);
}

function listLibraryEntities(category) {
  const { libraryDir } = getPaths();
  const dir = path.join(libraryDir, category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(dir, f), null))
    .filter(Boolean);
}

function createCampaign({ scenarioId = 'default', title = 'Nueva Campaña', activeEntities = [] }) {
  const { campaignsDir } = getPaths();
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const campFolder = path.join(campaignsDir, campaignId);
  fs.mkdirSync(path.join(campFolder, 'states'), { recursive: true });
  fs.mkdirSync(path.join(campFolder, 'chats'), { recursive: true });
  fs.mkdirSync(path.join(campFolder, 'memories'), { recursive: true });

  const manifest = {
    id: campaignId,
    scenarioId,
    title,
    createdAt: new Date().toISOString(),
    activeEntities
  };
  writeAtomicJson(path.join(campFolder, 'scenario.json'), manifest, { createBackup: false });

  // Initialize states for active entities
  activeEntities.forEach(item => {
    const entId = item.entityId || item.id;
    if (entId) {
      const template = getLibraryEntity('characters', entId) || getLibraryEntity('lore', entId);
      const statePayload = {
        entityId: entId,
        currentStats: template?.baseStats ? { ...template.baseStats } : {},
        inventory: template?.initialInventory ? [...template.initialInventory] : [],
        notes: ''
      };
      writeAtomicJson(path.join(campFolder, 'states', `${entId}.state.json`), statePayload, { createBackup: false });
    }
  });

  return manifest;
}

function resolveCampaignEntity(campaignId, entityId) {
  const { campaignsDir } = getPaths();
  const template = getLibraryEntity('characters', entityId) || getLibraryEntity('lore', entityId) || {};
  const statePath = path.join(campaignsDir, campaignId, 'states', `${entityId}.state.json`);
  const state = readJsonSafe(statePath, {});
  return {
    ...template,
    ...state,
    id: entityId,
    title: state.customTitle || template.title || entityId
  };
}

function mergeTemplateUpdates(campaignId, entityId) {
  const { campaignsDir } = getPaths();
  const template = getLibraryEntity('characters', entityId) || getLibraryEntity('lore', entityId);
  if (!template) return { success: false, error: 'Template not found' };

  const statePath = path.join(campaignsDir, campaignId, 'states', `${entityId}.state.json`);
  const currentState = readJsonSafe(statePath, { entityId });

  // 3-way merge: Preserve local stats/inventory while acknowledging template updates
  writeAtomicJson(statePath, currentState, { createBackup: false });
  return { success: true, entity: resolveCampaignEntity(campaignId, entityId) };
}

function saveCampaignMemory(campaignId, memory) {
  if (!memory || !memory.id) return false;
  const { campaignsDir } = getPaths();
  const memPath = path.join(campaignsDir, campaignId, 'memories', `${memory.id}.json`);
  return writeAtomicJson(memPath, memory, { createBackup: false });
}

function getCampaignMemories(campaignId) {
  const { campaignsDir } = getPaths();
  const memDir = path.join(campaignsDir, campaignId, 'memories');
  if (!fs.existsSync(memDir)) return [];
  return fs.readdirSync(memDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(memDir, f), null))
    .filter(Boolean);
}

function branchCampaign({ sourceCampaignId, branchTurn, newTitle }) {
  const { campaignsDir } = getPaths();
  const sourceDir = path.join(campaignsDir, sourceCampaignId);
  if (!fs.existsSync(sourceDir)) return null;

  const newCampaignId = `${sourceCampaignId}_branch_${Date.now()}`;
  const targetDir = path.join(campaignsDir, newCampaignId);
  fs.mkdirSync(path.join(targetDir, 'states'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'chats'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'memories'), { recursive: true });

  // 1. Slice chat JSONL up to branchTurn
  const srcChat = path.join(sourceDir, 'chats', 'main.jsonl');
  const tgtChat = path.join(targetDir, 'chats', 'main.jsonl');
  if (fs.existsSync(srcChat)) {
    sliceJsonl(srcChat, tgtChat, branchTurn);
  }

  // 2. Clone scenario manifest
  const srcManifest = readJsonSafe(path.join(sourceDir, 'scenario.json'), {});
  const newManifest = {
    ...srcManifest,
    id: newCampaignId,
    title: newTitle || `${srcManifest.title || 'Campaña'} (Rama)`,
    parentCampaignId: sourceCampaignId,
    branchedAtTurn: branchTurn
  };
  writeAtomicJson(path.join(targetDir, 'scenario.json'), newManifest, { createBackup: false });

  // 3. Copy entity states
  const srcStatesDir = path.join(sourceDir, 'states');
  if (fs.existsSync(srcStatesDir)) {
    fs.readdirSync(srcStatesDir).forEach(f => {
      const content = readJsonSafe(path.join(srcStatesDir, f));
      if (content) writeAtomicJson(path.join(targetDir, 'states', f), content, { createBackup: false });
    });
  }

  // 4. Copy memories that occurred at or before branchTurn
  const srcMemories = getCampaignMemories(sourceCampaignId);
  srcMemories.forEach(mem => {
    const maxTurn = Array.isArray(mem.turn_range) ? Math.max(...mem.turn_range) : (mem.turn || 0);
    if (maxTurn <= branchTurn) {
      saveCampaignMemory(newCampaignId, mem);
    }
  });

  return newManifest;
}

function listCampaigns() {
  const { campaignsDir } = getPaths();
  if (!fs.existsSync(campaignsDir)) return [];
  return fs.readdirSync(campaignsDir)
    .map(id => readJsonSafe(path.join(campaignsDir, id, 'scenario.json'), null))
    .filter(Boolean);
}

function assembleVirtualAppData() {
  const scenarios = listLibraryEntities('scenarios');
  const characters = listLibraryEntities('characters');
  const items = listLibraryEntities('items');
  const lore = listLibraryEntities('lore');
  const cards = [...characters, ...items, ...lore];
  const allNarrators = listLibraryEntities('narrators');
  const narrators = allNarrators.filter(n => !n.isTool);
  const tools = allNarrators.filter(n => n.isTool);

  return {
    scenarios,
    cards,
    narrators,
    tools
  };
}

function saveVirtualAppData(data = {}) {
  if (Array.isArray(data.scenarios)) {
    data.scenarios.forEach(sc => saveLibraryEntity('scenarios', sc));
  }
  if (Array.isArray(data.cards)) {
    data.cards.forEach(card => {
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
  if (Array.isArray(data.narrators)) {
    data.narrators.forEach(n => saveLibraryEntity('narrators', n));
  }
  if (Array.isArray(data.tools)) {
    data.tools.forEach(t => saveLibraryEntity('narrators', { ...t, isTool: true }));
  }
  return true;
}

module.exports = {
  initDocumentEngine,
  saveLibraryEntity,
  getLibraryEntity,
  listLibraryEntities,
  createCampaign,
  resolveCampaignEntity,
  mergeTemplateUpdates,
  saveCampaignMemory,
  getCampaignMemories,
  branchCampaign,
  listCampaigns,
  assembleVirtualAppData,
  saveVirtualAppData
};

