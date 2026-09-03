/**
 * Dual Model AI Orchestrator Pipeline
 * 
 * Manages the Inbound (pre-flight) and Outbound (post-flight) middleware pipeline
 * using an intelligent lightweight SLM orchestrator.
 */


import { filterAndSortRelevantCards } from './weightCalculator';
import { requestRerank, getServerBaseUrl } from './serverApi';
import { resolveSceneState } from './sceneStateTracker';
import { sanitizeTypography } from './textFormatter';

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
  baseUrl,
  previousSceneState = null,
  scenario = null,
  currentTurn = null
}) {
  const recentText = [
    ...recentMessages.slice(-3).map(m => m.text || ''),
    userMessage
  ].join(' ');

  // 1. Pre-filtrado acotado de candidatos del escenario para Cross-Encoder (Etapa 1: máx 15 candidatos)
  const candidatePool = (cards || []).slice(0, 15).map(c => ({
    id: c.id || c.title,
    title: c.title || c.name || '',
    text: `${c.title || c.name || ''}. Tipo: ${c.type || 'Entidad'}. ${c.intro || ''} ${Array.isArray(c.traits) ? c.traits.join(', ') : ''} ${Array.isArray(c.tags) ? c.tags.join(', ') : ''}`.trim()
  }));

  // 2. Scoring semántico con el Cross-Encoder / Re-Ranker nativo de CPU (Etapa 2)
  let semanticScores = {};
  if (candidatePool.length > 0 && userMessage) {
    try {
      const scoringContext = [
        ...recentMessages.slice(-1).map(m => m.text || ''),
        userMessage
      ].join(' ').trim();
      semanticScores = await requestRerank(
        scoringContext,
        candidatePool,
        baseUrl || (chatSettings?.serverUrl ? chatSettings.serverUrl : getServerBaseUrl())
      );
    } catch (e) {
      semanticScores = {};
    }
  }

  // 3. Propagación de pesos por el grafo de relaciones (Spreading Activation)
  const filteredCards = filterAndSortRelevantCards(cards, {
    recentText,
    semanticScores,
    maxLimit: 8,
    enableGraphPropagation: true
  });

  // 4. Extracción y resolución del Marco de Estado de la Escena con persistencia e inercia (F048)
  const topCharacter = filteredCards.find(c => {
    const t = (c.type || '').toLowerCase();
    const isChar = t === 'personaje' || t === 'criatura' || t === 'npc';
    if (!isChar) return false;

    const cName = (c.title || c.name || '').toLowerCase();
    const wasAlreadyTarget = previousSceneState?.primaryTarget && 
      previousSceneState.primaryTarget.toLowerCase() === cName;
    const isMentionedInRecent = cName && recentText.toLowerCase().includes(cName);

    if (wasAlreadyTarget || isMentionedInRecent) return true;

    const score = (semanticScores && semanticScores[c.id || c.title]) || 0;
    return score >= 0.45;
  });
  const hasPreviousLocation = Boolean(previousSceneState?.location);
  const hasMovement = /\b(entr(?:ar|o|as|a|amos|an)|viaj(?:ar|o|as|a|amos|an)|camin(?:ar|o|as|a|amos|an)|adentr(?:ar|o|as|a|amos|an)|lleg(?:ar|o|as|a|amos|an)|dirig(?:ir|o|es|e|imos|en)|cruz(?:ar|o|as|a|amos|an)|march(?:ar|o|as|a|amos|an)|descend(?:er|o|es|e|emos|en)|sub(?:ir|o|es|e|imos|en))\b/i.test(recentText);

  const topLocation = filteredCards.find(c => {
    if ((c.type || '').toLowerCase() !== 'lugar') return false;
    const cName = (c.title || c.name || '').toLowerCase();
    const wasAlreadyLocation = previousSceneState?.location && 
      previousSceneState.location.toLowerCase() === cName;
    const isMentionedInRecent = cName && recentText.toLowerCase().includes(cName);

    if (wasAlreadyLocation || isMentionedInRecent) return true;

    // Si ya existe una ubicación física previa, exigir desplazamiento explícito para cambiarla
    if (hasPreviousLocation) {
      if (hasMovement) {
        const score = (semanticScores && (semanticScores[c.id] ?? semanticScores[c.title])) || 0;
        return score >= 0.50;
      }
      return false;
    }

    // Si aún no hay ubicación previa establecida, permitir que la tarjeta de lugar candidata inicialice la escena
    const score = (semanticScores && (semanticScores[c.id] ?? semanticScores[c.title])) || 0;
    return score >= 0.45;
  });

  const resolvedState = resolveSceneState({
    previousState: previousSceneState,
    inboundContext: {
      primaryTarget: topCharacter ? (topCharacter.title || topCharacter.name) : null,
      targetType: topCharacter ? (topCharacter.type || 'Personaje') : null,
      targetTraits: topCharacter && Array.isArray(topCharacter.traits) ? topCharacter.traits : [],
      activeLocation: topLocation ? (topLocation.title || topLocation.name) : null,
      activeEntities: filteredCards.slice(0, 4).map(c => c.title || c.name)
    },
    currentText: recentText,
    scenario,
    currentTurn
  });

  const sceneContext = {
    ...resolvedState,
    activeLocation: resolvedState.location
  };

  return {
    translatedInput: userMessage,
    filteredCards,
    contextSummary: topCharacter ? `Objetivo en foco: ${topCharacter.title || topCharacter.name}` : '',
    sceneContext,
    sceneState: resolvedState
  };
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
  // Formateo y saneamiento limpio nativo instantáneo (0ms) sin demoras de GPU
  const formattedText = sanitizeTypography(rawNarrative || '');
  return {
    formattedText,
    areaA_expression: null,
    areaB_location: null,
    discoveredEntities: [],
    diffusionTasks: []
  };
}
