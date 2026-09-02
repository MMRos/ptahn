import { getScenarioCards, resolveUserCharacter } from '../components/ChatView';
import { normalizeInitialMessages, getActiveInitialMessage, getActiveInitialMessageText } from './scenarioScoping';

describe('Scenario Boundary & Isolation Tests (No Character/Card Bleed)', () => {
  const scenarioTierraDeBestias = {
    id: 'sc-tierra-bestias',
    title: 'Tierra de Bestias',
    cards: ['c-azgael', 'c-gildenhall']
  };

  const scenarioTheForge = {
    id: 'sc-forge',
    title: 'The Forge',
    cards: ['c-mari-setogaya', 'c-eelyt']
  };

  const appData = {
    cards: [
      { id: 'c-azgael', title: 'Azgael', type: 'Personaje', linkedScenario: 'sc-tierra-bestias' },
      { id: 'c-gildenhall', title: 'Gildenhall', type: 'Lugar', linkedScenario: 'sc-tierra-bestias' },
      { id: 'c-leporinos', title: 'Leporinos', type: 'Faccion', connectedCards: ['sc-tierra-bestias'] },
      { id: 'c-mari-setogaya', title: 'Mari Setogaya', type: 'Personaje', linkedScenario: 'sc-forge' },
      { id: 'c-eelyt', title: 'Eelyt', type: 'Personaje', linkedScenario: 'sc-forge' },
      { id: 'c-unrelated', title: 'Random Object', type: 'Objeto', linkedScenario: 'other-world' }
    ]
  };

  const chat = {
    id: 'chat-1',
    scenarioId: 'sc-tierra-bestias',
    scenario: 'Tierra de Bestias',
    characters: []
  };

  const userChar = {
    id: 'c-player',
    title: 'Aventurero Humano',
    type: 'Personaje'
  };

  test('getScenarioCards strictly returns ONLY cards linked to active scenario and blocks other scenarios', () => {
    const cards = getScenarioCards(scenarioTierraDeBestias, chat, appData, userChar);
    const titles = cards.map(c => c.title);

    expect(titles).toContain('Azgael');
    expect(titles).toContain('Gildenhall');
    expect(titles).toContain('Leporinos');

    // CRITICAL: Must NEVER contain cards from The Forge or other scenarios
    expect(titles).not.toContain('Mari Setogaya');
    expect(titles).not.toContain('Eelyt');
    expect(titles).not.toContain('Random Object');
  });

  test('getScenarioCards handles scenario where cards are linked by scenario title', () => {
    const cards = getScenarioCards(scenarioTheForge, { scenarioId: 'sc-forge', scenario: 'The Forge' }, appData, userChar);
    const titles = cards.map(c => c.title);

    expect(titles).toContain('Mari Setogaya');
    expect(titles).toContain('Eelyt');
    expect(titles).not.toContain('Azgael');
  });

  test('getScenarioCards enforces strict isolation: unlinked cards from other contexts are strictly excluded', () => {
    const customAppData = {
      cards: [
        { id: 'c-tavern', title: 'La Taberna del Búho', type: 'Lugar' },
        { id: 'c-wolf', title: 'Lobo Huargo del Norte (Especie)', type: 'Raza' },
        { id: 'c-mari', title: 'Mari Setogaya', type: 'Personaje', linkedScenario: 'sc-forge' },
        { id: 'c-leporina', title: 'Mujer Leporina', type: 'Personaje' }
      ]
    };

    const cards = getScenarioCards(scenarioTierraDeBestias, chat, customAppData, userChar);
    const titles = cards.map(c => c.title);

    // CRITICAL: Unlinked compendium cards must NEVER leak into active scenario
    expect(titles).not.toContain('Mari Setogaya');
    expect(titles).not.toContain('Mujer Leporina');
    expect(titles).not.toContain('La Taberna del Búho');
    expect(titles).not.toContain('Lobo Huargo del Norte (Especie)');
  });

  test('Rising an Empire chat is strictly sandboxed to its 7 cards and excludes Mujer Leporina and other compendium cards', () => {
    const risingAnEmpireScenario = {
      id: 'scenario-1788184012289',
      title: 'Rising an Empire',
      cards: [
        'local-1788206145456',
        { id: 'card-1788215262370', title: 'Mazmorras Durmientes' },
        { id: 'card-1788261597477', title: 'Bestiálidos' },
        { id: 'card-1788262343579', title: 'Elfos' },
        'Goblinoides',
        'Medianos',
        'Humanos'
      ]
    };
    const realAppDataCards = [
      { id: 'local-1788206145456', title: 'Mazmorras errantes', type: 'Lugar' },
      { id: 'card-1788215262370', title: 'Mazmorras Durmientes', type: 'Lugar' },
      { id: 'card-1788261597477', title: 'Bestiálidos', type: 'Raza' },
      { id: 'card-1788262343579', title: 'Elfos', type: 'Raza' },
      { id: 'c-gob', title: 'Goblinoides', type: 'Raza' },
      { id: 'c-med', title: 'Medianos', type: 'Raza' },
      { id: 'c-hum', title: 'Humanos', type: 'Raza' },
      { id: 'card-1788019417094-jntac', title: 'Mujer Leporina', type: 'Personaje' },
      { id: 'card-equido', title: 'Equido Uniformado', type: 'Personaje' },
      { id: 'card-mari', title: 'Mari Setogaya', type: 'Personaje' },
      { id: 'card-tiffany', title: 'Tiffany Preston', type: 'Personaje' }
    ];

    const cards = getScenarioCards(risingAnEmpireScenario, { scenarioId: 'scenario-1788184012289' }, { cards: realAppDataCards }, null);
    const titles = cards.map(c => c.title);

    expect(titles).toHaveLength(7);
    expect(titles).toContain('Mazmorras errantes');
    expect(titles).toContain('Mazmorras Durmientes');
    expect(titles).toContain('Bestiálidos');
    expect(titles).toContain('Elfos');
    expect(titles).toContain('Goblinoides');
    expect(titles).toContain('Medianos');
    expect(titles).toContain('Humanos');

    // Strict sandbox: foreign entities MUST NEVER appear
    expect(titles).not.toContain('Mujer Leporina');
    expect(titles).not.toContain('Equido Uniformado');
    expect(titles).not.toContain('Mari Setogaya');
    expect(titles).not.toContain('Tiffany Preston');
  });

  describe('resolveUserCharacter Tests', () => {
    const mockCards = [
      { id: 'card-lucius-id', title: 'Lucius Lukerna', type: 'Personaje' },
      { id: 'card-azgael-id', title: 'Azgael', type: 'Personaje' }
    ];
    const mockData = { cards: mockCards };

    test('resolves user character when characterId stores the card title string', () => {
      const chatWithTitle = { characterId: 'Lucius Lukerna' };
      const resolved = resolveUserCharacter(chatWithTitle, mockData);
      expect(resolved).not.toBeNull();
      expect(resolved.id).toBe('card-lucius-id');
      expect(resolved.title).toBe('Lucius Lukerna');
    });

    test('resolves user character when characterId stores the card ID', () => {
      const chatWithId = { characterId: 'card-azgael-id' };
      const resolved = resolveUserCharacter(chatWithId, mockData);
      expect(resolved).not.toBeNull();
      expect(resolved.id).toBe('card-azgael-id');
      expect(resolved.title).toBe('Azgael');
    });

    test('resolves user character via userCharacterName or userCharacterId', () => {
      const chatWithUserChar = { userCharacterName: 'Lucius Lukerna' };
      const resolved = resolveUserCharacter(chatWithUserChar, mockData);
      expect(resolved).not.toBeNull();
      expect(resolved.title).toBe('Lucius Lukerna');
    });

    test('returns null gracefully when character cannot be found', () => {
      const chatUnknown = { characterId: 'NonExistent' };
      expect(resolveUserCharacter(chatUnknown, mockData)).toBeNull();
      expect(resolveUserCharacter(null, mockData)).toBeNull();
    });
  });

  describe('Scenario Multiple Initial Messages & Context Isolation', () => {
    test('normalizes legacy scenario with only presentation string into default single tab', () => {
      const legacyScenario = {
        id: 'sc-legacy',
        title: 'Castillo Abandonado',
        presentation: 'Llegas a las puertas del castillo bajo una tormenta.'
      };

      const tabs = normalizeInitialMessages(legacyScenario);
      expect(tabs).toHaveLength(1);
      expect(tabs[0].title).toBe('Inicio 1');
      expect(tabs[0].text).toBe('Llegas a las puertas del castillo bajo una tormenta.');

      const activeText = getActiveInitialMessageText(legacyScenario);
      expect(activeText).toBe('Llegas a las puertas del castillo bajo una tormenta.');
    });

    test('correctly selects active initial message when activeInitialMessageId is specified', () => {
      const multiScenario = {
        id: 'sc-multi',
        title: 'Mundo Dividido',
        initialMessages: [
          { id: 'init-standard', title: 'Inicio Clásico', text: 'Empiezas en el gremio de aventureros.' },
          { id: 'init-stealth', title: 'Ruta Sigilosa', text: 'Te infiltras por las cloacas reales.' },
          { id: 'init-prison', title: 'Escape de Prisión', text: 'Despiertas encadenado en la mazmorra.' }
        ],
        activeInitialMessageId: 'init-stealth'
      };

      const active = getActiveInitialMessage(multiScenario);
      expect(active.id).toBe('init-stealth');
      expect(active.title).toBe('Ruta Sigilosa');
      expect(active.text).toBe('Te infiltras por las cloacas reales.');

      const activeText = getActiveInitialMessageText(multiScenario);
      expect(activeText).toBe('Te infiltras por las cloacas reales.');
      // CRITICAL: Must not bleed text from other tabs
      expect(activeText).not.toContain('gremio');
      expect(activeText).not.toContain('encadenado');
    });

    test('falls back to first tab if activeInitialMessageId does not match any tab', () => {
      const scenario = {
        id: 'sc-test',
        initialMessages: [
          { id: 'init-1', title: 'Inicio 1', text: 'Primer inicio.' },
          { id: 'init-2', title: 'Inicio 2', text: 'Segundo inicio.' }
        ],
        activeInitialMessageId: 'non-existent-id'
      };

      const activeText = getActiveInitialMessageText(scenario);
      expect(activeText).toBe('Primer inicio.');
    });

    test('handles empty scenario gracefully', () => {
      expect(getActiveInitialMessageText(null)).toBe('');
      expect(getActiveInitialMessageText({})).toBe('');
      const normalized = normalizeInitialMessages(null);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].text).toBe('');
    });
  });
});

