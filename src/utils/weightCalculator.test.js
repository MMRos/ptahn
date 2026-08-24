import { 
  calculateCardRelevance, 
  filterAndSortRelevantCards,
  detectLexicalMatch
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
      activationMode: 'dynamic'
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
      activationMode: 'dynamic'
    },
    {
      id: 'card-4',
      title: 'Cripta Olvidada',
      name: 'Cripta Olvidada',
      type: 'Lugar',
      importance: 3,
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

    test('dynamic card computes balanced hybrid weight', () => {
      const card = { id: 'c-dyn', title: 'Eelyt', importance: 7, activationMode: 'dynamic' };
      const score = calculateCardRelevance(card, { recentText: 'Habló con Eelyt sobre el pedido', semanticScore: 0.85 });

      // Base importance (0.7 * 0.3 = 0.21) + lexical match (1.0 * 0.3 = 0.30) + semantic (0.85 * 0.4 = 0.34) = 0.85
      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('filterAndSortRelevantCards', () => {
    test('returns pinned cards first, followed by highest weighted cards up to maxLimit', () => {
      const recentText = 'Entró a La Forja Sagrada y vio a Eelyt la Artesana trabajando.';
      const semanticScores = {
        'card-1': 0.9,
        'card-3': 0.85,
        'card-2': 0.0,
        'card-4': 0.1
      };

      const result = filterAndSortRelevantCards(mockCards, {
        recentText,
        semanticScores,
        maxLimit: 3
      });

      expect(result.length).toBeLessThanOrEqual(3);
      // Pinned card 1 must be first
      expect(result[0].id).toBe('card-1');
      // Card 3 should be included next
      expect(result.some(c => c.id === 'card-3')).toBe(true);
      // Unmentioned strict card 2 should not be in the top
      expect(result.some(c => c.id === 'card-2')).toBe(false);
    });
  });
});
