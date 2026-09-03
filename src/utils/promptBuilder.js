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
export function formatScenarioEntities(relevantEntities = [], allScenarioEntities = []) {
  if ((!Array.isArray(relevantEntities) || relevantEntities.length === 0) && (!Array.isArray(allScenarioEntities) || allScenarioEntities.length === 0)) return '';

  const activeCards = Array.isArray(relevantEntities) ? relevantEntities : [];
  const activeKeys = new Set(activeCards.map(c => (c.id || c.title || c.name || '').toLowerCase()));

  // Entidades conectadas al escenario que NO están en el foco activo (fondo / sin peso suficiente para tarjeta completa)
  const backgroundCards = (Array.isArray(allScenarioEntities) ? allScenarioEntities : []).filter(c => {
    if (!c) return false;
    const key = (c.id || c.title || c.name || '').toLowerCase();
    if (!key || activeKeys.has(key)) return false;
    if (c.characterRole === 'user_persona' || c.isUserPersona) return false;
    return true;
  });

  const locationCards = activeCards.filter(e => (e.type || '').toLowerCase() === 'lugar');
  const raceCards = activeCards.filter(e => (e.type || '').toLowerCase() === 'raza');
  const characterCards = activeCards.filter(e => {
    const t = (e.type || '').toLowerCase();
    return (t === 'personaje' || t === 'npc' || (!t && !e.subtype)) && e.characterRole !== 'user_persona' && !e.isUserPersona;
  });
  const factionCards = activeCards.filter(e => {
    const t = (e.type || '').toLowerCase();
    return t === 'facción' || t === 'faccion';
  });
  const itemCards = activeCards.filter(e => {
    const t = (e.type || '').toLowerCase();
    return t === 'objeto' || t === 'inventario' || t === 'item';
  });
  const otherCards = activeCards.filter(e => 
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

  // Resumen ultraliviano de intros breves de las entidades del escenario en segundo plano
  if (backgroundCards.length > 0) {
    const bgList = backgroundCards.map(c => {
      const name = c.title || c.name || 'Entidad';
      const type = c.type || 'Entidad';
      const subtype = c.subtype ? ` / ${c.subtype}` : '';
      const brief = (c.intro || c.description || c.text || '').replace(/\n+/g, ' ').slice(0, 180).trim();
      return `* ${name} [${type}${subtype}]: ${brief || 'Elemento del compendio del escenario.'}`;
    }).join('\n');

    sections.push(`[SCENARIO WORLD ENTITIES - BACKGROUND ROSTER & INTROS (NOT CURRENTLY IN SCENE)]:
The following connected entities exist in this scenario's broader setting. They are NOT in the immediate room with {{user}} right now, but exist in the world as available lore:
${bgList}`);
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
  allScenarioEntities = [],
  scenarioCards = [],
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

  const allBackgroundPool = (allScenarioEntities && allScenarioEntities.length > 0) 
    ? allScenarioEntities 
    : (scenarioCards && scenarioCards.length > 0 ? scenarioCards : []);

  const narratorDetails = formatNarratorProfile(narrator);
  const narratorToolsDetails = formatNarratorTools(assignedTools);
  const userCharDetails = formatPlayerDossier(userChar);
  const userInventoryDetails = formatPlayerInventory(userInventories);
  const scenarioEntitiesDetails = formatScenarioEntities(relevantEntities, allBackgroundPool);
  const episodicMemories = formatEpisodicMemories(chat?.memoryCards || [], relevantEntities);

  let scenarioDetails = `Scenario: ${chat.scenario || 'Freeplay'}.`;
  if (scenario) {
    const openingScene = scenario.presentation || (Array.isArray(scenario.initialMessages) && scenario.initialMessages[0]?.text) || '';
    scenarioDetails = `
[ACTIVE PLAYABLE SCENARIO]:
- Scenario Title: ${scenario.title}
${scenario.intro ? `- Introduction: ${scenario.intro}` : ''}
${openingScene ? `- Opening Scene / Initial Situation: ${openingScene}` : ''}
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
- CONTINUIDAD Y CAUSALIDAD FÍSICA:
  Mantén coherencia estricta con el entorno físico y el hilo causal del turno previo.
  Si la acción del jugador interactúa con una máquina, consola, objeto o comando de invocación, resuelve primero la respuesta mecánica o física del entorno antes de manifestar entidades o consecuencias finales.
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
   - GENERAL NARRATIVE PROSE & ENVIRONMENT (NO QUOTES): Environmental descriptions, actions, combat, physical deeds, and animal/beast behavior MUST be written in normal paragraphs WITHOUT ANY QUOTATION MARKS. NEVER wrap entire paragraphs, descriptions, or outputs in quotation marks.
   - SPOKEN NPC DIALOGUE (ALOUD) ONLY: Double quotes ("...") are STRICTLY AND EXCLUSIVELY RESERVED for words spoken aloud by speaking humanoid/sentient NPCs: "Hello, traveler." Non-sapient beasts (wolves, monsters, creatures) do NOT speak; their snarls, growls, or physical deeds are ACTIONS/PROSE and must NEVER be in quotation marks.
   - SILENT INTERNAL THOUGHTS (UNSPOKEN): If silent internal thoughts (unspoken) are narrated and originate from a sapient entity capable of speech, thoughts MUST be wrapped EXCLUSIVELY in tildes: ~What a strange presence this newcomer has...~ Non-sapient beasts, creatures, and wild animals act on physical instinct and DO NOT have verbalized internal monologues.
   - INLINE ACTIONS: Asterisks (*...*) are reserved ONLY for short inline gestures (e.g. *sonríe con picardía*).
   - MANDATORY ENTITY HIGHLIGHTS (==...==): You MUST wrap ALL key proper names, locations, towns, characters, factions, and notable items in double equal signs (e.g. ==NombrePersonaje==, ==NombreLugar==, ==NombreFaccion==, ==NombreItem==).
`.trim();
}

/**
 * Builds an attention-recency guidance hook to append at the exact tail of the context window,
 * countering the "Lost in the Middle" phenomenon (ISEKAI ZERO / FictionLab pattern).
 * 
 * @param {Object} params
 * @param {Object} [params.sceneContext]
 * @param {Object} [params.userChar]
 * @param {string} [params.oocDirective]
 * @returns {string}
 */
export function buildRecencyGuidanceHook({ sceneContext = null, userChar = null, oocDirective = '' } = {}) {
  const userName = userChar?.name || userChar?.title || 'the Player';
  const parts = [];

  parts.push('[IMMEDIATE RECENCY GUIDANCE - TURN EXECUTION RULES]:');
  parts.push(`1. ABSOLUTE PLAYER AGENCY: You are the Game Master. NEVER speak, act, decide, or narrate internal thoughts for {{user}} (${userName}). Describe ONLY the immediate external world and NPC reactions in third-person, then STOP.`);

  if (sceneContext?.primaryTarget) {
    parts.push(`2. ACTIVE SCENE FOCUS: Maintain continuity with "${sceneContext.primaryTarget}". If {{user}} interacts with a machine, console, portal, or summoning command, resolve that physical mechanism first.`);
  } else {
    parts.push('2. CAUSAL CONTINUITY: Follow strict cause-and-effect from the previous turn. If {{user}} interacts with a machine, environment, or command, resolve that physical mechanism before introducing resulting entities.');
  }

  if (sceneContext?.activeLocation) {
    parts.push(`3. IMMEDIATE SURROUNDINGS: Current location is "${sceneContext.activeLocation}"${sceneContext.timeOfDay ? ` (${sceneContext.timeOfDay})` : ''}. Maintain spatial continuity.`);
  }

  if (oocDirective && oocDirective.trim()) {
    parts.push(`4. SCENE DIRECTOR META-INSTRUCTION (OOC): ${oocDirective.trim()}`);
  }

  parts.push('5. TYPOGRAPHY: Write narrative descriptions, actions, and beast behavior in clean paragraphs WITHOUT quotation marks. Double quotes ("...") are STRICTLY AND EXCLUSIVELY for spoken words by humanoid characters. NEVER put entire paragraphs, environment, or animal growls in quotes.');

  return parts.join('\n');
}

