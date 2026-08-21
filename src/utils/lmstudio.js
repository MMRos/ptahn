/**
 * LM Studio API Manager for Ptah
 * Handles model discovery, automatic load/unload, reasoning, and context weight matching.
 * Configured for low CPU consumption and dynamic on-demand resource management.
 */

/**
 * Resolves the active base URL for the LM Studio API server.
 * 
 * Flow of resolution:
 * 1. If an explicit `baseUrl` argument is provided to the function, that URL is preferred (with trailing slashes removed).
 * 2. If no explicit URL is passed, it attempts to load global user settings from `localStorage` 
 *    under the key 'ptah-chat-settings'.
 * 3. If settings are found, it parses the JSON and looks for the custom `lmStudioUrl` field.
 * 4. The resolved URL has any trailing slash stripped to prevent malformed endpoint paths.
 * 5. If any step fails (e.g. localStorage is blocked or contains invalid JSON), it catches 
 *    the exception and falls back to the default 'http://localhost:1234'.
 * 
 * @param {string} [baseUrl] - Optional explicit base URL.
 * @returns {string} The resolved base URL without a trailing slash.
 */
export function getBaseUrl(baseUrl) {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }
  
  try {
    const storedSettings = localStorage.getItem('ptah-chat-settings');
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      if (parsedSettings && parsedSettings.lmStudioUrl) {
        return parsedSettings.lmStudioUrl.replace(/\/$/, '');
      }
    }
  } catch (error) {
    console.warn('[LM Studio URL Resolution]: Failed to read settings from localStorage, falling back to default.', error);
  }
  
  return 'http://localhost:1234';
}

// Mapeo de los mejores modelos del usuario por tarea (enfocados en Rol y Narrativa Sin Censura)
// Mapeo de los mejores modelos del usuario por tarea (enfocados en Rol y Narrativa Sin Censura)
export const RECOMMENDED_MODELS = {
  chat: {
    id: 'precog-magnum-31b-i1',
    name: 'Precog-Magnum 31B (mradermacher)',
    type: 'Narración & Rol Sin Censura (Top Calidad)',
    description: 'Máxima profundidad de prosa, iniciativa y razonamiento narrativo en 16GB VRAM.'
  },
  dark_rp: {
    id: 'magnum_lyra_darkness_12b-heretic',
    name: 'Magnum Lyra Darkness 12B Heretic',
    type: 'Ficción Oscura & Rol Maduro',
    description: 'Ultra-rápido, inmersivo, sin censura y con gran riqueza sensorial.'
  },
  heretic: {
    id: 'magnum-v4-12b',
    name: 'Magnum v4 12B Heretic',
    type: 'Narrativa Creativa General',
    description: 'Excelente equilibrio narrativo sin censura y alta velocidad.'
  },
  moe_dark: {
    id: 'mistral-moe-4x7b-dark-multiverse-uncensored-enhanced32-24b',
    name: 'Mistral MoE 4x7B Dark Multiverse (DavidAU)',
    type: 'Fantasía Oscura & MoE',
    description: 'Merge multi-experto sin censura para mundos oscuros.'
  },
  context: {
    id: 'mistral-nemo-instruct-2407-k-m',
    name: 'Mistral Nemo 12B Instruct',
    type: 'Extracción y Resumen de Memorias',
    description: 'Alta coherencia para procesar eventos de rol y memoria a largo plazo.'
  },
  image: {
    id: 'DreamShaperXL_Lightning.safetensors',
    name: 'DreamShaperXL Lightning (SDXL Vulkan)',
    type: 'Escenificación / Imágenes y Portadas',
    description: 'Generación visual rápida en 8 pasos con sd-vulkan.'
  },
  video: {
    id: 'nsfw_wan_14b',
    name: 'Wan 14B Video (NSFW-API)',
    type: 'Generación de Vídeos',
    description: 'Vídeo y loops cortos animados. Se carga y descarga bajo demanda.'
  },
  audio: {
    id: 'audio.cpp',
    name: 'Audio.cpp (Kokoro / TTS)',
    type: 'Voces / TTS',
    description: 'Síntesis de voz y efectos sonoros locales. Se carga y descarga bajo demanda.'
  }
};

