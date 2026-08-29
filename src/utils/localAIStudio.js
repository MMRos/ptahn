import { 
  enrichImagePrompt, 
  resolveTargetLanguage, 
  createTranslationPrompt, 
  createVisualPromptTranslationPrompt, 
  detectLanguage, 
  STYLE_PROMPT_PRESETS,
  adaptPromptForDiffusionArchitecture,
  getNegativePromptForModel
} from './language';
import { loadChatSettings } from './storage';
import { findMatchingEntity } from './textFormatter';
import { generateNativeImage, getServerBaseUrl } from './serverApi';
import { emitAILog } from './aiLogEmitter';
import { recordTokensTelemetry, calculateTokensSpeed } from './systemTelemetry';

/**
 * Local AI Studio Multimodal Manager for Ptahn
 * Orchestrates local AI backends:
 * 1. LM Studio (Text Generation, Roleplay LLMs, Context Management)
 * 2. Pinokio / Local AI Studio (sd-vulkan / SDXL Image Diffusion, DreamShaperXL)
 * 3. Audio.cpp / Kokoro (Dynamic TTS Synthesis)
 * 4. Video Generator Backends (Wan 14B / Animation Loops)
 */

/**
 * Resolves the active base URL for the Ptahn Native Server.
 * 
 * @param {string} [baseUrl] - Optional explicit base URL.
 * @returns {string} The resolved base URL without a trailing slash.
 */
export function getBaseUrl(baseUrl) {
  if (baseUrl && typeof baseUrl === 'string' && baseUrl.trim()) {
    if (!baseUrl.includes(':1234/') && !baseUrl.endsWith(':1234')) {
      return baseUrl.trim().replace(/\/$/, '');
    }
  }
  
  const settings = loadChatSettings();
  const url = settings.llmServerUrl || settings.lmStudioUrl || 'http://localhost:3001';
  if (url.includes(':1234/') || url.endsWith(':1234')) {
    return 'http://localhost:3001';
  }
  return url.replace(/\/$/, '');
}

// Recommended local models by task
export const RECOMMENDED_MODELS = {
  chat: {
    id: 'Precog-Magnum-31B.i1-Q3_K_S.gguf',
    name: 'Precog-Magnum 31B (mradermacher)',
    type: 'Narrative & Roleplay (Uncensored / High Quality)',
    description: 'Maximum depth of prose, initiative, and narrative reasoning in 16GB VRAM.'
  },
  orchestrator: {
    id: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf',
    name: 'Mistral Nemo Instruct 2407 (12B)',
    type: 'Intermediario / Orquestador SLM',
    description: 'Fast, precise JSON tool caller and lore extractor.'
  },
  dark_rp: {
    id: 'magnum-v4-12b-Q4_K_M.gguf',
    name: 'Magnum v4 12B (anthracite-org)',
    type: 'Dark Fiction & Mature Roleplay',
    description: 'Ultra-fast, immersive, uncensored with rich sensory prose.'
  },
  moe: {
    id: 'L3.2-8X3B-MOE-Dark-Champion-Inst-18.4B-uncen-ablit_D_AU-Q4_k_s.gguf',
    name: 'L3.2 MoE Dark Champion (18.4B)',
    type: 'Complex Multi-Character Fiction',
    description: 'Specialized mixture of experts for diverse dialogue voices.'
  }
};

// Recommended local diffusion checkpoints (available in ./models/)
export const RECOMMENDED_IMAGE_MODELS = [
  { id: 'malaAnimeMixNSFW_v70WithoutVAE.safetensors', name: 'Mala Anime Mix NSFW (SDXL Checkpoint)' },
  { id: 'v6.safetensors', name: 'Pony / Illustrious V6 (SDXL Checkpoint)' },
  { id: 'dmd2_sdxl_4step_lora.safetensors', name: 'DMD2 SDXL 4-Step (Acelerador LoRA)' },
  { id: 'MysticToon-V1.safetensors', name: 'MysticToon V1 (LoRA)' }
];

/**
 * Intelligent HTTP fetch for Ptahn local AI endpoints.
 */
export async function apiFetch(endpoint, options = {}, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Dynamic timeout: Long (180s) for LLM/SLM inference & diffusion; short (3.5s) for discovery & health checks
  const isHeavyEndpoint = cleanEndpoint.includes('/chat/completions') || cleanEndpoint.includes('/images/') || cleanEndpoint.includes('/models/load') || cleanEndpoint.includes('/completions');
  const defaultTimeoutMs = isHeavyEndpoint ? 180000 : 3500;
  const defaultTimeout = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(defaultTimeoutMs) : undefined;
  const fetchOptions = {
    ...options,
    signal: options.signal || defaultTimeout
  };

  // 1. Direct attempt to native backend
  try {
    const directUrl = `${finalBaseUrl}${cleanEndpoint}`;
    const directRes = await fetch(directUrl, fetchOptions);
    if (directRes.ok) {
      return directRes;
    }
  } catch (directErr) {
    // Network fallback
  }

  // 2. Relative endpoint fallback
  try {
    return await fetch(cleanEndpoint, fetchOptions);
  } catch (fallbackErr) {
    throw fallbackErr;
  }
}

