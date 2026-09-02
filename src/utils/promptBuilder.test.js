import {
  formatEntityEntry,
  formatNarratorProfile,
  formatNarratorTools,
  formatPlayerDossier,
  formatPlayerInventory,
  formatScenarioEntities,
  buildStorytellerSystemPrompt
} from './promptBuilder';

describe('promptBuilder Utilities', () => {
  test('formatEntityEntry formats location and character cards cleanly', () => {
    const card = {
      title: 'Vallebruma',
      intro: 'Un valle místico cubierto de niebla.',
      text: 'Lugar sagrado de los druidas.',
      traits: ['Místico', 'Antiguo'],
      tags: ['valle', 'magia']
    };
    const formatted = formatEntityEntry(card, 'LOCATION');
    expect(formatted).toContain('--- [LOCATION: Vallebruma] ---');
    expect(formatted).toContain('Summary / Introduction: Un valle místico');
    expect(formatted).toContain('Personality & Traits: Místico, Antiguo');
  });

  test('formatNarratorProfile formats active GM profile', () => {
    const narrator = {
      name: 'Vaelin',
      bio: 'Narrador épico',
      style: 'Oscuro y poético',
      tone: 'Solemne'
    };
    const formatted = formatNarratorProfile(narrator);
    expect(formatted).toContain('[ACTIVE GAME MASTER / NARRATOR PROFILE]');
    expect(formatted).toContain('Name: Vaelin');
    expect(formatted).toContain('Prose Style: Oscuro y poético');
  });

  test('formatNarratorTools formats modular tools from workshop', () => {
    const tools = [
      {
        id: 't-1',
        name: 'Barra de Cordura',
        toolType: 'attributes',
        config: {
          attributes: [{ name: 'Cordura', current: 80, max: 100, color: '#c084fc' }]
        }
      }
    ];
    const formatted = formatNarratorTools(tools);
    expect(formatted).toContain('[MODULAR GAME MECHANICS & TOOL WORKSHOP]');
    expect(formatted).toContain('TOOL: Barra de Cordura (ATTRIBUTES)');
  });

  test('formatPlayerDossier protects and formats player persona', () => {
    const userChar = {
      title: 'Azgael',
      intro: 'Guerrero de la forja',
      traits: ['Valiente', 'Leal']
    };
    const formatted = formatPlayerDossier(userChar);
    expect(formatted).toContain('[PLAYER CHARACTER DOSSIER ({{user}})]');
    expect(formatted).toContain('Name: Azgael');
  });

  test('formatScenarioEntities excludes user persona cards from NPC pool', () => {
    const entities = [
      { id: '1', title: 'Garrison', type: 'Lugar' },
      { id: '2', title: 'Garrick', type: 'Personaje' },
      { id: '3', title: 'Azgael', type: 'Personaje', characterRole: 'user_persona' }
    ];
    const formatted = formatScenarioEntities(entities);
    expect(formatted).toContain('Garrison');
    expect(formatted).toContain('Garrick');
    expect(formatted).not.toContain('[NPC / CHARACTER: Azgael]');
  });

  test('buildStorytellerSystemPrompt assembles full coherent harness with protagonist protection', () => {
    const prompt = buildStorytellerSystemPrompt({
      scenario: { title: 'Tierra de Bestias', intro: 'Mundo salvaje' },
      userChar: { title: 'Azgael' },
      messages: [{ from: 'user', text: 'Hola' }]
    });

    expect(prompt).toContain('[CRITICAL PROTAGONIST / PLAYER IDENTIFICATION ({{user}})]');
    expect(prompt).toContain('The HUMAN PLAYER (Protagonist) is: "Azgael"');
    expect(prompt).toContain('ABSOLUTELY FORBIDDEN to name any NPC, creature, or world character "Azgael"');
  });

  test('buildStorytellerSystemPrompt anchors in media res scene state to prevent context drift', () => {
    const prompt = buildStorytellerSystemPrompt({
      scenario: { title: 'Tierra de Bestias' },
      userChar: { title: 'Vampiro' },
      messages: [{ from: 'user', text: 'coloco el sable en su yugular' }],
      sceneContext: {
        turn: 3,
        primaryTarget: 'Lobo Gris',
        targetType: 'Criatura',
        targetTraits: ['Feroz', 'Depredador'],
        activeLocation: 'Claro en la llanura',
        timeOfDay: 'Amanecer',
        weather: 'Viento fuerte'
      }
    });

    expect(prompt).toContain('[ESTADO ACTUAL DE LA ESCENA IN MEDIA RES - ANCLAJE DE COHERENCIA]');
    expect(prompt).toContain('SECUENCIA / TURNO ACTUAL: #3.');
    expect(prompt).toContain('MOMENTO DEL DÍA: "Amanecer".');
    expect(prompt).toContain('CLIMA / CONDICIÓN ATMOSFÉRICA: "Viento fuerte".');
    expect(prompt).toContain('FOCO PRINCIPAL Y OBJETIVO DE LA ACCIÓN: "Lobo Gris" (Criatura) [Rasgos: Feroz, Depredador]');
    expect(prompt).toContain('ENTORNO FÍSICO INMEDIATO: "Claro en la llanura"');
    expect(prompt).toContain('QUEDA TERMINANTEMENTE PROHIBIDO sustituir, transformar o convertir a este sujeto');
    expect(prompt).toContain('QUEDA TERMINANTEMENTE PROHIBIDO alterar repentinamente el entorno físico, el clima o el momento del día');
  });

  test('buildStorytellerSystemPrompt strictly eliminates synthetic <think> scratchpads and 4-phase reasoning', () => {
    const prompt = buildStorytellerSystemPrompt({
      scenario: { title: 'Tierra de Bestias' },
      userChar: { title: 'Azgael' },
      messages: [{ from: 'user', text: 'Avanzo con cautela.' }]
    });

    expect(prompt).not.toContain('<think>');
    expect(prompt).not.toContain('</think>');
    expect(prompt).not.toContain('FASE 1: PLANIFICACIÓN');
    expect(prompt).not.toContain('FASE 2: REDACCIÓN');
    expect(prompt).not.toContain('AUTO-CRÍTICA');
    expect(prompt).not.toContain('SALIDA FINAL');

    // Asserts strict 3rd person narrative rule
    expect(prompt).toContain('STRICT THIRD-PERSON');
    expect(prompt).toContain('FORBIDDEN to use invasive second-person style');
  });
});

