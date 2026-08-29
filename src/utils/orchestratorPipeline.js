/**
 * Dual Model AI Orchestrator Pipeline
 * 
 * Manages the Inbound (pre-flight) and Outbound (post-flight) middleware pipeline
 * using an intelligent lightweight SLM orchestrator.
 */

import { sendChatMessage, resolveIntermediaryModelId } from './localAIStudio';
import { filterAndSortRelevantCards } from './weightCalculator';

/**
 * Parses JSON block from raw LLM/SLM response with resilient fallback.
 * 
 * @param {string} rawOutput
 * @param {string} fallbackText
 * @returns {Object}
 */
export function parseOrchestratorInboundJSON(rawOutput = '', fallbackText = '') {
  const text = typeof rawOutput === 'object' ? (rawOutput?.text || '') : String(rawOutput || '');
  if (!text || !text.trim()) {
    return {
      translatedInput: fallbackText,
      semanticScores: {},
      contextSummary: '',
      sceneContext: {}
    };
  }

  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        translatedInput: (parsed.translatedInput && parsed.translatedInput.trim().length > 0) ? parsed.translatedInput.trim() : fallbackText,
        semanticScores: (parsed.semanticScores && typeof parsed.semanticScores === 'object') ? parsed.semanticScores : {},
        contextSummary: parsed.contextSummary || '',
        sceneContext: parsed.sceneContext || {}
      };
    }
  } catch (err) {
    console.warn('[Orchestrator Inbound]: Failed to parse JSON, using fallback:', err.message);
  }

  return {
    translatedInput: fallbackText,
    semanticScores: {},
    contextSummary: '',
    sceneContext: {}
  };
}

/**
 * Parses JSON block from raw outbound SLM response.
 * 
 * @param {string|Object} rawOutput
 * @param {string} fallbackText
 * @returns {Object}
 */
export function parseOrchestratorOutboundJSON(rawOutput = '', fallbackText = '') {
  const text = typeof rawOutput === 'object' ? (rawOutput?.text || '') : String(rawOutput || '');
  if (!text || !text.trim()) {
    return {
      formattedText: fallbackText,
      areaA_expression: null,
      areaB_location: null,
      discoveredEntities: [],
      diffusionTasks: []
    };
  }

  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validFormatted = (parsed.formattedText && typeof parsed.formattedText === 'string' && parsed.formattedText.trim().length > 3)
        ? parsed.formattedText.trim()
        : fallbackText;
      return {
        formattedText: validFormatted,
        areaA_expression: parsed.areaA_expression || null,
        areaB_location: parsed.areaB_location || null,
        discoveredEntities: Array.isArray(parsed.discoveredEntities) ? parsed.discoveredEntities : [],
        diffusionTasks: Array.isArray(parsed.diffusionTasks) ? parsed.diffusionTasks : []
      };
    }
  } catch (err) {
    console.warn('[Orchestrator Outbound]: Failed to parse JSON, using fallback:', err.message);
  }

  return {
    formattedText: fallbackText,
    areaA_expression: null,
    areaB_location: null,
    discoveredEntities: [],
    diffusionTasks: []
  };
}

/**
 * Prevents duplicate image generation by checking existing cards in compendium.
 * 
 * @param {Array} diffusionTasks
 * @param {Array} compendiumCards
 * @returns {Array} Deduplicated tasks with shouldGenerate flags and existing URLs
 */
export function deduplicateVisualAssets(diffusionTasks = [], compendiumCards = []) {
  if (!Array.isArray(diffusionTasks)) return [];

  const existingMap = new Map();
  (compendiumCards || []).forEach(card => {
    if (!card) return;
    const key = (card.title || card.name || '').trim().toLowerCase();
    const cover = card.cover || (Array.isArray(card.images) && card.images[0]?.url);
    if (key && cover) {
      existingMap.set(key, cover);
    }
  });

  return diffusionTasks.map(task => {
    const targetKey = (task.targetName || '').trim().toLowerCase();
    const existingUrl = existingMap.get(targetKey) || null;

    return {
      ...task,
      shouldGenerate: !existingUrl,
      existingAssetUrl: existingUrl
    };
  });
}

/**
 * Formats narrative text to ensure proper typographical marks.
 * 
 * @param {string} text
 * @returns {string}
 */
export function formatFinalNarrativeWithTags(text = '') {
  if (!text) return '';
  return text.trim();
}

