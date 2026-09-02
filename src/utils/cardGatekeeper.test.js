import {
  isEntityEligibleForAutoCard,
  countEntityMentions,
  isIncidentalWildCreature
} from './cardGatekeeper';

describe('cardGatekeeper Utility (F046)', () => {
  const sampleMessages = [
    { from: 'narrator', text: 'El viento aúlla sobre Vallebruma mientras Garrick prepara su forja.' },
    { from: 'user', text: 'Me acerco a Garrick y le pregunto por el lobo.' },
    { from: 'narrator', text: 'De repente, un gran lobo gris surge de entre la maleza gruñendo.' },
    { from: 'user', text: 'Garrick, retrocede mientras desenvaino mi sable.' },
    { from: 'narrator', text: 'Garrick asiente y toma su martillo con firmeza.' }
  ];

  test('isIncidentalWildCreature identifies common wild animals and generic encounters', () => {
    expect(isIncidentalWildCreature({ title: 'Lobo Gris', type: 'Personaje' })).toBe(true);
    expect(isIncidentalWildCreature({ title: 'Gran lobo', type: 'Personaje' })).toBe(true);
    expect(isIncidentalWildCreature({ title: 'Oso pardo', type: 'Personaje' })).toBe(true);
    expect(isIncidentalWildCreature({ title: 'Un guardia', type: 'Personaje' })).toBe(true);
    expect(isIncidentalWildCreature({ title: 'Bandido anónimo', type: 'Personaje' })).toBe(true);

    // Named characters or cataloged species should not be dismissed as incidental
    expect(isIncidentalWildCreature({ title: 'Garrick', type: 'Personaje' })).toBe(false);
    expect(isIncidentalWildCreature({ title: 'Lobo Huargo del Norte (Especie)', type: 'Raza', tags: ['Bestiario'] })).toBe(false);
  });

  test('countEntityMentions accurately counts occurrences across distinct messages', () => {
    expect(countEntityMentions('Garrick', sampleMessages)).toBe(4);
    expect(countEntityMentions('lobo', sampleMessages)).toBe(2);
    expect(countEntityMentions('Vallebruma', sampleMessages)).toBe(1);
    expect(countEntityMentions('Inexistente', sampleMessages)).toBe(0);
  });

  test('rejects individual wild animal encounters like "Lobo Gris"', () => {
    const wolfEntity = {
      title: 'Lobo Gris',
      type: 'Personaje',
      intro: 'Un lobo gris feroz.'
    };
    expect(isEntityEligibleForAutoCard(wolfEntity, sampleMessages)).toBe(false);
  });

  test('rejects named characters that appear in fewer than 3 messages', () => {
    const shortLivedNPC = {
      title: 'Elowen',
      type: 'Personaje',
      intro: 'Una viajera fugaz.'
    };
    // Elowen appears 0 times in sampleMessages
    expect(isEntityEligibleForAutoCard(shortLivedNPC, sampleMessages)).toBe(false);

    // Appears only in 2 messages
    const twoMessageNPC = { title: 'Viajero', type: 'Personaje' };
    const customMsgs = [
      { from: 'user', text: 'Hablo con el Viajero.' },
      { from: 'narrator', text: 'El Viajero asiente.' }
    ];
    expect(isEntityEligibleForAutoCard(twoMessageNPC, customMsgs, { minRecurrence: 3 })).toBe(false);
  });

  test('accepts named characters that appear in 3 or more distinct messages', () => {
    const recurringNPC = {
      title: 'Garrick',
      type: 'Personaje',
      intro: 'El herrero de la forja.'
    };
    // Garrick appears in 4 messages
    expect(isEntityEligibleForAutoCard(recurringNPC, sampleMessages, { minRecurrence: 3 })).toBe(true);
  });

  test('accepts settlements, towns, and notable locations immediately', () => {
    const settlement = {
      title: 'Vallebruma',
      type: 'Lugar',
      intro: 'Un asentamiento entre la niebla.'
    };
    expect(isEntityEligibleForAutoCard(settlement, sampleMessages)).toBe(true);
  });

  test('accepts mob types / species tagged as Bestiario only if not generic wild animals', () => {
    const bestiarySpecies = {
      title: 'Lobo Huargo de las Estepas (Especie)',
      type: 'Raza',
      tags: ['Bestiario', 'Fauna'],
      intro: 'Especie depredadora de las tundras heladas.'
    };
    expect(isEntityEligibleForAutoCard(bestiarySpecies, sampleMessages)).toBe(true);

    // Common individual wolves must NOT be admitted even if typed as Bestiario or Bestiálidos
    const genericWolfWithBestiaryTag = {
      title: 'El Lobo Gris',
      type: 'Bestiálidos',
      tags: ['Lobo', 'Bestiario'],
      intro: 'Un lobo gris feroz.'
    };
    expect(isEntityEligibleForAutoCard(genericWolfWithBestiaryTag, sampleMessages)).toBe(false);
  });

  test('rejects duplicate entities if title already exists in compendium/scenario existingCards', () => {
    const existingCards = [
      { id: 'c-1', title: 'La Taberna del Búho', type: 'Lugar' },
      { id: 'c-2', title: 'Garrick', type: 'Personaje' }
    ];

    const duplicateTavern = {
      title: 'La Taberna del Búho',
      type: 'Lugar',
      intro: 'Una taberna acogedora.'
    };
    expect(isEntityEligibleForAutoCard(duplicateTavern, sampleMessages, { existingCards })).toBe(false);

    const duplicateGarrick = {
      title: 'garrick',
      type: 'Personaje',
      intro: 'Herrero de Vallebruma.'
    };
    expect(isEntityEligibleForAutoCard(duplicateGarrick, sampleMessages, { existingCards, minRecurrence: 1 })).toBe(false);
  });

  test('rejects entity creation matching active player character / persona', () => {
    const userChar = {
      id: 'p-1',
      title: 'El Vampiro',
      name: 'El Vampiro'
    };

    const extractedPlayer = {
      title: 'El Vampiro',
      type: 'Personaje',
      intro: 'Un vampiro con sangre vieja y un sable.'
    };

    expect(isEntityEligibleForAutoCard(extractedPlayer, sampleMessages, { userChar, minRecurrence: 1 })).toBe(false);
  });
});

