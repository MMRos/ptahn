import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRunning, 
  faBrain, 
  faCommentDots, 
  faBookOpen,
  faHighlighter
} from '@fortawesome/free-solid-svg-icons';

/**
 * Normaliza nombres de entidades para búsquedas insensibles a mayúsculas,
 * acentos y artículos iniciales comunes (el, la, los, las, the, a, an, un, una).
 * 
 * @param {string} str 
 * @returns {string}
 */
export function normalizeEntityName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*(el|la|los|las|the|a|an|un|una|unos|unas)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Busca si un término marcado coincide con una entidad del compendio o escenario.
 * 
 * @param {string} query - Término extraído de ==término==
 * @param {Object|Array} appDataOrCards - Datos del compendio (objeto con .cards / .scenarios o array de tarjetas)
 * @returns {Object|null} Entidad encontrada o null
 */
export function findMatchingEntity(query, appDataOrCards) {
  if (!query || typeof query !== 'string' || !appDataOrCards) return null;

  let pool = [];
  if (Array.isArray(appDataOrCards)) {
    pool = appDataOrCards;
  } else if (typeof appDataOrCards === 'object') {
    const cards = Array.isArray(appDataOrCards.cards) ? appDataOrCards.cards : [];
    const scenarios = Array.isArray(appDataOrCards.scenarios) ? appDataOrCards.scenarios : [];
    pool = [...cards, ...scenarios];
  }

  if (pool.length === 0) return null;

  const normQuery = normalizeEntityName(query);
  if (!normQuery) return null;

  // 1. Coincidencia exacta normalizada
  const exact = pool.find(item => {
    const title = item.title || item.name || '';
    return normalizeEntityName(title) === normQuery;
  });
  if (exact) return exact;

  // 2. Coincidencia con alias / callWords
  const aliasMatch = pool.find(item => {
    if (!item.callWords) return false;
    const words = Array.isArray(item.callWords) 
      ? item.callWords 
      : String(item.callWords).split(',').map(s => s.trim());
    return words.some(w => normalizeEntityName(w) === normQuery);
  });
  if (aliasMatch) return aliasMatch;

  // 3. Coincidencia por palabra principal o prefijo de longitud significativa
  if (normQuery.length >= 4) {
    const wordMatch = pool.find(item => {
      const title = item.title || item.name || '';
      const normTitle = normalizeEntityName(title);
      if (!normTitle) return false;
      const titleWords = (item.title || item.name || '').toLowerCase().split(/\s+/).map(w => normalizeEntityName(w));
      if (titleWords.includes(normQuery)) return true;
      if (normQuery.length >= 4 && normTitle.startsWith(normQuery)) return true;
      if (normTitle.length >= 4 && normQuery.startsWith(normTitle)) return true;
      return false;
    });
    if (wordMatch) return wordMatch;
  }

  return null;
}

/**
 * Sanitiza y limpia tokens tipográficos conflictivos:
 * - Corrige `*"diálogo"*` o `"*diálogo*"` -> `"diálogo"`
 * - Corrige `*~pensamiento~*` o `~*pensamiento*~` -> `~pensamiento~`
 * - Elimina asteriscos sobrantes en comillas de diálogo
 * 
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeTypography(text) {
  if (!text || typeof text !== 'string') return '';

  // 1. Desarmar comillas erróneas que envuelven párrafos completos de narración/entorno:
  const cleanedLines = text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Caso A: El párrafo empieza con comilla de bloque pero no se cierra y es claramente narración en 3ra persona
    // ej: "El lobo gris se detiene a unos pasos...
    if (trimmed.startsWith('"') && !trimmed.slice(1).includes('"')) {
      const inner = trimmed.slice(1).trim();
      const isDescriptiveNarrative = /^(el|la|los|las|un|una|unos|unas|tu|tus|su|sus|con|sin|al|mientras|de pronto|de repente|oyes|sientes|ves|estás|un pájaro|el lobo|el viento|la noche|el día|en el|en la)\b/i.test(inner);
      if (isDescriptiveNarrative && inner.length > 25) {
        return line.replace(/^(\s*)"/, '$1');
      }
    }

    // Caso B: El párrafo completo está envuelto en comillas de bloque: ^"(.*)"$
    // pero describe al entorno o acciones narrativas (no es una línea de diálogo hablada)
    // ej: "El viento sopla fuerte en el claro, y las hojas susurran..."
    const fullQuoteMatch = trimmed.match(/^"([^"]+)"$/);
    if (fullQuoteMatch) {
      const inner = fullQuoteMatch[1].trim();
      const isDescriptiveNarrative = /^(el|la|los|las|un|una|unos|unas|tu|tus|su|sus|con|sin|al|mientras|de pronto|de repente|oyes|sientes|ves|estás|un pájaro|el lobo|el viento|la noche|el día|en el|en la)\b/i.test(inner);
      if (isDescriptiveNarrative && inner.length > 35) {
        return line.replace(/^(\s*)"([^"]+)"(\s*)$/, '$1$2$3');
      }
    }

    return line;
  });

  const narrativeCleaned = cleanedLines.join('\n');

  return narrativeCleaned
    // 1. Corregir comillas envueltas en asteriscos: *"Hola"* -> "Hola"
    .replace(/\*+"([^"\n]+)"\*+/g, '"$1"')
    // 2. Corregir asteriscos dentro de comillas: "*Hola*" -> "Hola"
    .replace(/"\*+([^*"\n]+)\*+"/g, '"$1"')
    // 3. Corregir pensamientos envueltos en asteriscos: *~Pensamiento~* -> ~Pensamiento~
    .replace(/\*+~([^~\n]+)~\*+/g, '~$1~')
    // 4. Corregir asteriscos dentro de tildes: ~*Pensamiento*~ -> ~Pensamiento~
    .replace(/~\*+([^*~\n]+)\*+~/g, '~$1~')
    // 5. Corregir comillas envueltas en tildes: ~"Diálogo"~ -> "Diálogo"
    .replace(/~+"([^"\n]+)"+~/g, '"$1"')
    // 6. Corregir tildes dentro de comillas: "~Diálogo~" -> "~Diálogo~"
    .replace(/"~+([^~"\n]+)~+"/g, '~$1~')
    // 7. Limpiar cualquier `"*palabra` o `palabra*"` residual
    .replace(/"\*+([^*"\n]+)/g, '"$1')
    .replace(/([^*"\n]+)\*+"/g, '$1"');
}

/**
 * Renderiza sub-tokens anidados (marcas de compendio ==término== y **negrita**)
 * dentro de bloques de acción, diálogo, pensamiento o texto general.
 * 
 * @param {string} content 
 * @param {Function} [onTagClick] 
 * @param {Object} [appData] 
 * @param {string} parentKey 
 * @returns {React.ReactNode}
 */