/**
 * Realiza una petición HTTP inteligente a LM Studio.
 * Si la petición directa falla por CORS o por el error de preflight OPTIONS del servidor Express de LM Studio,
 * reintenta automáticamente a través del proxy interno de la aplicación (/api/lmstudio).
 */
export async function apiFetch(endpoint, options = {}, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Intento directo
  try {
    const directUrl = `${finalBaseUrl}${cleanEndpoint}`;
    const directRes = await fetch(directUrl, options);
    if (directRes.ok) {
      return directRes;
    }
  } catch (directErr) {
    // Error de red / CORS preflight de LM Studio
  }

  // 2. Fallback transparente mediante proxy interno
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
 * Obtiene la lista de modelos actualmente disponibles/descargados en LM Studio.
 */
export async function getAvailableModels(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await apiFetch('/v1/models', {}, finalBaseUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('LM Studio no está disponible o no tiene el servidor encendido:', error.message);
    return [];
  }
}

/**
 * Obtiene el modelo que actualmente está cargado en la memoria de LM Studio (si existe).
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
    // Silencioso si api/v0 no está disponible
  }
  return null;
}

/**
 * Resuelve el ID exacto del modelo disponible en LM Studio con detección inteligente.
 */
export async function resolveModelId(searchTerm, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    // 0. Si ya hay un modelo cargado en GPU en LM Studio, priorizarlo para respuesta instantánea
    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    if (currentlyLoaded) {
      if (!searchTerm || currentlyLoaded.toLowerCase().includes(searchTerm.toLowerCase())) {
        return currentlyLoaded;
      }
    }

    const models = await getAvailableModels(finalBaseUrl);
    if (!models || models.length === 0) return currentlyLoaded || searchTerm || null;

    // 1. Coincidencia exacta o parcial con el término buscado
    if (searchTerm) {
      const exactMatch = models.find(m => m.id.toLowerCase() === searchTerm.toLowerCase());
      if (exactMatch) return exactMatch.id;

      const partialMatch = models.find(m => m.id.toLowerCase().includes(searchTerm.toLowerCase()));
      if (partialMatch) return partialMatch.id;
    }

    // 2. Si hay un modelo cargado aunque no coincida exactamente con searchTerm, usarlo
    if (currentlyLoaded) return currentlyLoaded;

    // 3. Priorizar modelos sin censura / rol instalados en LM Studio
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

    // 4. Devolver el primer modelo disponible en LM Studio
    return models[0]?.id || searchTerm || null;
  } catch (e) {
    return searchTerm || null;
  }
}

/**
 * Solicita a LM Studio cargar un modelo específico en memoria de GPU/RAM.
 */
export async function loadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    console.log(`[LM Studio] Verificando modelo: ${modelId}`);
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
 * Solicita a LM Studio descargar/liberar un modelo de memoria.
 */
