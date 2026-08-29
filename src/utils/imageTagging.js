/**
 * imageTagging.js
 * Utilidades para clasificación visual multimodal con IA (Vision VLM),
 * taxonomía enriquecida en inglés y etiquetado contextual on-demand
 * para personajes, expresiones y localizaciones.
 */

import { getBaseUrl, apiFetch, resolveModelId } from './localAIStudio';
import { loadChatSettings } from './storage';

export const CHARACTER_TAG_PRESETS = {
  ropa: [
    { id: 'highschool_uniform', label: '🎒 Highschool Uniform', tag: 'highschool uniform' },
    { id: 'sport_clothes', label: '👟 Sport Clothes / Tracksuit', tag: 'sport clothes' },
    { id: 'casual', label: '👗 Casual Clothes', tag: 'casual clothes' },
    { id: 'hoodie', label: '🧥 Hoodie / Jacket', tag: 'hoodie' },
    { id: 'turtleneck', label: '🧶 Turtleneck Sweater', tag: 'turtleneck' },
    { id: 'tshirt', label: '👕 T-Shirt / Top', tag: 't-shirt' },
    { id: 'bikini', label: '👙 Bikini / Swimsuit', tag: 'bikini' },
    { id: 'underwear', label: '🩲 Underwear / Panties', tag: 'underwear' },
    { id: 'lingerie', label: '💋 Lingerie', tag: 'lingerie' },
    { id: 'topless', label: '✨ Topless', tag: 'topless' },
    { id: 'nude', label: '🔞 Nude / Naked', tag: 'nude' },
    { id: 'nekomimi_form', label: '🐱 Nekomimi Form / Cat Ears', tag: 'nekomimi form' },
    { id: 'succubus_form', label: '🦇 Succubus Form / Wings', tag: 'succubus form' },
    { id: 'armor', label: '🛡️ Armor / Battle Gear', tag: 'armor' }
  ],
  emocion: [
    { id: 'in_heat', label: '🔥 In Heat / Lust', tag: 'in heat' },
    { id: 'pleading', label: '🥺 Pleading / Begging', tag: 'pleading' },
    { id: 'knowing_look', label: '😏 Knowing Look / Sly', tag: 'knowing look' },
    { id: 'showing_attention', label: '👀 Showing Attention / Attentive', tag: 'showing attention' },
    { id: 'surprised_blushing', label: '😳 Surprised & Blushing', tag: 'surprised, blushing' },
    { id: 'happy', label: '😊 Happy / Smiling', tag: 'happy, smiling' },
    { id: 'blushing', label: '😳 Blushing / Shy', tag: 'blushing, shy' },
    { id: 'seductive', label: '😏 Seductive / Smug', tag: 'seductive, smug' },
    { id: 'pleasure', label: '🔥 Aroused / Pleasure', tag: 'aroused, pleasure' },
    { id: 'evil_smile', label: '😈 Evil Smile / Grin', tag: 'evil smile, grin' },
    { id: 'worried', label: '🥺 Worried / Nervous', tag: 'worried, nervous' },
    { id: 'angry', label: '😠 Angry / Furious', tag: 'angry' },
    { id: 'crying', label: '😢 Sad / Crying', tag: 'crying, tears' },
    { id: 'neutral', label: '😐 Neutral / Calm', tag: 'neutral' }
  ],
  accion: [
    { id: 'advancing_genitals', label: '🧎 Advancing to Genitals / Crotch', tag: 'advancing to genitals' },
    { id: 'crawling_legs', label: '🐾 Crawling Between Legs', tag: 'crawling between legs' },
    { id: 'leaning_forward', label: '📐 Leaning Forward', tag: 'leaning forward' },
    { id: 'kneeling', label: '🧎 Kneeling / On All Fours', tag: 'kneeling, on all fours' },
    { id: 'sitting', label: '🪑 Sitting', tag: 'sitting' },
    { id: 'standing', label: '🧍 Standing', tag: 'standing' },
    { id: 'lying', label: '🛌 Lying Down / Bed', tag: 'lying down' },
    { id: 'hands_behind', label: '🙆 Hands Behind Head', tag: 'hands behind head' },
    { id: 'looking_up', label: '👀 Looking Up', tag: 'looking up' },
    { id: 'close_up', label: '🔍 Close Up / Portrait', tag: 'close up' },
    { id: 'combat', label: '⚔️ Combat / Battle', tag: 'combat' }
  ],
  nsfw: [
    { id: 'sex_from_behind', label: '🔞 Sex from Behind / Doggy', tag: 'sex from behind, doggystyle, penetration' },
    { id: 'creampie', label: '💦 Creampie / Semen', tag: 'creampie, excessive cum, messy' },
    { id: 'torn_pantyhose', label: '🩲 Torn Pantyhose / Tights', tag: 'torn pantyhose, topless' },
    { id: 'ahegao', label: '👅 Ahegao / Pleasure Face', tag: 'ahegao, biting lip, intense pleasure' },
    { id: 'oral_sex', label: '👄 Oral Sex / Fellatio', tag: 'oral sex, blowjob' },
    { id: 'missionary', label: '🛌 Missionary / Penetration', tag: 'missionary, spread legs, penetration' }
  ]
};

