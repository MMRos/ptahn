/**
 * cloning.js
 * Utilidades para la duplicación y clonación independiente de Tarjetas y Escenarios.
 */

/**
 * Clona una tarjeta en un nuevo arquetipo maestro independiente.
 * @param {Object} card
 * @param {Object} creatorInfo
 * @returns {Object}
 */
export function cloneCard(card, creatorInfo = {}) {
  if (!card) return null;
  const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    ...card,
    id: newId,
    title: card.title ? `${card.title} (Copia)` : 'Nueva Tarjeta (Copia)',
    parentId: null,
    overrides: null,
    creatorId: creatorInfo.creatorId || card.creatorId || '',
    creatorName: creatorInfo.creatorName || card.creatorName || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Clona un escenario en un nuevo escenario independiente.
 * @param {Object} scenario
 * @param {Object} creatorInfo
 * @returns {Object}
 */
export function cloneScenario(scenario, creatorInfo = {}) {
  if (!scenario) return null;
  const newId = `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    ...scenario,
    id: newId,
    title: scenario.title ? `${scenario.title} (Copia)` : 'Nuevo Escenario (Copia)',
    cards: Array.isArray(scenario.cards) ? [...scenario.cards] : [],
    creatorId: creatorInfo.creatorId || scenario.creatorId || '',
    creatorName: creatorInfo.creatorName || scenario.creatorName || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
