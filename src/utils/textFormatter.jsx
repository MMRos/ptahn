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
 * Parses inline typographical tokens:
 * - Highlights: ==term== (interactive tag/compendium card link)
 * - Bold: **text**
 * - Inner Thoughts: ~thought~
 * - Spoken Dialogue: "dialogue"
 * 
 * @param {string} rawText 
 * @param {Function} [onTagClick] 
 * @param {Object} [appData] 
 * @returns {React.ReactNode}
 */
export function renderInlineFormattedText(rawText, onTagClick, appData) {
  if (!rawText) return null;
  const innerRegex = /(==[^=\n]+==|\*\*[^*\n]+\*\*|~[^~\n]+~|"[^"\n]+")/g;
  const innerParts = rawText.split(innerRegex);

  return innerParts.map((sub, j) => {
    if (!sub) return null;
    if (sub.startsWith('==') && sub.endsWith('==') && sub.length >= 4) {
      const tagContent = sub.slice(2, -2).trim();
      const existing = (appData?.cards || []).find(c => (c.title || c.name || '').toLowerCase() === tagContent.toLowerCase()) ||
                       (appData?.scenarios || []).find(s => (s.title || '').toLowerCase() === tagContent.toLowerCase());
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
    if (sub.startsWith('**') && sub.endsWith('**') && sub.length >= 4) {
      return <strong key={j} className="msg-bold">{sub.slice(2, -2)}</strong>;
    }
    if (sub.startsWith('~') && sub.endsWith('~') && sub.length >= 2) {
      return (
        <span key={j} className="msg-thought">
          <FontAwesomeIcon icon={faBrain} className="msg-type-icon thought-icon" />
          {sub.slice(1, -1)}
        </span>
      );
    }
    if (sub.startsWith('"') && sub.endsWith('"') && sub.length >= 2) {
      return (
        <span key={j} className="msg-dialogue">
          <FontAwesomeIcon icon={faCommentDots} className="msg-type-icon dialogue-icon" />
          {sub}
        </span>
      );
    }
    return sub;
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

  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|"[^"]+"|~[^~]+~|==[^=]+==)/g;
  const parts = cleanText ? cleanText.split(regex) : [];
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
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={i} className="msg-bold">{renderInlineFormattedText(part.slice(2, -2), onTagClick, appData)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return (
            <em key={i} className="msg-action">
              <FontAwesomeIcon icon={faRunning} className="msg-type-icon action-icon" />
              {renderInlineFormattedText(part.slice(1, -1), onTagClick, appData)}
            </em>
          );
        }
        if (part.startsWith('"') && part.endsWith('"') && part.length >= 2) {
          return (
            <span key={i} className="msg-dialogue">
              <FontAwesomeIcon icon={faCommentDots} className="msg-type-icon dialogue-icon" />
              {renderInlineFormattedText(part, onTagClick, appData)}
            </span>
          );
        }
        if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
          const tagContent = part.slice(2, -2).trim();
          const existing = (appData?.cards || []).find(c => (c.title || c.name || '').toLowerCase() === tagContent.toLowerCase()) ||
                           (appData?.scenarios || []).find(s => (s.title || '').toLowerCase() === tagContent.toLowerCase());
          return (
            <mark 
              key={i} 
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
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={i} className="msg-bold">{renderInlineFormattedText(part.slice(2, -2), onTagClick, appData)}</strong>;
        }
        if (part.startsWith('~') && part.endsWith('~') && part.length >= 2) {
          return (
            <span key={i} className="msg-thought">
              <FontAwesomeIcon icon={faBrain} className="msg-type-icon thought-icon" />
              {renderInlineFormattedText(part.slice(1, -1), onTagClick, appData)}
            </span>
          );
        }
        return <React.Fragment key={i}>{renderInlineFormattedText(part, onTagClick, appData)}</React.Fragment>;
      })}
    </span>
  );
}
