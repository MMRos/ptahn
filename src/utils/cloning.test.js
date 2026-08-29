import { cloneCard, cloneScenario } from './cloning';

describe('Frontend Card & Scenario Cloning / Duplication Tests', () => {
  const sampleCard = {
    id: 'c-card-original',
    title: 'Espada Rúnica',
    type: 'Objeto',
    subtype: 'Arma',
    text: 'Espada antigua forjada con runas arcanas.',
    tags: ['Magia', 'Arma'],
    callWords: ['espada rúnica', 'hoja arcana'],
    creatorId: 'usr-1',
    creatorName: 'Azgael',
    creatorKey: 'PTAH-1111'
  };

  const sampleScenario = {
    id: 'sc-original',
    title: 'Mundo Sumergido',
    description: 'Un reino bajo las aguas cristalinas.',
    cards: ['c-card-original'],
    creatorId: 'usr-1',
    creatorName: 'Azgael'
  };

  test('cloneCard creates a new independent Master Archetype with a unique ID and Copia title', () => {
    const cloned = cloneCard(sampleCard, { creatorId: 'usr-2', creatorName: 'Cloner' });

    expect(cloned.id).toBeDefined();
    expect(cloned.id).not.toBe(sampleCard.id);
    expect(cloned.title).toBe('Espada Rúnica (Copia)');
    expect(cloned.creatorId).toBe('usr-2');
    expect(cloned.creatorName).toBe('Cloner');
    expect(cloned.text).toBe(sampleCard.text);
    expect(cloned.callWords).toEqual(['espada rúnica', 'hoja arcana']);
    expect(cloned.tags).toEqual(['Magia', 'Arma']);
  });

  test('cloneScenario creates a new independent Scenario with its own ID and Copia title', () => {
    const cloned = cloneScenario(sampleScenario, { creatorId: 'usr-2', creatorName: 'Cloner' });

    expect(cloned.id).toBeDefined();
    expect(cloned.id).not.toBe(sampleScenario.id);
    expect(cloned.title).toBe('Mundo Sumergido (Copia)');
    expect(cloned.creatorId).toBe('usr-2');
    expect(cloned.cards).toEqual(['c-card-original']);
  });
});
