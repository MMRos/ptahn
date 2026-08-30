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
});
