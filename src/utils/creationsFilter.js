/**
 * Helper utilities for filtering Compendium cards and extracting child/scenario provenance.
 */

/**
 * Checks whether a card is a linked child instance (delta) belonging to a scenario or chat.
 */
export function isChildCard(card) {
  if (!card) return false;
  if (card.isMaster === true) return false;
  return Boolean(
    card.parentId ||
    card.isChild === true ||
    card.scenarioId ||
    card.scenarioName ||
    card.chatId
  );
}

/**
 * Extracts provenance metadata for child cards to display in UI badges and details.
 */
export function getCardProvenance(card) {
  if (!card) return null;
  const isChild = isChildCard(card);
  if (!isChild) {
    return {
      isChild: false,
      scenarioName: null,
      scenarioId: null,
      chatName: null,
      chatId: null,
      formattedLabel: 'Arquetipo Maestro'
    };
  }

  const scenarioName = card.scenarioName || card.scenarioTitle || (card.scenarioId ? `Escenario ${card.scenarioId}` : null);
  const chatName = card.chatName || (card.chatId ? `Chat #${card.chatId}` : null);

  let formattedLabel = '🔗 Versión Hijo';
  if (scenarioName && chatName) {
    formattedLabel = `🔗 ${scenarioName} • ${chatName}`;
  } else if (scenarioName) {
    formattedLabel = `🔗 Escenario: ${scenarioName}`;
  } else if (chatName) {
    formattedLabel = `💬 ${chatName}`;
  }

  return {
    isChild: true,
    parentId: card.parentId || null,
    scenarioName,
    scenarioId: card.scenarioId || null,
    chatName,
    chatId: card.chatId || null,
    formattedLabel
  };
}

/**
 * Filters and sorts Compendium cards and scenarios.
 * Supports both signatures: filterCreationsCards(cards, options) and filterCreationsCards({ cards, ...options })
 */
export function filterCreationsCards(cardsOrOptions = [], maybeOptions = {}) {
  let cards = [];
  let options = {};

  if (Array.isArray(cardsOrOptions)) {
    cards = cardsOrOptions;
    options = maybeOptions || {};
  } else if (cardsOrOptions && typeof cardsOrOptions === 'object') {
    cards = cardsOrOptions.cards || [];
    options = cardsOrOptions;
  }

  const {
    searchQuery = '',
    cardTypeFilter = 'all',
    scenarioCategoryFilter = 'all',
    showChildVersions = false,
    sortBy = 'recent'
  } = options;

  let list = Array.isArray(cards) ? [...cards] : [];

  // 1. Child versions filter (hidden by default)
  if (!showChildVersions) {
    list = list.filter(c => !isChildCard(c));
  }

  // 2. Search query filter
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c =>
      (c.title || c.name || '').toLowerCase().includes(q) ||
      (c.type || '').toLowerCase().includes(q) ||
      (c.subtype || '').toLowerCase().includes(q) ||
      (c.description || c.intro || c.text || c.bio || '').toLowerCase().includes(q) ||
      (c.scenarioName && c.scenarioName.toLowerCase().includes(q)) ||
      (c.tags && Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase().includes(q)))
    );
  }

  // 3. Card type filter
  if (cardTypeFilter && cardTypeFilter !== 'all') {
    const filterLower = cardTypeFilter.toLowerCase();
    list = list.filter(c => {
      const typeLower = (c.type || '').toLowerCase();
      if (filterLower === 'historia' || filterLower === 'escenario') {
        return typeLower === 'historia' || typeLower === 'escenario' || c.isScenario;
      }
      return typeLower === filterLower;
    });
  }

  // 4. Scenario category filter
  if (scenarioCategoryFilter && scenarioCategoryFilter !== 'all') {
    const catLower = scenarioCategoryFilter.toLowerCase();
    list = list.filter(c => {
      if (c.category && c.category.toLowerCase() === catLower) return true;
      if (c.tags && Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase() === catLower)) return true;
      return false;
    });
  }

  // 5. Sorting
  if (sortBy === 'custom') {
    // Orden manual personalizado definido por el usuario (mantiene el orden del array)
    return list;
  }

  list.sort((a, b) => {
    if (sortBy === 'name_asc') return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    if (sortBy === 'name_desc') return (b.title || b.name || '').localeCompare(a.title || a.name || '');
    if (sortBy === 'type') {
      const typePriority = { 
        historia: 1, 
        escenario: 1, 
        personaje: 2, 
        lugar: 3, 
        objeto: 4, 
        criatura: 5, 
        raza: 6, 
        faccion: 7, 
        'facción': 7, 
        memoria: 8, 
        inventario: 9, 
        narrador: 10,
        herramienta: 11,
        regla: 12, 
        otros: 13 
      };
      const pA = typePriority[(a.type || '').toLowerCase()] || 99;
      const pB = typePriority[(b.type || '').toLowerCase()] || 99;
      if (pA !== pB) return pA - pB;
      return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    }
    if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  return list;
}