/**
 * Retrieves available GGUF LLM models from Ptahn Native Server.
 */
export async function getAvailableModels(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await apiFetch('/api/models', {}, finalBaseUrl).catch(() => apiFetch('/v1/models', {}, finalBaseUrl));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.models || data.data || [];
  } catch (error) {
    console.warn('[Ptahn AI Engine]: Native AI server offline or unreachable:', error.message);
    return [];
  }
}

/**
 * Retrieves currently active model in GPU/VRAM from Ptahn Native Server.
 */
export async function getLoadedModel(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await apiFetch('/api/models', {}, finalBaseUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.activeModel) return data.activeModel;
    }
  } catch (e) {
    // Silent
  }
  return null;
}

/**
 * Resolves exact model ID available in LM Studio with fuzzy matching.
 */
export async function resolveModelId(searchTerm, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    if (currentlyLoaded) {
      if (!searchTerm || currentlyLoaded.toLowerCase().includes(searchTerm.toLowerCase())) {
        return currentlyLoaded;
      }
    }

    const models = await getAvailableModels(finalBaseUrl);
    if (!models || models.length === 0) return currentlyLoaded || searchTerm || null;

    if (searchTerm) {
      const exactMatch = models.find(m => m.id.toLowerCase() === searchTerm.toLowerCase());
      if (exactMatch) return exactMatch.id;

      const partialMatch = models.find(m => m.id.toLowerCase().includes(searchTerm.toLowerCase()));
      if (partialMatch) return partialMatch.id;
    }

    if (currentlyLoaded) return currentlyLoaded;

    const uncensoredKeywords = [
      'precog-magnum',
      'precog',
      'magnum_lyra',
      'darkness',
      'magnum-v4',
      'magnum',
      'mistral-nemo',
      'nemo',
      'dark-multiverse',
      'heretic',
      'mistral-moe',
      'qwen3.6',
      'qwen3.5',
      'llama-3'
    ];

    for (const kw of uncensoredKeywords) {
      const found = models.find(m => m.id.toLowerCase().includes(kw));
      if (found) return found.id;
    }

    return models[0]?.id || searchTerm || null;
  } catch (e) {
    return searchTerm || null;
  }
}

/**
 * Resolves the lightweight Intermediary SLM model ID (GGUF menor) for middleware tasks.
 * Avoids defaulting to heavy 31B Storyteller models.
 */
export async function resolveIntermediaryModelId(preferredIntermediary, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const settings = loadChatSettings();
  const targetTerm = preferredIntermediary || settings.orchestratorModel || 'mistral-nemo';

  try {
    const models = await getAvailableModels(finalBaseUrl);
    if (!models || models.length === 0) {
      return targetTerm;
    }

    if (targetTerm) {
      const exactMatch = models.find(m => m.id.toLowerCase() === targetTerm.toLowerCase());
      if (exactMatch) return exactMatch.id;

      const partialMatch = models.find(m => m.id.toLowerCase().includes(targetTerm.toLowerCase()));
      if (partialMatch) return partialMatch.id;
    }

    const slmKeywords = [
      'mistral-nemo',
      'nemo',
      'magnum-v4-12b',
      'magnum-12b',
      '12b',
      '8b',
      '7b',
      '3b',
      'qwen',
      'llama-3'
    ];

    for (const kw of slmKeywords) {
      const found = models.find(m => m.id.toLowerCase().includes(kw));
      if (found) return found.id;
    }

    return models[0]?.id || targetTerm;
  } catch (e) {
    return targetTerm;
  }
}

/**
 * Loads a model into GPU/RAM in Ptahn Native Server.
 */
export async function loadModel(modelId, baseUrl) {
  if (!modelId) return false;
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const res = await apiFetch('/api/models/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName: modelId })
    }, finalBaseUrl);
    return res.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Ensures both Principal (Storyteller) and Intermediary (Orchestrator) models are active in Ptahn Engine.
 */
export async function loadDualModels(storytellerId, orchestratorId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const results = { storyteller: false, orchestrator: false };
  try {
    if (storytellerId) {
      results.storyteller = await loadModel(storytellerId, finalBaseUrl);
    }
    if (orchestratorId && orchestratorId !== storytellerId) {
      results.orchestrator = await loadModel(orchestratorId, finalBaseUrl);
    }
  } catch (e) {}
  return results;
}

/**
 * Unloads a model from GPU/RAM in Ptahn Engine.
 */
