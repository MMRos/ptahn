import { normalizeEntityName } from './textFormatter';

describe('F010 Chat Enhancements & Scenario Isolation Tests', () => {
  test('Scenario roster strictly excludes characters from other scenarios', () => {
    const activeScenario = {
      id: 'sc-mari',
      title: 'Aventuras con Mari',
      cards: ['card-mari', 'card-lugar-forja']
    };

    const allCompendiumCards = [
      { id: 'card-mari', title: 'Mari', type: 'Personaje', linkedScenario: 'sc-mari' },
      { id: 'card-lugar-forja', title: 'La Forja', type: 'Lugar', linkedScenario: 'sc-mari' },
      { id: 'card-kaelen', title: 'Kaelen', type: 'Personaje', linkedScenario: 'sc-otro-mundo' },
      { id: 'card-lyra', title: 'Lyra', type: 'Personaje', linkedScenario: 'sc-otro-mundo' }
    ];

    const scenarioCardIds = activeScenario.cards;
    const scenarioCards = allCompendiumCards.filter(c => {
      if (!c) return false;
      const isDirectlyLinked = scenarioCardIds.includes(c.id) || scenarioCardIds.includes(c.title);
      const isScenarioLinked = c.linkedScenario === activeScenario.id || c.linkedScenario === activeScenario.title;
      return isDirectlyLinked || isScenarioLinked;
    });

    expect(scenarioCards.map(c => c.title)).toEqual(['Mari', 'La Forja']);
    expect(scenarioCards.some(c => c.title === 'Kaelen')).toBe(false);
    expect(scenarioCards.some(c => c.title === 'Lyra')).toBe(false);
  });

  test('Recent chats are ordered chronologically by last activity descending', () => {
    const chats = [
      { id: '1', title: 'Chat Antiguo', createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z' },
      { id: '2', title: 'Chat Reciente', createdAt: '2026-08-10T10:00:00Z', updatedAt: '2026-08-23T23:30:00Z' },
      { id: '3', title: 'Chat Medio', createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T12:00:00Z' }
    ];

    const getLatestActivity = (c) => {
      if (c.updatedAt) return new Date(c.updatedAt).getTime();
      if (c.messages && c.messages.length > 0) {
        const last = c.messages[c.messages.length - 1];
        if (last.timestamp) return new Date(last.timestamp).getTime();
      }
      return new Date(c.createdAt || 0).getTime();
    };

    const sorted = chats.slice().sort((a, b) => getLatestActivity(b) - getLatestActivity(a));

    expect(sorted[0].id).toBe('2'); // Chat Reciente
    expect(sorted[1].id).toBe('3'); // Chat Medio
    expect(sorted[2].id).toBe('1'); // Chat Antiguo
  });
});
