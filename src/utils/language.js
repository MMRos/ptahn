/**
 * Language detection, multilingual routing, and SDXL visual prompt translation utility for Ptahn.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto', label: 'Auto (Detectar automáticamente)', instruction: 'Respond in the language detected from the user input and story context.' },
  { code: 'es', name: 'Español', label: 'Español', instruction: 'Respond strictly in Spanish (Español). All narration, character lore, NPC dialogues, and system descriptions must be in natural, evocative Spanish.' },
  { code: 'en', name: 'English', label: 'English', instruction: 'Respond strictly in English. All narration, character lore, NPC dialogues, and system descriptions must be in natural, evocative English.' },
  { code: 'fr', name: 'Français', label: 'Français', instruction: 'Répondez strictement en français. Toute la narration, le lore des personnages, les dialogues et les descriptions doivent être en français.' },
  { code: 'de', name: 'Deutsch', label: 'Deutsch', instruction: 'Antworten Sie ausschließlich auf Deutsch. Alle Erzählungen, Charakter-Lore, NSC-Dialoge und Beschreibungen müssen auf Deutsch verfasst sein.' },
  { code: 'pt', name: 'Português', label: 'Português', instruction: 'Responda estritamente em português. Toda a narração, lore dos personagens, diálogos e descrições devem ser em português.' },
  { code: 'it', name: 'Italiano', label: 'Italiano', instruction: 'Rispondi rigorosamente in italiano. Tutte le narrazioni, la lore dei personaggi, i dialoghi dei PNG e le descrizioni devono essere in italiano.' },
  { code: 'ja', name: '日本語', label: '日本語', instruction: '必ず日本語で返答してください。すべてのナレーション、キャラクター設定、NPCの会話、情景描写を自然な日本語で記述してください。' },
  { code: 'zh', name: '中文', label: '中文', instruction: '请务必使用中文回复。所有的叙事、角色背景设定、NPC对话和场景描述都必须使用流畅自然的中文。' },
  { code: 'ru', name: 'Русский', label: 'Русский', instruction: 'Отвечайте строго на русском языке. Все повествование, лор персонажей, диалоги NPC и описания должны быть на русском языке.' }
];

// Common stopwords and markers for fast detection
const LANGUAGE_MARKERS = {
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'en', 'es', 'por', 'para', 'con', 'no', 'está', 'estaba', 'había', 'pero', 'más', 'este', 'esta', 'cuando', 'sobre', 'todo', 'plaza', 'hombre', 'mujer', 'siendo', 'azotado', 'esclavo', 'lobo', 'bosque'],
  en: ['the', 'a', 'an', 'of', 'in', 'and', 'to', 'is', 'was', 'that', 'for', 'with', 'on', 'as', 'by', 'at', 'this', 'from', 'they', 'are', 'were', 'when', 'there', 'what', 'which', 'about', 'into', 'being', 'whipped', 'town', 'square', 'wolfkin', 'knight'],
  fr: ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'dans', 'en', 'est', 'que', 'qui', 'pour', 'sur', 'avec', 'pas', 'plus', 'ce', 'cette', 'ont', 'sont', 'mais', 'sombre', 'son', 'guerrier', 'marche', 'forêt', 'solitaire', 'épée'],
  de: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'eines', 'einem', 'einen', 'und', 'in', 'ist', 'von', 'zu', 'mit', 'auf', 'für', 'nicht', 'war', 'sich', 'es', 'als', 'ritter', 'reitet', 'durch', 'wald', 'dunklen'],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'que', 'para', 'com', 'não', 'está', 'estava', 'este', 'esta', 'por', 'homem', 'lobo'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del', 'della', 'in', 'nel', 'nella', 'che', 'per', 'con', 'non', 'è', 'era', 'questo', 'questa', 'sono', 'cavaliere'],
  ru: ['и', 'в', 'не', 'на', 'я', 'что', 'тот', 'быть', 'с', 'он', 'а', 'как', 'это', 'по', 'к', 'но', 'они', 'мы', 'весь', 'из', 'у', 'который', 'то', 'за', 'свой']
};

/**
 * Heuristic language detector.
 * Analyzes scripts, character sets, and word frequency with zero dependencies.
 * 
 * @param {string} text - The input text or messages to detect.
 * @returns {string} Detected language code ('es', 'en', 'fr', 'de', 'pt', 'it', 'ja', 'zh', 'ru').
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return detectBrowserLanguage();
  }

  const cleanText = text.trim();

  // 1. Script checks (Japanese, Chinese, Cyrillic)
  if (/[\u3040-\u30ff\u3400-\u4dbf]/.test(cleanText)) {
    return 'ja';
  }
  if (/[\u4e00-\u9fff]/.test(cleanText)) {
    return 'zh';
  }
  if (/[\u0400-\u04FF]/.test(cleanText)) {
    return 'ru';
  }

  // 2. Unambiguous unique characters check
  if (/[¿¡ñ]/.test(cleanText)) {
    return 'es';
  }
  if (/[ãõ]/.test(cleanText)) {
    return 'pt';
  }
  if (/[äöüß]/.test(cleanText)) {
    return 'de';
  }
  if (/[œæ]/.test(cleanText)) {
    return 'fr';
  }

  // 3. Stopword token matching & frequency scoring
  const words = cleanText.toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return detectBrowserLanguage();

  const scores = { es: 0, en: 0, fr: 0, de: 0, pt: 0, it: 0, ru: 0 };

  for (const word of words) {
    for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS)) {
      if (markers.includes(word)) {
        scores[lang] = (scores[lang] || 0) + 1;
      }
    }
  }

  let bestLang = 'es';
  let maxScore = -1;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestLang = lang;
    }
  }

  if (maxScore > 0) {
    return bestLang;
  }

  // Fallback to Spanish diacritics if any
  if (/[áéíóú]/.test(cleanText)) {
    return 'es';
  }

  // Default fallback to browser language or English
  return detectBrowserLanguage();
}

/**
 * Detects browser language fallback.
 */
