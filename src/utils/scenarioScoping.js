/**
 * scenarioScoping.js
 * Utilidades puras para gestión y resolución del ámbito de escenarios,
 * incluyendo selección y aislamiento estricto del mensaje inicial activo.
 */

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