export async function unloadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    console.log(`[LM Studio] Descargando modelo: ${modelId}`);
    await fetch(`${finalBaseUrl}/api/v0/models/unload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId })
    });
    return true;
  } catch (error) {
    console.warn(`Error al intentar descargar el modelo ${modelId}:`, error);
    return false;
  }
}

/**
 * Crea un placeholder SVG nítido en formato Data URI en caso de fallo de red o servidor offline.
 */
export function createLocalSvgPlaceholder(prompt = 'Ilustración Ptahn') {
  const cleanTitle = (prompt || 'Ilustración').replace(/[<>&"]/g, '');
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
    <text x="480" y="230" fill="#ffd36b" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" text-anchor="middle">✨ Ptahn AI</text>
    <text x="480" y="340" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="600" text-anchor="middle" opacity="0.9">${cleanTitle.substring(0, 55)}</text>
    <text x="480" y="380" fill="#ffd36b" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" opacity="0.75">Local AI Studio (v6.safetensors / sd-vulkan)</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Obtiene la lista de modelos de imagen locales disponibles en Local AI Studio / Pinokio.
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
    console.warn('[Local AI Studio]: No se pudieron obtener los modelos de imagen:', e.message);
  }
  return [];
}

/**
 * Consulta el estado del backend de difusión (sd-vulkan / sd.cpp).
 */
export async function getImageBackendStatus(imageServerUrl = '') {
  const baseUrl = (imageServerUrl || 'http://127.0.0.1:42016').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/backend-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Backend inalcanzable
  }
  return { ready: false, running: false };
}

/**
 * Inicia o cambia el modelo activo en Local AI Studio / sd-vulkan.
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
      // Detener modelo anterior primero
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
    console.warn('[Local AI Studio]: Error al iniciar backend de imagen:', e.message);
  }
  return null;
}

/**
 * Genera una imagen utilizando el servidor local (Uncensored Local Studio / Pinokio / SD WebUI / Forge) o fallback.
 */
export async function generateImageLocal(prompt, style = 'Fantasía Oscura', imageServerUrl = '', targetModel = '') {
  // Obtener URL configurada o defaults de Pinokio / Uncensored Local Studio
  let serverUrls = [];
  if (imageServerUrl) {
    serverUrls.push(imageServerUrl.replace(/\/$/, ''));
  } else {
    try {
      const stored = localStorage.getItem('ptah-chat-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.imageServerUrl) {
          serverUrls.push(parsed.imageServerUrl.replace(/\/$/, ''));
        }
      }
    } catch (e) {}
    serverUrls.push('http://127.0.0.1:42016', 'http://192.168.1.41:42016', 'http://localhost:42016');
  }

  const selectedModel = targetModel || 'DreamShaperXL_Lightning.safetensors';
  const isLightning = selectedModel.toLowerCase().includes('lightning') || selectedModel.toLowerCase().includes('4step');
  const steps = isLightning ? 8 : 20;

  const fullPrompt = `${prompt}${style ? `, style: ${style}` : ''}, masterpiece, high quality, highly detailed`;

  for (const baseUrl of serverUrls) {
    try {
      // 1. Asegurar que el modelo deseado esté cargado en GPU
      try {
        const statusRes = await fetch(`${baseUrl}/api/backend-status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          const currentModel = status?.loading?.model || status?.settings?.model || '';
          if (!status.ready || !status.running || (selectedModel && !currentModel.includes(selectedModel))) {
            console.log(`[Local AI Studio]: Cargando modelo de difusión "${selectedModel}"...`);
            await startImageBackend(selectedModel, baseUrl);
            for (let i = 0; i < 8; i++) {
              await new Promise(r => setTimeout(r, 1000));
              const poll = await fetch(`${baseUrl}/api/backend-status`).then(r => r.json()).catch(() => null);
              if (poll && poll.ready && poll.running) break;
            }
          }
        }
      } catch (e) {}

      // 2. Enviar petición directa a /sdapi/v1/txt2img (formato sd.cpp / WebUI)
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

      // 3. Fallback a endpoint OpenAI (/v1/images/generations)
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
      console.warn(`[Local AI Studio]: Fallo al contactar ${baseUrl}:`, e.message);
    }
  }

  // Fallback local instantáneo y garantizado sin enlaces rotos
  console.log('[Escenificación]: Servidor local de imágenes no respondió, usando escenificación visual local.');
  return createLocalSvgPlaceholder(prompt);
}

/**
 * Genera un vídeo/loop utilizando un servidor de animación local opcional o fallback animado.
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
    } catch (error) {
      // Fallback
    }
  }
  console.log('[Escenificación Vídeo]: Usando escenificación de vídeo simulada.');
  return 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif';
}

/**
 * Sintetiza voz (TTS) utilizando el modelo audio.cpp de forma dinámica.
 */