export async function unloadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    await apiFetch('/api/models/unload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName: modelId })
    }, finalBaseUrl);
    return true;
  } catch (error) {
    console.warn(`[Ptahn AI Engine]: Error unloading model ${modelId}:`, error);
    return false;
  }
}

/**
 * Retrieves diffusion image models from Local AI Studio / Pinokio.
 */
export async function getAvailableImageModels(imageServerUrl = '') {
  const baseUrl = (imageServerUrl || 'http://127.0.0.1:42016').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/models`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        return data.models;
      }
    }
  } catch (e) {
    console.warn('[Local AI Studio]: Could not retrieve image models:', e.message);
  }
  return [];
}

/**
 * Checks diffusion backend status (sd-vulkan / Pinokio).
 */
export async function getImageBackendStatus(imageServerUrl = '') {
  const baseUrl = (imageServerUrl || 'http://127.0.0.1:42016').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/backend-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return { ready: false, running: false };
}

/**
 * Starts or switches the active diffusion model in Local AI Studio / sd-vulkan.
 */
export async function startImageBackend(model = 'v6.safetensors', imageServerUrl = '') {
  const baseUrl = (imageServerUrl || 'http://127.0.0.1:42016').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/restart-backend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    if (res.ok) {
      return await res.json();
    }
    const data = await res.json().catch(() => null);
    if (data && (data.code === 'MODEL_ALREADY_ACTIVE' || !res.ok)) {
      await fetch(`${baseUrl}/api/stop-backend`, { method: 'POST' }).catch(() => null);
      await new Promise(r => setTimeout(r, 1200));
      const retryRes = await fetch(`${baseUrl}/api/restart-backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });
      if (retryRes.ok) return await retryRes.json();
    }
  } catch (e) {
    console.warn('[Local AI Studio]: Error starting image backend:', e.message);
  }
  return null;
}

/**
 * Translates and synthesizes narrative character or scene descriptions into English SDXL visual tags.
 * Uses the local LLM if available, with graceful fallback to the heuristic visual dictionary.
 * 
 * @param {string} rawPrompt - The character or scene prompt (may be Spanish or multilingual).
 * @param {string} [style='Fantasía Oscura / Entornos'] - Selected visual style.
 * @param {string} [baseUrl] - Base server URL.
 * @param {string} [modelId] - LLM model ID.
 * @returns {Promise<string>} Fully enriched English visual prompt.
 */
export async function translateVisualPromptToEnglish(rawPrompt = '', style = 'Fantasía Oscura / Entornos', baseUrl = '', modelId = '', targetModel = '') {
  if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
    return enrichImagePrompt('', style, targetModel);
  }

  const trimmed = rawPrompt.trim();
  const lang = detectLanguage(trimmed);
  const isLikelySpanish = lang === 'es' || /[áéíóúñ¿¡]/i.test(trimmed) || /\b(es|un|una|su|torso|forma|armadura|maza|colosal|bipeda|bipedo|orejas|ojos|rasgos|taparrabos)\b/i.test(trimmed);

  // If text is already strictly in English and not narrative prose
  if (!isLikelySpanish && lang === 'en' && trimmed.includes(',') && !trimmed.includes('. ') && !trimmed.includes(' daughter ') && !trimmed.includes(' grew up ')) {
    return adaptPromptForDiffusionArchitecture(trimmed, targetModel);
  }

  // Try LLM translation into English visual tokens with Intermediary SLM
  const finalBaseUrl = getBaseUrl(baseUrl);
  const resolvedModelId = await resolveIntermediaryModelId(modelId, finalBaseUrl);
  emitAILog({
    from: 'INTERMEDIARY_SLM',
    to: 'DIFFUSION_PIPELINE',
    type: 'PROMPT_TRANSLATION',
    summary: `Traducción visual de prompt con modelo intermediario (${resolvedModelId}): "${trimmed.substring(0, 45)}..."`,
    payload: { raw: trimmed, style, model: resolvedModelId, targetModel }
  });

  try {
    const { system, user } = createVisualPromptTranslationPrompt(trimmed, style, targetModel);

    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModelId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        stream: false
      })
    }, finalBaseUrl);

    if (response && response.ok) {
      const data = await response.json();
      let translated = data.choices?.[0]?.message?.content?.trim();
      if (translated) {
        // Strip think blocks and markdown code fences
        translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        translated = translated.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim();
        if (translated.length > 5) {
          const styleModifier = STYLE_PROMPT_PRESETS[style] || STYLE_PROMPT_PRESETS['Fantasía Oscura'] || 'cinematic lighting, masterpiece, high quality, highly detailed';
          const combined = `${translated}, style: ${styleModifier}, sharp focus, detailed composition`;
          const finalResult = adaptPromptForDiffusionArchitecture(combined, targetModel);
          emitAILog({
            from: 'PROMPT_TRANSLATOR',
            to: 'DIFFUSION_PIPELINE',
            type: 'PROMPT_TRANSLATION',
            summary: `Prompt convertido a tokens en inglés (${finalResult.substring(0, 50)}...)`,
            payload: { fullPrompt: finalResult, targetModel }
          });
          return finalResult;
        }
      }
    }
  } catch (e) {
    // Soft fallback to heuristic dictionary on network or LLM timeout/error
  }

  // Heuristic dictionary fallback
  const fallbackResult = enrichImagePrompt(trimmed, style, targetModel);
  emitAILog({
    from: 'PROMPT_TRANSLATOR_HEURISTIC',
    to: 'DIFFUSION_PIPELINE',
    type: 'PROMPT_TRANSLATION',
    summary: `Prompt traducido mediante diccionario heurístico (${fallbackResult.substring(0, 50)}...)`,
    payload: { fullPrompt: fallbackResult, targetModel }
  });
  return fallbackResult;
}

