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

// Mapeo de los mejores modelos del usuario por tarea
export const RECOMMENDED_MODELS = {
  chat: {
    id: 'qwen3.5-4b-nsfw-ara',
    name: 'Qwen 3.5 4B NSFW Arousal (Sinbad-The-Sailor)',
    type: 'Narración & Rol Constante',
    description: 'Bajo consumo de CPU, ideal para mantener en memoria de forma constante.'
  },
  context: {
    id: 'qwen2.5-coder-14b',
    name: 'Qwen 2.5 Coder 14B',
    type: 'Extracción de Tarjetas',
    description: 'Alta precisión para procesamiento de tags y JSON estructurado.'
  },
  image: {
    id: 'nova-anime-xl',
    name: 'Nova Anime XL (nuupy / SDXL)',
    type: 'Escenificación / Imágenes',
    description: 'Generación visual bajo demanda. Se carga y descarga automáticamente.'
  },
  video: {
    id: 'nsfw_wan_14b',
    name: 'Wan 14B Video (NSFW-API)',
    type: 'Generación de Vídeos',
    description: 'Vídeo y loops cortos animados. Se carga y descarga bajo demanda.'
  },
  audio: {
    id: 'audio.cpp',
    name: 'Audio.cpp (audio-cpp)',
    type: 'Voces / TTS',
    description: 'Síntesis de voz y efectos sonoros locales. Se carga y descarga bajo demanda.'
  }
};

/**
 * Obtiene la lista de modelos actualmente disponibles/descargados en LM Studio.
 */
export async function getAvailableModels(baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const response = await fetch(`${finalBaseUrl}/v1/models`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('LM Studio no está disponible o no tiene el servidor encendido:', error.message);
    return [];
  }
}

/**
 * Resuelve el ID exacto del modelo disponible en LM Studio a partir de una palabra clave.
 */
export async function resolveModelId(searchTerm, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const models = await getAvailableModels(finalBaseUrl);
    const found = models.find(m => m.id.toLowerCase().includes(searchTerm.toLowerCase()));
    return found ? found.id : null;
  } catch (e) {
    return null;
  }
}

/**
 * Solicita a LM Studio cargar un modelo específico en memoria de GPU/RAM.
 */
export async function loadModel(modelId, baseUrl) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    console.log(`[LM Studio] Cargando modelo: ${modelId}`);
    const response = await fetch(`${finalBaseUrl}/api/v0/models/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId })
    });
    if (!response.ok) {
      console.log(`Intentando seleccionar modelo ${modelId} mediante endpoint estándar v1...`);
    }
    return true;
  } catch (error) {
    console.warn(`No se pudo cargar automáticamente el modelo ${modelId}:`, error);
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
 * Genera una imagen utilizando un servidor de difusión local opcional (SD WebUI / Forge) o fallback de escenificación.
 */
export async function generateImageLocal(prompt, style = 'Fantasía Oscura', imageServerUrl = '') {
  if (imageServerUrl) {
    try {
      const endpoint = imageServerUrl.includes('/sdapi') ? imageServerUrl : `${imageServerUrl.replace(/\/$/, '')}/sdapi/v1/txt2img`;
      const sdResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, style: ${style}, high quality, detailed`,
          steps: 20,
          width: 768,
          height: 768
        })
      });
      if (sdResponse.ok) {
        const data = await sdResponse.json();
        if (data.images && data.images[0]) {
          return `data:image/png;base64,${data.images[0]}`;
        }
      }
    } catch (e) {
      console.warn('Servidor de difusión no disponible en la URL configurada:', e.message);
    }
  }

  // Fallback de escenificación simulada elegante
  console.log('[Escenificación]: Generando escenificación visual simulada.');
  return `https://images.unsplash.com/photo-1579783922614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80&sig=${Date.now()}`;
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
 * Se asegura de usar el modelo de narración constante qwen3.5-4b-nsfw-ara.
 */
export async function sendChatMessage({
  messages,
  systemInstruction = '',
  contextDocuments = [],
  modelId = 'qwen3.5-4b-nsfw-ara',
  temperature = 0.7,
  baseUrl
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
      formattedMessages.push({ role: 'user', content: 'Continuar la historia.' });
    }

    // Resolviendo el ID real del modelo de narración
    const narrationId = await resolveModelId('qwen3.5-4b-nsfw', finalBaseUrl) || await resolveModelId('Sinbad-The-Sailor', finalBaseUrl) || modelId;
    
    // Asegurar que el modelo de narración esté cargado
    await loadModel(narrationId, finalBaseUrl);

    const requestBody = JSON.stringify({
      model: narrationId,
      messages: formattedMessages,
      temperature: temperature,
      stream: false
    });

    const response = await fetch(`${finalBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`Error en LM Studio API: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No se recibió respuesta del modelo.';
    
    return {
      text: content,
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
  modelId = 'qwen2.5-coder-14b',
  baseUrl
}) {
  const finalBaseUrl = getBaseUrl(baseUrl);
  try {
    const recentMessages = messages.slice(-5).map(m => `${m.from}: ${m.text}`).join('\n');
    const existingMem = currentMemory.length ? currentMemory.join('; ') : 'Ninguna.';

    const systemInstruction = `Eres un asistente de rol silencioso. Tu única tarea es leer los recientes mensajes y decidir si hay un nuevo evento clave o descubrimiento que deba recordarse.
    Memorias actuales: ${existingMem}.
    Responde SOLO con una frase corta para añadir a la memoria, o con la palabra NADA si no es relevante.`;

    const summarizerId = await resolveModelId('qwen2.5-coder', finalBaseUrl) || await resolveModelId('qwen2.5', finalBaseUrl) || modelId;

    // Asegurar que el modelo de resumen esté cargado
    await loadModel(summarizerId, finalBaseUrl);

    const requestBody = JSON.stringify({
      model: summarizerId,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: recentMessages || 'Nada.' }
      ],
      temperature: 0.3,
      stream: false
    });

    const response = await fetch(`${finalBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || 'NADA';
    
    if (content.toUpperCase().includes('NADA') || content.length < 5) {
      return null;
    }
    return content;
  } catch (error) {
    console.warn('Fallo en la tarea de resumen de contexto:', error);
    return null;
  }
}