export function detectBrowserLanguage() {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserCode = navigator.language.split('-')[0].toLowerCase();
      const match = SUPPORTED_LANGUAGES.find(l => l.code === browserCode);
      if (match && match.code !== 'auto') return match.code;
    }
  } catch (e) {}
  return 'es';
}

/**
 * Resolves the target output language based on user preference and live text context.
 * 
 * @param {string} preference - Configured preference ('auto', 'Español', 'English', 'es', etc.)
 * @param {string|Array} contextText - Sample text or message history to detect from if preference is 'auto'.
 * @returns {object} The resolved language descriptor { code, name, label, instruction }.
 */
export function resolveTargetLanguage(preference = 'auto', contextText = '') {
  const normPref = (preference || 'auto').trim().toLowerCase();

  // If user selected an explicit language
  if (normPref !== 'auto' && normPref !== 'auto (detectar automáticamente)') {
    const directMatch = SUPPORTED_LANGUAGES.find(
      l => l.code.toLowerCase() === normPref || l.name.toLowerCase() === normPref || l.label.toLowerCase() === normPref
    );
    if (directMatch && directMatch.code !== 'auto') {
      return directMatch;
    }
  }

  // Auto-detect mode: extract text from context
  let sample = '';
  if (typeof contextText === 'string') {
    sample = contextText;
  } else if (Array.isArray(contextText)) {
    sample = contextText.map(m => (typeof m === 'string' ? m : m.text || '')).join(' ');
  }

  const detectedCode = detectLanguage(sample);
  const matched = SUPPORTED_LANGUAGES.find(l => l.code === detectedCode);
  return matched || SUPPORTED_LANGUAGES.find(l => l.code === 'es');
}

/**
 * Builds the strict language directive for the LLM system prompt.
 * 
 * @param {object} targetLanguage - The resolved language object.
 * @returns {string} Prompt constraint string.
 */
