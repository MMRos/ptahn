const fs = require('fs');
const path = require('path');

/**
 * Creates a timestamped backup of an existing file before it gets modified.
 * Rotates backups to retain the 5 most recent per entity/file.
 */
function createBackupFile(filePath, customBackupsDir = null) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const dir = path.dirname(filePath);
    const backupsDir = customBackupsDir || path.join(dir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const baseName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${baseName}_${timestamp}${ext}.bak`;
    const backupPath = path.join(backupsDir, backupFileName);

    fs.copyFileSync(filePath, backupPath);

    // Rotate backups: Keep only 5 most recent for this baseName
    try {
      const allBackups = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith(baseName) && f.endsWith('.bak'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(backupsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      if (allBackups.length > 5) {
        allBackups.slice(5).forEach(old => {
          try { fs.unlinkSync(path.join(backupsDir, old.name)); } catch (e) { }
        });
      }
    } catch (err) { }

    return backupPath;
  } catch (error) {
    console.error('[AtomicStorage Backup Error]:', error);
    return null;
  }
}

/**
 * Writes data safely using atomic write (.tmp -> rename) pattern.
 */
function writeAtomicJson(filePath, data, options = {}) {
  const { createBackup = true, backupsDir = null } = options;

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (createBackup && fs.existsSync(filePath)) {
      createBackupFile(filePath, backupsDir);
    }

    const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    fs.writeFileSync(tempPath, jsonString, 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error('[AtomicStorage Write Error]:', error);
    return false;
  }
}

/**
 * Safely reads and parses a JSON file with fallback.
 */
function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[AtomicStorage Read Error for ${filePath}]:`, error);
    return defaultValue;
  }
}

/**
 * Clones a Card entity into an independent master archetype with a fresh ID.
 */
function cloneCardEntity(card, creatorInfo = {}) {
  if (!card) return null;
  const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    ...card,
    id: newId,
    title: card.title ? `${card.title} (Copia)` : 'Nueva Tarjeta (Copia)',
    parentId: null,
    overrides: null,
    creatorId: creatorInfo.creatorId || card.creatorId || '',
    creatorName: creatorInfo.creatorName || card.creatorName || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Clones a Scenario entity into an independent copy.
 */
function cloneScenarioEntity(scenario, creatorInfo = {}) {
  if (!scenario) return null;
  const newId = `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    ...scenario,
    id: newId,
    title: scenario.title ? `${scenario.title} (Copia)` : 'Nuevo Escenario (Copia)',
    cards: Array.isArray(scenario.cards) ? [...scenario.cards] : [],
    creatorId: creatorInfo.creatorId || scenario.creatorId || '',
    creatorName: creatorInfo.creatorName || scenario.creatorName || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Resolves inheritance: merges parent archetype with child delta overrides.
 */
function resolveInheritedCard(childInstance, masterParent) {
  if (!childInstance) return null;
  if (!masterParent) {
    const overrides = childInstance.overrides || {};
    return { ...childInstance, ...overrides };
  }

  const overrides = childInstance.overrides || {};
  return {
    ...masterParent,
    ...childInstance,
    ...overrides,
    id: childInstance.id || masterParent.id,
    parentId: masterParent.id,
    title: overrides.title || childInstance.title || masterParent.title,
    traits: overrides.traits || childInstance.traits || masterParent.traits || [],
    inventory: overrides.inventory || childInstance.inventory || masterParent.inventory || [],
    callWords: overrides.callWords || childInstance.callWords || masterParent.callWords || []
  };
}

module.exports = {
  createBackupFile,
  writeAtomicJson,
  readJsonSafe,
  cloneCardEntity,
  cloneScenarioEntity,
  resolveInheritedCard
};
