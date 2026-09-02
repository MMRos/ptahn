/**
 * cardGatekeeper.js
 * 
 * Significance and Recurrence Gatekeeper for Auto-Card Generation (F046).
 * Prevents compendium clutter by filtering out incidental wild animals,
 * single-turn combat mobs, and generic anonymous NPCs, while welcoming
 * settlements, overarching bestiary species, and recurring characters (>= 3 turns).
 */

const INCIDENTAL_ANIMAL_PATTERNS = [
  /\blobo\b/i,
  /\bloba\b/i,
  /\boso\b/i,
  /\bosa\b/i,
  /\bciervo\b/i,
  /\bcierva\b/i,
  /\brata\b/i,
  /\bcuervo\b/i,
  /\bpájaro\b/i,
  /\bcaballo\b/i,
  /\byegua\b/i,
  /\bjabalí\b/i,
  /\bserpiente\b/i,
  /\bvip[eé]ra\b/i,
  /\baraña\b/i,
  /\bperro\b/i,
  /\bguardia\b/i,
  /\bbandido\b/i,
  /\bsoldado\b/i,
  /\bposadero\b/i,
  /\bmercader\b/i
];

/**
 * Checks if an entity represents an incidental wild animal or anonymous throwaway NPC.
 * @param {Object} entity 
 * @returns {boolean}
 */
export function isIncidentalWildCreature(entity) {
  if (!entity || !entity.title) return false;

  const title = entity.title.trim().toLowerCase();

  // Explicit species definitions with "(especie)" or "(raza)" in title are cataloged compendium entries
  if (/\b(especie|raza)\b/i.test(title)) {
    return false;
  }

  // Check if title matches common wild animals or anonymous mobs
  for (const pattern of INCIDENTAL_ANIMAL_PATTERNS) {
    if (pattern.test(title)) {
      return true;
    }
  }

  return false;
}

/**
 * Counts the number of distinct messages in which an entity name appears.
 * @param {string} name 
 * @param {Array<Object>} messages 
 * @returns {number}
 */
export function countEntityMentions(name, messages = []) {
  if (!name || typeof name !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    return 0;
  }

  const cleanName = name.trim().toLowerCase();
  if (cleanName.length < 2) return 0;

  // Escape regex special chars
  const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');

  let distinctCount = 0;
  for (const msg of messages) {
    const text = msg?.text || '';
    if (regex.test(text)) {
      distinctCount++;
    }
  }

  return distinctCount;
}

/**
 * Evaluates whether an extracted entity qualifies for permanent automatic compendium insertion.
 * @param {Object} entity 
 * @param {Array<Object>} messages Full chat messages history
 * @param {Object} options Configuration overrides (e.g. { minRecurrence: 3, existingCards: [], userChar: {} })
 * @returns {boolean}
 */
export function isEntityEligibleForAutoCard(entity, messages = [], options = {}) {
  if (!entity || !entity.title || typeof entity.title !== 'string') {
    return false;
  }

  const title = entity.title.trim();
  if (title.length < 2) return false;

  const cleanLowerTitle = title.toLowerCase();

  // 1. Deduplicación estricta contra tarjetas ya existentes en el compendio o escenario
  if (Array.isArray(options.existingCards) && options.existingCards.length > 0) {
    const isDuplicate = options.existingCards.some(existing => {
      if (!existing) return false;
      const existingTitle = (existing.title || existing.name || '').trim().toLowerCase();
      if (!existingTitle) return false;
      const strippedExisting = existingTitle.replace(/^(el|la|los|las)\s+/i, '').trim();
      const strippedCandidate = cleanLowerTitle.replace(/^(el|la|los|las)\s+/i, '').trim();
      return existingTitle === cleanLowerTitle || strippedExisting === strippedCandidate;
    });
    if (isDuplicate) {
      return false;
    }
  }

  // 2. Blindaje de la identidad del jugador ({{user}} / userChar): jamás crear ficha de PNJ para el protagonista
  if (options.userChar) {
    const playerTitle = (options.userChar.title || options.userChar.name || '').trim().toLowerCase();
    if (playerTitle) {
      const strippedPlayer = playerTitle.replace(/^(el|la|los|las)\s+/i, '').trim();
      const strippedCandidate = cleanLowerTitle.replace(/^(el|la|los|las)\s+/i, '').trim();
      if (cleanLowerTitle === playerTitle || strippedCandidate === strippedPlayer) {
        return false;
      }
    }
  }

  // 3. Animales salvajes o PNJs incidentales: Bloqueo prioritario
  if (isIncidentalWildCreature(entity)) {
    return false;
  }

  const type = (entity.type || 'Personaje').toLowerCase();
  const minRecurrence = options.minRecurrence !== undefined ? options.minRecurrence : 3;

  // 4. Lugares y Asentamientos: Se admiten siempre si tienen nombre descriptivo (>= 3 caracteres)
  if (type === 'lugar') {
    return title.length >= 3;
  }

  // 5. Especies catalogadas de bestiario general
  const tags = Array.isArray(entity.tags) ? entity.tags : [];
  const isCatalogedSpecies = (type === 'raza' && /\b(especie|fauna|tribu)\b/i.test(tags.join(' '))) ||
                             /\b(especie|raza)\b/i.test(cleanLowerTitle);
  if (isCatalogedSpecies) {
    return true;
  }

  // 6. Personajes, Mobs y Criaturas nombradas: Requieren recurrencia demostrada (mínimo 3 mensajes distintos)
  if (type === 'personaje' || type === 'npc' || type === 'mob' || type === 'bestiario' || type === 'bestiálidos') {
    const mentions = countEntityMentions(title, messages);
    return mentions >= minRecurrence;
  }

  // 7. Objetos e Ítems especiales: Deben mencionarse al menos 2 veces
  if (type === 'objeto' || type === 'item' || type === 'inventario') {
    const mentions = countEntityMentions(title, messages);
    return mentions >= 2;
  }

  return false;
}