/**
 * Executes the Inbound Pre-flight Pipeline.
 * 
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function executeInboundOrchestration({
  orchestratorModel,
  userMessage,
  cards = [],
  recentMessages = [],
  chatSettings = {},
  baseUrl
}) {
  const modelToUse = await resolveIntermediaryModelId(orchestratorModel || chatSettings.orchestratorModel, baseUrl || chatSettings.lmStudioUrl);
  
  if (!modelToUse) {
    return {
      translatedInput: userMessage,
      filteredCards: cards.slice(0, 8),
      contextSummary: '',
      sceneContext: {}
    };
  }

  const cardsSummaryList = cards.map(c => ({
    id: c.id,
    name: c.title || c.name,
    type: c.type,
    summary: c.intro || (c.text ? c.text.substring(0, 60) : '')
  }));

  const systemPrompt = `You are Ptahn's High-Speed Orchestrator Middleware.
Your job is to analyze the user's latest message and return a SINGLE valid JSON object with:
1. "translatedInput": Faithful English translation of the user's message (or pristine original if already in English).
2. "semanticScores": An object mapping card IDs to a float relevance score between 0.0 and 1.0 based on what is relevant to the user's action.
3. "contextSummary": Ultra-brief 1-line summary of recent context.
4. "sceneContext": { "currentLocation": "...", "activeCharacters": ["..."] }

AVAILABLE SCENARIO CARDS:
${JSON.stringify(cardsSummaryList)}

Respond ONLY with valid JSON.`;

  try {
    const response = await sendChatMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `LATEST USER MESSAGE:\n"${userMessage}"` }
      ],
      modelId: modelToUse,
      baseUrl: baseUrl || chatSettings.lmStudioUrl,
      temperature: 0.1,
      maxTokens: 500,
      callerType: 'INTERMEDIARY_SLM'
    });

    const parsed = parseOrchestratorInboundJSON(response, userMessage);
    
    // Combine semantic scores with hybrid weight calculator
    const recentText = [
      ...recentMessages.slice(-3).map(m => m.text || ''),
      userMessage
    ].join(' ');

    const filteredCards = filterAndSortRelevantCards(cards, {
      recentText,
      semanticScores: parsed.semanticScores,
      maxLimit: 8
    });

    return {
      translatedInput: parsed.translatedInput,
      filteredCards,
      contextSummary: parsed.contextSummary,
      sceneContext: parsed.sceneContext
    };
  } catch (err) {
    console.warn('[Orchestrator Pipeline]: Inbound pass bypassed:', err.message);
    return {
      translatedInput: userMessage,
      filteredCards: cards.slice(0, 8),
      contextSummary: '',
      sceneContext: {}
    };
  }
}

/**
 * Executes the Outbound Post-flight Pipeline.
 * 
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function executeOutboundOrchestration({
  orchestratorModel,
  rawNarrative,
  targetLang = 'es',
  compendiumCards = [],
  chatSettings = {},
  baseUrl
}) {
  const modelToUse = await resolveIntermediaryModelId(orchestratorModel || chatSettings.orchestratorModel, baseUrl || chatSettings.lmStudioUrl);

  if (!modelToUse) {
    return {
      formattedText: rawNarrative,
      areaA_expression: null,
      areaB_location: null,
      discoveredEntities: [],
      diffusionTasks: []
    };
  }

  const langCode = typeof targetLang === 'object' ? (targetLang.code || 'es') : (targetLang || 'es');
  const isSpanish = langCode === 'es';

  const systemPrompt = `You are Ptahn's High-Speed Post-Processing Orchestrator.
Your job is to parse the storyteller's raw narrative and return a SINGLE valid JSON object with:
1. "formattedText": The narrative translated faithfully into ${isSpanish ? 'Spanish (Español)' : `language code "${langCode}"`} with clean, literary formatting:
   - Spoken NPC dialogue MUST be strictly in double quotes without internal asterisks: "¡Hola!" (NEVER "*¡Hola!*" and NEVER *"¡Hola!"*).
   - Silent internal thoughts MUST be in tildes: ~Qué extraño...~ (NEVER *~...~*).
   - General narrative prose MUST be standard clean paragraph text without wrapping full sentences or descriptions in asterisks.
   - Specific short inline actions/gestures can be in asterisks: *sonríe con picardía*.
   - Key entities, proper names, towns, locations, and characters MUST be wrapped in double equal signs: ==Garrison==, ==Tierra de Bestias==, ==La Forja==, ==Azgael==, ==Leporinos==.
   ${isSpanish ? '- MANDATORY: The entire formatted narrative MUST be 100% in natural Spanish. Do NOT output English.' : ''}
2. "areaA_expression": { "characterName": "...", "expression": "smiling / battle / neutral" } or null if no character is active.
3. "areaB_location": { "locationName": "..." } or null.
4. "discoveredEntities": Array of any new items, NPCs, or places mentioned for the first time: [{ "name": "...", "type": "Objeto|Lugar|Personaje", "summary": "..." }].
5. "diffusionTasks": Array of prompts for any newly discovered visual entities: [{ "targetName": "...", "prompt": "high quality diffusion prompt in English", "negativePrompt": "blurry, low quality" }].

Respond ONLY with valid JSON.`;

  try {
    const response = await sendChatMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `RAW STORYTELLER NARRATIVE:\n${rawNarrative}` }
      ],
      modelId: modelToUse,
      baseUrl: baseUrl || chatSettings.lmStudioUrl,
      temperature: 0.1,
      maxTokens: 800,
      callerType: 'INTERMEDIARY_SLM'
    });

    const parsed = parseOrchestratorOutboundJSON(response, rawNarrative);
    const deduplicatedTasks = deduplicateVisualAssets(parsed.diffusionTasks, compendiumCards);

    return {
      formattedText: parsed.formattedText,
      areaA_expression: parsed.areaA_expression,
      areaB_location: parsed.areaB_location,
      discoveredEntities: parsed.discoveredEntities,
      diffusionTasks: deduplicatedTasks
    };
  } catch (err) {
    console.warn('[Orchestrator Pipeline]: Outbound pass bypassed:', err.message);
    return {
      formattedText: rawNarrative,
      areaA_expression: null,
      areaB_location: null,
      discoveredEntities: [],
      diffusionTasks: []
    };
  }
}