export function renderNestedSubTokens(content, onTagClick, appData, parentKey = 'nested') {
  if (!content) return null;
  const regex = /(==[^=\n]+==|\*\*[^*\n]+\*\*)/g;
  const parts = content.split(regex);

  return parts.map((sub, k) => {
    if (!sub) return null;

    // Etiqueta Interactiva / Compendio: ==término==
    if (sub.startsWith('==') && sub.endsWith('==') && sub.length >= 4) {
      const tagContent = sub.slice(2, -2).trim();
      const existing = findMatchingEntity(tagContent, appData);
      return (
        <mark 
          key={`${parentKey}-tag-${k}`} 
          className={`msg-highlight ${existing ? 'existing-card' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onTagClick) onTagClick(tagContent, existing);
          }}
          title={existing 
            ? `🏷️ Entidad existente: ${existing.title || existing.name} (${existing.type || 'Escenario'}). Clic para inspeccionar.` 
            : `✨ Término clave: "${tagContent}". Clic para inspeccionar o crear tarjeta en el compendio.`
          }
        >
          <FontAwesomeIcon icon={existing ? faBookOpen : faHighlighter} className="msg-type-icon highlight-icon" />
          {tagContent}
        </mark>
      );
    }

    // Negrita anidada: **texto**
    if (sub.startsWith('**') && sub.endsWith('**') && sub.length >= 4) {
      return <strong key={`${parentKey}-bold-${k}`} className="msg-bold">{sub.slice(2, -2)}</strong>;
    }

    return sub;
  });
}

/**
 * Parsea y formatea tokens tipográficos principales y anidados:
 * - Resaltados: ==término== (etiqueta interactiva / vínculo al compendio)
 * - Acciones: *acción* (narrativa en tercera persona / acotación) con soporte anidado de ==término==
 * - Negrita: **texto**
 * - Pensamientos: ~pensamiento~ (monólogo interno silencioso)
 * - Diálogos: "diálogo" (discurso hablado en voz alta) con soporte anidado de ==término==
 * 
 * @param {string} rawText 
 * @param {Function} [onTagClick] 
 * @param {Object} [appData] 
 * @returns {React.ReactNode}
 */
export function renderInlineFormattedText(rawText, onTagClick, appData) {
  if (!rawText) return null;
  const sanitized = sanitizeTypography(rawText);
  // Captura negrita (**...**), acciones (*...*), diálogos ("..."), pensamientos (~...~), tags (==...==)
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+(?:"|$)|~[^~\n]+(?:~|$)|==[^=\n]+(?:==|$))/g;
  const parts = sanitized.split(regex);

  return parts.map((part, j) => {
    if (!part) return null;

    // Negrita: **texto**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={j} className="msg-bold">
          {renderNestedSubTokens(boldText, onTagClick, appData, `b-${j}`)}
        </strong>
      );
    }

    // Acción: *acción narrativa* (con soporte de ==término== y **negrita** anidados)
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const actionText = part.slice(1, -1).trim();
      return (
        <em key={j} className="msg-action">
          <FontAwesomeIcon icon={faRunning} className="msg-type-icon action-icon" />
          {renderNestedSubTokens(actionText, onTagClick, appData, `act-${j}`)}
        </em>
      );
    }

    // Diálogo: "discurso hablado" (con soporte de ==término== y **negrita** anidados)
    if (part.startsWith('"') && part.length >= 2) {
      let rawInner = part.endsWith('"') ? part.slice(1, -1) : part.slice(1);
      rawInner = rawInner.replace(/^[*~]+|[*~]+$/g, '').trim();
      return (
        <span key={j} className="msg-dialogue">
          <FontAwesomeIcon icon={faCommentDots} className="msg-type-icon dialogue-icon" />
          {'"'}
          {renderNestedSubTokens(rawInner, onTagClick, appData, `dia-${j}`)}
          {part.endsWith('"') ? '"' : ''}
        </span>
      );
    }

    // Pensamiento: ~pensamiento~
    if (part.startsWith('~') && part.length >= 2) {
      const thoughtText = (part.endsWith('~') ? part.slice(1, -1) : part.slice(1)).trim();
      if (thoughtText.length > 200) {
        return (
          <span key={j} className="msg-prose">
            {renderNestedSubTokens(thoughtText, onTagClick, appData, `prose-${j}`)}
          </span>
        );
      }
      return (
        <span key={j} className="msg-thought">
          <FontAwesomeIcon icon={faBrain} className="msg-type-icon thought-icon" />
          {renderNestedSubTokens(thoughtText, onTagClick, appData, `th-${j}`)}
        </span>
      );
    }

    // Etiqueta suelta: ==término==
    if (part.startsWith('==') && part.length >= 2) {
      const tagContent = part.replace(/^==/, '').replace(/==$/, '').trim();
      const existing = findMatchingEntity(tagContent, appData);
      return (
        <mark 
          key={j} 
          className={`msg-highlight ${existing ? 'existing-card' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onTagClick) onTagClick(tagContent, existing);
          }}
          title={existing 
            ? `🏷️ Entidad existente: ${existing.title || existing.name} (${existing.type || 'Escenario'}). Clic para inspeccionar.` 
            : `✨ Término clave: "${tagContent}". Clic para inspeccionar o crear tarjeta en el compendio.`
          }
        >
          <FontAwesomeIcon icon={existing ? faBookOpen : faHighlighter} className="msg-type-icon highlight-icon" />
          {tagContent}
        </mark>
      );
    }

    // Prosa estándar / texto suelto
    return renderNestedSubTokens(part, onTagClick, appData, `txt-${j}`);
  });
}

