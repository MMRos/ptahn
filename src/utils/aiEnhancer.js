import { getBaseUrl, resolveIntermediaryModelId, apiFetch } from './localAIStudio';
import { emitAILog } from './aiLogEmitter';

/**
 * Generates or enhances a specific field using the local LLM.
 * 
 * @param {object} params
 * @param {string} params.fieldType - 'title' | 'intro' | 'lore' | 'traits' | 'tags' | 'scenario_presentation' | 'scenario_context' | 'scenario_instructions'
 * @param {string} params.entityType - 'Personaje' | 'Lugar' | 'Faccion' | 'Escenario' | etc.
 * @param {string} [params.currentValue] - Current text in the field
 * @param {object} [params.entityContext] - Context about the entity (title, role, tags, other fields)
 * @returns {Promise<string|string[]>} Enhanced text or array of items (for traits/tags)
 */
export async function enhanceFieldWithAI({
  fieldType,
  entityType = 'Personaje',
  currentValue = '',
  entityContext = {},
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const modelId = await resolveIntermediaryModelId(finalBaseUrl);

  const contextStr = [
    entityContext.title ? `Nombre/Título: "${entityContext.title}"` : '',
    entityContext.type ? `Tipo de entidad: "${entityContext.type}"` : `Tipo: "${entityType}"`,
    entityContext.characterRole ? `Rol: "${entityContext.characterRole}"` : '',
    entityContext.intro ? `Intro: "${entityContext.intro}"` : '',
    entityContext.text ? `Lore/Descripción actual: "${entityContext.text}"` : '',
    entityContext.category ? `Categoría/Género: "${entityContext.category}"` : '',
    entityContext.traits?.length ? `Rasgos: ${entityContext.traits.join(', ')}` : '',
    entityContext.tags?.length ? `Etiquetas: ${entityContext.tags.join(', ')}` : '',
    currentValue ? `Texto actual a mejorar: "${currentValue}"` : ''
  ].filter(Boolean).join('\n');

  let systemPrompt = `Eres un asistente maestro de escritura creativa, diseño de personajes y narrativa para el motor Ptahn.
Tu misión es generar contenido inmersivo, rico, evocador y sin censura en Español, adaptado a juegos de rol narrativos.
Responde DIRECTAMENTE con el contenido solicitado, sin preámbulos, saludos, ni explicaciones adicionales.`;

  let userPrompt = '';

  switch (fieldType) {
    case 'title':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nSugiere un nombre o título único, memorable y evocador para este ${entityType}. Responde SOLO con el nombre/título.`;
      break;

    case 'intro':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nEscribe una introducción breve y concisa de máximo 250 caracteres para este ${entityType}. Si es un personaje, describe su actitud o esencia. Si es un lugar o escenario, describe la primera impresión al llegar. Responde con un único párrafo conciso de máximo 250 caracteres.`;
      break;

    case 'lore':
    case 'text':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nEscribe una descripción profunda, lore y apariencia física detallada para este ${entityType}. Incluye detalles visuales (rostro, peinado, ropa, ojos), personalidad, motivaciones, trasfondo y secretos si aplica. Redacta de forma rica y atmosférica.`;
      break;

    case 'traits':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nSugiere entre 4 y 6 rasgos de personalidad arquetípicos y precisos para este personaje (ejemplos: Valiente, Astuto, Enigmático, Tsundere, Rebelde, Seductor, etc.).
Responde estrictamente con una lista de palabras separadas por comas, sin numeración ni viñetas.`;
      break;

    case 'tags':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nSugiere entre 3 y 5 etiquetas o palabras clave temáticas (género, ambientación, tropos) para este ${entityType}.
Responde estrictamente como una lista de etiquetas separadas por comas.`;
      break;

    case 'scenario_presentation':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nEscribe el mensaje de apertura / presentación inmersiva para este Escenario jugable. Debe sumergir al jugador en la escena, establecer la atmósfera, el dilema o gancho inicial y provocar una acción inmediata.`;
      break;

    case 'scenario_context':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nDesarrolla el Contexto Base / Worldbuilding de este Escenario. Explica el entorno, el estado del mundo, las facciones presentes, el trasfondo y las reglas implícitas de la ambientación.`;
      break;

    case 'scenario_instructions':
      userPrompt = `Basándote en este contexto:\n${contextStr}\n\nEscribe las Instrucciones del Sistema / Directivas para la IA del Narrador de este Escenario. Define el tono narrativo, cómo debe reaccionar el mundo ante las decisiones del jugador y qué secretos debe mantener o revelar progresivamente.`;
      break;

    default:
      userPrompt = `Mejora y expande el siguiente texto para un ${entityType} en un juego de rol:\n${contextStr}\n\nTexto: ${currentValue}`;
      break;
  }

  emitAILog({
    from: 'AI_CREATOR_ASSISTANT',
    to: 'CREATE_MODAL',
    type: 'PROMPT_TRANSFORM',
    summary: `Generando asistencia IA para campo "${fieldType}" (${entityType}: ${entityContext.title || 'Nueva entidad'})`,
    payload: { fieldType, entityType, model: modelId }
  });

  try {
    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.75,
        max_tokens: 800
      })
    }, finalBaseUrl);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip thinking tags if returned by reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Clean wrapping quotes if single string
    if (fieldType === 'title') {
      content = content.replace(/^["'«»“]+|["'«»”]+$/g, '').trim();
    }

    // Format list if traits or tags
    if (fieldType === 'traits' || fieldType === 'tags') {
      const items = content
        .split(/[,\n]/)
        .map(s => s.replace(/^[-*•\d.)\s]+/, '').replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
      return items;
    }

    return content;
  } catch (error) {
    console.warn(`[AI Enhancer]: Failed to enhance field "${fieldType}":`, error);
    emitAILog({
      from: 'AI_CREATOR_ASSISTANT',
      to: 'CREATE_MODAL',
      type: 'ERROR',
      summary: `Error generando campo "${fieldType}": ${error.message}`
    });
    throw error;
  }
}

/**
 * Autocompletes an entire entity (Card or Scenario) from just a title/concept.
 * 
 * @param {object} params
 * @param {string} params.entityType - 'Personaje' | 'Lugar' | 'Faccion' | 'Escenario' | etc.
 * @param {string} params.title - Entity title or seed concept
 * @param {string} [params.category]
 * @param {string} [params.characterRole]
 * @param {string} [params.baseUrl]
 * @returns {Promise<object>} Auto-filled entity fields
 */
export async function autoCompleteEntityWithAI({
  entityType = 'Personaje',
  title = '',
  category = '',
  characterRole = 'npc',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const modelId = await resolveIntermediaryModelId(finalBaseUrl);

  const systemPrompt = `Eres un generador maestro de entidades narrativas para el compendio de Ptahn.
Debes responder ESTRICTAMENTE con un objeto JSON válido (sin código markdown de backticks adicional) con la siguiente estructura según el tipo:

Para Tarjetas (Personaje, Lugar, Facción, etc.):
{
  "title": "Nombre pulido de la entidad",
  "intro": "Párrafo breve y conciso de introducción para el compendio (máximo 250 caracteres)",
  "text": "Descripción detallada, apariencia física, lore, vestimenta y personalidad",
  "traits": ["Rasgo 1", "Rasgo 2", "Rasgo 3", "Rasgo 4"],
  "tags": ["Tag1", "Tag2", "Tag3"],
  "callWords": ["palabra1", "palabra2"]
}

Para Escenarios:
{
  "title": "Título del escenario",
  "category": "Categoría o género",
  "intro": "Sinopsis rápida del escenario",
  "presentation": "Párrafo de apertura inmersiva para el jugador al empezar la partida",
  "baseContext": "Worldbuilding profundo, contexto y ambientación del mundo",
  "aiInstructions": "Instrucciones de sistema para el narrador IA (tono, secretos, reglas)",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

  const userPrompt = `Crea una entidad completa de tipo "${entityType}" basada en esta idea inicial:
Título o Concepto: "${title || 'Creación espontánea temática'}"
${category ? `Categoría/Género: "${category}"` : ''}
${entityType === 'Personaje' ? `Rol del personaje: "${characterRole === 'user_persona' ? 'Persona del usuario' : characterRole === 'playable' ? 'Personaje Jugable' : 'No Jugable (PNJ)'}"` : ''}

Responde ÚNICAMENTE con el objeto JSON.`;

  emitAILog({
    from: 'AI_CREATOR_ASSISTANT',
    to: 'CREATE_MODAL',
    type: 'COMPENDIUM_EXTRACTION',
    summary: `Auto-rellenando entidad completa (${entityType}: "${title || 'Aleatoria'}")`,
    payload: { entityType, title, model: modelId }
  });

  try {
    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1200
      })
    }, finalBaseUrl);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || '{}';

    // Strip think tags
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Extract JSON substring
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];

    const parsed = JSON.parse(raw);
    if (parsed.intro && typeof parsed.intro === 'string') {
      parsed.intro = parsed.intro.trim().substring(0, 250);
    }
    return parsed;
  } catch (error) {
    console.warn('[AI Enhancer]: Failed to auto-complete entity:', error);
    throw error;
  }
}
