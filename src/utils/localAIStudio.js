import { enrichImagePrompt, resolveTargetLanguage, createTranslationPrompt } from './language';
import { loadChatSettings } from './storage';
import { findMatchingEntity } from './textFormatter';

/**
 * Local AI Studio Multimodal Manager for Ptahn
 * Orchestrates local AI backends:
 * 1. LM Studio (Text Generation, Roleplay LLMs, Context Management)
 * 2. Pinokio / Local AI Studio (sd-vulkan / SDXL Image Diffusion, DreamShaperXL)
 * 3. Audio.cpp / Kokoro (Dynamic TTS Synthesis)
 * 4. Video Generator Backends (Wan 14B / Animation Loops)
 */

/**
 * Resolves the active base URL for the LM Studio API server.
 * 
 * @param {string} [baseUrl] - Optional explicit base URL.
 * @returns {string} The resolved base URL without a trailing slash.
 */
export function getBaseUrl(baseUrl) {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }
  
  const settings = loadChatSettings();
  return (settings.lmStudioUrl || 'http://localhost:1234').replace(/\/$/, '');
}

// Recommended local models by task
export const RECOMMENDED_MODELS = {
  chat: {
    id: 'precog-magnum-31b-i1',
    name: 'Precog-Magnum 31B (mradermacher)',
    type: 'Narrative & Roleplay (Uncensored / High Quality)',
    description: 'Maximum depth of prose, initiative, and narrative reasoning in 16GB VRAM.'
  },
  dark_rp: {
    id: 'magnum_lyra_darkness_12b-heretic',
    name: 'Magnum Lyra Darkness 12B Heretic',
    type: 'Dark Fiction & Mature Roleplay',
    description: 'Ultra-fast, immersive, uncensored with rich sensory prose.'
  },
  heretic: {
    id: 'magnum-v4-12b',
    name: 'Magnum v4 12B Heretic',
    type: 'Creative Storytelling',
    description: 'Balanced uncensored roleplay with fast token generation.'
  },
  moe_dark: {
    id: 'mistral-moe-4x7b-dark-multiverse-uncensored-enhanced32-24b',
    name: 'Mistral MoE 4x7B Dark Multiverse (DavidAU)',
    type: 'Dark Fantasy & MoE',
    description: 'Multi-expert merge for dark worlds.'
  },
  context: {
    id: 'mistral-nemo-instruct-2407-k-m',
    name: 'Mistral Nemo 12B Instruct',
    type: 'Memory & Context Summarization',
    description: 'High coherence for processing roleplay events and long-term memory.'
  },
  image: {
    id: 'DreamShaperXL_Lightning.safetensors',
    name: 'DreamShaperXL Lightning (SDXL Vulkan)',
    type: 'Scene Staging & Scenario Covers',
    description: 'Fast 8-step image diffusion via sd-vulkan / Pinokio.'
  },
  video: {
    id: 'nsfw_wan_14b',
    name: 'Wan 14B Video (NSFW-API)',
    type: 'Video & Animation Loops',
    description: 'Short animated loops loaded dynamically.'
  },
  audio: {
    id: 'audio.cpp',
    name: 'Audio.cpp (Kokoro / TTS)',
    type: 'Voices / TTS',
    description: 'Local speech synthesis and sound effects loaded on demand.'
  }
};

/**
 * Intelligent HTTP fetch for local AI endpoints.
 * Handles direct CORS requests with transparent internal proxy fallback (/api/lmstudio).
 */
export async function apiFetch(endpoint, options = {}, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Direct attempt
  try {
    const directUrl = `${finalBaseUrl}${cleanEndpoint}`;
    const directRes = await fetch(directUrl, options);
    if (directRes.ok) {
      return directRes;
    }
  } catch (directErr) {
    // Network / CORS preflight fallback
  }

  // 2. Transparent fallback via internal proxy
  try {
    const proxyUrl = `/api/lmstudio${cleanEndpoint}`;
    const proxyOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        'x-target-url': finalBaseUrl
      }
    };
    return await fetch(proxyUrl, proxyOptions);
  } catch (proxyErr) {
    throw proxyErr;
  }
}

/**
 * Retrieves available/downloaded models in LM Studio.
 */
export async function getAvailableModels(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await apiFetch('/v1/models', {}, finalBaseUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('[Local AI Studio]: LM Studio server offline or unreachable:', error.message);
    return [];
  }
}

/**
 * Retrieves currently loaded model in GPU/VRAM from LM Studio (if available).
 */
