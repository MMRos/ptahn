import { getScenarioCards } from '../components/ChatView';

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
});
