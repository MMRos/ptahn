/**
 * Weight & Relevance Calculator for Lore Cards and Scenario Components
 * 
 * Computes hybrid relevance based on:
 * 1. Base importance slider (1-10)
 * 2. Pinned flag (isPinned: true -> guaranteed inclusion)
 * 3. Activation mode ('dynamic' vs 'strict_mention')
 * 4. Lexical / Regex match in recent turns
 * 5. Semantic relevance score from the Orchestrator SLM (0.0 to 1.0)
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
  const candidates = [
    card.title,
    card.name,
    ...(Array.isArray(card.tags) ? card.tags : [])
  ].filter(Boolean);

  const matchedTerms = [];

  for (const term of candidates) {
    const cleanTerm = term.trim().toLowerCase();
    if (cleanTerm.length >= 3 && normText.includes(cleanTerm)) {
      matchedTerms.push(term);
    }
  }

  if (matchedTerms.length > 0) {
    const isTitleMatched = candidates.slice(0, 2).some(t => normText.includes(t.toLowerCase()));
    const score = isTitleMatched ? 1.0 : 0.6;
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

  const finalScore = (normImportance * 0.3) + (lexical.score * 0.3) + (validSemantic * 0.4);
  return Number(finalScore.toFixed(4));
}

/**
 * Filters and sorts cards by hybrid relevance.
 * 
 * @param {Array} cards
 * @param {Object} options
 * @param {string} [options.recentText]
 * @param {Object} [options.semanticScores] Map of { [cardId]: score }
 * @param {number} [options.maxLimit] Maximum number of cards to include (default 8)
 * @returns {Array} Sorted top relevant cards
 */
export function filterAndSortRelevantCards(cards = [], { recentText = '', semanticScores = {}, maxLimit = 8 } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const scoredCards = cards.map(card => {
    const semScore = semanticScores[card.id] ?? semanticScores[card.title] ?? 0;
    const finalWeight = calculateCardRelevance(card, { recentText, semanticScore: semScore });
    return { card, finalWeight };
  });

  // Separate pinned and dynamic cards
  const pinned = scoredCards.filter(sc => sc.finalWeight === Infinity).map(sc => sc.card);
  const unpinned = scoredCards
    .filter(sc => sc.finalWeight > 0 && sc.finalWeight !== Infinity)
    .sort((a, b) => b.finalWeight - a.finalWeight)
    .map(sc => sc.card);

  const remainingSlots = Math.max(0, maxLimit - pinned.length);
  return [...pinned, ...unpinned.slice(0, remainingSlots)];
}
