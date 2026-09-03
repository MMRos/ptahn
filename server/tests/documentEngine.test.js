const fs = require('fs');
const path = require('path');
const {
  initDocumentEngine,
  saveLibraryEntity,
  getLibraryEntity,
  createCampaign,
  resolveCampaignEntity,
  mergeTemplateUpdates
} = require('../storage/documentEngine');

const TEST_ROOT = path.join(__dirname, '__test_doc_engine_data__');

describe('DocumentEngine (Library, Campaigns & Git-Merge)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
    initDocumentEngine({ dataDir: TEST_ROOT });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test('creates library directories and persists library entities', () => {
    const character = {
      id: 'char_aria_v1',
      title: 'Aria Sombra',
      systemPrompt: 'Eres Aria, pícara sigilosa.',
      baseStats: { strength: 10, agility: 16 },
      initialInventory: ['daga_acero']
    };

    const saved = saveLibraryEntity('characters', character);
    expect(saved).toBe(true);

    const loaded = getLibraryEntity('characters', 'char_aria_v1');
    expect(loaded).toBeDefined();
    expect(loaded.title).toBe('Aria Sombra');
    expect(loaded.baseStats.agility).toBe(16);
  });

  test('creates an isolated campaign with scenario.json and local entity states', () => {
    saveLibraryEntity('characters', {
      id: 'char_aria_v1',
      title: 'Aria Sombra',
      baseStats: { hp: 100, strength: 10 }
    });

    const campaign = createCampaign({
      scenarioId: 'sc_bosque',
      title: 'El Bosque Oscuro',
      activeEntities: [
        { entityId: 'char_aria_v1', role: 'player_character' }
      ]
    });

    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();

    const campaignDir = path.join(TEST_ROOT, 'campaigns', campaign.id);
    expect(fs.existsSync(campaignDir)).toBe(true);
    expect(fs.existsSync(path.join(campaignDir, 'scenario.json'))).toBe(true);
    expect(fs.existsSync(path.join(campaignDir, 'states', 'char_aria_v1.state.json'))).toBe(true);
  });

  test('resolveCampaignEntity merges base template with mutable local state', () => {
    saveLibraryEntity('characters', {
      id: 'char_aria_v1',
      title: 'Aria Sombra',
      systemPrompt: 'Sigilosa y cauta.',
      baseStats: { hp: 100 }
    });

    const campaign = createCampaign({
      scenarioId: 'sc_1',
      title: 'Test Run',
      activeEntities: [{ entityId: 'char_aria_v1' }]
    });

    // Mutate campaign state (e.g. lost 20 HP and acquired an item)
    const stateFile = path.join(TEST_ROOT, 'campaigns', campaign.id, 'states', 'char_aria_v1.state.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      currentStats: { hp: 80 },
      inventory: ['anillo_magico'],
      notes: 'Herida en el bosque'
    }));

    const resolved = resolveCampaignEntity(campaign.id, 'char_aria_v1');
    expect(resolved.title).toBe('Aria Sombra'); // from library
    expect(resolved.systemPrompt).toBe('Sigilosa y cauta.'); // from library
    expect(resolved.currentStats.hp).toBe(80); // from campaign state
    expect(resolved.inventory).toContain('anillo_magico'); // from campaign state
  });

  test('mergeTemplateUpdates updates core definitions without overwriting local campaign progress', () => {
    saveLibraryEntity('characters', {
      id: 'char_aria_v1',
      title: 'Aria',
      description: 'Versión 1',
      systemPrompt: 'Prompt v1'
    });

    const campaign = createCampaign({
      scenarioId: 'sc_1',
      title: 'Run',
      activeEntities: [{ entityId: 'char_aria_v1' }]
    });

    // Local campaign progress
    const stateFile = path.join(TEST_ROOT, 'campaigns', campaign.id, 'states', 'char_aria_v1.state.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      level: 5,
      inventory: ['espada_runica']
    }));

    // Author updates library template
    saveLibraryEntity('characters', {
      id: 'char_aria_v1',
      title: 'Aria la Valiente',
      description: 'Versión 2 enriquecida',
      systemPrompt: 'Prompt v2 mejorado'
    });

    // Apply 3-way merge
    const merged = mergeTemplateUpdates(campaign.id, 'char_aria_v1');
    expect(merged.success).toBe(true);

    const resolved = resolveCampaignEntity(campaign.id, 'char_aria_v1');
    expect(resolved.title).toBe('Aria la Valiente'); // updated trunk
    expect(resolved.description).toBe('Versión 2 enriquecida'); // updated trunk
    expect(resolved.level).toBe(5); // preserved local state
    expect(resolved.inventory).toContain('espada_runica'); // preserved local state
  });
});
