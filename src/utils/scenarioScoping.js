/**
 * scenarioScoping.js
 * Utilidades puras para gestión y resolución del ámbito de escenarios,
 * incluyendo selección y aislamiento estricto del mensaje inicial activo,
 * resolución del personaje del usuario y filtrado de tarjetas del escenario.
 */

import { normalizeEntityName, findMatchingEntity } from './textFormatter';

/**
 * Normaliza y devuelve la lista de mensajes iniciales de un escenario.
 * Si el escenario solo tiene `presentation` (legado) o texto vacío,
 * asegura al menos una pestaña por defecto ("Inicio 1").
 *
 * @param {object} scenario
 * @returns {Array<{id: string, title: string, text: string}>}
 */
export function normalizeInitialMessages(scenario) {
  if (!scenario) return [{ id: 'init-default', title: 'Inicio 1', text: '' }];

  if (Array.isArray(scenario.initialMessages) && scenario.initialMessages.length > 0) {
    return scenario.initialMessages.map((msg, index) => ({
      id: msg.id || `init-${index + 1}`,
      title: (msg.title || `Inicio ${index + 1}`).trim(),
      text: typeof msg.text === 'string' ? msg.text : (typeof msg.content === 'string' ? msg.content : '')
    }));
  }

  // Compatibilidad retroactiva: Si solo existía `presentation` o `intro`
  const fallbackText = (scenario.presentation || scenario.intro || '').trim();
  return [
    {
      id: 'init-1',
      title: 'Inicio 1',
      text: fallbackText
    }
  ];
}

/**
 * Obtiene el objeto del mensaje inicial activo/visible del escenario.
 *
 * @param {object} scenario
 * @returns {{id: string, title: string, text: string}}
 */
export function getActiveInitialMessage(scenario) {
  const list = normalizeInitialMessages(scenario);
  if (!scenario?.activeInitialMessageId) {
    return list[0];
  }
  const found = list.find(m => m.id === scenario.activeInitialMessageId);
  return found || list[0];
}

/**
 * Obtiene estrictamente el texto del mensaje inicial visible/seleccionado.
 * Garantiza que a la IA y al chat SOLO se le entregue este texto.
 *
 * @param {object} scenario
 * @returns {string}
 */
export function getActiveInitialMessageText(scenario) {
  return (getActiveInitialMessage(scenario)?.text || '').trim();
}

/**
 * Resuelve el personaje activo del jugador a partir del estado del chat y el compendio.
 *
 * @param {object} chat
 * @param {object} appData
 * @returns {object|null}
 */
export function resolveUserCharacter(chat, appData) {
  if (!chat || !appData?.cards) return null;
  const targetId = chat.userCharacterId || chat.characterId || chat.character;
  const targetName = (chat.userCharacterName || chat.character || chat.characterId || '').trim().toLowerCase();

  return (appData.cards || []).find(c => {
    if (c.type !== 'Personaje' && c.type !== 'User') return false;
    const cTitle = (c.title || c.name || '').trim().toLowerCase();
    return c.id === targetId ||
           (targetName && cTitle === targetName) ||
           (chat.userCharacterId && c.id === chat.userCharacterId) ||
           (chat.characterId && (c.id === chat.characterId || cTitle === chat.characterId.trim().toLowerCase())) ||
           (chat.character && (c.id === chat.character || cTitle === chat.character.trim().toLowerCase())) ||
           (chat.userCharacterName && cTitle === chat.userCharacterName.trim().toLowerCase());
  }) || findMatchingEntity(targetName, appData.cards) || null;
}

/**
 * Obtiene las tarjetas estrictamente asociadas al escenario activo,
 * garantizando el aislamiento total de entidades de otros escenarios.
 *
 * @param {object} scenario
 * @param {object} chat
 * @param {object} appData
 * @param {object} userChar
 * @returns {Array<object>}
 */
export function getScenarioCards(scenario, chat, appData, userChar) {
  const allCards = appData?.cards || [];
  const scenarioCardsArray = Array.isArray(scenario?.cards) ? scenario.cards : [];
  const chatCharactersArray = Array.isArray(chat?.characters) ? chat.characters : [];
  const activeScenarioId = scenario?.id || chat?.scenarioId;
  const activeScenarioTitle = scenario?.title || chat?.scenario;

  // Incluir objetos embebidos directos si existen en scenario.cards
  const embeddedScenarioCards = scenarioCardsArray.filter(item => item && typeof item === 'object');
  const combinedPool = [...allCards, ...embeddedScenarioCards];
  const seen = new Set();
  const uniquePool = [];
  for (const c of combinedPool) {
    const key = c.id || c.title || c.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      uniquePool.push(c);
    }
  }

  return uniquePool.filter(c => {
    if (!c) return false;
    if (userChar && (c.id === userChar.id || c.title === userChar.title)) return false;
    if (c.type === 'Inventario' || c.type === 'Memoria') return false;

    // 1. Vinculación directa en scenario.cards (por id o título)
    const isDirectlyInScenario = scenarioCardsArray.some(ref => {
      if (!ref) return false;
      const refId = typeof ref === 'string' ? ref : ref.id;
      const refTitle = typeof ref === 'string' ? ref : (ref.title || ref.name);
      return (
        (refId && (c.id === refId || normalizeEntityName(c.id) === normalizeEntityName(refId))) ||
        (refTitle && (c.title === refTitle || normalizeEntityName(c.title) === normalizeEntityName(refTitle)))
      );
    });
    if (isDirectlyInScenario) return true;

    // 2. Vinculación directa en chat.characters
    const isDirectlyInChat = chatCharactersArray.some(ref => {
      if (!ref) return false;
      const refId = typeof ref === 'string' ? ref : ref.id;
      const refTitle = typeof ref === 'string' ? ref : (ref.title || ref.name);
      return (
        (refId && (c.id === refId || normalizeEntityName(c.id) === normalizeEntityName(refId))) ||
        (refTitle && (c.title === refTitle || normalizeEntityName(c.title) === normalizeEntityName(refTitle)))
      );
    });
    if (isDirectlyInChat) return true;

    // 3. Tarjeta creada o vinculada explícitamente a este escenario
    if (c.linkedScenario) {
      if (activeScenarioId && (c.linkedScenario === activeScenarioId || normalizeEntityName(c.linkedScenario) === normalizeEntityName(activeScenarioId))) return true;
      if (activeScenarioTitle && (c.linkedScenario === activeScenarioTitle || normalizeEntityName(c.linkedScenario) === normalizeEntityName(activeScenarioTitle))) return true;
    }

    // 4. Tarjetas conectadas explícitamente a este escenario
    if (Array.isArray(c.connectedCards) && c.connectedCards.length > 0) {
      const isConnected = c.connectedCards.some(cc => {
        if (!cc || typeof cc !== 'string') return false;
        return (
          (activeScenarioId && (cc === activeScenarioId || normalizeEntityName(cc) === normalizeEntityName(activeScenarioId))) ||
          (activeScenarioTitle && (cc === activeScenarioTitle || normalizeEntityName(cc) === normalizeEntityName(activeScenarioTitle)))
        );
      });
      if (isConnected) return true;
    }

    // AISLAMIENTO TOTAL: No existen tarjetas globales. Toda entidad fuera del escenario queda excluida.
    return false;
  });
}
