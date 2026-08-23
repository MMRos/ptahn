import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCommentDots, 
  faRunning, 
  faBrain, 
  faHighlighter, 
  faBookOpen 
} from '@fortawesome/free-solid-svg-icons';

/**
 * Normalizes an entity or scenario name for comparison by removing accents, extra whitespace,
 * and common leading articles in Spanish and English (e.g. "La Forja" -> "forja").
 * 
 * @param {string} name 
 * @returns {string}
 */
export function normalizeEntityName(name = '') {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/^(el|la|los|las|un|una|the|a|an)\s+/i, '') // strip leading articles
    .replace(/[^\w\s]/gi, '') // strip punctuation
    .trim();
}

/**
 * Finds a matching entity in appData.cards or appData.scenarios with smart normalized,
 * alias/tag, and word-boundary matching.
 * 
 * @param {string} rawName - The name or tag text to find.
 * @param {object|Array} appData - The appData object or an array of entities.
 * @returns {object|null} The matched card or scenario object.
 */
export function findMatchingEntity(rawName, appData) {
  if (!rawName) return null;
  const cleanQuery = String(rawName).trim().toLowerCase();
  const normQuery = normalizeEntityName(rawName);
  if (!cleanQuery) return null;

  let allItems = [];
  if (Array.isArray(appData)) {
    allItems = appData;
  } else if (appData && typeof appData === 'object') {
    allItems = [...(appData.cards || []), ...(appData.scenarios || [])];
  }
  if (allItems.length === 0) return null;

  // 1. Exact raw title, name or id match
  const exact = allItems.find(item => {
    if (!item) return false;
    const title = (item.title || item.name || '').trim().toLowerCase();
    return title === cleanQuery || item.id === rawName;
  });
  if (exact) return exact;

  // 2. Normalized article-stripped match ("La Forja" === "Forja")
  if (normQuery) {
    const normalizedMatch = allItems.find(item => {
      if (!item) return false;
      const normTitle = normalizeEntityName(item.title || item.name || '');
      return normTitle === normQuery;
    });
    if (normalizedMatch) return normalizedMatch;

    // 3. Tag or Alias exact match
    const tagMatch = allItems.find(item => {
      if (!item) return false;
      if (Array.isArray(item.tags)) {
        return item.tags.some(t => normalizeEntityName(t) === normQuery);
      }
      return false;
    });
    if (tagMatch) return tagMatch;

    // 4. Word boundary / prefix match (e.g. "Garrick" in "Garrick el Herrero" or "Forja" in "La Forja Ancestral")
    const wordMatch = allItems.find(item => {
      if (!item) return false;
      const normTitle = normalizeEntityName(item.title || item.name || '');
      if (!normTitle) return false;
      const titleWords = normTitle.split(/\s+/);
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
 * Parses inline typographical tokens:
 * - Highlights: ==term== (interactive tag/compendium card link)
 * - Actions: *action* (third-person action/narration)
 * - Bold: **text**
 * - Inner Thoughts: ~thought~ (unspoken private mind monologue)
 * - Spoken Dialogue: "dialogue" (vocal spoken speech aloud)
 * 
 * @param {string} rawText 
 * @param {Function} [onTagClick] 
 * @param {Object} [appData] 
 * @returns {React.ReactNode}
 */
export function renderInlineFormattedText(rawText, onTagClick, appData) {
  if (!rawText) return null;
  // Match bold (**...**), actions (*...*), dialogue ("..."), thoughts (~...~), tags (==...==)
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+(?:"|$)|~[^~\n]+(?:~|$)|==[^=\n]+(?:==|$))/g;
  const parts = rawText.split(regex);

  return parts.map((part, j) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={j} className="msg-bold">{part.slice(2, -2)}</strong>;
    }

    // Action: *narrative action*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={j} className="msg-action">
          <FontAwesomeIcon icon={faRunning} className="msg-type-icon action-icon" />
          {part.slice(1, -1)}
        </em>
      );
    }

    // Dialogue: "speech"
    if (part.startsWith('"') && part.length >= 2) {
      const dialogueText = part.endsWith('"') ? part : `${part}"`;
      return (
        <span key={j} className="msg-dialogue">
          <FontAwesomeIcon icon={faCommentDots} className="msg-type-icon dialogue-icon" />
          {dialogueText}
        </span>
      );
    }

    // Thought: ~thought~
    if (part.startsWith('~') && part.length >= 2) {
      const thoughtText = part.endsWith('~') ? part.slice(1, -1) : part.slice(1);
      return (
        <span key={j} className="msg-thought">
          <FontAwesomeIcon icon={faBrain} className="msg-type-icon thought-icon" />
          {thoughtText}
        </span>
      );
    }

    // Interactive Tag: ==term==
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
            ? `📖 Entidad existente: ${existing.title || existing.name} (${existing.type || 'Escenario'}). Clic para inspeccionar.` 
            : `✨ Término clave: "${tagContent}". Clic para inspeccionar o crear tarjeta en el compendio.`
          }
        >
          <FontAwesomeIcon icon={existing ? faBookOpen : faHighlighter} className="msg-type-icon highlight-icon" />
          {tagContent}
        </mark>
      );
    }

    return part;
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
              {shouldDisplayThinking ? '▼ Ocultar' : '▶ Ver pensamiento'}
            </span>
          </div>
          {shouldDisplayThinking && (
            <div style={{ padding: '8px 12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {thinkingContent}
              {isCurrentlyThinking && <span style={{ opacity: 0.6, color: '#c084fc' }}> ▍</span>}
            </div>
          )}
        </div>
      )}
      {cleanText ? renderInlineFormattedText(cleanText, onTagClick, appData) : null}
    </span>
  );
}
