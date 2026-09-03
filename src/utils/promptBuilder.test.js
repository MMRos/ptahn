import {
  formatEntityEntry,
  formatNarratorProfile,
  formatNarratorTools,
  formatPlayerDossier,
  formatPlayerInventory,
  formatScenarioEntities,
  buildStorytellerSystemPrompt,
  buildRecencyGuidanceHook
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
    expect(prompt).toContain('CONTINUIDAD Y CAUSALIDAD FÍSICA:');
    expect(prompt).toContain('resuelve primero la respuesta mecánica o física del entorno');
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

  test('buildStorytellerSystemPrompt anchors opening scene / initial presentation in scenario details', () => {
    const prompt = buildStorytellerSystemPrompt({
      scenario: {
        title: 'Rising an Empire',
        presentation: 'El viento sopla sobre el claro. Un gran lobo gris acecha detrás de ti.',
        initialMessages: [{ text: 'El viento sopla sobre el claro. Un gran lobo gris acecha detrás de ti.' }]
      },
      userChar: { title: 'Lucius Lukerna' },
      messages: [{ from: 'user', text: 'Desenfundo el sable.' }]
    });

    expect(prompt).toContain('[ACTIVE PLAYABLE SCENARIO]');
    expect(prompt).toContain('- Scenario Title: Rising an Empire');
    expect(prompt).toContain('- Opening Scene / Initial Situation: El viento sopla sobre el claro. Un gran lobo gris acecha detrás de ti.');
  });

  test('buildRecencyGuidanceHook generates recency tail with player agency, scene focus and OOC', () => {
    const hook = buildRecencyGuidanceHook({
      sceneContext: {
        primaryTarget: 'Lobo Alfa',
        activeLocation: 'Claro del bosque',
        timeOfDay: 'Amanecer'
      },
      userChar: { name: 'Lucius' },
      oocDirective: 'Haz que el lobo retroceda asustado si desenvaino la espada.'
    });

    expect(hook).toContain('[IMMEDIATE RECENCY GUIDANCE - TURN EXECUTION RULES]');
    expect(hook).toContain('1. ABSOLUTE PLAYER AGENCY: You are the Game Master. NEVER speak, act, decide, or narrate internal thoughts for {{user}} (Lucius).');
    expect(hook).toContain('2. ACTIVE SCENE FOCUS: Maintain continuity with "Lobo Alfa".');
    expect(hook).toContain('3. IMMEDIATE SURROUNDINGS: Current location is "Claro del bosque" (Amanecer).');
    expect(hook).toContain('4. SCENE DIRECTOR META-INSTRUCTION (OOC): Haz que el lobo retroceda asustado si desenvaino la espada.');
  });

  test('buildStorytellerSystemPrompt includes full cards for active entities and brief intros for background scenario entities', () => {
    const activeEntities = [
      { id: 'c-active', title: 'Lobo Alfa', type: 'Personaje', intro: 'Líder feroz de la manada.', text: 'Cuerpo cubierto de cicatrices.' }
    ];
    const allScenarioEntities = [
      { id: 'c-active', title: 'Lobo Alfa', type: 'Personaje', intro: 'Líder feroz de la manada.', text: 'Cuerpo cubierto de cicatrices.' },
      { id: 'c-bg-1', title: 'Mari Setogaya', type: 'Personaje', intro: 'Estudiante de preparatoria híbrida de súcubo y vampiro.' },
      { id: 'c-bg-2', title: 'La Forja', type: 'Lugar', intro: 'Vasto espacio retro-tecnológico con marco circular beige.' }
    ];

    const prompt = buildStorytellerSystemPrompt({
      scenario: { title: 'The Forge' },
      userChar: { title: 'Azgael' },
      relevantEntities: activeEntities,
      allScenarioEntities: allScenarioEntities
    });

    // Entidad activa en foco: debe tener ficha completa
    expect(prompt).toContain('--- [WORLD NPC: Lobo Alfa] ---');
    expect(prompt).toContain('Cuerpo cubierto de cicatrices.');

    // Entidades de fondo del escenario: deben tener su intro breve
    expect(prompt).toContain('[SCENARIO WORLD ENTITIES - BACKGROUND ROSTER & INTROS (NOT CURRENTLY IN SCENE)]');
    expect(prompt).toContain('* Mari Setogaya [Personaje]: Estudiante de preparatoria híbrida de súcubo y vampiro.');
    expect(prompt).toContain('* La Forja [Lugar]: Vasto espacio retro-tecnológico con marco circular beige.');
  });
});

