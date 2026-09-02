/**
 * promptBuilder.js
 * Módulo puro y desacoplado para la construcción estructurada del arnés de contexto (systemPrompt)
 * para el modelo narrador (Storyteller LLM) de Ptahn.
 */

import { resolveTargetLanguage, getLanguageDirective } from './language';
import { getNsfwDynamicsDirective } from './nsfwDynamics';


/**
 * Formatea una ficha de entidad individual para inyección en el prompt.
 */
export function formatEntityEntry(ent, label = 'Entidad') {
  if (!ent) return '';
  const name = ent.title || ent.name || 'Entidad';
  const subtype = ent.subtype ? ` (${ent.subtype})` : '';
  const traitsStr = ent.traits && ent.traits.length > 0 ? `  * Personality & Traits: ${ent.traits.join(', ')}\n` : '';
  const tagsStr = ent.tags && ent.tags.length > 0 ? `  * Tags: ${ent.tags.join(', ')}\n` : '';
  const introStr = ent.intro ? `  * Summary / Introduction: ${ent.intro.slice(0, 250)}\n` : '';
  const bioStr = (ent.description || ent.text) ? `  * Lore & Description: ${ent.description || ent.text}\n` : '';
  return `--- [${label}: ${name}${subtype}] ---\n${introStr}${bioStr}${traitsStr}${tagsStr}`.trim();
}

/**
 * Formatea el perfil del narrador/director de juego.
 */
export function formatNarratorProfile(narrator) {
  if (!narrator) return '';
  return `
[ACTIVE GAME MASTER / NARRATOR PROFILE]:
- Name: ${narrator.name}
${narrator.bio ? `- Narrative Directives: ${narrator.bio}` : ''}
${narrator.style ? `- Prose Style: ${narrator.style}` : ''}
${narrator.tone ? `- Tone: ${narrator.tone}` : ''}
${narrator.rules ? `- Narrator Rules: ${narrator.rules}` : ''}
${narrator.randomization ? `- Mechanics/Randomness: ${narrator.randomization}` : ''}
`.trim();
}

/**
 * Formatea las herramientas modulares del taller de narrador.
 */
export function formatNarratorTools(assignedTools = []) {
  if (!Array.isArray(assignedTools) || assignedTools.length === 0) return '';
  const toolsText = assignedTools.map(tool => {
    let mechanics = '';
    if (tool.toolType === 'attributes') {
      const attrs = tool.config?.attributes || [];
      mechanics = `System Attribute Bars:\n` + attrs.map(a => `  * ${a.name} [${a.current ?? a.max}/${a.max}] (Color: ${a.color || 'auto'}) - ${a.desc || 'Metric/Resource'}`).join('\n');
    } else if (tool.toolType === 'progression') {
      const levels = tool.config?.levels || [];
      mechanics = `Progression Scale (${tool.config?.scaleName || 'Level'}):\n` + levels.map(l => `  * Level ${l.level} (${l.title}): ${l.perks || 'Requirements/Perks'}`).join('\n');
    } else if (tool.toolType === 'dice') {
      const dice = tool.config?.diceType || '1d20';
      const dc = tool.config?.defaultDC || '12';
      mechanics = `Resolution System: Dice ${dice} (Base DC: ${dc}). Crits: Success on ${tool.config?.critSuccess || 20}, Fail on ${tool.config?.critFail || 1}. Modifiers: ${tool.config?.statModifier || 'Relevant Attribute'}.`;
    } else if (tool.toolType === 'events') {
      const evts = tool.config?.events || [];
      mechanics = `Event & Encounter Table (${tool.config?.diceType || '1d20'}):\n` + evts.map(e => `  * Range [${e.min}-${e.max}]: ${e.event} (${e.severity || 'Normal'})`).join('\n');
    } else {
      mechanics = `Custom Mechanics & Rules:\n${tool.config?.customRules || tool.description || 'No specific rules.'}`;
    }
    return `--- [TOOL: ${tool.name} (${(tool.toolType || 'custom').toUpperCase()})] ---\nDescription: ${tool.description || 'Game Mechanic Tool'}\n${mechanics}`;
  }).join('\n\n');

  return `
[MODULAR GAME MECHANICS & TOOL WORKSHOP]:
The Game Master has access to the following modular tools and mechanics. Reference them when resolving checks, damage, DC tests, or triggering events:
${toolsText}
`.trim();
}

