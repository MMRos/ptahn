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
      if (name) {
        const normName = normalizeString(name);
        if (normName.length > 2 && normText.includes(normName)) {
          return char;
        }
      }

      // 3. Buscar coincidencias con Call Words
      let callWordsList = [];
      if (typeof char.callWords === 'string') {
        callWordsList = char.callWords.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(char.callWords)) {
        callWordsList = char.callWords.map(s => String(s).trim()).filter(Boolean);
      }

      for (const cw of callWordsList) {
        const normCw = normalizeString(cw);
        if (normCw.length > 2 && normText.includes(normCw)) {
          return char;
        }
      }
    }
  }

  // 3. Fallback a personaje de usuario o predeterminado
  return userChar || defaultChar || (characters.length > 0 ? characters[0] : null);
}

const TAG_SYNONYMS = {
  // Ropa / Outfits & Formas
  'highschool uniform': ['uniforme', 'escolar', 'colegial', 'instituto', 'colegio', 'uniform', 'school uniform', 'highschool uniform', 'blazer', 'falda escolar', 'camisa escolar'],
  'school uniform': ['uniforme', 'escolar', 'colegial', 'instituto', 'colegio', 'uniform', 'school uniform', 'blazer', 'falda escolar', 'camisa escolar'],
  'uniform': ['uniforme', 'uniform', 'traje'],
  'sport clothes': ['chandal', 'ropa deportiva', 'sudadera', 'sport clothes', 'ropa de deporte', 'tracksuit', 'chaqueta de deporte'],
  'blazer': ['blazer', 'chaqueta escolar', 'americana'],
  'hoodie': ['sudadera', 'hoodie', 'chaqueta con capucha', 'tracksuit', 'chandal'],
  'turtleneck': ['cuello alto', 'turtleneck', 'jersey', 'sweater', 'sueter'],
  't-shirt': ['camiseta', 't-shirt', 'playera', 'remera', 'top'],
  'bikini': ['bikini', 'banador', 'traje de bano', 'playa', 'mar', 'piscina', 'costa', 'nadar', 'swimsuit'],
  'swimsuit': ['banador', 'traje de bano', 'bikini', 'swimsuit', 'playa'],
  'underwear': ['ropa interior', 'bragas', 'sujetador', 'en ropa interior', 'en bragas', 'calzones', 'underwear', 'panties', 'bra', 'lenceria'],
  'panties': ['bragas', 'panties', 'calzones', 'bombacha', 'tanga', 'ropa interior'],
  'lingerie': ['lenceria', 'lingerie', 'encaje', 'ropa interior', 'picardias', 'baby doll'],
  'topless': ['topless', 'pechos al aire', 'sin camiseta', 'pecho descubierto', 'senos', 'descamisada', 'sin sujetador'],
  'nude': ['desnudo', 'desnuda', 'sin ropa', 'nude', 'naked', 'completamente desnuda', 'desvestida', 'en cueros'],
  'naked': ['desnudo', 'desnuda', 'sin ropa', 'naked', 'nude'],
  'nekomimi form': ['nekomimi', 'orejas de gato', 'forma de gata', 'chica gato', 'cola de gato', 'cat ears', 'neko', 'forma felina'],
  'succubus form': ['forma de sucubo', 'alas de murcielago', 'sucubo', 'succubus', 'demonio', 'diablesa', 'alas negras', 'succubus form'],
  'armor': ['armadura', 'combate', 'batalla', 'guerra', 'espada', 'lucha', 'pelea', 'armor', 'peto', 'coraza'],
  'maid outfit': ['maid', 'sirvienta', 'criada', 'doncella', 'maid dress', 'delantal'],

  // Emociones, Estados e Intención Narrativa
  'in heat': ['en celo', 'celo', 'caliente', 'desesperada de deseo', 'ardiendo de deseo', 'lujuria', 'lujuriosa', 'in heat', 'rut', 'frenesi'],
  'pleading': ['suplicando', 'suplica', 'rogando', 'mirada suplicante', 'implorando', 'pleading', 'begging', 'pidiendo por favor', 'ojos suplicantes'],
  'knowing look': ['mirada complice', 'mirada picara', 'sabiendo lo que pasa', 'mirada burlona', 'sabiendo', 'knowing look', 'mirada de complicidad'],
  'showing attention': ['atenta', 'prestando atencion', 'inclinandose', 'escuchando atentamente', 'atencion', 'showing attention', 'attentive', 'mirando fijamente'],
  'pleasure': ['placer', 'gemidos', 'gemiendo', 'jadeando', 'jadeo', 'excitada', 'excitado', 'caliente', 'gozo', 'sensacion', 'estremecimiento', 'pleasure', 'aroused', 'lust', 'tocandose', 'climax', 'orgasmo'],
  'aroused': ['excitada', 'excitado', 'caliente', 'deseo', 'lujuria', 'aroused', 'placer', 'humeda', 'mojada'],
  'seductive': ['seductora', 'seductor', 'provocativa', 'picara', 'seductive', 'mirada picara', 'coqueta', 'tentadora', 'erotica'],
  'smug': ['sonrisa picara', 'burlona', 'engreida', 'smug', 'autosuficiente'],
  'evil smile': ['sonrisa maliciosa', 'sonrisa malevola', 'risa malvada', 'evil smile', 'grinning', 'diabolica'],
  'happy': ['feliz', 'alegre', 'sonriendo', 'contenta', 'contento', 'risa', 'riendo', 'happy', 'smile', 'cheerful', 'sonrisa'],
  'smiling': ['sonriendo', 'sonrisa', 'smiling', 'smile', 'feliz'],
  'blushing': ['sonrojada', 'sonrojado', 'timida', 'timido', 'rubor', 'avergonzada', 'verguenza', 'blushing', 'shy', 'mejillas rojas'],
  'shy': ['timida', 'timido', 'vergonzosa', 'apocada', 'shy', 'sonrojada'],
  'worried': ['preocupada', 'preocupado', 'nerviosa', 'nervioso', 'inquietud', 'worried', 'nervous', 'ansiosa'],
  'crying': ['llorando', 'lagrimas', 'sollozando', 'llanto', 'crying', 'tears', 'triste', 'sad'],
  'sad': ['triste', 'deprimida', 'pena', 'sad', 'desolada'],
  'angry': ['enojado', 'enojada', 'furioso', 'furiosa', 'ira', 'rabia', 'angry', 'molesta', 'enfadada'],
  'surprised': ['sorprendida', 'sorprendido', 'shock', 'asombrada', 'surprised', 'boquiabierta', 'sobresaltada'],

  // Poses, Acciones e Interacción Espacial / NSFW
  'sex from behind': ['sexo por detras', 'por detras', 'penetracion', 'empalandola', 'sex from behind', 'penetration', 'doggystyle', 'a cuatro patas', 'embistiendo', 'penetrando'],
  'doggystyle': ['a cuatro patas', 'de espaldas', 'penetracion por detras', 'doggystyle', 'en cuatro', 'por detras'],
  'penetration': ['penetracion', 'penetrandola', 'metiendola', 'dentro de ella', 'embestida', 'empalando', 'penetration'],
  'creampie': ['corriendose dentro', 'eyaculacion', 'semen', 'cum', 'creampie', 'lechada', 'chorros de semen', 'llena de semen', 'eyacula'],
  'torn pantyhose': ['medias rotas', 'medias rasgadas', 'pantyhose', 'medias negras rotas', 'torn pantyhose', 'medias', 'medias negras'],
  'ahegao': ['ahegao', 'mordiendose el labio', 'ojos en blanco', 'expresion de placer', 'extasis', 'jadeando', 'babeando', 'rostro de placer'],
  'oral sex': ['mamada', 'sexo oral', 'chupandosela', 'blowjob', 'oral sex', 'felacion', 'boca'],
  'advancing to genitals': ['entrepierna', 'genitales', 'sexo', 'acercandose a su entrepierna', 'arrastrandose hacia su entrepierna', 'gateando entre sus piernas', 'advancing to genitals', 'hacia su sexo', 'avanzando'],
  'crawling between legs': ['entre las piernas', 'entre sus piernas', 'gateando entre sus piernas', 'a gatas', 'crawling between legs', 'a gatas entre las piernas'],
  'leaning forward': ['inclinandose', 'inclinada hacia adelante', 'asomandose', 'leaning forward', 'aproximandose'],
  'kneeling': ['de rodillas', 'arrodillada', 'arrodillado', 'kneeling', 'hincada'],
  'on all fours': ['a cuatro patas', 'gateando', 'a gatas', 'on all fours', 'crawling', 'en el suelo'],
  'crawling': ['gateando', 'arrastrandose', 'a gatas', 'crawling'],
  'sitting': ['sentada', 'sentado', 'en el suelo', 'sitting', 'en la silla', 'en la cama'],
  'standing': ['de pie', 'erguida', 'parada', 'standing'],
  'lying down': ['acostada', 'tumbada', 'echada', 'en la cama', 'lying down', 'en el colchon'],
  'hands behind head': ['manos en la nuca', 'manos tras la cabeza', 'hands behind head', 'relajada'],
  'looking up': ['mirando hacia arriba', 'mirada suplicante', 'looking up', 'ojos alzados'],
  'close up': ['primer plano', 'rostro', 'cara', 'close up', 'mirada cercana'],
  'cleavage': ['escote', 'pechos', 'senos', 'busto', 'cleavage'],
  'bat wings': ['alas', 'alas de murcielago', 'alas negras', 'bat wings', 'wings', 'sucubo', 'succubus', 'demonio'],
  'succubus': ['sucubo', 'succubus', 'demonio', 'diablesa'],

  // Entornos / Lugares
  'night': ['noche', 'nocturno', 'oscuridad', 'luna', 'estrellas', 'medianoche', 'night', 'dark', 'tinieblas'],
  'dark': ['oscuro', 'oscuridad', 'sombras', 'dark'],
  'day': ['dia', 'sol', 'manana', 'mediodia', 'despejado', 'day', 'sunny', 'luz del dia'],
  'sunny': ['soleado', 'sol brillante', 'calor', 'sunny'],
  'sunset': ['atardecer', 'ocaso', 'crepusculo', 'poblado naranja', 'sunset', 'dusk'],
  'sunrise': ['amanecer', 'aurora', 'alborada', 'sunrise', 'dawn'],
  'rain': ['lluvia', 'lloviendo', 'tormenta', 'chaparron', 'diluvio', 'mojado', 'rain', 'storm', 'gotas'],
  'storm': ['tormenta', 'rayos', 'relampagos', 'tempestad', 'storm', 'truenos'],
  'snow': ['nieve', 'nevando', 'helada', 'ventisca', 'snow', 'blizzard'],
  'foggy': ['niebla', 'neblina', 'bruma', 'foggy', 'mist'],
  'ruins': ['ruinas', 'destruido', 'abandonado', 'escombros', 'derruido', 'ruins', 'abandoned', 'devastado'],
  'abandoned': ['abandonado', 'desolado', 'vacio', 'abandoned'],
  'on fire': ['fuego', 'llamas', 'ardiendo', 'incendio', 'on fire', 'burning'],
  'indoor': ['interior', 'dentro', 'habitacion', 'sala', 'indoor', 'recinto'],
  'bedroom': ['dormitorio', 'habitacion', 'cama', 'cuarto', 'bedroom'],
  'dungeon': ['mazmorra', 'celda', 'prision', 'calabozo', 'grilletes', 'dungeon', 'cell'],
  'beach': ['playa', 'costa', 'arena', 'mar', 'oceano', 'orilla', 'beach', 'ocean']
};