export function getLanguageDirective(targetLanguage) {
  const lang = targetLanguage || SUPPORTED_LANGUAGES.find(l => l.code === 'es');
  const isSpanish = lang.code === 'es';

  if (isSpanish) {
    return `
[CRITICAL INVIOLABLE DIRECTIVE: MANDATORY OUTPUT LANGUAGE / IDIOMA OBLIGATORIO: ${lang.name.toUpperCase()} (${lang.name})]:
- TODA TU NARRACIÓN, PROSA LITERARIA, DESCRIPCIONES DE ESCENAS, DIÁLOGOS DE PNJS Y PENSAMIENTOS DEBEN ESTAR ESCRITOS 100% EN ESPAÑOL (${lang.name}).
- ESTÁ ESTRICTAMENTE PROHIBIDO RESPONDER O NARRAR EN INGLÉS. Aunque algunas instrucciones del sistema, fichas de compendio o títulos estén en inglés, tú DEBES traducir e interpretar todo para redactar única y exclusivamente en un español (${lang.name}) fluido, literario y natural.
- YOUR ENTIRE PROSE OUTPUT, SCENE NARRATION, AND DIALOGUES MUST BE IN SPANISH (${lang.name.toUpperCase()}). DO NOT OUTPUT ENGLISH UNDER ANY CIRCUMSTANCES.
`.trim();
  }

  return `
[CRITICAL INVIOLABLE DIRECTIVE: MANDATORY OUTPUT LANGUAGE / IDIOMA OBLIGATORIO: ${lang.name.toUpperCase()} (${lang.name})]:
- YOUR ENTIRE PROSE OUTPUT, SCENE NARRATION, DESCRIPTIONS, INTERNAL THOUGHTS, AND NPC DIALOGUES MUST BE EXCLUSIVELY WRITTEN IN: ${lang.name} (${lang.code.toUpperCase()}).
- ${lang.instruction}
- ABSOLUTE PROHIBITION AGAINST CODE-SWITCHING OR INSERTING ENGLISH WORDS. ALL OUTPUT MUST BE 100% NATURAL, EXPRESSIVE, LITERARY ${lang.name.toUpperCase()}.
`.trim();
}

/**
 * Generates system and user messages for translating a chat message to the target language.
 * Preserves RPG typographical markup ("...", *...*, ~...~, ==...==, <think>...</think>).
 * 
 * @param {string} text - The raw text to translate.
 * @param {object} targetLanguage - The resolved target language.
 * @returns {{ system: string, user: string }}
 */
export function createTranslationPrompt(text, targetLanguage) {
  const lang = targetLanguage || SUPPORTED_LANGUAGES.find(l => l.code === 'es');
  return {
    system: `You are a professional literary RPG translator. Translate the provided text faithfully into ${lang.name} (${lang.code.toUpperCase()}).
CRITICAL RULES:
1. Preserve all formatting tokens intact:
   - Dialogue quotes: "..."
   - Action asterisks: *...*
   - Inner thoughts: ~...~
   - Bold text: **...**
   - Highlighted tags: ==...==
   - Reasoning blocks: <think>...</think>
2. Maintain the dramatic tone, nuances, and vocabulary of the scene.
3. Do NOT include conversational filler, notes, or explanations. Output ONLY the translated text.`,
    user: text
  };
}

/**
 * SDXL Style Presets with Volumetric Lighting & Chiaroscuro.
 * Prevents literal underexposure / pitch-black dark fantasy while creating rich atmospheres.
 */
export const STYLE_PROMPT_PRESETS = {
  'Fantasía Oscura / Entornos': 'dark fantasy aesthetic, atmospheric volumetric lighting, cinematic chiaroscuro, high dynamic range, rim lighting, detailed environment, rich textures, moody ambiance, visible clear illumination, masterpiece',
  'Fantasía Oscura': 'dark fantasy aesthetic, atmospheric volumetric lighting, cinematic chiaroscuro, high dynamic range, rim lighting, detailed environment, rich textures, moody ambiance, visible clear illumination, masterpiece',
  'Paisaje Épico / Naturaleza': 'epic fantasy landscape, grand vistas, majestic natural lighting, golden hour rays, atmospheric haze, ultra detailed, sweeping panoramic view, pristine nature, 8k resolution',
  'Cyberpunk / Sci-Fi Futurista': 'cyberpunk sci-fi metropolis, vibrant neon lighting, volumetric night fog, rainy reflections, chromatic accents, sharp architectural details, high-tech dystopian atmosphere',
  'Grimdark / Gótico y Niebla': 'grimdark gothic architecture, haunting mist, soft moonlight illumination, dramatic shadows, baroque stonework, eerie atmospheric glow, intricate details, legible depth',
  'Anime / Ilustración Estilizada 2.5D': 'stylized 2.5D anime concept art, vibrant cinematic illumination, crisp clean outlines, dynamic key lighting, colorful atmospheric background, high aesthetic quality',
  'Anime / Fantasía': 'anime fantasy illustration, crisp details, expressive lighting, soft rim light, vibrant fantasy world, detailed character portrait, high quality digital painting',
  'Pintura al Óleo / Arte Conceptual': 'classical oil painting texture, rich visible brushwork, dramatic chiaroscuro composition, fine art masterpiece, museum quality lighting, deep emotional tones',
  'Terror Cósmico / Lovecraftiano': 'cosmic horror landscape, otherworldly luminescence, non-euclidean architecture, eerie ethereal lighting, ominous celestial glow, atmospheric tension, detailed art'
};

