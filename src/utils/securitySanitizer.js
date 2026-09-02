/**
 * securitySanitizer.js
 * Utilidades centralizadas de seguridad y saneamiento de inputs para Ptahn.
 * Protege contra XSS, Path Traversal, Esquemas Peligrosos y Prototype Pollution.
 */

// Protocolos permitidos para URLs multimedia y enlaces
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_DATA_IMAGE_MIMES = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i;

/**
 * Sanea y valida una URL de imagen o recurso.
 * Rechaza esquemas maliciosos como javascript:, vbscript:, data:text/html, file://
 * @param {string} url
 * @returns {string} URL limpia o cadena vacía si es peligrosa
 */
export function sanitizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Permitir data URLs válidas exclusivamente de tipo imagen
  if (trimmed.startsWith('data:')) {
    return ALLOWED_DATA_IMAGE_MIMES.test(trimmed) ? trimmed : '';
  }

  // Permitir rutas relativas de assets del proyecto (/assets/..., ./assets/...)
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    // Bloquear intentos de path traversal
    if (trimmed.includes('../') || trimmed.includes('..\\') || trimmed.includes('%2e%2e')) {
      return '';
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    // Si no es URL absoluta válida ni ruta relativa segura, descartar
    return '';
  }

  return '';
}

/**
 * Sanea texto de usuario eliminando caracteres de control nulos y etiquetas de script directas.
 * @param {string} text
 * @param {number} maxLength Límite máximo de longitud opcional
 * @returns {string} Texto seguro
 */
export function sanitizeText(text, maxLength = 100000) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  // Eliminar bytes nulos y caracteres de control no imprimibles (excepto saltos de línea y tabuladores)
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Truncar si excede la longitud máxima para prevenir ReDoS y sobrecarga de memoria
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }

  return clean;
}

/**
 * Sanea un nombre de archivo para prevenir Path Traversal y caracteres prohibidos en el sistema operativo.
 * @param {string} filename
 * @returns {string} Nombre de archivo saneado
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  let clean = filename.trim();

  // Eliminar bytes nulos y secuencias de escape
  clean = clean.replace(/\0/g, '');

  // Reemplazar separadores de directorio y secuencias traversal
  clean = clean.replace(/(\.\.[\/\\])+/g, '').replace(/[\/\\]/g, '_');

  // Eliminar caracteres ilegales en Windows/Linux: < > : " / \ | ? *
  clean = clean.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Prevenir nombres vacíos o solo puntos
  clean = clean.replace(/^\.+$/, '');

  return clean.trim();
}

/**
 * Parser JSON seguro con protección contra Prototype Pollution.
 * Descarta claves peligrosas (__proto__, constructor, prototype) en el proceso de deserialización.
 * @param {string} jsonString
 * @param {*} fallback Valor por defecto en caso de error
 * @returns {*} Objeto parseado seguro o fallback
 */
export function safeJsonParse(jsonString, fallback = null) {
  if (!jsonString || typeof jsonString !== 'string') return fallback;

  try {
    return JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // Descartar claves que contaminan el prototipo
      }
      return value;
    });
  } catch {
    return fallback;
  }
}

/**
 * Valida y sanea un array de etiquetas (tags).
 * - Elimina etiquetas vacías o duplicadas
 * - Limita longitud por tag y total de tags
 * @param {Array<string>} tags
 * @param {number} maxTags
 * @param {number} maxTagLength
 * @returns {Array<string>}
 */
export function sanitizeTags(tags, maxTags = 10, maxTagLength = 50) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  const result = [];

  for (const item of tags) {
    if (typeof item !== 'string') continue;
    const clean = sanitizeText(item, maxTagLength).trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;

    seen.add(clean.toLowerCase());
    result.push(clean);

    if (result.length >= maxTags) break;
  }

  return result;
}
