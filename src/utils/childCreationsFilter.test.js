import { isChildCard, getCardProvenance, filterCreationsCards } from './creationsFilter';

describe('Creations Card Filtering & Child Provenance (F030)', () => {
  const masterCard1 = {
    id: 'card-1',
    title: 'Azgael',
    type: 'Personaje',
    isMaster: true,
    parentId: null
  };

  const masterCard2 = {
    id: 'card-2',
    title: 'Garrison',
    type: 'Lugar',
    parentId: null
  };

  const childCard1 = {
    id: 'card-child-1',
    title: 'Azgael (Tierra de Bestias)',
    type: 'Personaje',
    parentId: 'card-1',
    scenarioId: 'scenario-tierra-bestias',
    scenarioName: 'Tierra de Bestias',
    chatId: 'chat-101',
    chatName: 'Partida Principal'
  };

  const childCard2 = {
    id: 'card-child-2',
    title: 'Azgael (Prólogo)',
    type: 'Personaje',
    parentId: 'card-1',
    scenarioId: 'scenario-prologo',
    scenarioName: 'El Prólogo Oscuro'
  };

  const allCards = [masterCard1, masterCard2, childCard1, childCard2];

  test('isChildCard accurately identifies master archetypes vs child instances', () => {
    expect(isChildCard(masterCard1)).toBe(false);
    expect(isChildCard(masterCard2)).toBe(false);
    expect(isChildCard(childCard1)).toBe(true);
    expect(isChildCard(childCard2)).toBe(true);
  });

  test('getCardProvenance formats scenario and chat provenance badges', () => {
    const provMaster = getCardProvenance(masterCard1);
    expect(provMaster.isChild).toBe(false);

    const provChild1 = getCardProvenance(childCard1);
    expect(provChild1.isChild).toBe(true);
    expect(provChild1.scenarioName).toBe('Tierra de Bestias');
    expect(provChild1.chatId).toBe('chat-101');
    expect(provChild1.formattedLabel).toContain('Tierra de Bestias');
    expect(provChild1.formattedLabel).toContain('Partida Principal');

    const provChild2 = getCardProvenance(childCard2);
    expect(provChild2.isChild).toBe(true);
    expect(provChild2.scenarioName).toBe('El Prólogo Oscuro');
    expect(provChild2.formattedLabel).toBe('🔗 Escenario: El Prólogo Oscuro');
  });

  test('filterCreationsCards excludes child versions by default (showChildVersions: false)', () => {
    const result = filterCreationsCards(allCards, { showChildVersions: false });
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toEqual(['card-1', 'card-2']);
  });

  test('filterCreationsCards includes child versions when showChildVersions: true', () => {
    const result = filterCreationsCards(allCards, { showChildVersions: true });
    expect(result).toHaveLength(4);
    expect(result.some(c => c.id === 'card-child-1')).toBe(true);
    expect(result.some(c => c.id === 'card-child-2')).toBe(true);
  });

  test('filterCreationsCards applies search query and type filter alongside child filter', () => {
    const result = filterCreationsCards(allCards, {
      showChildVersions: true,
      cardTypeFilter: 'Personaje',
      searchQuery: 'Bestias'
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-child-1');
  });
});