// Multilingual common scenery and subject translation dictionary for SDXL diffusion prompts
export const VISUAL_DICTIONARY = {
  // Razas, especies y criaturas
  'équido': 'anthro horse, equine humanoid',
  'équida': 'anthro horse, equine humanoid',
  'caballo': 'horse, equine',
  'alfa équido': 'muscular anthro horse stallion, equine humanoid',
  'centauro': 'centaur, half horse half human',
  'lobo': 'wolf creature, fierce lupine traits',
  'humanoide con rasgos lobunos': 'humanoid wolfkin beastfolk with lupine ears and fur features',
  'lobo humanoide': 'anthropomorphic wolf warrior with detailed fur',
  'hombre lobo': 'werewolf beastfolk creature',
  'felino': 'feline beastfolk, cat ears',
  'hombre gato': 'catfolk warrior with feline ears and tail',
  'mujer gato': 'catgirl, feline ears, tail',
  'elfo': 'elf male with pointed ears',
  'elfa': 'elf female with pointed ears',
  'enano': 'stout dwarf warrior, rugged beard',
  'enana': 'dwarf woman, braided hair',
  'orco': 'muscular green-skinned orc warrior',
  'draconiano': 'dragonkin warrior with reptilian scales and horns',
  'dragón': 'colossal scaled dragon beast',
  'demonio': 'demon with dark horns and glowing eyes',
  'súcubo': 'succubus with demonic wings and horns',
  'ángel': 'angelic warrior with radiant feathery wings',

  // Fisionomía, anatomía y complexión
  'bipedo': 'bipedal stance',
  'bipeda': 'bipedal stance',
  'bípedo': 'bipedal stance',
  'bípeda': 'bipedal stance',
  'colosal': 'towering colossal muscular build',
  'su torso': 'broad muscular torso',
  'torso': 'muscular broad torso',
  'masa de músculo': 'dense defined muscles',
  'musculoso': 'heavily muscular build',
  'músculo': 'dense defined muscles',
  'espesa': 'thick',
  'melena': 'thick wild mane hair',
  'melena castaña': 'thick brown mane hair',
  'orejas alerta': 'alert animal ears',
  'orejas': 'ears',
  'rostro humanoide': 'humanoid face features',
  'rostro': 'facial features',
  'humanoide': 'humanoid',
  'ojos oscuros e inteligentes': 'sharp dark intelligent eyes',
  'ojos oscuros': 'sharp dark intelligent eyes',
  'ojos inteligentes': 'keen intelligent eyes',
  'ojos ámbar': 'glowing amber eyes',
  'ojos dorados': 'striking golden eyes',
  'pelo castaño': 'brown hair',
  'pelo plateado': 'silver white hair',
  'pelo negro': 'jet black hair',
  'pelo rubio': 'golden blonde hair',
  'pelirrojo': 'vibrant crimson red hair',
  'cicatrices': 'battle scars across skin',

  // Atuendos, armaduras y equipo
  'taparrabos': 'leather loincloth',
  'taparrabos de cuero': 'rugged leather loincloth',
  'armadura': 'armor',
  'armadura de placas': 'heavy metal plate armor',
  'armadura de placas mal ajustadas': 'mismatched weathered plate armor pieces',
  'malla': 'chainmail armor',
  'cota de malla': 'chainmail armor',
  'cuero': 'worn leather straps and belts',
  'túnica': 'flowing medieval robe',
  'capa': 'weathered dark cape',
  'harapos': 'tattered cloth rags',
  'esclavo': 'enslaved captive in iron shackles and worn rags',
  'esclava': 'enslaved captive in iron shackles and worn rags',
  'grilletes': 'iron shackles around wrists',
  'azotado': 'weathered, bearing whip scars and battle-worn marks',

  // Armas y combate
  'maza de pinchos desgastada': 'weathered battle-worn spiked mace',
  'maza de pinchos': 'lethal spiked iron mace weapon',
  'maza desgastada': 'weathered battle-worn spiked mace',
  'maza': 'heavy battle mace',
  'desgastada': 'weathered battle-worn',
  'desgastado': 'weathered battle-worn',
  'espada': 'steel longsword blade',
  'mandoble': 'massive greatsword',
  'daga': 'sharp steel dagger',
  'dagas': 'twin throwing daggers',
  'hacha': 'heavy battle axe',
  'arco': 'recurve wooden bow',
  'escudo': 'sturdy defensive shield',
  'báculo': 'magical arcane staff',
  'guerrero': 'battle-hardened warrior',
  'caballero': 'knight in plate armor',
  'mago': 'arcane sorcerer casting magic',
  'guardiana': 'guardian protector',
  'pícaro': 'stealthy rogue assassin with daggers',

  // Entornos y arquitectura (Zona A Wallpapers)
  'forja': 'blacksmith forge, glowing molten metal embers, anvil, iron workshop tools',
  'la forja': 'blacksmith forge, glowing molten metal embers, anvil, iron workshop tools',
  'herrería': 'blacksmith workshop, sparks, roaring furnace, iron anvil',
  'taberna': 'warm rustic medieval tavern interior, wooden tables, roaring hearth, lantern light',
  'posada': 'cozy fantasy inn interior, wooden timber beams, warm fireplace glow',
  'taberna del cerdo sifilítico': 'grimy rustic fantasy tavern, dim lantern lighting, weathered wood tables, crowded medieval pub',
  'ruinas': 'ancient mossy stone ruins, crumbling pillars, atmospheric depth',
  'ruina': 'ancient stone ruins, overgrown foliage',
  'templo': 'grand sacred stone temple, towering marble columns, divine rays',
  'castillo': 'gothic castle fortress ramparts, towering stone spires',
  'fortaleza': 'imposing stone fortress walls, battlements, torches',
  'plaza': 'bustling town square cobblestone plaza, medieval market stalls',
  'pueblo': 'quaint fantasy village settlement, thatched roofs, dirt roads',
  'ciudad': 'sprawling medieval fantasy city, gothic architecture, stone streets',
  'gremio': 'guildhall stone headquarters, large oak doors, banners',
  'gremio de aventureros': 'adventurer guildhall headquarters, wooden benches, quest board, warm lanterns',
  'bosque': 'dense enchanted forest, towering ancient trees, sunbeams through canopy',
  'bosque oscuro': 'dark eerie forest, twisted ancient trees, ground mist, moonlight rays',
  'montaña': 'rugged mountain peaks, snow-capped ridges, dramatic clouds',
  'cueva': 'subterranean cavern, glowing crystal formations, underground pool',
  'calabozo': 'dungeon stone prison corridor, iron cell bars, wall torches',
  'mazmorra': 'dark stone dungeon corridor, iron cages, flickering torches',
  'torre': 'tall gothic mage tower, arched stained glass windows',
  'acantilado': 'sheer coastal cliff, crashing ocean waves, misty horizon',
  'mercado': 'busy fantasy marketplace alley, merchant tents, hanging lanterns',
  'puerto': 'seaport harbor docks, wooden piers, moored fantasy sailing ships, mist',
  'muelle': 'wooden pier, foggy harbor, nautical ropes, ocean water reflections',
  'bahía': 'coastal ocean bay, rocky shores, dramatic sea cliffs',
  'sala del trono': 'grand royal throne room, gothic chandeliers, red carpet, vaulted stone arches',
  'biblioteca': 'arcane library interior, towering bookshelves, floating scrolls, candlelight',
  'laboratorio': 'alchemist laboratory, glowing magical potions, alembics, arcane clutter',
  'pantano': 'gloomy murky swamp, dead twisted trees, green mist, reflective dark water',
  'cementerio': 'gothic graveyard, mossy ancient tombstones, wrought iron fence, ground fog',
  'cripta': 'underground stone crypt, ancient carved sarcophagi, eerie glowing braziers',
  'callejón': 'narrow medieval cobblestone alley, gothic stone arches, dim hanging lanterns',
  'alcantarillas': 'subterranean stone sewers, murky water, damp brick walls, green moss',

  // Iluminación y clima
  'noche': 'night scene with bright moonlight and lanterns',
  'tormenta': 'dramatic storm clouds with lightning flashes',
  'niebla': 'atmospheric volumetric mist and fog',
  'lluvia': 'falling rain with wet reflective surfaces',
  'atardecer': 'golden sunset horizon, warm rim lighting',
  'amanecer': 'dawn light breaking through clouds'
};