/**
 * Calcula la puntuación de coincidencia de etiquetas/tags contra el texto del mensaje.
 * Soporta etiquetas compuestas separadas por comas (ej. "bikini, happy" o "noche, lluvia").
 * @param {string} label 
 * @param {string} normText 
 * @returns {number}
 */
export function scoreLabelMatch(label, normText) {
  if (!label || !normText) return 0;
  const subLabels = label.split(',').map(l => normalizeString(l)).filter(Boolean);
  let totalScore = 0;

  for (const sub of subLabels) {
    if (sub.length < 2) continue;
    
    // 1. Coincidencia exacta directa de la etiqueta en el texto
    if (normText.includes(sub)) {
      totalScore += sub.length * 4;
    } else {
      // 2. Coincidencia por palabras individuales
      const words = sub.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (normText.includes(w)) {
          totalScore += w.length * 2;
        }
      }
    }

    // 3. Coincidencia por sinónimos de contexto semántico
    const syns = TAG_SYNONYMS[sub] || [];
    for (const syn of syns) {
      if (normText.includes(syn)) {
        totalScore += 6;
      }
    }
  }

  return totalScore;
}

/**
 * Selecciona la mejor imagen / expresión para un personaje o lugar según el contexto del mensaje.
 * @param {Object} entity - Objeto personaje o lugar con lista `images` o `characterImages`.
 * @param {string} messageText - Texto del mensaje para analizar emociones, ropa, acciones o clima.
 * @returns {Object} { id, url, label, tags, isDefault }
 */
