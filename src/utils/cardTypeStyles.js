/**
 * Card Type Chromatic & Styling Configuration
 * 
 * Provides unified color palettes, icons, border styles, and badges
 * for all card entities across Ptahn.
 */

export const CARD_TYPE_CONFIG = {
  Personaje: {
    key: 'Personaje',
    label: 'Personaje',
    pluralLabel: 'Personajes',
    icon: '🎭',
    color: '#818cf8', // Indigo
    accentColor: '#6366f1',
    borderColor: 'rgba(99, 102, 241, 0.45)',
    glowColor: 'rgba(99, 102, 241, 0.25)',
    chipBg: 'rgba(99, 102, 241, 0.18)',
    chipBorder: 'rgba(129, 140, 248, 0.45)',
    chipColor: '#c7d2fe'
  },
  Lugar: {
    key: 'Lugar',
    label: 'Lugar',
    pluralLabel: 'Lugares',
    icon: '🏛️',
    color: '#22d3ee', // Cyan / Turquoise
    accentColor: '#06b6d4',
    borderColor: 'rgba(6, 182, 212, 0.45)',
    glowColor: 'rgba(6, 182, 212, 0.25)',
    chipBg: 'rgba(6, 182, 212, 0.18)',
    chipBorder: 'rgba(34, 211, 238, 0.45)',
    chipColor: '#a5f3fc'
  },
  Objeto: {
    key: 'Objeto',
    label: 'Objeto',
    pluralLabel: 'Objetos',
    icon: '📦',
    color: '#ffd36b', // Gold / Amber
    accentColor: '#f59e0b',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    chipBg: 'rgba(245, 158, 11, 0.18)',
    chipBorder: 'rgba(255, 211, 107, 0.45)',
    chipColor: '#fef08a'
  },
  Criatura: {
    key: 'Criatura',
    label: 'Criatura',
    pluralLabel: 'Criaturas',
    icon: '🐉',
    color: '#a3e635', // Lime / Beast Green
    accentColor: '#84cc16',
    borderColor: 'rgba(132, 204, 22, 0.45)',
    glowColor: 'rgba(132, 204, 22, 0.25)',
    chipBg: 'rgba(132, 204, 22, 0.18)',
    chipBorder: 'rgba(163, 230, 53, 0.45)',
    chipColor: '#d9f99d'
  },
  Raza: {
    key: 'Raza',
    label: 'Raza',
    pluralLabel: 'Razas',
    icon: '🐾',
    color: '#fb923c', // Orange Copper / Terracotta
    accentColor: '#f97316',
    borderColor: 'rgba(249, 115, 22, 0.45)',
    glowColor: 'rgba(249, 115, 22, 0.25)',
    chipBg: 'rgba(249, 115, 22, 0.18)',
    chipBorder: 'rgba(251, 146, 60, 0.45)',
    chipColor: '#fed7aa'
  },
  Facción: {
    key: 'Facción',
    label: 'Facción',
    pluralLabel: 'Facciones',
    icon: '🛡️',
    color: '#f87171', // Crimson / Ruby Red
    accentColor: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    chipBg: 'rgba(239, 68, 68, 0.18)',
    chipBorder: 'rgba(248, 113, 113, 0.45)',
    chipColor: '#fecaca'
  },
  Memoria: {
    key: 'Memoria',
    label: 'Memoria',
    pluralLabel: 'Memorias',
    icon: '🧠',
    color: '#c084fc', // Neon Magenta / Purple
    accentColor: '#d946ef',
    borderColor: 'rgba(217, 70, 239, 0.45)',
    glowColor: 'rgba(217, 70, 239, 0.25)',
    chipBg: 'rgba(217, 70, 239, 0.18)',
    chipBorder: 'rgba(192, 132, 252, 0.45)',
    chipColor: '#f5d0fe'
  },
  Inventario: {
    key: 'Inventario',
    label: 'Inventario',
    pluralLabel: 'Inventarios',
    icon: '🎒',
    color: '#fde047', // Citric Gold / Yellow
    accentColor: '#eab308',
    borderColor: 'rgba(234, 179, 8, 0.45)',
    glowColor: 'rgba(234, 179, 8, 0.25)',
    chipBg: 'rgba(234, 179, 8, 0.18)',
    chipBorder: 'rgba(253, 224, 71, 0.45)',
    chipColor: '#fef9c3'
  },
  Regla: {
    key: 'Regla',
    label: 'Regla',
    pluralLabel: 'Reglas / Historia',
    icon: '📜',
    color: '#fbbf24', // Parchment Amber
    accentColor: '#d97706',
    borderColor: 'rgba(217, 119, 6, 0.45)',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    chipBg: 'rgba(217, 119, 6, 0.18)',
    chipBorder: 'rgba(251, 191, 36, 0.45)',
    chipColor: '#fde68a'
  },
  Historia: {
    key: 'Historia',
    label: 'Historia',
    pluralLabel: 'Historias',
    icon: '📖',
    color: '#fbbf24',
    accentColor: '#d97706',
    borderColor: 'rgba(217, 119, 6, 0.45)',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    chipBg: 'rgba(217, 119, 6, 0.18)',
    chipBorder: 'rgba(251, 191, 36, 0.45)',
    chipColor: '#fde68a'
  },
  Otros: {
    key: 'Otros',
    label: 'Otros',
    pluralLabel: 'Otros / Misceláneos',
    icon: '✨',
    color: '#cbd5e1', // Platinum / Silver
    accentColor: '#94a3b8',
    borderColor: 'rgba(148, 163, 184, 0.45)',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    chipBg: 'rgba(148, 163, 184, 0.18)',
    chipBorder: 'rgba(203, 213, 225, 0.45)',
    chipColor: '#f1f5f9'
  }
};

/**
 * Normalizes type string and returns appropriate styling object.
 * 
 * @param {string} cardType
 * @returns {Object} Card type style specification
 */
export function getCardTypeStyle(cardType = '') {
  if (!cardType || typeof cardType !== 'string') {
    return CARD_TYPE_CONFIG.Otros;
  }
  const clean = cardType.trim().toLowerCase();
  
  if (clean === 'personaje' || clean === 'npc' || clean === 'pj') return CARD_TYPE_CONFIG.Personaje;
  if (clean === 'lugar' || clean === 'ubicacion' || clean === 'ubicación') return CARD_TYPE_CONFIG.Lugar;
  if (clean === 'objeto' || clean === 'item' || clean === 'ítem') return CARD_TYPE_CONFIG.Objeto;
  if (clean === 'criatura' || clean === 'monstruo' || clean === 'bestia') return CARD_TYPE_CONFIG.Criatura;
  if (clean === 'raza' || clean === 'especie') return CARD_TYPE_CONFIG.Raza;
  if (clean === 'facción' || clean === 'faccion' || clean === 'gremio') return CARD_TYPE_CONFIG.Facción;
  if (clean === 'memoria' || clean === 'recuerdo') return CARD_TYPE_CONFIG.Memoria;
  if (clean === 'inventario' || clean === 'mochila') return CARD_TYPE_CONFIG.Inventario;
  if (clean === 'regla' || clean === 'mecanica' || clean === 'mecánica') return CARD_TYPE_CONFIG.Regla;
  if (clean === 'historia' || clean === 'lore') return CARD_TYPE_CONFIG.Historia;
  
  return CARD_TYPE_CONFIG.Otros;
}