export const LOCATION_TAG_PRESETS = {
  momento: [
    { id: 'day', label: '☀️ Day / Sunny', tag: 'day, sunny' },
    { id: 'night', label: '🌙 Night / Dark', tag: 'night, dark' },
    { id: 'sunset', label: '🌅 Sunset / Dusk', tag: 'sunset' },
    { id: 'sunrise', label: '🌄 Sunrise / Dawn', tag: 'sunrise' }
  ],
  clima: [
    { id: 'clear', label: '☀️ Clear Sky', tag: 'clear sky' },
    { id: 'rain', label: '🌧️ Rain / Storm', tag: 'rain, storm' },
    { id: 'fog', label: '🌫️ Foggy / Mist', tag: 'foggy' },
    { id: 'snow', label: '❄️ Snow / Blizzard', tag: 'snow' }
  ],
  estado: [
    { id: 'intact', label: '🏰 Intact / Majestic', tag: 'intact, majestic' },
    { id: 'ruins', label: '🏚️ Ruins / Abandoned', tag: 'ruins, abandoned' },
    { id: 'fire', label: '🔥 On Fire / Burning', tag: 'on fire, burning' },
    { id: 'indoor', label: '🚪 Indoor / Bedroom', tag: 'indoor, bedroom' },
    { id: 'outdoor', label: '🌲 Outdoor / Forest', tag: 'outdoor, forest' },
    { id: 'dungeon', label: '⛓️ Dungeon / Cell', tag: 'dungeon, cell' },
    { id: 'beach', label: '🏖️ Beach / Ocean', tag: 'beach, ocean' }
  ]
};

/**
 * Normaliza una cadena o arreglo de etiquetas a formato coma-separado limpio en inglés.
 * @param {string|Array} tags 
 * @returns {string} ej: "school uniform, kneeling, blushing"
 */
export function formatTagsString(tags) {
  if (!tags) return '';
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim().toLowerCase()).filter(Boolean).join(', ');
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

/**
 * Agrega o quita una etiqueta de un string de etiquetas separadas por comas.
 * @param {string} currentTagsString 
 * @param {string} tagToToggle 
 * @returns {string}
 */