export function matchCharacterExpression(entity, messageText = '') {
  if (!entity) {
    return { id: 'none', url: '', label: 'Sin imagen', tags: '', isDefault: true };
  }

  const rawImages = entity.images || entity.characterImages || [];
  const validImages = Array.isArray(rawImages) ? rawImages.filter(img => img && img.url) : [];

  if (validImages.length === 0) {
    return {
      id: 'default',
      url: entity.cover || '',
      label: 'Principal',
      tags: '',
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
    const combinedDescriptor = [img.label, img.tags].filter(Boolean).join(', ');
    const score = scoreLabelMatch(combinedDescriptor, normText);
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
 * Si el lugar dispone de múltiples imágenes (ej: noche, lluvia, ruinas), selecciona la más coherente.
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

  const locationCards = (cards || []).filter(c => c && (c.type === 'Lugar' || c.subtype === 'Lugar' || c.type === 'Escenario') && (c.cover || (c.images && c.images.length > 0)));

  // 1. Buscar mención de lugar en los últimos mensajes
  if (Array.isArray(messages) && messages.length > 0) {
    const recent = messages.slice(-5).reverse();
    const recentContext = recent.map(m => m.text || '').join(' ');

    for (const msg of recent) {
      const text = msg.text || '';
      if (!text) continue;
      const normText = normalizeString(text);

      for (const loc of locationCards) {
        const name = loc.title || loc.name;
        if (!name) continue;
        const normName = normalizeString(name);
        if (normName.length > 2 && normText.includes(normName)) {
          // Si el lugar tiene variantes de imagen (ej. noche / lluvia), hacer matching contextual
          const matchedVariant = matchCharacterExpression(loc, recentContext);
          return matchedVariant?.url || loc.cover;
        }
      }
    }
  }

  // 2. Fallback a portada o variante del escenario
  if (scenario) {
    if (Array.isArray(scenario.images) && scenario.images.length > 0) {
      const recentContext = (Array.isArray(messages) && messages.length > 0)
        ? messages.slice(-4).map(m => m.text || '').join(' ')
        : '';
      const matchedScenarioImg = matchCharacterExpression(scenario, recentContext);
      if (matchedScenarioImg?.url) return matchedScenarioImg.url;
    }
    if (scenario.cover) {
      return scenario.cover;
    }
  }

  return null;
}
