/**
 * Weight & Relevance Calculator for Lore Cards and Scenario Components
 * 
 * Computes hybrid relevance based on:
 * 1. Base importance slider (1-10)
 * 2. Pinned flag (isPinned: true -> guaranteed inclusion)
 * 3. Activation mode ('dynamic' vs 'strict_mention')
 * 4. Lexical / Regex match in recent turns (including callWords)
 * 5. Semantic relevance score from the Orchestrator SLM (0.0 to 1.0)
 * 6. Graph relationship propagation (inter-card connections with decay)
 */

/**
 * Detects if a card title, name, or tags match anywhere in the recent text.
 * 
 * @param {Object} card
 * @param {string} text
 * @returns {Object} { matched: boolean, score: number, matches: string[] }
 */
export function detectLexicalMatch(card, text = '') {
  if (!card || !text) return { matched: false, score: 0, matches: [] };

  const normText = text.toLowerCase();

  // Normalize callWords if string
  let normalizedCallWords = [];
  if (typeof card.callWords === 'string') {
    normalizedCallWords = card.callWords.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(card.callWords)) {
    normalizedCallWords = card.callWords.map(s => String(s).trim()).filter(Boolean);
  }

  const candidates = [
    card.title,
    card.name,
    ...(Array.isArray(card.tags) ? card.tags : []),
    ...normalizedCallWords
  ].filter(Boolean);

  const matchedTerms = [];

  for (const term of candidates) {
    const cleanTerm = term.trim().toLowerCase();
    if (cleanTerm.length >= 2 && normText.includes(cleanTerm)) {
      matchedTerms.push(term);
    }
  }

  if (matchedTerms.length > 0) {
    const titleCandidates = [card.title, card.name].filter(Boolean);
    const isTitleMatched = titleCandidates.some(t => normText.includes(t.toLowerCase()));
    const isCallWordMatched = normalizedCallWords.some(cw => normText.includes(cw.toLowerCase()));
    const score = isTitleMatched ? 1.0 : (isCallWordMatched ? 0.9 : 0.6);
    return { matched: true, score, matches: matchedTerms };
  }

  return { matched: false, score: 0, matches: [] };
}

/**
 * Calculates the final hybrid relevance score of a single card.
 * 
 * @param {Object} card
 * @param {Object} context
 * @param {string} [context.recentText]
 * @param {number} [context.semanticScore]
 * @returns {number} Final weight score (or Infinity if pinned)
 */
export function calculateCardRelevance(card, { recentText = '', semanticScore = 0 } = {}) {
  if (!card) return 0;

  // 1. Pinned cards are always guaranteed at top
  if (card.isPinned) {
    return Infinity;
  }

  const lexical = detectLexicalMatch(card, recentText);
  const isStrictMention = card.activationMode === 'strict_mention';

  // 2. Strict mention mode: Must be explicitly present in recent text
  if (isStrictMention) {
    if (!lexical.matched) {
      return 0;
    }
    const rawImportance = typeof card.importance === 'number' ? card.importance : 5;
    const normImportance = Math.max(0.1, Math.min(1.0, rawImportance / 10));
    return (normImportance * 0.4) + (lexical.score * 0.6);
  }

  // 3. Dynamic hybrid mode: Importance (30%) + Lexical Match (30%) + Semantic AI Score (40%)
  const rawImportance = typeof card.importance === 'number' ? card.importance : 5;
  const normImportance = Math.max(0.1, Math.min(1.0, rawImportance / 10));
  const validSemantic = typeof semanticScore === 'number' ? Math.max(0, Math.min(1.0, semanticScore)) : 0;

  // Compuerta de Activación: Una tarjeta dinámica solo se activa si tiene mención léxica o afinidad semántica real
  const hasLexicalMatch = lexical.matched;
  const hasSemanticAffinity = validSemantic >= 0.40;

  if (!hasLexicalMatch && !hasSemanticAffinity) {
    return 0;
  }

  const finalScore = (normImportance * 0.3) + (lexical.score * 0.3) + (validSemantic * 0.4);
  return Number(finalScore.toFixed(4));
}

/**
 * Propagates activation weight across interconnected scenario entities.
 * When entity A has an active weight > 0, it distributes derived weight to connected entities B, C, etc.
 * 
 * @param {Array<{ card: Object, finalWeight: number }>} scoredCards
 * @param {Object} [options]
 * @param {number} [options.decayFactor=0.7]
 * @returns {Array<{ card: Object, finalWeight: number, directWeight: number, inducedWeight: number }>}
 */