export function toggleTagInString(currentTagsString, tagToToggle) {
  const normTag = tagToToggle.trim().toLowerCase();
  let list = (currentTagsString || '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  // Si tagToToggle contiene comas (ej. "happy, smiling")
  const subTags = normTag.split(',').map(s => s.trim()).filter(Boolean);

  const allPresent = subTags.every(st => list.includes(st));
  if (allPresent) {
    list = list.filter(t => !subTags.includes(t));
  } else {
    for (const st of subTags) {
      if (!list.includes(st)) {
        list.push(st);
      }
    }
  }

  return list.join(', ');
}

/**
 * Checks whether an AI response is a valid comma-separated tag list
 * rather than a conversational sentence or refusal.
 */
export function isValidTagList(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  if (lower.length < 3) return false;

  // Conversational phrases and AI refusals that should NEVER be used as tags
  const invalidPhrases = [
    "i don't see", "i cannot see", "i can't see", "no image", "please provide",
    "as an ai", "as per the guidelines", "i'm sorry", "i cannot analyze",
    "i do not see", "here are", "based on", "the image is", "this is an image",
    "you provided", "brief description", "tags as per", "let me know", "i'll do my best",
    "as an ai", "language model", "sure,", "certainly,",
    "[ptahn", "[llama", "detectado en", "inferencia lista"
  ];
  if (invalidPhrases.some(phrase => lower.includes(phrase))) {
    return false;
  }

  // Must not be a conversational sentence (>50 chars without commas)
  if (text.length > 50 && !text.includes(',')) {
    return false;
  }

  return true;
}

/**
 * Clasificación Visual On-Demand con IA Multimodal (Vision VLM / LLM).
 * Envía la imagen y el contexto al modelo para resumir en etiquetas en inglés:
 * - Personaje: tipo de ropa, acciones/postura, estado emocional y rasgos únicos.
 * - Lugar: ambientación, clima, momento del día y estado del entorno.
 * 
 * @param {Object} params
 * @param {string} params.imageUrl - URL o base64 de la imagen.
 * @param {string} params.entityType - 'Personaje' | 'Lugar' | 'Escenario'
 * @param {string} params.entityTitle - Nombre o título
 * @param {string} params.entityDesc - Descripción o lore
 * @param {string} params.currentLabel - Etiqueta actual o nombre de variante
 * @param {string} params.currentTags - Tags existentes
 * @returns {Promise<string>} Etiquetas en inglés separadas por comas
 */
export async function classifyImageWithAI({
  imageUrl = '',
  entityType = 'Personaje',
  entityTitle = '',
  entityDesc = '',
  currentLabel = '',
  currentTags = '',
  prompt = ''
}) {
  const isLocation = entityType === 'Lugar' || entityType === 'Escenario';
  const settings = loadChatSettings();
  const baseUrl = getBaseUrl(settings?.llmServerUrl || settings?.lmStudioUrl);
  let modelId = settings?.preferredModel || 'local-model';
  try {
    const resolved = await resolveModelId(settings?.preferredModel || settings?.orchestratorModel, baseUrl);
    if (resolved) modelId = resolved;
  } catch (e) {
    // Keep fallback modelId
  }

  const systemInstruction = isLocation
    ? `You are an expert anime/visual scene classifier for a roleplay engine.
Analyze the image or scene context and output EXCLUSIVELY 3 to 6 concise comma-separated English tags describing:
1. Time of day (e.g. night, day, sunset, dawn)
2. Weather / Atmosphere (e.g. rain, heavy rain, storm, snow, fog, clear sky)
3. Environment & Condition (e.g. ruins, abandoned, intact, on fire, bedroom, dungeon, classroom, forest, beach)
4. Distinct visual features (e.g. dim lighting, neon lights, fantasy landscape)
RULES: Output ONLY comma-separated English tags. Never add conversational text, explanations, or quotes.
Example valid outputs:
night, heavy rain, ruins, abandoned
sunset, clear sky, fantasy castle, intact
indoor, bedroom, dim lighting, cozy`
    : `You are an expert anime visual tagger for an interactive dynamic roleplay engine.
Analyze the image with extreme attention to narrative intent, emotional nuance, erotic state, and specific interaction with the partner/viewer.
Output EXCLUSIVELY 3 to 6 concise comma-separated English tags covering:
1. Exact Outfit or Form (e.g. highschool uniform, sport clothes, underwear, striped bikini, nude, nekomimi form, succubus form, topless)
2. Nuanced Emotion & Intent (e.g. in heat, pleading, knowing look, surprised, blushing, showing attention, seductive, aroused, embarrassed, confident, furious, crying)
3. Specific Action & Spatial Interaction (e.g. advancing to genitals, crawling between legs, leaning forward, hands behind head, looking up, gazing at viewer, sitting, kneeling)
4. Distinct features (e.g. cat ears, bat wings, red eyes, cleavage)

GOLD STANDARD EXAMPLES:
- highschool uniform, advancing to genitals
- nude, nekomimi form, in heat, pleading
- underwear, surprised, blushing
- sport clothes, knowing look
- highschool uniform, happy, showing attention
- topless, panties, aroused, bat wings

RULES: Output ONLY comma-separated English tags. Never add conversational filler, preambles, explanations or quotes.`;

// 1. Intento con Vision Multimodal (si hay imageUrl)
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
    try {
      let resolvedImgUrl = imageUrl.trim();
      if (!resolvedImgUrl.startsWith('data:') && !resolvedImgUrl.startsWith('http')) {
        resolvedImgUrl = `${baseUrl}${resolvedImgUrl.startsWith('/') ? '' : '/'}${resolvedImgUrl}`;
      }

      const visionMessages = [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image for ${entityType} "${entityTitle}". Provide specific visual tags in English:`
            },
            {
              type: 'image_url',
              image_url: { url: resolvedImgUrl }
            }
          ]
        }
      ];

      const visionSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(1000) : undefined;
      const res = await apiFetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: visionSignal,
        body: JSON.stringify({
          model: modelId,
          messages: visionMessages,
          temperature: 0.15,
          max_tokens: 60,
          stream: false
        })
      }, baseUrl);

      if (res && res.ok) {
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content?.trim() || '';
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        text = text.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
        text = text.replace(/^(Tags|Etiquetas|Output):\s*/i, '').trim();
        if (isValidTagList(text)) {
          return formatTagsString(text);
        }
      }
    } catch (visionErr) {
      // Vision model not active or text-only model -> proceed to text LLM analysis
      console.warn('[imageTagging]: Vision payload failed, attempting contextual LLM:', visionErr.message);
    }
  }

  // 2. Intento con LLM Textual
  const textPrompt = isLocation
    ? `Task: Output 3 to 5 comma-separated visual tags in English for a roleplay location image variant.
Location: "${entityTitle || 'Scenery'}"
Context / Lighting / Atmosphere: "${currentLabel || currentTags || prompt || entityDesc || 'Atmospheric scenery'}"

MANDATORY: Output ONLY 3 to 5 comma-separated tags in English (e.g. "night, rain, ruins, abandoned"). Do NOT write explanations or conversational sentences.`
    : `Task: Output 3 to 5 comma-separated visual tags in English for a roleplay character image variant.
Character: "${entityTitle || 'Anime character'}"
Context / Outfit / Pose: "${currentLabel || currentTags || prompt || entityDesc || 'Casual outfit, looking at viewer'}"

MANDATORY: Output ONLY 3 to 5 comma-separated tags in English (e.g. "highschool uniform, happy, looking at viewer"). Do NOT write explanations or conversational sentences.`;

  try {
    const timeoutSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(1000) : undefined;
    const res = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: timeoutSignal,
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: textPrompt }
        ],
        temperature: 0.2,
        max_tokens: 60,
        stream: false
      })
    }, baseUrl);

    if (res && res.ok) {
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim() || '';
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      text = text.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
      text = text.replace(/^(Tags|Etiquetas|Output):\s*/i, '').trim();
      if (isValidTagList(text)) {
        return formatTagsString(text);
      }
    }
  } catch (error) {
    console.warn('[imageTagging]: Text LLM error:', error.message);
  }

  // 3. Fallback Heurístico Rico en INGLÉS
  const combined = `${entityTitle} ${entityDesc} ${currentLabel} ${currentTags} ${prompt}`.toLowerCase();
  
  if (isLocation) {
    const tags = [];
    if (combined.includes('noche') || combined.includes('night') || combined.includes('dark') || combined.includes('oscur')) tags.push('night', 'dark');
    else if (combined.includes('tarde') || combined.includes('sunset') || combined.includes('dusk')) tags.push('sunset');
    else if (combined.includes('amanecer') || combined.includes('dawn')) tags.push('sunrise');
    else tags.push('day', 'sunny');

    if (combined.includes('lluvia') || combined.includes('rain') || combined.includes('storm') || combined.includes('tormenta')) tags.push('rain', 'storm');
    else if (combined.includes('niebla') || combined.includes('fog')) tags.push('foggy');
    else if (combined.includes('nieve') || combined.includes('snow')) tags.push('snow');
    else tags.push('clear sky');

    if (combined.includes('ruina') || combined.includes('ruin') || combined.includes('abandon') || combined.includes('destru')) tags.push('ruins', 'abandoned');
    else if (combined.includes('fuego') || combined.includes('fire') || combined.includes('llamas')) tags.push('on fire', 'burning');
    else if (combined.includes('interior') || combined.includes('room') || combined.includes('habitacion')) tags.push('indoor', 'bedroom');
    else if (combined.includes('playa') || combined.includes('beach') || combined.includes('mar')) tags.push('beach', 'ocean');
    else tags.push('intact', 'majestic');

    return formatTagsString(tags);
  } else {
    const tags = [];
    
    // Ropa / Clothing
    if (combined.includes('bikini') || combined.includes('bañador') || combined.includes('swimsuit')) tags.push('bikini', 'swimsuit');
    else if (combined.includes('lenceria') || combined.includes('underwear') || combined.includes('panties') || combined.includes('bragas') || combined.includes('ropa interior')) tags.push('underwear', 'lingerie');
    else if (combined.includes('topless')) tags.push('topless', 'panties');
    else if (combined.includes('desnud') || combined.includes('nude') || combined.includes('naked') || combined.includes('sin ropa')) tags.push('nude');
    else if (combined.includes('uniform') || combined.includes('escolar') || combined.includes('colegial') || combined.includes('blazer')) tags.push('school uniform');
    else if (combined.includes('sudadera') || combined.includes('hoodie') || combined.includes('tracksuit')) tags.push('hoodie');
    else if (combined.includes('turtleneck') || combined.includes('cuello alto') || combined.includes('sweater')) tags.push('turtleneck');
    else if (combined.includes('armadura') || combined.includes('armor') || combined.includes('combate')) tags.push('armor');
    else if (combined.includes('maid') || combined.includes('sirvienta')) tags.push('maid outfit');
    else tags.push('casual clothes');

    // Emoción / Emotion
    if (combined.includes('placer') || combined.includes('pleasure') || combined.includes('aroused') || combined.includes('excitad') || combined.includes('gemid')) tags.push('aroused', 'pleasure');
    else if (combined.includes('seductor') || combined.includes('seductive') || combined.includes('smug') || combined.includes('picar')) tags.push('seductive', 'smug');
    else if (combined.includes('sonrojad') || combined.includes('blush') || combined.includes('timid') || combined.includes('shy') || combined.includes('vergonz')) tags.push('blushing', 'shy');
    else if (combined.includes('evil') || combined.includes('malicios') || combined.includes('grin')) tags.push('evil smile', 'grin');
    else if (combined.includes('alegre') || combined.includes('feliz') || combined.includes('happy') || combined.includes('smile') || combined.includes('sonri')) tags.push('happy', 'smiling');
    else if (combined.includes('enojad') || combined.includes('furi') || combined.includes('angry')) tags.push('angry');
    else if (combined.includes('triste') || combined.includes('sad') || combined.includes('llor') || combined.includes('crying')) tags.push('crying', 'tears');
    else if (combined.includes('preocupad') || combined.includes('worried') || combined.includes('nervio')) tags.push('worried', 'nervous');
    else tags.push('neutral');

    // Acciones y Rasgos Especiales
    if (combined.includes('rodillas') || combined.includes('cuatro patas') || combined.includes('kneel') || combined.includes('crawl')) tags.push('kneeling', 'on all fours');
    else if (combined.includes('sentad') || combined.includes('sit')) tags.push('sitting');
    else if (combined.includes('acostad') || combined.includes('bed') || combined.includes('lying')) tags.push('lying down');
    else if (combined.includes('manos nuca') || combined.includes('hands behind')) tags.push('hands behind head');
    
    if (combined.includes('alas') || combined.includes('wings') || combined.includes('sucub') || combined.includes('succubus')) tags.push('bat wings', 'succubus');

    return formatTagsString(tags);
  }
}