/**
 * Generates an image using Local AI Studio / Pinokio / SD WebUI with automatic English prompt enrichment.
 */
export async function generateImageLocal(prompt, style = 'Fantasía Oscura / Entornos', imageServerUrl = '', targetModel = '', customWidth = 768, customHeight = 512) {
  const settings = loadChatSettings();
  const selectedModel = targetModel || settings.preferredImageModel || 'DreamShaperXL_Lightning.safetensors';
  const isLightning = selectedModel.toLowerCase().includes('lightning') || selectedModel.toLowerCase().includes('4step');
  const steps = isLightning ? 8 : 20;

  // Translate and convert visual prompt to English SDXL / Pony tokens
  const fullPrompt = await translateVisualPromptToEnglish(prompt, style, settings.lmStudioUrl, settings.preferredModel, selectedModel);
  const negativePrompt = getNegativePromptForModel(selectedModel);

  emitAILog({
    from: 'DIFFUSION_PIPELINE',
    to: 'NATIVE_DIFFUSION_WORKER',
    type: 'DIFFUSION_TASK',
    summary: `Generando imagen ${customWidth}x${customHeight} (${steps} pasos, modelo: ${selectedModel})`,
    payload: { prompt: fullPrompt, negativePrompt, model: selectedModel, width: customWidth, height: customHeight, steps }
  });

  // 1. Prioritize Ptahn Native Server Diffusion Endpoint (/api/images/generate)
  try {
    const nativeRes = await generateNativeImage(fullPrompt, {
      width: customWidth,
      height: customHeight,
      steps: steps,
      model: selectedModel,
      style: style,
      negativePrompt: negativePrompt
    });
    if (nativeRes && nativeRes.success && (nativeRes.base64 || nativeRes.url)) {
      if (nativeRes.base64) return nativeRes.base64;
      const origin = getServerBaseUrl();
      return `${origin}${nativeRes.url}`;
    }
  } catch (nativeErr) {
    // Soft fallback to local bridge ports if native endpoint not running
  }

  // 2. Probe local bridge ports (SD WebUI, Pinokio, ComfyUI, user custom URL)
  let serverUrls = [];
  if (imageServerUrl) {
    serverUrls.push(imageServerUrl.replace(/\/$/, ''));
  }
  if (settings.imageServerUrl) {
    const custom = settings.imageServerUrl.replace(/\/$/, '');
    if (!serverUrls.includes(custom)) serverUrls.push(custom);
  }
  const defaultPorts = ['http://127.0.0.1:42016', 'http://127.0.0.1:7860', 'http://localhost:7860', 'http://127.0.0.1:8188', 'http://localhost:42016'];
  for (const p of defaultPorts) {
    if (!serverUrls.includes(p)) serverUrls.push(p);
  }

  for (const baseUrl of serverUrls) {
    try {
      try {
        const statusRes = await fetch(`${baseUrl}/api/backend-status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          const currentModel = status?.loading?.model || status?.settings?.model || '';
          if (!status.ready || !status.running || (selectedModel && !currentModel.includes(selectedModel))) {
            await startImageBackend(selectedModel, baseUrl);
            for (let i = 0; i < 6; i++) {
              await new Promise(r => setTimeout(r, 1000));
              const poll = await fetch(`${baseUrl}/api/backend-status`).then(r => r.json()).catch(() => null);
              if (poll && poll.ready && poll.running) break;
            }
          }
        }
      } catch (e) {}

      const sdRes = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          steps: steps,
          width: customWidth,
          height: customHeight
        })
      });

      if (sdRes.ok) {
        const data = await sdRes.json();
        if (data.images && data.images[0]) {
          const img = data.images[0];
          return img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
        }
      }

      const v1Res = await fetch(`${baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 1,
          size: `${customWidth}x${customHeight}`,
          response_format: 'b64_json'
        })
      });

      if (v1Res.ok) {
        const data = await v1Res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
        if (data.data?.[0]?.url) return data.data[0].url;
      }
    } catch (e) {}
  }

  throw new Error('No se pudo conectar con el motor de difusión local de Ptahn ni con ningún servidor de imágenes (puertos 3001, 7860, 42016). Coloca un archivo de modelo (.safetensors / .gguf) en la carpeta ./models/ de Ptahn para generar imágenes nativas.');
}

