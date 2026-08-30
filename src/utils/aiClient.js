/**
 * aiClient.js
 * Capa unificada de cliente HTTP, gestión de ciclo de vida de modelos locales
 * y registro de eventos para el motor de IA de Ptahn (LM Studio, Local AI Studio, Ollama).
 */

import { loadChatSettings, DEFAULT_CHAT_SETTINGS } from './storage';
import { emitAILog } from './aiLogEmitter';

/**
 * Obtiene la URL base configurada para el motor de IA local.
 */
export function getAIBaseUrl(customUrl = null) {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  try {
    const settings = loadChatSettings() || DEFAULT_CHAT_SETTINGS;
    if (settings.lmStudioUrl && typeof settings.lmStudioUrl === 'string' && settings.lmStudioUrl.trim()) {
      return settings.lmStudioUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    console.warn('[AI Client]: Fallo al leer configuración de URL:', e);
  }
  return 'http://127.0.0.1:1234';
}

/**
 * Función genérica de consulta HTTP con timeout y control de errores.
 */
export async function aiFetch(endpoint, options = {}, baseUrl = null) {
  const rootUrl = getAIBaseUrl(baseUrl);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${rootUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 45000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Lista los modelos disponibles en el servidor local de IA.
 */
export async function fetchAvailableModels(baseUrl = null) {
  try {
    const res = await aiFetch('/v1/models', { method: 'GET', timeoutMs: 4000 }, baseUrl);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || data.data || [];
  } catch (err) {
    console.warn('[AI Client]: Servidor local de IA inaccesible:', err.message);
    return [];
  }
}

/**
 * Resuelve el identificador del modelo principal o recurre al primer modelo disponible.
 */
export async function resolveAIModel(preferredModelId = null, baseUrl = null) {
  if (preferredModelId && typeof preferredModelId === 'string' && preferredModelId.trim()) {
    return preferredModelId.trim();
  }
  const available = await fetchAvailableModels(baseUrl);
  if (available.length > 0) {
    return available[0].id || available[0].name || 'local-model';
  }
  return 'local-model';
}