/**
 * Strips conversational Spanish narrative filler and converts known terms to English tokens.
 * @param {string} text - Raw input prompt or description.
 * @returns {string} Cleaned and translated token string.
 */
export function cleanHeuristicVisualPrompt(text = '') {
  if (!text || typeof text !== 'string') return '';
  let clean = text.trim();

  // Multi-word replacements first (longest phrases first)
  const sortedEntries = Object.entries(VISUAL_DICTIONARY).sort((a, b) => b[0].length - a[0].length);
  for (const [key, replacement] of sortedEntries) {
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    clean = clean.replace(regex, replacement);
  }

  // Remove Spanish narrative filler phrases and stop words
  const spanishStopWords = [
    '\\bes un\\b', '\\bes una\\b', '\\bes el\\b', '\\bes la\\b', '\\ben su\\b', '\\bde su\\b',
    '\\bsu forma\\b', '\\bsu rostro\\b', '\\bsu torso\\b', '\\bsu cuerpo\\b', '\\bviste un\\b',
    '\\bviste una\\b', '\\bsosteniendo un\\b', '\\bsosteniendo una\\b', '\\bpresenta\\b',
    '\\bsuperando los\\b', '\\bcubierto por\\b', '\\bcon un\\b', '\\bcon una\\b', '\\bpero letal\\b',
    '\\bque\\b', '\\bcomo\\b', '\\bpara\\b', '\\bpor\\b', '\\bdel\\b', '\\bde los\\b', '\\bde las\\b',
    '\\ben\\b', '\\bel\\b', '\\bla\\b', '\\blos\\b', '\\blas\\b', '\\bun\\b', '\\buna\\b', '\\bunos\\b',
    '\\bunas\\b', '\\by\\b', '\\be\\b', '\\bo\\b', '\\bu\\b'
  ];
  for (const stop of spanishStopWords) {
    clean = clean.replace(new RegExp(stop, 'gi'), ' ');
  }

  // Clean repeated commas, punctuation, and multiple spaces
  clean = clean
    .replace(/[.;:!?]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,+/g, ',')
    .replace(/^[, ]+|[, ]+$/g, '');

  return clean;
}