export function propagateRelationshipWeights(scoredCards = [], { decayFactor = 0.7 } = {}) {
  if (!Array.isArray(scoredCards) || scoredCards.length === 0) return [];

  // Create lookup map
  const cardMap = new Map();
  scoredCards.forEach(sc => {
    if (sc && sc.card) {
      const entry = {
        card: sc.card,
        directWeight: sc.finalWeight,
        inducedWeight: 0
      };
      if (sc.card.id) {
        cardMap.set(sc.card.id, entry);
      }
      if (sc.card.title) {
        cardMap.set(sc.card.title, entry);
      }
      if (sc.card.name) {
        cardMap.set(sc.card.name, entry);
      }
    }
  });

  // Propagate along connections
  scoredCards.forEach(sc => {
    const { card, finalWeight } = sc;
    if (!card || finalWeight <= 0 || finalWeight === Infinity) return;

    const rawConns = [];

    // 1. Support card.connectedCards (array of string IDs/titles or objects from ConnectionSelector)
    if (Array.isArray(card.connectedCards)) {
      card.connectedCards.forEach(c => {
        if (typeof c === 'string') rawConns.push({ targetId: c, weightMultiplier: 0.7 });
        else if (c && c.id) rawConns.push({ targetId: c.id, weightMultiplier: 0.7 });
        else if (c && c.title) rawConns.push({ targetId: c.title, weightMultiplier: 0.7 });
      });
    }

    // 2. Support card.connections (array of connection objects or strings)
    if (Array.isArray(card.connections)) {
      card.connections.forEach(conn => {
        if (typeof conn === 'string') rawConns.push({ targetId: conn, weightMultiplier: 0.7 });
        else if (conn && conn.targetId) rawConns.push(conn);
        else if (conn && conn.id) rawConns.push({ targetId: conn.id, weightMultiplier: 0.7 });
        else if (conn && conn.title) rawConns.push({ targetId: conn.title, weightMultiplier: 0.7 });
      });
    }

    rawConns.forEach(conn => {
      if (!conn || !conn.targetId) return;
      const target = cardMap.get(conn.targetId);
      if (target && target.directWeight !== Infinity) {
        const multiplier = typeof conn.weightMultiplier === 'number' 
          ? Math.max(0, Math.min(1.0, conn.weightMultiplier)) 
          : 0.7;
        const propagated = finalWeight * multiplier * decayFactor;
        target.inducedWeight = Math.max(target.inducedWeight, propagated);
      }
    });
  });

  // Return augmented scored cards with combined weights
  return scoredCards.map(sc => {
    const entry = cardMap.get(sc.card.id) || cardMap.get(sc.card.title);
    if (!entry) return sc;

    if (entry.directWeight === Infinity) {
      return { ...sc, directWeight: Infinity, inducedWeight: 0, finalWeight: Infinity };
    }

    const combined = Math.min(1.0, entry.directWeight + (entry.inducedWeight * (1 - entry.directWeight)));
    const finalWeight = Number(Math.max(entry.directWeight, combined).toFixed(4));

    return {
      card: sc.card,
      directWeight: entry.directWeight,
      inducedWeight: Number(entry.inducedWeight.toFixed(4)),
      finalWeight
    };
  });
}

/**
 * Filters and sorts cards by hybrid relevance and inter-entity graph propagation.
 * 
 * @param {Array} cards
 * @param {Object} options
 * @param {string} [options.recentText]
 * @param {Object} [options.semanticScores] Map of { [cardId]: score }
 * @param {number} [options.maxLimit] Maximum number of cards to include (default 8)
 * @param {boolean} [options.enableGraphPropagation] Whether to propagate weights across connections (default true)
 * @returns {Array} Sorted top relevant cards
 */
export function filterAndSortRelevantCards(cards = [], { recentText = '', semanticScores = {}, maxLimit = 8, enableGraphPropagation = true } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  let scoredCards = cards.map(card => {
    const semScore = semanticScores[card.id] ?? semanticScores[card.title] ?? 0;
    const finalWeight = calculateCardRelevance(card, { recentText, semanticScore: semScore });
    return { card, finalWeight };
  });

  if (enableGraphPropagation) {
    scoredCards = propagateRelationshipWeights(scoredCards);
  }

  // Separate pinned and dynamic cards
  const pinned = scoredCards.filter(sc => sc.finalWeight === Infinity).map(sc => sc.card);
  const unpinned = scoredCards
    .filter(sc => sc.finalWeight > 0 && sc.finalWeight !== Infinity)
    .sort((a, b) => b.finalWeight - a.finalWeight)
    .map(sc => sc.card);

  const remainingSlots = Math.max(0, maxLimit - pinned.length);
  return [...pinned, ...unpinned.slice(0, remainingSlots)];
}