/**
 * Message text component supporting model <think> reasoning blocks,
 * actions in italics (*...*), dialogues ("..."), thoughts (~...~), and highlighted tags (==...==).
 */
export function FormattedMessageText({ text, onTagClick, appData }) {
  const [showThinking, setShowThinking] = useState(false);

  if (!text) {
    return (
      <span className="msg-streaming-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.75, fontStyle: 'italic', fontSize: '0.85rem', color: '#ffd36b' }}>
        <FontAwesomeIcon icon={faBrain} className="fa-pulse" /> Esperando respuesta del narrador...
      </span>
    );
  }

  let thinkingContent = null;
  let cleanText = text;
  const isCurrentlyThinking = text.includes('<think>') && !text.includes('</think>');

  const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    cleanText = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/i, '').trim();
  }

  const shouldDisplayThinking = showThinking || isCurrentlyThinking;

  return (
    <span>
      {thinkingContent && (
        <div className="msg-think-box" style={{
          background: 'rgba(192, 132, 252, 0.04)',
          border: isCurrentlyThinking ? '1px dashed #c084fc' : '1px solid rgba(192, 132, 252, 0.2)',
          borderRadius: '6px',
          marginBottom: '10px',
          fontSize: '0.78rem',
          overflow: 'hidden'
        }}>
          <div 
            onClick={() => setShowThinking(prev => !prev)}
            style={{
              cursor: 'pointer',
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              background: 'rgba(192, 132, 252, 0.08)',
              color: '#c084fc'
            }}
            title="Clic para desplegar el razonamiento interno"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <FontAwesomeIcon icon={faBrain} className={isCurrentlyThinking ? 'fa-pulse' : ''} /> 
              {isCurrentlyThinking ? 'Razonando en vivo...' : 'Pensamiento del Narrador'}
            </span>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              {shouldDisplayThinking ? '▲ Ocultar' : '▼ Ver pensamiento'}
            </span>
          </div>
          {shouldDisplayThinking && (
            <div style={{ padding: '8px 12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {thinkingContent}
              {isCurrentlyThinking && <span style={{ opacity: 0.6, color: '#c084fc' }}> ✍️...</span>}
            </div>
          )}
        </div>
      )}
      {cleanText ? renderInlineFormattedText(cleanText, onTagClick, appData) : null}
    </span>
  );
}