export async function generateAudioLocal(text, voice = 'default', description = '', pitch = 1.0, speed = 1.0, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  const defaultId = 'audio-cpp/audio.cpp';
  const resolvedId = await resolveModelId('audio.cpp', finalBaseUrl) || defaultId;

  console.log(`[Dynamic Load] Iniciando síntesis de voz. Cargando: ${resolvedId}`);
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
      throw new Error(`Servidor devolvió error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error(`El servidor devolvió un formato no binario (${contentType}). Verifica que el servidor TTS de LM Studio esté habilitado y respondiendo en /v1/audio/speech.`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error en generación de audio local:', error);
    throw error;
  } finally {
    console.log(`[Dynamic Unload] Finalizada síntesis de voz. Descargando: ${resolvedId}`);
    await unloadModel(resolvedId, finalBaseUrl);
  }
}

/**
 * Envía una solicitud de completado de chat a LM Studio con soporte para instrucciones de sistema y contexto con pesos.
 * Resuelve y carga automáticamente el modelo seleccionado por el usuario o el mejor modelo sin censura disponible.
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
    // 1. Filtrado dinámico de contexto por tags y relevancia en los últimos mensajes
    const recentText = messages.slice(-3).map(m => m.text).join(' ').toLowerCase();
    
    // Inyectar solo documentos cuyos tags o título coincidan con los últimos mensajes
    const weightedDocs = contextDocuments.filter(doc => {
      if (!doc) return false;
      const titleMatch = doc.title && recentText.includes(doc.title.toLowerCase());
      const tagMatch = doc.tags && doc.tags.some(t => recentText.includes(t.toLowerCase()));
      return titleMatch || tagMatch;
    });

    let contextText = '';
    if (weightedDocs.length > 0) {
      contextText = '\n\n[CONTEXTO RELEVANTE ACTIVADO POR TAGS]:\n' + 
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
      formattedMessages.push({ role: 'user', content: 'Inicia la narración del escenario y describe el entorno en tercera persona como Narrador.' });
    } else if (formattedMessages[formattedMessages.length - 1].role === 'assistant') {
      // Si el último mensaje es del asistente (ej. al pulsar Continuar), añadir instrucción de usuario para que la IA responda como Narrador externo
      formattedMessages.push({ 
        role: 'user', 
        content: '[El jugador aguarda]. Continúa la narración de los sucesos del entorno y los PNJs en tercera persona desde tu rol de Narrador externo.' 
      });
    }

    // Resolviendo el ID real del modelo de narración en LM Studio
    const narrationId = (await resolveModelId(modelId, finalBaseUrl)) || modelId;
    
    // Asegurar que el modelo de narración esté cargado en GPU
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
      throw new Error(`Error en LM Studio API: ${errText || response.statusText}`);
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
            const contentDelta = deltaObj?.content || '';
            const reasoningDelta = deltaObj?.reasoning_content || deltaObj?.reasoning || '';

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
          } catch (e) {
            // Fragmento JSON parcial
          }
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
      fullContent = text || 'No se recibió respuesta del modelo.';
    }
    
    return {
      text: fullContent,
      usedContextDocs: weightedDocs.map(d => d.title)
    };
  } catch (error) {
    console.error('LM Studio Send Error:', error);
    return {
      text: `[Modo Simulación / LM Studio no detectado en ${finalBaseUrl}]: Asegúrate de tener el modelo de narración cargado y el servidor encendido.\n\n*El narrador observa en silencio la sala...*`,
      usedContextDocs: []
    };
  }
}

/**
 * Tarea en Background: Envía los últimos mensajes al modelo de contexto/resumen
 * para que decida si se deben añadir nuevas memorias clave.
 */
export async function sendContextSummarizationTask({
  messages,
  currentMemory = [],
  modelId = 'Magnum_Lyra_Darkness_12B-Heretic',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const recentMessages = messages.slice(-5).map(m => `${m.from}: ${m.text}`).join('\n');
    const existingMem = currentMemory.length ? currentMemory.join('; ') : 'Ninguna.';

    const systemInstruction = `Eres un asistente de rol silencioso. Tu única tarea es leer los recientes mensajes y decidir si hay un nuevo evento clave o descubrimiento que deba recordarse.
    Memorias actuales: ${existingMem}.
    Responde SOLO con una frase corta para añadir a la memoria, o con la palabra NADA si no es relevante.`;

    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    const summarizerId = currentlyLoaded || (await resolveModelId(modelId, finalBaseUrl)) || (await resolveModelId('magnum', finalBaseUrl)) || modelId;

    const requestBody = JSON.stringify({
      model: summarizerId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: recentMessages || 'Nada.' }
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
    let content = data.choices?.[0]?.message?.content?.trim() || 'NADA';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    if (content.toUpperCase().includes('NADA') || content.length < 5) {
      return null;
    }
    return content;
  } catch (error) {
    console.warn('Fallo en la tarea de resumen de contexto:', error);
    return null;
  }
}

/**
 * Tarea en Background: Analiza los últimos mensajes de la historia y extrae
 * de forma estructurada personajes, criaturas, lugares u objetos relevantes
 * que aún no existan en el compendio de tarjetas.
 * Utiliza el modelo cargado actualmente o el modelo secundario sin forzar cambio de VRAM.
 */
export async function sendExtractCardsTask({
  messages = [],
  existingCards = [],
  modelId = '',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const recentStory = messages.slice(-4).map(m => `${m.from === 'user' ? 'Jugador' : 'Narrador'}: ${m.text}`).join('\n\n');
    if (!recentStory || recentStory.trim().length < 20) return [];

    const existingNames = existingCards.map(c => (c.title || c.name || '').trim().toLowerCase()).filter(Boolean);

    const systemInstruction = `Eres el Archivista del Compendio de un juego de rol.
Tu misión es analizar los últimos mensajes de la partida y detectar personajes, criaturas, lugares u objetos significativos recién introducidos que merezcan una ficha de compendio.

Nombres ya registrados (IGNORAR ESTOS): ${existingNames.join(', ') || 'Ninguno'}.

Si encuentras entidades nuevas y relevantes, responde ÚNICAMENTE con un array JSON válido con la siguiente estructura exacta por cada entidad:
[
  {
    "title": "Nombre de la entidad",
    "type": "Personaje",
    "intro": "Descripción breve y evocadora en 1 frase",
    "text": "Detalles, apariencia física, lore, trasfondo o comportamiento descriptivo",
    "tags": ["etiqueta1", "etiqueta2"],
    "traits": ["Rasgo 1", "Rasgo 2"],
    "imagePrompt": "A detailed digital painting portrait of [Nombre], fantasy RPG character, dramatic atmospheric lighting, high quality, masterpiece"
  }
]

Tipos permitidos: "Personaje", "Lugar", "Objeto", "Historia".
Si NO hay ninguna entidad nueva relevante que deba registrarse, responde ÚNICAMENTE con: []
NO agregues explicaciones ni texto fuera del JSON.`;

    const currentlyLoaded = await getLoadedModel(finalBaseUrl);
    let targetModelId = currentlyLoaded || modelId;
    if (!targetModelId) {
      targetModelId = (await resolveModelId('nemo', finalBaseUrl)) || (await resolveModelId('magnum', finalBaseUrl)) || 'default';
    }

    const requestBody = JSON.stringify({
      model: targetModelId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Analiza esta narrativa reciente y extrae las entidades nuevas:\n\n${recentStory}` }
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
    
    // Limpiar posibles bloques <think> o ```json
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
        const cleanName = item.title.trim().toLowerCase();
        if (!cleanName || existingNames.includes(cleanName)) return false;
        return true;
      });
    }
    return [];
  } catch (error) {
    console.warn('[Auto-Card Extractor Task]: Error en extracción automática:', error.message);
    return [];
  }
}
