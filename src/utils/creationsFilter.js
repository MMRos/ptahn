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
 * Filters and sorts Compendium cards.
 * By default (showChildVersions: false), child instances are filtered out.
 */
export function filterCreationsCards(cards = [], {
  searchQuery = '',
  cardTypeFilter = 'all',
  showChildVersions = false,
  sortBy = 'recent'
} = {}) {
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
      (c.description || c.intro || c.text || '').toLowerCase().includes(q) ||
      (c.scenarioName && c.scenarioName.toLowerCase().includes(q)) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  // 3. Card type filter
  if (cardTypeFilter && cardTypeFilter !== 'all') {
    list = list.filter(c => (c.type || '').toLowerCase() === cardTypeFilter.toLowerCase());
  }

  // 4. Sorting
  list.sort((a, b) => {
    if (sortBy === 'name_asc') return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    if (sortBy === 'name_desc') return (b.title || b.name || '').localeCompare(a.title || a.name || '');
    if (sortBy === 'type') {
      const typePriority = { 
        personaje: 1, 
        lugar: 2, 
        objeto: 3, 
        criatura: 4, 
        raza: 5, 
        faccion: 6, 
        'facción': 6, 
        memoria: 7, 
        inventario: 8, 
        regla: 9, 
        historia: 10, 
        otros: 11 
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
