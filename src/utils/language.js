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
  return `
[CRITICAL INVIOLABLE DIRECTIVE: MANDATORY OUTPUT LANGUAGE / IDIOMA OBLIGATORIO]:
- YOUR ENTIRE PROSE OUTPUT, SCENE NARRATION, DESCRIPTIONS, INTERNAL THOUGHTS, AND NPC DIALOGUES MUST BE EXCLUSIVELY WRITTEN IN: ${lang.name} (${lang.code.toUpperCase()}).
- ${lang.instruction}
- ABSOLUTE PROHIBITION AGAINST CODE-SWITCHING OR INSERTING ENGLISH WORDS (e.g. NEVER write "Trying desperately to...", always write 100% natural, expressive, literary ${lang.name}).
- EVEN THOUGH SYSTEM PROMPTS, FORMATTING RULES, OR LABELS ARE IN ENGLISH FOR ACCURACY, NEVER REFLECT ENGLISH IN YOUR STORYTELLING OUTPUT. TRANSLATE ALL CONTEXT AND WORLD EVENTS TO NATURAL, HIGH-QUALITY ${lang.name.toUpperCase()}.
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
const VISUAL_DICTIONARY = {
  // Entornos y arquitectura
  'ruinas': 'ancient stone ruins',
  'ruina': 'ancient ruins',
  'templo': 'sacred temple',
  'castillo': 'gothic castle fortress',
  'plaza': 'town square cobblestone plaza',
  'pueblo': 'fantasy village settlement',
  'ciudad': 'sprawling medieval fantasy city',
  'bosque': 'dense enchanted forest, tall trees',
  'montaña': 'rugged mountain peaks',
  'cueva': 'subterranean cavern, glowing crystals',
  'calabozo': 'dungeon stone prison corridor',
  'torre': 'tall gothic tower',
  'acantilado': 'sheer coastal cliff',
  'mercado': 'busy marketplace alley',

  // Personajes y condición
  'esclavo': 'enslaved captive in iron shackles and worn rags',
  'esclava': 'enslaved captive in iron shackles and worn rags',
  'azotado': 'weathered, bearing whip scars and battle-worn marks',
  'guerrero': 'armored warrior',
  'caballero': 'knight in plate armor',
  'mago': 'arcane sorcerer casting magic',
  'lobo': 'wolf creature, fierce lupine traits',
  'humanoide con rasgos lobunos': 'humanoid wolfkin beastfolk with lupine ears and fur features',
  'lobo humanoide': 'anthropomorphic wolf warrior with detailed fur',
  'hombre lobo': 'werewolf beastfolk creature',
  'guardiana': 'guardian protector',

  // Iluminación y clima
  'noche': 'night scene with bright moonlight and lanterns',
  'tormenta': 'dramatic storm clouds with lightning flashes',
  'niebla': 'atmospheric volumetric mist and fog',
  'lluvia': 'falling rain with wet reflective surfaces',
  'atardecer': 'golden sunset horizon, warm rim lighting',
  'amanecer': 'dawn light breaking through clouds'
};

/**
 * Translates and enriches visual prompts and style selections into optimal English tokens for SDXL models.
 * 
 * @param {string} prompt - Raw visual prompt.
 * @param {string} style - Selected style key.
 * @returns {string} Enriched English prompt with professional lighting modifiers.
 */
export function enrichImagePrompt(prompt = '', style = 'Fantasía Oscura / Entornos') {
  let cleanPrompt = (prompt || '').trim();

  // Replace common foreign keywords with expressive English equivalents
  for (const [key, replacement] of Object.entries(VISUAL_DICTIONARY)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleanPrompt = cleanPrompt.replace(regex, replacement);
  }

  // Resolve style preset
  const styleModifier = STYLE_PROMPT_PRESETS[style] || STYLE_PROMPT_PRESETS['Fantasía Oscura'] || 'cinematic lighting, masterpiece, high quality, highly detailed';

  // Compose prompt with clear illumination guarantees
  return `${cleanPrompt}, style: ${styleModifier}, sharp focus, detailed composition`;
}
