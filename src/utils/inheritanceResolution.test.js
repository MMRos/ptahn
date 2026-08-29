import { resolveEntityInheritance, resolveAllScenarioCards } from './inheritance';

describe('Frontend Prototype Inheritance & Delta Overrides (Parent ➔ Child)', () => {
  const masterCompendium = [
    {
      id: 'c-master-ranma',
      title: 'Ranma Saotome',
      type: 'Personaje',
      intro: 'Heredero del estilo de artes marciales Saotome.',
      text: 'Experto en combate. Cuando se moja con agua fría se convierte en mujer.',
      traits: ['Orgulloso', 'Competitivo'],
      inventory: ['Cinturón negro', 'Gi de combate'],
      callWords: ['Ranma', 'Saotome'],
      cover: '/api/storage/images/ranma_master.jpg'
    },
    {
      id: 'c-master-dojo',
      title: 'Dojo Tendo',
      type: 'Lugar',
      intro: 'Dojo tradicional en Nerima.',
      text: 'Suelo de madera pulida, altar tradicional y patio con estanque.',
      callWords: ['Dojo', 'Tendo', 'tatami']
    }
  ];

  test('resolveEntityInheritance merges parent archetype with child delta overrides', () => {
    const childInstance = {
      id: 'inst-ranma-female',
      parentId: 'c-master-ranma',
      scenarioId: 'sc-nerima-1',
      overrides: {
        title: 'Ranma (Chica)',
        traits: ['Tsundere', 'Ágil', 'Voz femenina'],
        inventory: ['Tetera de agua caliente'],
        cover: '/api/storage/images/ranma_female.jpg',
        callWords: ['Ranma chica', 'pelirroja']
      }
    };

    const resolved = resolveEntityInheritance(childInstance, masterCompendium);

    expect(resolved.id).toBe('inst-ranma-female');
    expect(resolved.parentId).toBe('c-master-ranma');
    expect(resolved.title).toBe('Ranma (Chica)'); // Overridden
    expect(resolved.cover).toBe('/api/storage/images/ranma_female.jpg'); // Overridden
    expect(resolved.traits).toEqual(['Tsundere', 'Ágil', 'Voz femenina']); // Overridden
    expect(resolved.inventory).toEqual(['Tetera de agua caliente']); // Overridden
    expect(resolved.callWords).toEqual(['Ranma chica', 'pelirroja']); // Overridden
    expect(resolved.intro).toBe('Heredero del estilo de artes marciales Saotome.'); // Inherited from Parent
    expect(resolved.text).toBe('Experto en combate. Cuando se moja con agua fría se convierte en mujer.'); // Inherited from Parent
  });

  test('resolveEntityInheritance leaves non-child entities intact', () => {
    const regularCard = masterCompendium[1];
    const resolved = resolveEntityInheritance(regularCard, masterCompendium);
    expect(resolved).toEqual(regularCard);
  });

  test('resolveAllScenarioCards resolves an entire array of mixed master cards and child instances', () => {
    const scenarioCards = [
      masterCompendium[1], // Dojo Tendo (Direct Master)
      {
        id: 'inst-ranma-female',
        parentId: 'c-master-ranma',
        overrides: {
          title: 'Ranma (Chica)'
        }
      }
    ];

    const resolvedList = resolveAllScenarioCards(scenarioCards, masterCompendium);
    expect(resolvedList.length).toBe(2);
    expect(resolvedList[0].title).toBe('Dojo Tendo');
    expect(resolvedList[1].title).toBe('Ranma (Chica)');
    expect(resolvedList[1].text).toContain('Experto en combate');
  });
});