/**
 * Detects the diffusion architecture family based on model filename/ID.
 * @param {string} modelName
 * @returns {'pony' | 'illustrious' | 'sdxl' | 'sd15'}
 */
export function detectDiffusionArchitecture(modelName = '') {
  const lower = (modelName || '').toLowerCase();
  if (lower.includes('pony') || lower.includes('malaanime') || lower.includes('v6.safetensors') || lower.includes('autismmix') || lower.includes('ebara')) {
    return 'pony';
  }
  if (lower.includes('illustrious') || lower.includes('noobai')) {
    return 'illustrious';
  }
  return 'sdxl';
}

/**
 * Returns the optimal negative prompt based on diffusion architecture.
 * @param {string} modelName
 * @returns {string}
 */
export function getNegativePromptForModel(modelName = '') {
  const arch = detectDiffusionArchitecture(modelName);
  if (arch === 'pony') {
    return 'score_6, score_5, score_4, score_3, score_2, score_1, worst quality, low quality, bad anatomy, bad hands, text, watermark, signature, frame, border, multiple people, group photo';
  }
  return 'blurry, low quality, deformed, distorted, text, watermark, bad anatomy, bad hands';
}

/**
 * Adapts and formats a visual prompt specifically for the target diffusion architecture.
 * @param {string} prompt - Base visual tags or prompt.
 * @param {string} modelName - Selected diffusion checkpoint filename.
 * @param {object} [options={}] - Additional flags (e.g. isNsfw).
 * @returns {string}
 */
