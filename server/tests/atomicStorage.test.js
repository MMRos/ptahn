const fs = require('fs');
const path = require('path');
const {
  writeAtomicJson,
  readJsonSafe,
  createBackupFile,
  cloneCardEntity,
  cloneScenarioEntity,
  resolveInheritedCard
} = require('../storage/atomicStorage');

const TEST_DIR = path.join(__dirname, '__test_atomic_data__');
const BACKUPS_DIR = path.join(TEST_DIR, 'backups');

describe('Atomic Storage, Backups & Parent-Child Prototype Inheritance (Zero-Touch Compliant)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Atomic JSON Writing & Rotation Backups', () => {
    test('writeAtomicJson safely writes JSON and leaves no temporary .tmp file', () => {
      const targetFile = path.join(TEST_DIR, 'entity.json');
      const payload = { id: 'c-123', title: 'Test Card', tags: ['Hero'] };

      const result = writeAtomicJson(targetFile, payload, { backupsDir: BACKUPS_DIR });
      expect(result).toBe(true);
      expect(fs.existsSync(targetFile)).toBe(true);
      expect(fs.existsSync(`${targetFile}.tmp`)).toBe(false);

      const loaded = readJsonSafe(targetFile);
      expect(loaded).toEqual(payload);
    });

    test('createBackupFile creates a timestamped backup before overwriting', () => {
      const targetFile = path.join(TEST_DIR, 'card.json');
      const originalPayload = { id: 'c-1', version: 1, title: 'Original Ranma' };
      writeAtomicJson(targetFile, originalPayload, { backupsDir: BACKUPS_DIR, createBackup: false });

      // Second write creates backup of originalPayload
      const updatedPayload = { id: 'c-1', version: 2, title: 'Updated Ranma' };
      writeAtomicJson(targetFile, updatedPayload, { backupsDir: BACKUPS_DIR, createBackup: true });

      const backupFiles = fs.readdirSync(BACKUPS_DIR);
      expect(backupFiles.length).toBeGreaterThan(0);
      expect(backupFiles[0]).toContain('card');

      const backupContent = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, backupFiles[0]), 'utf-8'));
      expect(backupContent.title).toBe('Original Ranma');
      expect(readJsonSafe(targetFile).title).toBe('Updated Ranma');
    });
  });

  describe('Parent-Child Inheritance (Archetype Master ➔ Linked Instance with Delta Overrides)', () => {
    test('resolveInheritedCard correctly merges parent properties with child delta overrides', () => {
      const masterParent = {
        id: 'c-ranma',
        title: 'Ranma Saotome',
        type: 'Personaje',
        text: 'Artista marcial experto en artes marciales de combate de estilo libre.',
        traits: ['Orgulloso', 'Valiente', 'Competitivo'],
        inventory: ['Cinturón', 'Gi tradicional'],
        callWords: ['Ranma', 'Saotome', 'artista marcial']
      };

      const childInstance = {
        id: 'inst-ranma-female',
        parentId: 'c-ranma',
        scenarioId: 'sc-nerima',
        overrides: {
          title: 'Ranma (Chica)',
          traits: ['Tsundere', 'Ágil', 'Voz femenina'],
          inventory: ['Tetera de agua caliente'],
          callWords: ['Ranma chica', 'pelirroja', 'trenza']
        }
      };

      const resolved = resolveInheritedCard(childInstance, masterParent);
      expect(resolved.id).toBe('inst-ranma-female');
      expect(resolved.parentId).toBe('c-ranma');
      expect(resolved.title).toBe('Ranma (Chica)'); // Overridden
      expect(resolved.text).toBe('Artista marcial experto en artes marciales de combate de estilo libre.'); // Inherited from parent
      expect(resolved.traits).toEqual(['Tsundere', 'Ágil', 'Voz femenina']); // Overridden
      expect(resolved.inventory).toEqual(['Tetera de agua caliente']); // Overridden
      expect(resolved.callWords).toEqual(['Ranma chica', 'pelirroja', 'trenza']);
    });

    test('resolveInheritedCard falls back gracefully when parent is not found', () => {
      const orphanInstance = {
        id: 'inst-orphan',
        parentId: 'c-non-existent',
        title: 'Orphan Instance',
        overrides: {
          text: 'Custom text'
        }
      };

      const resolved = resolveInheritedCard(orphanInstance, null);
      expect(resolved.id).toBe('inst-orphan');
      expect(resolved.text).toBe('Custom text');
    });
  });

  describe('Card & Scenario Cloning (Independent Copies)', () => {
    test('cloneCardEntity creates an independent copy with new ID, creator and Copia suffix', () => {
      const originalCard = {
        id: 'c-azgael',
        title: 'Azgael',
        type: 'Personaje',
        tags: ['Protagonista', 'Guerrero'],
        callWords: ['Azgael', 'guerrero'],
        creatorId: 'usr-1',
        creatorName: 'Azgael'
      };

      const cloned = cloneCardEntity(originalCard, {
        creatorId: 'usr-2',
        creatorName: 'PlayerTwo'
      });

      expect(cloned.id).toBeDefined();
      expect(cloned.id).not.toBe(originalCard.id);
      expect(cloned.title).toBe('Azgael (Copia)');
      expect(cloned.creatorId).toBe('usr-2');
      expect(cloned.creatorName).toBe('PlayerTwo');
      expect(cloned.tags).toEqual(['Protagonista', 'Guerrero']);
      expect(cloned.callWords).toEqual(['Azgael', 'guerrero']);
    });

    test('cloneScenarioEntity creates an independent scenario copy with re-anchored card references', () => {
      const originalScenario = {
        id: 'sc-tierra',
        title: 'Tierra de Bestias',
        description: 'Un mundo salvaje',
        cards: ['c-azgael', 'c-garrison'],
        creatorId: 'usr-1'
      };

      const cloned = cloneScenarioEntity(originalScenario, {
        creatorId: 'usr-2',
        creatorName: 'Tester'
      });

      expect(cloned.id).toBeDefined();
      expect(cloned.id).not.toBe(originalScenario.id);
      expect(cloned.title).toBe('Tierra de Bestias (Copia)');
      expect(cloned.cards).toEqual(['c-azgael', 'c-garrison']);
      expect(cloned.creatorId).toBe('usr-2');
    });
  });
});
