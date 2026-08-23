/**
 * characterMatcher.js
 * Utilidades puras para la detección contextual de personajes, matching inteligente
 * de expresiones/imágenes según etiquetas y resolución de fondos de localización.
 */

/**
 * Normaliza un texto eliminando acentos y convirtiendo a minúsculas para comparaciones robustas.
 * @param {string} str 
 * @returns {string}
 */
export function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta el personaje que tiene mayor protagonismo en los mensajes recientes.
 * @param {Array} messages - Historial de mensajes del chat.
 * @param {Array} characters - Lista de personajes del compendio.
 * @param {Object} [userChar] - Personaje interpretado por el usuario.
 * @param {Object} [defaultChar] - Personaje por defecto si no se detecta ninguno.
 * @returns {Object|null}
 */
export function detectActiveCharacter(messages = [], characters = [], userChar = null, defaultChar = null) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return userChar || defaultChar || (characters.length > 0 ? characters[0] : null);
  }

  // Inspeccionar los últimos mensajes desde el más reciente
  const recentMessages = messages.slice(-4).reverse();

  for (const msg of recentMessages) {
    const text = msg.text || '';
    if (!text) continue;

    const normText = normalizeString(text);

    // 1. Buscar coincidencias con marcado de compendio ==Nombre==
    const markupMatches = text.match(/==([^=]+)==/g);
    if (markupMatches) {
      for (const m of markupMatches) {
        const rawName = m.replace(/==/g, '').trim();
        const found = characters.find(c => normalizeString(c.title || c.name) === normalizeString(rawName));
        if (found) return found;
      }
    }

    // 2. Buscar menciones directas por nombre de personaje
    for (const char of characters) {
      const name = char.title || char.name;
      if (!name) continue;
      const normName = normalizeString(name);
      if (normName.length > 2 && normText.includes(normName)) {
        return char;
      }
    }
  }

  // 3. Fallback a personaje de usuario o predeterminado
  return userChar || defaultChar || (characters.length > 0 ? characters[0] : null);
}

/**
 * Calcula la puntuación de coincidencia de una etiqueta contra el texto del mensaje.
 * Soporta etiquetas compuestas separadas por comas (ej. "alegre, sonriendo, bañador").
 * @param {string} label 
 * @param {string} normText 
 * @returns {number}
 */
function scoreLabelMatch(label, normText) {
  if (!label || !normText) return 0;
  const subLabels = label.split(',').map(l => normalizeString(l)).filter(Boolean);
  let totalScore = 0;

  for (const sub of subLabels) {
    if (sub.length < 2) continue;
    
    // Coincidencia exacta de frase completa
    if (normText.includes(sub)) {
      totalScore += sub.length * 3;
    } else {
      // Coincidencia por palabras individuales
      const words = sub.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (normText.includes(w)) {
          totalScore += w.length;
        }
      }
    }
  }

  return totalScore;
}

/**
 * Selecciona la mejor imagen / expresión para un personaje según el contexto del mensaje.
 * @param {Object} character - Objeto personaje con lista `images` o `characterImages`.
 * @param {string} messageText - Texto del mensaje para analizar emociones y acciones.
 * @returns {Object} { id, url, label, isDefault }
 */
export function matchCharacterExpression(character, messageText = '') {
  if (!character) {
    return { id: 'none', url: '', label: 'Sin imagen', isDefault: true };
  }

  const rawImages = character.images || character.characterImages || [];
  const validImages = Array.isArray(rawImages) ? rawImages.filter(img => img && img.url) : [];

  if (validImages.length === 0) {
    return {
      id: 'default',
      url: character.cover || '',
      label: 'Principal',
      isDefault: true
    };
  }

  if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
    const defaultImg = validImages.find(img => img.isDefault) || validImages[0];
    return defaultImg;
  }

  const normText = normalizeString(messageText);
  let bestImage = null;
  let highestScore = 0;

  for (const img of validImages) {
    const label = img.label || '';
    const score = scoreLabelMatch(label, normText);
    if (score > highestScore) {
      highestScore = score;
      bestImage = img;
    }
  }

  if (bestImage && highestScore > 0) {
    return bestImage;
  }

  // Fallback a imagen marcada como default o primera disponible
  return validImages.find(img => img.isDefault) || validImages[0];
}

/**
 * Resuelve la URL del fondo de pantalla de localización según el contexto del chat y compendio.
 * @param {Array} messages - Historial de mensajes.
 * @param {Object} scenario - Escenario activo.
 * @param {Array} cards - Tarjetas del compendio (lugares, facciones, etc.).
 * @param {Object} chatSettings - Configuración del chat.
 * @returns {string|null} URL de la imagen de fondo o null.
 */
export function resolveLocationWallpaper(messages = [], scenario = null, cards = [], chatSettings = {}) {
  if (chatSettings.showLocationBackground === false) {
    return null;
  }

  const locationCards = (cards || []).filter(c => c && c.type === 'Lugar' && c.cover);

  // 1. Buscar mención de lugar en los últimos mensajes
  if (Array.isArray(messages) && messages.length > 0) {
    const recent = messages.slice(-5).reverse();
    for (const msg of recent) {
      const text = msg.text || '';
      if (!text) continue;
      const normText = normalizeString(text);

      for (const loc of locationCards) {
        const name = loc.title || loc.name;
        if (!name) continue;
        const normName = normalizeString(name);
        if (normName.length > 2 && normText.includes(normName)) {
          return loc.cover;
        }
      }
    }
  }

  // 2. Fallback a portada del escenario
  if (scenario && scenario.cover) {
    return scenario.cover;
  }

  return null;
}
