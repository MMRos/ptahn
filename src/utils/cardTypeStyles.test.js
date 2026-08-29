import { getCardTypeStyle, CARD_TYPE_CONFIG } from './cardTypeStyles';

describe('Card Type Styles & Chromatic Palette (F031)', () => {
  test('returns correct styles for standard types', () => {
    expect(getCardTypeStyle('Personaje').key).toBe('Personaje');
    expect(getCardTypeStyle('Personaje').icon).toBe('🎭');
    expect(getCardTypeStyle('Personaje').color).toBe('#818cf8');

    expect(getCardTypeStyle('Lugar').key).toBe('Lugar');
    expect(getCardTypeStyle('Lugar').icon).toBe('🏛️');
    expect(getCardTypeStyle('Lugar').color).toBe('#22d3ee');

    expect(getCardTypeStyle('Objeto').key).toBe('Objeto');
    expect(getCardTypeStyle('Objeto').icon).toBe('📦');
    expect(getCardTypeStyle('Objeto').color).toBe('#ffd36b');
  });

  test('returns correct styles for Criatura, Raza, Facción, Regla, Memoria, Inventario', () => {
    expect(getCardTypeStyle('Criatura').key).toBe('Criatura');
    expect(getCardTypeStyle('Criatura').icon).toBe('🐉');
    expect(getCardTypeStyle('Criatura').color).toBe('#a3e635');

    expect(getCardTypeStyle('Raza').key).toBe('Raza');
    expect(getCardTypeStyle('Raza').icon).toBe('🐾');
    expect(getCardTypeStyle('Raza').color).toBe('#fb923c');

    expect(getCardTypeStyle('Facción').key).toBe('Facción');
    expect(getCardTypeStyle('Facción').icon).toBe('🛡️');
    expect(getCardTypeStyle('Facción').color).toBe('#f87171');

    expect(getCardTypeStyle('faccion').key).toBe('Facción');

    expect(getCardTypeStyle('Memoria').key).toBe('Memoria');
    expect(getCardTypeStyle('Memoria').icon).toBe('🧠');

    expect(getCardTypeStyle('Inventario').key).toBe('Inventario');
    expect(getCardTypeStyle('Inventario').icon).toBe('🎒');

    expect(getCardTypeStyle('Regla').key).toBe('Regla');
    expect(getCardTypeStyle('Regla').icon).toBe('📜');
  });

  test('handles unknown, empty or undefined types gracefully with fallback to Otros', () => {
    expect(getCardTypeStyle('').key).toBe('Otros');
    expect(getCardTypeStyle(null).key).toBe('Otros');
    expect(getCardTypeStyle(undefined).key).toBe('Otros');
    expect(getCardTypeStyle('TipoDesconocido').key).toBe('Otros');
    expect(getCardTypeStyle('Otros').icon).toBe('✨');
  });
});
