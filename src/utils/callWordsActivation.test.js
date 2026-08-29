import { detectLexicalMatch, calculateCardRelevance } from './weightCalculator';
import { detectActiveCharacter } from './characterMatcher';

describe('Call Words (Llamadas / Keywords de Activación) Tests', () => {
  describe('detectLexicalMatch with callWords', () => {
    test('activates card when a callWord string matches in recent dialogue', () => {
      const card = {
        id: 'c-fosas',
        title: 'Las Fosas de Garrison',
        tags: ['Lugar'],
        callWords: ['fosas', 'incursión', 'grieta profunda']
      };

      const text = 'He decidido aventurarme en la grieta profunda hoy mismo.';
      const result = detectLexicalMatch(card, text);

      expect(result.matched).toBe(true);
      expect(result.matches).toContain('grieta profunda');
      expect(result.score).toBeGreaterThanOrEqual(0.8);
    });

    test('supports comma-separated string for callWords', () => {
      const card = {
        id: 'c-espada',
        title: 'Sable Équido',
        tags: ['Objeto'],
        callWords: 'sable, hoja curva, arma de bronce'
      };

      const text = 'Desenveino mi hoja curva listo para el combate.';
      const result = detectLexicalMatch(card, text);

      expect(result.matched).toBe(true);
      expect(result.matches).toContain('hoja curva');
    });

    test('calculates high relevance when call words match', () => {
      const card = {
        id: 'c-alfa',
        title: 'Jerarquía Alfa',
        importance: 5,
        callWords: ['líder de la manada', 'alfa']
      };

      const score = calculateCardRelevance(card, { recentText: 'El líder de la manada nos observa.' });
      expect(score).toBeGreaterThan(0.4);
    });
  });

  describe('detectActiveCharacter with callWords', () => {
    test('detects active character referenced by one of their callWords', () => {
      const characters = [
        {
          id: 'c-ranma',
          title: 'Ranma Saotome',
          callWords: ['chica de la trenza', 'pelirroja', 'artista marcial']
        },
        {
          id: 'c-azgael',
          title: 'Azgael',
          callWords: ['guerrero castaño', 'aventurero humano']
        }
      ];

      const messages = [
        { from: 'user', text: 'Miro a mi alrededor.' },
        { from: 'narrator', text: 'De pronto, la chica de la trenza salta sobre el tejado.' }
      ];

      const active = detectActiveCharacter(messages, characters);
      expect(active).toBeDefined();
      expect(active.title).toBe('Ranma Saotome');
    });
  });
});