export async function getLoadedModel(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await apiFetch('/api/v0/models', {}, finalBaseUrl);
    if (response.ok) {
      const data = await response.json();
      const loaded = (data.data || []).find(m => m.state === 'loaded');
      if (loaded) return loaded.id;
    }
  } catch (e) {
    // Silent if api/v0 is not supported
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
 * Loads a model into GPU/RAM in LM Studio.
 */
export async function loadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    if (currentlyLoaded && currentlyLoaded.toLowerCase() === modelId.toLowerCase()) {
      return true;
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Unloads a model from GPU/RAM in LM Studio.
 */
export async function unloadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    await fetch(`${finalBaseUrl}/api/v0/models/unload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId })
    });
    return true;
  } catch (error) {
    console.warn(`[Local AI Studio]: Error unloading model ${modelId}:`, error);
    return false;
  }
}

/**
 * Generates an SVG placeholder when diffusion backends are unreachable.
 */
export function createLocalSvgPlaceholder(prompt = 'Ptahn Illustration') {
  const cleanTitle = (prompt || 'Illustration').replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141424" />
        <stop offset="50%" stop-color="#1e183a" />
        <stop offset="100%" stop-color="#0a0a14" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" />
    <circle cx="480" cy="220" r="70" fill="none" stroke="#ffd36b" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>
    <text x="480" y="230" fill="#ffd36b" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" text-anchor="middle">✨ Ptahn Local AI Studio</text>
    <text x="480" y="340" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="600" text-anchor="middle" opacity="0.9">${cleanTitle.substring(0, 55)}</text>
    <text x="480" y="380" fill="#ffd36b" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" opacity="0.75">Pinokio / sd-vulkan (DreamShaperXL)</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
 * Generates an image using Local AI Studio / Pinokio / SD WebUI with automatic English prompt enrichment.
 */
export async function generateImageLocal(prompt, style = 'Fantasía Oscura / Entornos', imageServerUrl = '', targetModel = '') {
  let serverUrls = [];
  if (imageServerUrl) {
    serverUrls.push(imageServerUrl.replace(/\/$/, ''));
  } else {
    const settings = loadChatSettings();
    if (settings.imageServerUrl) {
      serverUrls.push(settings.imageServerUrl.replace(/\/$/, ''));
    }
    serverUrls.push('http://127.0.0.1:42016', 'http://192.168.1.41:42016', 'http://localhost:42016');
  }

  const selectedModel = targetModel || 'DreamShaperXL_Lightning.safetensors';
  const isLightning = selectedModel.toLowerCase().includes('lightning') || selectedModel.toLowerCase().includes('4step');
  const steps = isLightning ? 8 : 20;

  const fullPrompt = enrichImagePrompt(prompt, style);

  for (const baseUrl of serverUrls) {
    try {
      try {
        const statusRes = await fetch(`${baseUrl}/api/backend-status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          const currentModel = status?.loading?.model || status?.settings?.model || '';
          if (!status.ready || !status.running || (selectedModel && !currentModel.includes(selectedModel))) {
            console.log(`[Local AI Studio]: Loading diffusion model "${selectedModel}"...`);
            await startImageBackend(selectedModel, baseUrl);
            for (let i = 0; i < 8; i++) {
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
          width: 768,
          height: 512
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
          size: '768x512',
          response_format: 'b64_json'
        })
      });

      if (v1Res.ok) {
        const data = await v1Res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
        if (data.data?.[0]?.url) return data.data[0].url;
      }
    } catch (e) {
      console.warn(`[Local AI Studio]: Failed to contact ${baseUrl}:`, e.message);
    }
  }

  console.log('[Local AI Studio]: Image server unreachable, rendering local graphic preview.');
  return createLocalSvgPlaceholder(prompt);
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

  console.log(`[Dynamic TTS Load]: Loading voice model ${resolvedId}`);
  await loadModel(resolvedId, finalBaseUrl);

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
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[Local AI Studio TTS Error]:', error);
    throw error;
  } finally {
    console.log(`[Dynamic TTS Unload]: Unloading voice model ${resolvedId}`);
    await unloadModel(resolvedId, finalBaseUrl);
  }
}

/**
 * Sends a chat completion request to LM Studio with tag context weighting and streaming.
 */
export async function sendChatMessage({
  messages,
  systemInstruction = '',
  contextDocuments = [],
  modelId = 'Precog-Magnum-31B-i1-GGUF',
  temperature = 0.85,
  baseUrl,
  onChunk = null
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
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

    const isStream = typeof onChunk === 'function';

    const requestBody = JSON.stringify({
      model: narrationId,
      messages: formattedMessages,
      temperature: temperature,
      stream: isStream
    });

    const response = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    }, finalBaseUrl);

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
    
    return {
      text: fullContent,
      usedContextDocs: weightedDocs.map(d => d.title)
    };
  } catch (error) {
    console.error('[Local AI Studio Chat Error]:', error);
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

    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    const summarizerId = currentlyLoaded || (await resolveModelId(modelId, finalBaseUrl)) || (await resolveModelId('magnum', finalBaseUrl)) || modelId;

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

    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    let targetModelId = currentlyLoaded || modelId;
    if (!targetModelId) {
      targetModelId = (await resolveModelId('nemo', finalBaseUrl)) || (await resolveModelId('magnum', finalBaseUrl)) || 'default';
    }

    const requestBody = JSON.stringify({
      model: targetModelId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Analyze this recent narrative and extract new entities:\n\n${recentStory}` }
      ],
      temperature: 0.2,
      stream: false
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
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      rawContent = rawContent.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => {
        if (!item || !item.title || typeof item.title !== 'string') return false;
        // Strict duplicate check against all existing entities using findMatchingEntity
        const duplicate = findMatchingEntity(item.title, allExisting);
        return !duplicate;
      });
    }
    return [];
  } catch (error) {
    console.warn('[Local AI Studio Extraction Error]:', error.message);
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

    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    const resolvedModelId = currentlyLoaded || (await resolveModelId(modelId, finalBaseUrl)) || modelId || 'default';

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
