/**
 * inheritance.js
 * Utilidades para la resolución de herencia prototípica (Padre -> Hijo con Delta Overrides)
 * para entidades de compendio y tarjetas de escenarios.
 */

/**
 * Resuelve una entidad individual aplicando los overrides de la instancia hija sobre el arquetipo padre.
 * @param {Object} entity - Tarjeta o instancia hija.
 * @param {Array<Object>} masterCards - Catálogo maestro de tarjetas de compendio.
 * @returns {Object} Tarjeta con propiedades fusionadas.
 */
export function resolveEntityInheritance(entity, masterCards = []) {
  if (!entity) return null;

  // Si no tiene parentId, es una tarjeta arquetipo directa
  if (!entity.parentId) {
    return entity;
  }

  const masterParent = Array.isArray(masterCards) 
    ? masterCards.find(c => c && (c.id === entity.parentId || c.title === entity.parentId))
    : null;

  if (!masterParent) {
    const overrides = entity.overrides || {};
    return { ...entity, ...overrides };
  }

  const overrides = entity.overrides || {};

  return {
    ...masterParent,
    ...entity,
    ...overrides,
    id: entity.id || masterParent.id,
    parentId: masterParent.id,
    title: overrides.title || entity.title || masterParent.title,
    intro: overrides.intro || entity.intro || masterParent.intro,
    text: overrides.text || entity.text || masterParent.text,
    cover: overrides.cover || entity.cover || masterParent.cover,
    traits: overrides.traits || entity.traits || masterParent.traits || [],
    inventory: overrides.inventory || entity.inventory || masterParent.inventory || [],
    callWords: overrides.callWords || entity.callWords || masterParent.callWords || masterParent.tags || []
  };
}

/**
 * Resuelve una lista completa de tarjetas de escenario, mezclando arquetipos directos e hijos vinculados.
 * @param {Array<Object>} scenarioCards
 * @param {Array<Object>} masterCards
 * @returns {Array<Object>}
 */
export function resolveAllScenarioCards(scenarioCards = [], masterCards = []) {
  if (!Array.isArray(scenarioCards)) return [];
  return scenarioCards.map(card => resolveEntityInheritance(card, masterCards)).filter(Boolean);
}
