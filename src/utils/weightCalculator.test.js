import { 
  calculateCardRelevance, 
  filterAndSortRelevantCards,
  detectLexicalMatch,
  propagateRelationshipWeights
} from './weightCalculator';

describe('weightCalculator utility', () => {
  const mockCards = [
    {
      id: 'card-1',
      title: 'La Forja Sagrada',
      name: 'La Forja Sagrada',
      type: 'Lugar',
      importance: 8,
      isPinned: true,
      activationMode: 'dynamic',
      connections: [
        { targetId: 'card-3', relationType: 'artesana', weightMultiplier: 0.8 }
      ]
    },
    {
      id: 'card-2',
      title: 'Espada de Ébano',
      name: 'Espada de Ébano',
      type: 'Objeto',
      importance: 5,
      isPinned: false,
      activationMode: 'strict_mention'
    },
    {
      id: 'card-3',
      title: 'Eelyt la Artesana',
      name: 'Eelyt la Artesana',
      type: 'Personaje',
      importance: 7,
      isPinned: false,
      activationMode: 'dynamic',
      callWords: ['la herrera', 'artesana de la forja'],
      connections: [
        { targetId: 'card-5', relationType: 'raza', weightMultiplier: 0.9 }
      ]
    },
    {
      id: 'card-4',
      title: 'Cripta Olvidada',
      name: 'Cripta Olvidada',
      type: 'Lugar',
      importance: 3,
      isPinned: false,
      activationMode: 'dynamic'
    },
    {
      id: 'card-5',
      title: 'Raza Dracónica',
      name: 'Raza Dracónica',
      type: 'Lore',
      importance: 4,
      isPinned: false,
      activationMode: 'dynamic'
    }
  ];

  describe('detectLexicalMatch', () => {
    test('detects exact title and partial name matches in text', () => {
      const card = { title: 'Espada de Ébano', tags: ['espada', 'ébano'] };
      const text = 'Desenfundó su Espada de Ébano para defender el taller.';

      const result = detectLexicalMatch(card, text);
      expect(result.matched).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });

    test('detects callWords matches in text', () => {
      const card = { title: 'Eelyt', callWords: ['la herrera', 'maestra del yunque'] };
      const text = 'Fue a ver a la herrera para reparar su armadura.';

      const result = detectLexicalMatch(card, text);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.9);
      expect(result.matches).toContain('la herrera');
    });

    test('returns false when no entity matches are present', () => {
      const card = { title: 'Cripta Olvidada' };
      const text = 'Caminó por el bosque bajo la lluvia.';

      const result = detectLexicalMatch(card, text);
      expect(result.matched).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('calculateCardRelevance', () => {
    test('pinned card always has Infinity score', () => {
      const card = { id: 'c-pin', title: 'Ancla', isPinned: true };
      const score = calculateCardRelevance(card, { recentText: 'hola', semanticScore: 0 });

      expect(score).toBe(Infinity);
    });

    test('strict_mention card without mention gets 0', () => {
      const card = { id: 'c-strict', title: 'Daga Oculta', activationMode: 'strict_mention', importance: 10 };
      const score = calculateCardRelevance(card, { recentText: 'Paseando por la plaza', semanticScore: 0.9 });

      expect(score).toBe(0);
    });

    test('strict_mention card with mention gets computed score', () => {
      const card = { id: 'c-strict', title: 'Daga Oculta', activationMode: 'strict_mention', importance: 8 };
      const score = calculateCardRelevance(card, { recentText: 'Sujeta la Daga Oculta firmemente', semanticScore: 0.8 });

      expect(score).toBeGreaterThan(0);
    });

    test('dynamic card computes balanced hybrid weight when mentioned', () => {
      const card = { id: 'c-dyn', title: 'Eelyt', importance: 7, activationMode: 'dynamic' };
      const score = calculateCardRelevance(card, { recentText: 'Habló con Eelyt sobre el pedido', semanticScore: 0.85 });

      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    test('dynamic card without lexical mention and zero or low semantic affinity returns 0 (no false activation)', () => {
      const card = { id: 'c-dungeon', title: 'Mazmorras errantes', importance: 8, activationMode: 'dynamic' };
      const scoreZero = calculateCardRelevance(card, { recentText: 'El lobo gruñe en la llanura bajo el cielo naranja', semanticScore: 0 });
      const scoreLow = calculateCardRelevance(card, { recentText: 'El lobo gruñe en la llanura bajo el cielo naranja', semanticScore: 0.25 });

      expect(scoreZero).toBe(0);
      expect(scoreLow).toBe(0);
    });

    test('dynamic card without lexical mention activates when semanticScore >= 0.40', () => {
      const card = { id: 'c-beast', title: 'Bestiario de Lobos', importance: 5, activationMode: 'dynamic' };
      const scoreHigh = calculateCardRelevance(card, { recentText: 'Una fiera salvaje de cuatro patas acecha entre las sombras', semanticScore: 0.65 });

      expect(scoreHigh).toBeGreaterThan(0.3);
    });
  });

  describe('propagateRelationshipWeights', () => {
    test('propagates weight to connected entities when origin entity is active', () => {
      const scoredCards = [
        {
          card: {
            id: 'char-mari',
            title: 'Mari',
            connections: [{ targetId: 'race-dragonkin', relationType: 'raza', weightMultiplier: 0.8 }]
          },
          finalWeight: 0.8
        },
        {
          card: {
            id: 'race-dragonkin',
            title: 'Raza Dracónica',
            connections: []
          },
          finalWeight: 0.1
        }
      ];

      const propagated = propagateRelationshipWeights(scoredCards, { decayFactor: 0.7 });
      const raceCard = propagated.find(p => p.card.id === 'race-dragonkin');

      // Expected induced weight: 0.8 * 0.8 * 0.7 = 0.448
      expect(raceCard.inducedWeight).toBeCloseTo(0.448, 2);
      expect(raceCard.finalWeight).toBeGreaterThan(0.4);
    });
    test('propagates weight via connectedCards array of IDs/names', () => {
      const scoredCards = [
        {
          card: {
            id: 'char-lyra',
            title: 'Lyra',
            connectedCards: ['place-sanctuary', 'item-relic']
          },
          finalWeight: 0.9
        },
        {
          card: {
            id: 'place-sanctuary',
            title: 'Santuario Olvidado',
            connectedCards: []
          },
          finalWeight: 0.0
        },
        {
          card: {
            id: 'item-relic',
            title: 'Reliquia Solar',
            connectedCards: []
          },
          finalWeight: 0.0
        }
      ];

      const propagated = propagateRelationshipWeights(scoredCards, { decayFactor: 0.7 });
      const sanctuary = propagated.find(p => p.card.id === 'place-sanctuary');
      const relic = propagated.find(p => p.card.id === 'item-relic');

      expect(sanctuary.inducedWeight).toBeGreaterThan(0.4);
      expect(sanctuary.finalWeight).toBeGreaterThan(0.4);
      expect(relic.inducedWeight).toBeGreaterThan(0.4);
    });
  });

  describe('filterAndSortRelevantCards', () => {
    test('returns pinned cards first, followed by highest weighted cards including graph connections', () => {
      // Mention Eelyt by callWord, which is connected to Raza Dracónica (card-5)
      const recentText = 'Buscó a la herrera en su taller.';
      const semanticScores = {
        'card-1': 0.5,
        'card-3': 0.8,
        'card-5': 0.0
      };

      const result = filterAndSortRelevantCards(mockCards, {
        recentText,
        semanticScores,
        maxLimit: 4
      });

      // Pinned card-1 must be included
      expect(result.some(c => c.id === 'card-1')).toBe(true);
      // Mentioned card-3 (via callWord "la herrera") must be included
      expect(result.some(c => c.id === 'card-3')).toBe(true);
      // Connected card-5 should receive induced weight from card-3 and be included
      expect(result.some(c => c.id === 'card-5')).toBe(true);
      // Strict unmentioned card-2 should not be included
      expect(result.some(c => c.id === 'card-2')).toBe(false);
    });

    test('returns empty array when no cards are mentioned, none are pinned, and semanticScores are below activation threshold (Branch 3a)', () => {
      const unpinnedCards = mockCards.filter(c => !c.isPinned);
      const text = 'Caminó por la llanura solitaria bajo el viento frío.';
      const semanticScores = {
        'card-2': 0.1,
        'card-3': 0.15,
        'card-4': 0.05,
        'card-5': 0.2
      };

      const result = filterAndSortRelevantCards(unpinnedCards, {
        recentText: text,
        semanticScores,
        maxLimit: 5
      });

      // Branch 3a: Zero cards invoked -> returns empty array
      expect(result).toHaveLength(0);
    });
  });
});