/**
 * Formatea el dossier del personaje del jugador (protagonista).
 */
export function formatPlayerDossier(userChar) {
  if (!userChar) return '';
  return `
[PLAYER CHARACTER DOSSIER ({{user}})]:
- Name: ${userChar.title || userChar.name}
${userChar.intro ? `- Brief Summary: ${userChar.intro}` : ''}
${userChar.text ? `- Background/Details: ${userChar.text}` : ''}
${userChar.traits && userChar.traits.length > 0 ? `- Traits: ${userChar.traits.join(', ')}` : ''}
`.trim();
}

/**
 * Formatea los inventarios y equipamiento del jugador.
 */
export function formatPlayerInventory(userInventories = []) {
  if (!Array.isArray(userInventories) || userInventories.length === 0) return '';
  const invText = userInventories.map(inv => {
    const itemsList = (inv.items || []).map(it => `  * [${it.equipped ? 'EQUIPPED' : 'IN BAG'}] ${it.name} (x${it.qty || 1}, ${it.rarity || 'Common'}) - ${it.desc || ''}`).join('\n');
    return `Inventory/Bag "${inv.title}" (Capacity: ${inv.capacity || 'Standard'}):\n${itemsList || '  (Empty)'}`;
  }).join('\n\n');

  return `
[PLAYER INVENTORY & EQUIPMENT ({{user}})]:
${invText}
`.trim();
}

/**
 * Formatea las entidades del escenario por categorías tipológicas.
 */