/**
 * Generates an on-demand portrait specifically optimized for 3:4 character sidebar and card covers.
 */
export async function generateCharacterPortrait(characterName, traits = [], intro = '', targetModel = '', imageServerUrl = '') {
  const traitsText = Array.isArray(traits) ? traits.filter(Boolean).join(', ') : (traits || '');
  const portraitPrompt = `portrait of ${characterName || 'hero character'}, ${traitsText ? `traits: ${traitsText}, ` : ''}${intro ? `description: ${intro}, ` : ''}expressive eyes, dramatic lighting, sharp focus, 8k masterpiece character concept art, high quality vertical portrait`;
  return generateImageLocal(
    portraitPrompt,
    'Anime / Ilustración Estilizada 2.5D',
    imageServerUrl,
    targetModel || 'v6.safetensors',
    512,
    768
  );
}

/**
 * Generates an on-demand landscape wallpaper specifically optimized for Zona A (chat background) and Location cards.
 */
export async function generateLocationWallpaper(locationName, intro = '', text = '', targetModel = '', imageServerUrl = '') {
  const locationPrompt = `wide angle cinematic landscape wallpaper of ${locationName || 'fantasy location'}, scenery background, ${intro ? `intro: ${intro}, ` : ''}${text ? `details: ${text}, ` : ''}detailed environment architecture, atmospheric depth, volumetric lighting, masterpiece wallpaper, landscape orientation`;
  return generateImageLocal(
    locationPrompt,
    'Fantasía Oscura / Entornos',
    imageServerUrl,
    targetModel || 'v6.safetensors',
    768,
    512
  );
}

/**
 * Generates an animated video/loop using local video generator backends.
 */
export async function generateVideoLocal(prompt, aspect = '16:9', videoServerUrl = '') {
  if (videoServerUrl) {
    try {
      const response = await fetch(`${videoServerUrl.replace(/\/$/, '')}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, cinematic movement, aspect ratio ${aspect}`,
          n: 1,
          response_format: 'b64_json'
        })
      });
      if (response.ok) {
        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('text/html')) {
          const data = await response.json();
          const b64 = data.data?.[0]?.b64_json;
          if (b64) return `data:video/mp4;base64,${b64}`;
          if (data.data?.[0]?.url) return data.data[0].url;
        }
      }
    } catch (error) {}
  }
  return 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif';
}

/**
 * Dynamic speech synthesis (TTS) using audio.cpp / Kokoro.
 */
