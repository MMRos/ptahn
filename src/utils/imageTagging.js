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
  traits = [],
  currentLabel = '',
  currentTags = '',
  prompt = ''
}) {
  const isLocation = entityType === 'Lugar' || entityType === 'Escenario';
  const settings = loadChatSettings();
  const baseUrl = getBaseUrl(settings?.llmServerUrl || settings?.lmStudioUrl);

  // 1. Inferencia Nativa de Visión por Computador (PyTorch + BLIP en GPU local)
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
    try {
      const visionRes = await apiFetch('/api/images/vision-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          entityTitle: entityTitle || ''
        })
      });

      if (visionRes && visionRes.ok) {
        const visionData = await visionRes.json();
        if (visionData.success && visionData.tags) {
          console.log('[imageTagging]: Native GPU vision analysis completed:', visionData.tags, `(Caption: "${visionData.caption}")`);
          return formatTagsString(visionData.tags);
        }
      }
    } catch (nativeErr) {
      console.warn('[imageTagging]: Native vision worker failed, trying remote/external VLM fallback:', nativeErr.message);
    }
  }

  // 2. Intento de respaldo con VLM Multimodal Remoto/Compatible (OpenAI vision payload)
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
    try {
      let resolvedImgUrl = imageUrl.trim();
      if (!resolvedImgUrl.startsWith('data:') && !resolvedImgUrl.startsWith('http')) {
        resolvedImgUrl = `${baseUrl}${resolvedImgUrl.startsWith('/') ? '' : '/'}${resolvedImgUrl}`;
      }

      let modelId = settings?.preferredModel || 'local-model';
      try {
        const resolved = await resolveModelId(settings?.preferredModel || settings?.orchestratorModel, baseUrl);
        if (resolved) modelId = resolved;
      } catch (e) {}

      const systemInstruction = isLocation
        ? `You are an expert visual scene classifier. Output EXCLUSIVELY 3 to 6 concise comma-separated English tags describing time of day, weather, environment and physical condition. Output ONLY comma-separated tags.`
        : `You are an expert anime visual tagger. Inspect the image pixels directly and output EXCLUSIVELY 3 to 6 concise comma-separated English tags describing exact clothing/nudity state, facial emotion/gaze, pose/posture and biological traits (wings, tail, ears). Output ONLY comma-separated tags.`;

      const visionMessages = [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image directly and describe strictly what is visually visible:\n\nOutput 3 to 6 concise comma-separated English tags:`
            },
            {
              type: 'image_url',
              image_url: { url: resolvedImgUrl }
            }
          ]
        }
      ];

      const visionSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15000) : undefined;
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
      console.warn('[imageTagging]: External VLM endpoint failed:', visionErr.message);
    }
  }

  // 3. Si la visión real no está disponible, NO inventar etiquetas leyendo el texto del personaje.
  console.warn('[imageTagging]: No vision model was able to inspect image pixels.');
  return '';
}