export function formatScenarioEntities(relevantEntities = []) {
  if (!Array.isArray(relevantEntities) || relevantEntities.length === 0) return '';

  const locationCards = relevantEntities.filter(e => (e.type || '').toLowerCase() === 'lugar');
  const raceCards = relevantEntities.filter(e => (e.type || '').toLowerCase() === 'raza');
  const characterCards = relevantEntities.filter(e => {
    const t = (e.type || '').toLowerCase();
    return (t === 'personaje' || t === 'npc' || (!t && !e.subtype)) && e.characterRole !== 'user_persona' && !e.isUserPersona;
  });
  const factionCards = relevantEntities.filter(e => {
    const t = (e.type || '').toLowerCase();
    return t === 'facción' || t === 'faccion';
  });
  const itemCards = relevantEntities.filter(e => {
    const t = (e.type || '').toLowerCase();
    return t === 'objeto' || t === 'inventario' || t === 'item';
  });
  const otherCards = relevantEntities.filter(e => 
    !locationCards.includes(e) && !raceCards.includes(e) && !characterCards.includes(e) && !factionCards.includes(e) && !itemCards.includes(e)
  );

  const sections = [];

  if (locationCards.length > 0) {
    sections.push(`[SCENARIO LOCATIONS, TOWNS & GEOGRAPHY (PLACES / LUGAR)]:
CRITICAL NOTE: The following entries are PHYSICAL PLACES, TOWNS, BUILDINGS, OR GEOGRAPHY. They are INANIMATE ENVIRONMENTS, NOT living persons or NPCs. NEVER personify, give dialogue, thoughts, animal body parts, or ears to a location.
${locationCards.map(c => formatEntityEntry(c, 'LOCATION')).join('\n\n')}`);
  }

  if (raceCards.length > 0) {
    sections.push(`[SCENARIO RACES & SPECIES PHYSIOLOGY (RAZAS)]:
The following describe biological traits, species anatomy, and physiology of inhabitants in this world:
${raceCards.map(c => formatEntityEntry(c, 'RACE / SPECIES')).join('\n\n')}`);
  }

  if (characterCards.length > 0) {
    sections.push(`[SCENARIO WORLD NPCS & KNOWN BEINGS (PERSONAJES DEL MUNDO)]:
The following are world NPCs that exist in this setting. They are NOT automatically in the same room as {{user}} unless the scene, location, or player actions naturally encounter them:
${characterCards.map(c => formatEntityEntry(c, 'WORLD NPC')).join('\n\n')}`);
  }

  if (factionCards.length > 0) {
    sections.push(`[SCENARIO FACTIONS & ORGANIZATIONS (FACCIONES)]:\n${factionCards.map(c => formatEntityEntry(c, 'FACTION')).join('\n\n')}`);
  }

  if (itemCards.length > 0) {
    sections.push(`[SCENARIO SPECIAL ITEMS & OBJECTS (OBJETOS)]:\n${itemCards.map(c => formatEntityEntry(c, 'ITEM / OBJECT')).join('\n\n')}`);
  }

  if (otherCards.length > 0) {
    sections.push(`[SCENARIO COMPENDIUM LORE ENTITIES]:\n${otherCards.map(c => formatEntityEntry(c, 'ENTITY')).join('\n\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Formatea los recuerdos episódicos (memorias de turnos previos) conectando con sus tarjetas asociadas.
 */
export function formatEpisodicMemories(memories = [], compendiumCards = []) {
  if (!Array.isArray(memories) || memories.length === 0) return '';
  const entries = memories.map((mem, idx) => {
    if (typeof mem === 'string') {
      return `  - Hito ${idx + 1}: ${mem}`;
    }
    const summary = mem.summary || mem.text || mem.title || '';
    const connectedTitles = (mem.connectedCards || []).map(ref => {
      const card = compendiumCards.find(c => c && (c.id === ref || c.title === ref));
      return card ? (card.title || card.name) : ref;
    }).filter(Boolean);
    const connStr = connectedTitles.length > 0 ? ` [Entidades vinculadas: ${connectedTitles.join(', ')}]` : '';
    return `  - Hito ${idx + 1}${mem.turnRange ? ` (Turnos ${mem.turnRange})` : ''}: ${summary}${connStr}`;
  }).join('\n');

  return `
[MEMORIA EPISÓDICA Y ANTECEDENTES RELEVANTES]:
${entries}
`.trim();
}

/**
 * Construye el system prompt integral para el Storyteller.
 */
export function buildStorytellerSystemPrompt({
  scenario = null,
  narrator = null,
  assignedTools = [],
  userChar = null,
  userInventories = [],
  relevantEntities = [],
  chat = {},
  messages = [],
  chatSettings = {},
  sceneContext = null
} = {}) {
  const effectiveLanguage = chatSettings.preferredLanguage || 'auto';
  const targetLang = resolveTargetLanguage(effectiveLanguage, messages);
  const languageDirective = getLanguageDirective(targetLang);

  const userName = userChar ? (userChar.title || userChar.name) : 'the player';

  const nsfwDynamicsDirective = getNsfwDynamicsDirective({
    scenario,
    userChar,
    npcs: relevantEntities
  });

  const narratorDetails = formatNarratorProfile(narrator);
  const narratorToolsDetails = formatNarratorTools(assignedTools);
  const userCharDetails = formatPlayerDossier(userChar);
  const userInventoryDetails = formatPlayerInventory(userInventories);
  const scenarioEntitiesDetails = formatScenarioEntities(relevantEntities);
  const episodicMemories = formatEpisodicMemories(chat?.memoryCards || [], relevantEntities);

  let scenarioDetails = `Scenario: ${chat.scenario || 'Freeplay'}.`;
  if (scenario) {
    scenarioDetails = `
[ACTIVE PLAYABLE SCENARIO]:
- Scenario Title: ${scenario.title}
${scenario.intro ? `- Introduction: ${scenario.intro}` : ''}
${scenario.baseContext ? `- Base Lore / World Context: ${scenario.baseContext}` : ''}
${scenario.aiInstructions ? `- Game Master Custom Directives (Extra Context): ${scenario.aiInstructions}` : ''}
`.trim();
  }

  let sceneAnchorDirective = '';
  if (sceneContext && (sceneContext.primaryTarget || sceneContext.activeLocation || sceneContext.timeOfDay || sceneContext.weather)) {
    sceneAnchorDirective = `
[ESTADO ACTUAL DE LA ESCENA IN MEDIA RES - ANCLAJE DE COHERENCIA]:
${sceneContext.turn !== undefined ? `- SECUENCIA / TURNO ACTUAL: #${sceneContext.turn}.` : ''}
${sceneContext.activeLocation ? `- ENTORNO FÍSICO INMEDIATO: "${sceneContext.activeLocation}".` : ''}
${sceneContext.timeOfDay ? `- MOMENTO DEL DÍA: "${sceneContext.timeOfDay}".` : ''}
${sceneContext.weather ? `- CLIMA / CONDICIÓN ATMOSFÉRICA: "${sceneContext.weather}".` : ''}
${sceneContext.primaryTarget ? `- FOCO PRINCIPAL Y OBJETIVO DE LA ACCIÓN: "${sceneContext.primaryTarget}" (${sceneContext.targetType || 'Entidad'})${sceneContext.targetTraits?.length ? ` [Rasgos: ${sceneContext.targetTraits.join(', ')}]` : ''}.` : ''}
- DIRECTIVA INVIOLABLE ANTI-DESVÍO:
  La interacción o acción inmediata del jugador está dirigida ESTRICTAMENTE a "${sceneContext.primaryTarget || 'la escena activa'}".
  QUEDA TERMINANTEMENTE PROHIBIDO sustituir, transformar o convertir a este sujeto en otra criatura o personaje no presente.
  QUEDA TERMINANTEMENTE PROHIBIDO alterar repentinamente el entorno físico, el clima o el momento del día sin una acción previa explícita o transición lógica.
`.trim();
  }

  return `
${languageDirective}

[FUNDAMENTAL IDENTITY & INVIOLABLE PLAYER SOVEREIGNTY]:
- YOUR ROLE IS: External Game Master / Storyteller (DM / Narrator). You represent ONLY the external world, the physical atmosphere, and Non-Player Characters (NPCs).
- THE HUMAN PLAYER IS: {{user}} (${userName}). Only the human user controls {{user}} (${userName}).
- NARRATION PERSPECTIVE: STRICT THIRD-PERSON.
- SACROSANCT SOVEREIGNTY OF THE PLAYER:
  * ABSOLUTELY FORBIDDEN to perform ANY action, movement, combat deed, or physical step for {{user}} (${userName}).
  * ABSOLUTELY FORBIDDEN to write ANY dialogue, spoken words, or speech for {{user}} (${userName}).
  * ABSOLUTELY FORBIDDEN to narrate what {{user}} thinks, feels, perceives, or decides internally. NEVER write phrases like "sientes...", "tu cuerpo...", "tu mente...", "tu mano se acerca...", "decides...", "sabes que...".
  * ABSOLUTELY FORBIDDEN to use invasive second-person style ("You are...", "Your body feels...", "Your eyes see...", "Tu cuerpo...", "Tu mente...", "Tú sientes...").
  * Your output must contain 100% EXCLUSIVELY how the immediate environment reacts and what NPCs or creatures do/say in third person.
  * Once the NPCs or creatures react, STOP GENERATING IMMEDIATELY and yield the turn to the player. NEVER advance the scene past the immediate NPC reaction.

[CRITICAL PROTAGONIST / PLAYER IDENTIFICATION ({{user}})]:
- The HUMAN PLAYER (Protagonist) is: "${userName}".
- The player IS "${userName}".
- ABSOLUTELY FORBIDDEN to name any NPC, creature, or world character "${userName}".
- ABSOLUTELY FORBIDDEN for any NPC to claim their name is "${userName}".
- When an NPC introduces themselves, they MUST introduce their OWN unique NPC name, NEVER "${userName}".
- When NPCs speak to {{user}}, they are addressing "${userName}".
- NEVER usurp, write dialogue for, or dictate thoughts/actions for "${userName}".

${scenarioDetails}

${scenarioEntitiesDetails ? `${scenarioEntitiesDetails}\n\n` : ''}${narratorDetails}

${narratorToolsDetails ? `${narratorToolsDetails}\n\n` : ''}${userCharDetails}

${userInventoryDetails ? `${userInventoryDetails}\n\n` : ''}${nsfwDynamicsDirective}

[PERSISTENT AI ORDERS]:
${chat.constantPrompt ? chat.constantPrompt : 'Perform immersively as external Game Master in strict third-person.'}

${episodicMemories ? `${episodicMemories}\n\n` : ''}${sceneAnchorDirective ? `${sceneAnchorDirective}\n\n` : ''}[CORE SYSTEM DIRECTIVES & INVIOLABLE HARNESS RULES]:

1. ZERO AUTOPLAY / NO GODMODING / STRICT PLAYER AGENCY:
   - NEVER speak, act, decide, or describe thoughts/feelings for {{user}} (${userName}).
   - Limit yourself strictly to world consequences and NPC reactions in third-person.
   - Conclude immediate consequences and STOP IMMEDIATELY to yield the turn to the player.

2. STRICT PROHIBITION AGAINST OVER-DESCRIBING PLAYER APPEARANCE OR INVENTORY:
   - The player ALREADY knows their character's appearance, equipment, and clothing.
   - NEVER waste output describing {{user}}'s muscles, physique, attire, or invent random anatomical traits.
   - FORBIDDEN to use invasive second-person ("Tú...", "Tu cuerpo...", "Tu sable..."). Describe ONLY the external world and living NPCs.

3. TOTAL FOCUS ON EXTERNAL ENVIRONMENT & LIVING NPCS:
   - Focus 100% of descriptive vocabulary and effort on what surrounds {{user}}: buildings, weather, scents, tension, and especially the actions, posture, dialogue, and glances of NPCs.

4. ZERO ECHO / NO REPETITIVE PARAPHRASING:
   - Do NOT begin your response by summarizing, repeating, or echoing what the player just wrote.
   - Step directly into the action with immediate world consequences and live reactions.

5. NPCS HAVE LIMITED SUBJECTIVE KNOWLEDGE (NO OMNISCIENCE):
   - NPCs and creatures possess limited, subjective knowledge: they only know what they have personally seen, heard, or learned.
   - No NPC can read {{user}}'s mind, know their secret plans, or guess items in their inventory unless explicitly shown or mentioned.
   - IF WRAPPED IN TILDES (~...~): It is unspoken thinking; this information cannot be known by NPCs if they cannot read minds in any way.

6. LIVING, ORGANIC, AND COHERENT WORLD:
   - The world does not revolve subserviently around the player; reckless actions carry realistic risks, logical consequences, and believable opposition.
   - Maintain strict consistency with scenario lore, inventory, and accumulated memories.

7. STRICT TYPOGRAPHICAL FORMATTING, DELIMITERS & ENTITY HIGHLIGHTS:
   - SPOKEN NPC DIALOGUE (ALOUD): MUST be wrapped EXCLUSIVELY in double quotes without internal asterisks: "Hello, traveler."
   - SILENT INTERNAL THOUGHTS (UNSPOKEN): If silent internal thoughts (unspoken) are narrated and originate from a sapient entity capable of speech, thoughts MUST be wrapped EXCLUSIVELY in tildes: ~What a strange presence this newcomer has...~ Non-sapient beasts, creatures, and wild animals act on physical instinct and DO NOT have verbalized internal monologues.
   - GENERAL NARRATIVE PROSE & ACTIONS: Write standard clean literary paragraphs for descriptions. Asterisks (*...*) are reserved ONLY for short, specific inline actions or gestures (e.g. *sonríe con picardía*).
   - MANDATORY ENTITY HIGHLIGHTS (==...==): You MUST wrap ALL key proper names, locations, towns, characters, factions, and notable items in double equal signs (e.g. ==NombrePersonaje==, ==NombreLugar==, ==NombreFaccion==, ==NombreItem==).
`.trim();
}