export async function generateAudioLocal(text, voice = 'default', description = '', pitch = 1.0, speed = 1.0, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const defaultId = 'audio-cpp/audio.cpp';
  const resolvedId = (await resolveModelId('audio.cpp', finalBaseUrl)) || defaultId;
  const startTime = Date.now();

  console.log(`[Dynamic TTS Load]: Loading voice model ${resolvedId}`);
  await loadModel(resolvedId, finalBaseUrl);
  emitAILog({
    from: 'CHAT_NARRATOR',
    to: 'TTS_KOKORO',
    type: 'TTS_AUDIO',
    summary: `Generando síntesis de voz ("${text.substring(0, 40)}...", voz: ${voice}, velocidad: ${speed}x)`,
    payload: { text: text.substring(0, 100), voice, pitch, speed }
  });

  try {
    const response = await fetch(`${finalBaseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedId,
        input: text,
        voice: voice,
        response_format: 'mp3',
        description: description,
        pitch: pitch,
        speed: speed,
        rate: speed
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error(`Server returned non-binary format (${contentType}). Ensure TTS endpoint is active.`);
    }
    
    const blob = await response.blob();
    emitAILog({
      from: 'TTS_KOKORO',
      to: 'AUDIO_PLAYER',
      type: 'TTS_AUDIO',
      summary: `Síntesis de voz completada (${blob.size} bytes generados en ${Date.now() - startTime}ms)`,
      metrics: { sizeBytes: blob.size, durationMs: Date.now() - startTime }
    });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[Local AI Studio TTS Error]:', error);
    emitAILog({
      from: 'TTS_KOKORO',
      to: 'AUDIO_PLAYER',
      type: 'ERROR',
      summary: `Error en síntesis de voz: ${error.message}`
    });
    throw error;
  } finally {
    console.log(`[Dynamic TTS Unload]: Unloading voice model ${resolvedId}`);
    await unloadModel(resolvedId, finalBaseUrl);
  }
}

/**
 * Sends a chat completion request to native Ptahn engine with tag context weighting and streaming.
 */
export async function sendChatMessage({
  messages,
  systemInstruction = '',
  contextDocuments = [],
  modelId = 'Precog-Magnum-31B.i1-Q3_K_S.gguf',
  temperature = 0.85,
  baseUrl,
  onChunk = null,
  callerType = 'STORYTELLER_LLM'
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const chatStartTime = Date.now();
  try {
    const recentText = messages.slice(-3).map(m => m.text).join(' ').toLowerCase();
    
    const weightedDocs = contextDocuments.filter(doc => {
      if (!doc) return false;
      const titleMatch = doc.title && recentText.includes(doc.title.toLowerCase());
      const tagMatch = doc.tags && doc.tags.some(t => recentText.includes(t.toLowerCase()));
      return titleMatch || tagMatch;
    });

    let contextText = '';
    if (weightedDocs.length > 0) {
      contextText = '\n\n[TAG-ACTIVATED RELEVANT LORE CONTEXT]:\n' + 
        weightedDocs.map(d => `- ${d.title} (${d.type}): ${d.intro || d.text}`).join('\n');
    }

    const fullSystemPrompt = `${systemInstruction}${contextText}`.trim();

    const formattedMessages = [];
    if (fullSystemPrompt) {
      formattedMessages.push({ role: 'system', content: fullSystemPrompt });
    }

    messages.forEach(m => {
      if (m && m.text) {
        formattedMessages.push({
          role: m.from === 'user' ? 'user' : 'assistant',
          content: m.text
        });
      }
    });

    if (formattedMessages.length === 0 || (formattedMessages.length === 1 && formattedMessages[0].role === 'system')) {
      formattedMessages.push({ role: 'user', content: 'Begin the scenario narration and describe the immediate environment from your Game Master role.' });
    } else if (formattedMessages[formattedMessages.length - 1].role === 'assistant') {
      formattedMessages.push({ 
        role: 'user', 
        content: '[The player waits]. Continue the environmental narration, events, and NPC dialogue in strict third-person from your external Game Master perspective.' 
      });
    }

    const narrationId = (await resolveModelId(modelId, finalBaseUrl)) || modelId;
    await loadModel(narrationId, finalBaseUrl);

    emitAILog({
      from: callerType === 'INTERMEDIARY_SLM' ? 'INTERMEDIARY_SLM' : 'CHAT_VIEW',
      to: callerType === 'INTERMEDIARY_SLM' ? 'INTERMEDIARY_SLM' : 'STORYTELLER_LLM',
      type: callerType === 'INTERMEDIARY_SLM' ? 'INTER_AI' : 'STORYTELLER',
      summary: callerType === 'INTERMEDIARY_SLM'
        ? `Petición procesada con modelo intermediario ${narrationId}`
        : `Petición de turno narrativo al modelo principal ${narrationId} (${messages.length} mensajes previos)`,
      payload: { model: narrationId, messageCount: messages.length, contextDocs: weightedDocs.length }
    });

    const isStream = typeof onChunk === 'function';

    const requestBody = JSON.stringify({
      model: narrationId,
      messages: formattedMessages,
      temperature: temperature,
      stream: isStream
    });

    let response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    }, finalBaseUrl);

    if (!response.ok) {
      // If the specific requested model failed (e.g. model not loaded in LM Studio single-model mode), retry with currently loaded model
      const currentlyLoaded = await getLoadedModel(finalBaseUrl);
      if (currentlyLoaded && currentlyLoaded !== narrationId) {
        console.warn(`[Local AI Studio]: Model '${narrationId}' not loaded, retrying with active model '${currentlyLoaded}'...`);
        const fallbackBody = JSON.stringify({
          model: currentlyLoaded,
          messages: formattedMessages,
          temperature: temperature,
          stream: isStream
        });
        response = await apiFetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: fallbackBody
        }, finalBaseUrl);
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`LM Studio API Error: ${errText || response.statusText}`);
    }

    let fullContent = '';
    let isReasoning = false;

    if (isStream && response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const deltaObj = parsed.choices?.[0]?.delta;
            const contentDelta = deltaObj?.content ?? deltaObj?.text ?? parsed.choices?.[0]?.text ?? '';
            const reasoningDelta = deltaObj?.reasoning_content ?? deltaObj?.reasoning ?? '';

            if (reasoningDelta) {
              if (!isReasoning && !fullContent.includes('<think>')) {
                fullContent += '<think>';
                isReasoning = true;
              }
              fullContent += reasoningDelta;
              onChunk(fullContent, reasoningDelta);
            } else if (contentDelta) {
              if (isReasoning && !fullContent.includes('</think>')) {
                fullContent += '</think>\n\n';
                isReasoning = false;
              }
              fullContent += contentDelta;
              onChunk(fullContent, contentDelta);
            }
          } catch (e) {}
        }
      }
      if (isReasoning && !fullContent.includes('</think>')) {
        fullContent += '</think>';
      }
    } else {
      const data = await response.json();
      const messageObj = data.choices?.[0]?.message;
      let text = messageObj?.content || '';
      if (messageObj?.reasoning_content && !text.includes('<think>')) {
        text = `<think>${messageObj.reasoning_content}</think>\n\n${text}`.trim();
      }
      fullContent = text || 'No response received from model.';
    }

    const elapsed = Date.now() - chatStartTime;
    const approxTokens = Math.max(1, Math.round(fullContent.length / 4));
    const speed = calculateTokensSpeed(approxTokens, elapsed);
    recordTokensTelemetry(approxTokens, speed);

    emitAILog({
      from: 'STORYTELLER_LLM',
      to: 'CHAT_VIEW',
      type: 'STORYTELLER',
      summary: `Turno narrativo completado (~${approxTokens} tokens a ${speed} tok/s en ${(elapsed / 1000).toFixed(1)}s)`,
      metrics: { tokens: approxTokens, speedTokPerSec: speed, elapsedMs: elapsed }
    });
    
    return {
      text: fullContent,
      usedContextDocs: weightedDocs.map(d => d.title)
    };
  } catch (error) {
    console.error('[Local AI Studio Chat Error]:', error);
    emitAILog({
      from: 'STORYTELLER_LLM',
      to: 'CHAT_VIEW',
      type: 'ERROR',
      summary: `Error en turno narrativo: ${error.message}`
    });
    return {
      text: `[Simulation Mode / Local AI Studio server not detected at ${finalBaseUrl}]: Ensure your LLM server is active.\n\n*The game master watches the room in silence...*`,
      usedContextDocs: []
    };
  }
}

/**
 * Background Task: Memory and Story Summarization.
 */
export async function sendContextSummarizationTask({
  messages,
  currentMemory = [],
  modelId = 'Magnum_Lyra_Darkness_12B-Heretic',
  preferredLanguage = 'auto',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const recentMessages = messages.slice(-5).map(m => `${m.from}: ${m.text}`).join('\n');
    const existingMem = currentMemory.length ? currentMemory.join('; ') : 'None.';
    const targetLang = resolveTargetLanguage(preferredLanguage, recentMessages);

    const systemInstruction = `You are a silent RPG memory recorder. Read recent messages and decide if there is a new key discovery or story milestone to record into long-term memory.
Current memories: ${existingMem}.
Language: Write the memory sentence strictly in ${targetLang.name} (${targetLang.code}).
Respond ONLY with a short, evocative sentence to add to memory, or the word NONE if not relevant.`;

    const summarizerId = await resolveIntermediaryModelId(modelId, finalBaseUrl);

    emitAILog({
      from: 'STORYTELLER_LLM',
      to: 'INTERMEDIARY_SLM',
      type: 'INTER_AI',
      summary: `Petición de resumen y extracción de memorias al modelo intermediario (${summarizerId})`,
      payload: { model: summarizerId, messageCount: messages.length }
    });

    const requestBody = JSON.stringify({
      model: summarizerId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: recentMessages || 'None.' }
      ],
      temperature: 0.3,
      stream: false
    });

    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    }, finalBaseUrl);

    if (!response.ok) return null;
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || 'NONE';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    if (content.toUpperCase().includes('NONE') || content.toUpperCase().includes('NADA') || content.length < 5) {
      return null;
    }
    return content;
  } catch (error) {
    console.warn('[Local AI Studio Summarization Error]:', error);
    return null;
  }
}

/**
 * Background Task: Automatic Compendium Card Extraction.
 */
export async function sendExtractCardsTask({
  messages = [],
  existingCards = [],
  existingScenarios = [],
  activeScenario = null,
  modelId = '',
  preferredLanguage = 'auto',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const recentStory = messages.slice(-5).map(m => `${m.from === 'user' ? 'Player' : 'Game Master'}: ${m.text}`).join('\n\n');
    if (!recentStory || recentStory.trim().length < 20) return [];

    const targetLang = resolveTargetLanguage(preferredLanguage, recentStory);
    const allExisting = [...existingCards, ...existingScenarios];
    if (activeScenario && !allExisting.some(x => x && (x.id === activeScenario.id || x.title === activeScenario.title))) {
      allExisting.push(activeScenario);
    }

    const existingNames = allExisting.map(c => (c.title || c.name || '').trim()).filter(Boolean);

    const systemInstruction = `You are the Compendium Archivist of a tabletop RPG.
Your task is to analyze the recent game messages and extract significant NEW characters, creatures, locations, or items that deserve a compendium card.

CRITICAL RULES FOR CHARACTER LORE:
1. Grounding in the scene: The "intro" and "text" fields MUST accurately reflect the entity's current condition, physical state, social role, and situation as described in the story.
2. Never invent contradictory, generic mythological archetypes that contradict the ongoing scene.
3. Language: All "title", "intro", "text", "tags", and "traits" MUST be written strictly in ${targetLang.name} (${targetLang.code}).
4. "imagePrompt" must be in English for SDXL image generation with appropriate lighting and aesthetic modifiers.

Registered entities already in the compendium (DO NOT EXTRACT THESE OR CREATE DUPLICATES FOR THEM):
${existingNames.join(', ') || 'None'}.

If new entities are found, reply ONLY with a valid JSON array matching this exact schema:
[
  {
    "title": "Name in ${targetLang.name}",
    "type": "Personaje",
    "intro": "Brief evocative 1-sentence description reflecting their current situation in ${targetLang.name}",
    "text": "Detailed physical description, current condition, status, lore, and behavior in ${targetLang.name}",
    "tags": ["tag1", "tag2"],
    "traits": ["Trait 1", "Trait 2"],
    "imagePrompt": "A detailed digital painting portrait of [Name], [their current physical state and role], fantasy RPG art style, dramatic volumetric lighting, cinematic chiaroscuro, masterpiece"
  }
]

Allowed types: "Personaje", "Lugar", "Objeto", "Historia".
If no new entity is found, reply ONLY with: []
Do not add any explanation or text outside the JSON.`;

    const targetModelId = await resolveIntermediaryModelId(modelId, finalBaseUrl);

    const requestBody = JSON.stringify({
      model: targetModelId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Analyze this recent narrative and extract new entities:\n\n${recentStory}` }
      ],
      temperature: 0.2,
      stream: false
    });

    emitAILog({
      from: 'STORYTELLER_LLM',
      to: 'INTERMEDIARY_SLM',
      type: 'INTER_AI',
      summary: `Petición de extracción de entidades al modelo intermediario (${targetModelId})`,
      payload: { model: targetModelId, existingEntitiesCount: existingNames.length, preferredLanguage: targetLang.code }
    });

    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    }, finalBaseUrl);

    if (!response.ok) return [];
    const data = await response.json();
    let rawContent = data.choices?.[0]?.message?.content?.trim() || '[]';
    
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    }

    const jsonStart = rawContent.indexOf('[');
    const jsonEnd = rawContent.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return [];
    }

    rawContent = rawContent.substring(jsonStart, jsonEnd + 1);

    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(item => {
          if (!item || !item.title || typeof item.title !== 'string') return false;
          // Strict duplicate check against all existing entities using findMatchingEntity
          const duplicate = findMatchingEntity(item.title, allExisting);
          return !duplicate;
        });

        emitAILog({
          from: 'INTERMEDIARY_SLM',
          to: 'CHAT_COMPENDIUM_VIEW',
          type: 'CARD_EXTRACTOR',
          summary: `Extracción completada por intermediario: ${filtered.length} nuevas entidades (${filtered.map(c => c.title).join(', ') || 'Ninguna'})`,
          payload: filtered
        });

        return filtered;
      }
    } catch (parseErr) {
      return [];
    }
    return [];
  } catch (error) {
    console.warn('[Local AI Studio Extraction Error]:', error.message);
    emitAILog({
      from: 'INTERMEDIARY_SLM',
      to: 'CHAT_COMPENDIUM_VIEW',
      type: 'ERROR',
      summary: `Error en extracción de entidades con intermediario: ${error.message}`
    });
    return [];
  }
}