export function adaptPromptForDiffusionArchitecture(prompt = '', modelName = '', options = {}) {
  const arch = detectDiffusionArchitecture(modelName);
  let clean = (prompt || '').trim();

  if (arch === 'pony') {
    const isNsfw = options.isNsfw || /nsfw|erotic|nude|naked|desnud|lenceria|underwear|topless|sex|aroused/i.test(clean);
    const ratingTag = isNsfw ? 'rating:explicit' : 'rating:general';
    const ponyPrefix = `score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, ${ratingTag}`;

    // Remove any existing score tags to avoid duplication
    clean = clean.replace(/score_\d(_up|_down)?/gi, '').replace(/rating:(general|questionable|explicit)/gi, '').trim();
    clean = clean.replace(/^[,\s]+|[,\s]+$/g, '');

    // Ensure solo subject tag if character is mentioned to prevent group photo hallucination
    const isFemale = /\b(girl|woman|she|her|daughter|queen|princess|waifu|chica|mujer|ella|femme)\b/i.test(clean);
    const isMale = /\b(man|boy|he|his|son|king|prince|chico|hombre|él)\b/i.test(clean);

    let subjectTag = '';
    if (!clean.includes('solo') && !clean.includes('1girl') && !clean.includes('1boy')) {
      if (isFemale && !isMale) subjectTag = '1girl, solo, ';
      else if (isMale && !isFemale) subjectTag = '1boy, solo, ';
    }

    return `${ponyPrefix}, ${subjectTag}${clean}, masterpiece, best quality`.replace(/,\s*,+/g, ', ').replace(/^[,\s]+|[,\s]+$/g, '');
  }

  return clean;
}

/**
 * Creates LLM prompt to translate and convert character / scene descriptions into English SDXL / Pony visual tags.
 * @param {string} text - The input description in any language.
 * @param {string} style - Visual style category.
 * @param {string} [targetModel=''] - Optional diffusion model name to tailor prompt tags.
 * @returns {{ system: string, user: string }}
 */
export function createVisualPromptTranslationPrompt(text = '', style = '', targetModel = '') {
  const arch = detectDiffusionArchitecture(targetModel);
  const isPony = arch === 'pony';

  return {
    system: `You are an expert AI image prompt engineer and synthesizer for Stable Diffusion SDXL and Pony Diffusion anime models.
Your task is to analyze character lore, biography, or scene descriptions (which may contain narrative prose, backstories, or Spanish text) and distill it EXCLUSIVELY into concise, comma-separated English visual tags (Danbooru tokens).

CRITICAL RULES:
1. Output ONLY English comma-separated visual tags (Danbooru / CLIP tokens).
2. DISTILL VISUALS, IGNORE NARRATIVE PROSE:
   - Convert abstract lore (e.g. "grew up under pressure of high society, spoiled brat who breaks men") into concrete visual tags: "1girl, solo, smug, arrogant smile, rich girl, luxury dress, jewelry, upper body, looking at viewer".
   - Never output words like "family", "mother", "daughter", "society", "pressure", "trophy" if only a single character should be drawn.
3. ${isPony ? 'Structure for Pony Diffusion: Focus on character appearance, outfit, pose, expression, and environment without filler words.' : 'Structure for SDXL: Include subject, detailed appearance, attire, lighting, and camera composition.'}
4. Do NOT include conversational filler, notes, prefixes, or markdown. Output ONLY the comma-separated English tags.`,
    user: `Convert this character or scene narrative into clean English visual diffusion tags:\n${text}`
  };
}

/**
 * Translates and enriches visual prompts and style selections into optimal English tokens for SDXL models.
 * 
 * @param {string} prompt - Raw visual prompt.
 * @param {string} style - Selected style key.
 * @param {string} [targetModel=''] - Target diffusion checkpoint.
 * @returns {string} Enriched English prompt with professional lighting modifiers.
 */
export function enrichImagePrompt(prompt = '', style = 'Fantasía Oscura / Entornos', targetModel = '') {
  let cleanPrompt = cleanHeuristicVisualPrompt(prompt || '');

  // Resolve style preset
  const styleModifier = STYLE_PROMPT_PRESETS[style] || STYLE_PROMPT_PRESETS['Fantasía Oscura'] || 'cinematic lighting, masterpiece, high quality, highly detailed';

  // Compose prompt with clear illumination guarantees
  const enriched = `${cleanPrompt}, style: ${styleModifier}, sharp focus, detailed composition`;
  return adaptPromptForDiffusionArchitecture(enriched, targetModel);
}
