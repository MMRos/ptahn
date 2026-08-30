import { enhanceFieldWithAI, autoCompleteEntityWithAI } from './aiEnhancer';
import * as localAIStudio from './localAIStudio';

jest.mock('./localAIStudio', () => ({
  getBaseUrl: jest.fn(() => 'http://localhost:3001'),
  resolveIntermediaryModelId: jest.fn(() => Promise.resolve('test-model-id')),
  apiFetch: jest.fn()
}));

jest.mock('./aiLogEmitter', () => ({
  emitAILog: jest.fn()
}));

describe('aiEnhancer utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enhanceFieldWithAI handles title and lore enhancement', async () => {
    localAIStudio.apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '<think>reasoning</think> "Valerius el Justo"' } }]
      })
    });

    const result = await enhanceFieldWithAI({
      fieldType: 'title',
      entityType: 'Personaje',
      entityContext: { intro: 'Un caballero andante' }
    });

    expect(result).toBe('Valerius el Justo');
  });

  test('enhanceFieldWithAI parses traits as list', async () => {
    localAIStudio.apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Valiente, Astuto, Melancólico, Tsundere' } }]
      })
    });

    const traits = await enhanceFieldWithAI({
      fieldType: 'traits',
      entityType: 'Personaje',
      entityContext: { title: 'Valerius' }
    });

    expect(Array.isArray(traits)).toBe(true);
    expect(traits).toContain('Valiente');
    expect(traits).toContain('Astuto');
    expect(traits.length).toBe(4);
  });

  test('autoCompleteEntityWithAI returns complete entity JSON', async () => {
    const mockJson = {
      title: 'El Refugio Olvidado',
      intro: 'Un santuario antiguo oculto en el bosque.',
      text: 'Piedras cubiertas de musgo y runas titilantes.',
      traits: ['Místico', 'Pacífico'],
      tags: ['Fantasía', 'Lugar Sagrado'],
      callWords: ['santuario', 'refugio']
    };

    localAIStudio.apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockJson) } }]
      })
    });

    const entity = await autoCompleteEntityWithAI({
      entityType: 'Lugar',
      title: 'El Refugio'
    });

    expect(entity.title).toBe('El Refugio Olvidado');
    expect(entity.intro).toContain('santuario');
    expect(entity.tags).toContain('Fantasía');
  });
});