/**
 * Translates a chat message or narrative text to the specified target language using the local LLM.
 * Preserves all formatting tokens ("...", *...*, ~...~, ==...==, <think>...).
 * 
 * @param {object} params
 * @param {string} params.text - The message text to translate.
 * @param {string} [params.targetLanguage='es'] - The target language preference.
 * @param {string} [params.modelId] - The LLM model ID.
 * @param {string} [params.baseUrl] - Base server URL.
 * @returns {Promise<string>} The translated text.
 */
export async function translateChatMessage({
  text,
  targetLanguage = 'es',
  modelId,
  baseUrl
}) {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const resolvedLang = resolveTargetLanguage(targetLanguage, text);
    const { system, user } = createTranslationPrompt(text, resolvedLang);

    const resolvedModelId = await resolveIntermediaryModelId(modelId, finalBaseUrl);

    emitAILog({
      from: 'CHAT_VIEW',
      to: 'INTERMEDIARY_SLM',
      type: 'INTER_AI',
      summary: `Traducción de mensaje con modelo intermediario (${resolvedModelId})`,
      payload: { model: resolvedModelId, targetLanguage: resolvedLang.code }
    });

    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModelId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        stream: false
      })
    }, finalBaseUrl);

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Translation API error: ${errText || response.statusText}`);
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated) {
      return translated;
    }
    return text;
  } catch (err) {
    console.warn('[Local AI Studio Translation Error]:', err.message);
    throw err;
  }
}
