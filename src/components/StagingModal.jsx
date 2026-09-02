import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faImage, 
  faMagic, 
  faTimes, 
  faCheckSquare, 
  faSquare, 
  faUser, 
  faCheckDouble, 
  faEraser,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import './stagingModal.css';

export default function StagingModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  characters = [], 
  onGenerateImage 
}) {
  // Preseleccionar por defecto los últimos 3 mensajes
  const [selectedMsgIndexes, setSelectedMsgIndexes] = useState(() => 
    messages.slice(-3).map((_, idx) => messages.length - 3 + idx).filter(i => i >= 0)
  );
  const [selectedCharIds, setSelectedCharIds] = useState([]);
  const [stylePreset, setStylePreset] = useState('Fantasía Oscura / Entornos');
  const [aspectRatio, setAspectRatio] = useState('landscape'); // 'landscape' (768x512), 'portrait' (512x768), 'square' (512x512)
  const [promptExtra, setPromptExtra] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const toggleMsg = (index) => {
    setSelectedMsgIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleChar = (id) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAllChars = () => {
    setSelectedCharIds(characters.map(c => c.id));
  };

  const handleClearChars = () => {
    setSelectedCharIds([]);
  };

  const handleSelectLastThreeMsgs = () => {
    setSelectedMsgIndexes(messages.slice(-3).map((_, idx) => messages.length - 3 + idx).filter(i => i >= 0));
  };

  const handleSelectAllMsgs = () => {
    setSelectedMsgIndexes(messages.map((_, idx) => idx));
  };

  const handleClearMsgs = () => {
    setSelectedMsgIndexes([]);
  };

  // Calcular dimensiones según la relación de aspecto
  const getDimensions = () => {
    switch (aspectRatio) {
      case 'portrait':
        return { width: 512, height: 768 };
      case 'square':
        return { width: 512, height: 512 };
      case 'landscape':
      default:
        return { width: 768, height: 512 };
    }
  };

  // Construir el prompt compuesto
  const selectedCharsObjects = characters.filter(c => selectedCharIds.includes(c.id));
  const selectedCharsNames = selectedCharsObjects
    .map(c => c.title || c.name)
    .filter(Boolean)
    .join(', ');

  const contextMsgs = selectedMsgIndexes
    .map(i => messages[i]?.text)
    .filter(Boolean)
    .join(' ');

  const composedPrompt = [
    `Escena estilo ${stylePreset}.`,
    selectedCharsNames ? `Personajes presentes: ${selectedCharsNames}.` : '',
    contextMsgs ? `Contexto de la escena: ${contextMsgs}.` : '',
    promptExtra.trim() ? `Detalles adicionales: ${promptExtra.trim()}.` : ''
  ].filter(Boolean).join(' ');

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const { width, height } = getDimensions();

    try {
      await onGenerateImage({
        prompt: composedPrompt,
        summary: promptExtra.trim() || (selectedCharsNames ? `Escena con ${selectedCharsNames}` : 'Escena del chat'),
        style: stylePreset,
        width,
        height,
        messageIndexes: selectedMsgIndexes,
        characterIds: selectedCharIds
      });
      onClose();
    } catch (err) {
      console.error('[StagingModal]: Failed to generate scene image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const modalContent = (
    <div className="staging-modal-overlay" onClick={onClose}>
      <div className="staging-modal" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="staging-header">
          <div className="staging-title-group">
            <h3>
              <FontAwesomeIcon icon={faImage} className="staging-icon" /> Escenificación
            </h3>
            <span className="staging-subtitle">
              Genera una ilustración con IA basada en los personajes y eventos seleccionados
            </span>
          </div>
          <button className="staging-close-btn" onClick={onClose} title="Cerrar modal">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="staging-body">
          {/* 1. Selección de Personajes */}
          <div className="staging-section">
            <div className="staging-section-header">
              <label className="staging-label">1. Personajes presentes en la escena</label>
              {characters.length > 0 && (
                <div className="staging-quick-actions">
                  <button type="button" onClick={handleSelectAllChars} className="staging-quick-btn">
                    <FontAwesomeIcon icon={faCheckDouble} /> Todos
                  </button>
                  <button type="button" onClick={handleClearChars} className="staging-quick-btn">
                    <FontAwesomeIcon icon={faEraser} /> Limpiar
                  </button>
                </div>
              )}
            </div>

            <div className="staging-grid">
              {characters.length === 0 ? (
                <div className="staging-empty">No se detectaron tarjetas de personajes en este escenario.</div>
              ) : (
                characters.map(char => {
                  const isChecked = selectedCharIds.includes(char.id);
                  const charName = char.title || char.name || 'Personaje';
                  const avatarUrl = char.cover || char.images?.[0]?.url || '';
                  const traits = Array.isArray(char.traits) ? char.traits.filter(Boolean).slice(0, 2).join(' · ') : '';

                  return (
                    <div 
                      key={char.id} 
                      className={`staging-card-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleChar(char.id)}
                    >
                      <div className="staging-avatar-wrap">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={charName} className="staging-avatar-img" />
                        ) : (
                          <div className="staging-avatar-placeholder">
                            <FontAwesomeIcon icon={faUser} />
                          </div>
                        )}
                      </div>
                      <div className="staging-card-meta">
                        <span className="staging-card-name">{charName}</span>
                        {traits && <span className="staging-card-traits">{traits}</span>}
                      </div>
                      <FontAwesomeIcon 
                        icon={isChecked ? faCheckSquare : faSquare} 
                        className={`staging-checkbox ${isChecked ? 'checked' : ''}`} 
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Selección de Mensajes de Contexto */}
          <div className="staging-section">
            <div className="staging-section-header">
              <label className="staging-label">2. Mensajes que forman parte del contexto visual</label>
              {messages.length > 0 && (
                <div className="staging-quick-actions">
                  <button type="button" onClick={handleSelectLastThreeMsgs} className="staging-quick-btn">
                    Últimos 3
                  </button>
                  <button type="button" onClick={handleSelectAllMsgs} className="staging-quick-btn">
                    <FontAwesomeIcon icon={faCheckDouble} /> Todos
                  </button>
                  <button type="button" onClick={handleClearMsgs} className="staging-quick-btn">
                    <FontAwesomeIcon icon={faEraser} /> Limpiar
                  </button>
                </div>
              )}
            </div>

            <div className="staging-msgs-list">
              {messages.length === 0 ? (
                <div className="staging-empty">No hay mensajes aún en la conversación.</div>
              ) : (
                messages.map((msg, idx) => {
                  const isChecked = selectedMsgIndexes.includes(idx);
                  const isUser = msg.from === 'user';
                  const authorLabel = isUser ? 'Tú' : (msg.from === 'narrator' ? 'Narrador' : 'IA');

                  return (
                    <div 
                      key={idx} 
                      className={`staging-msg-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleMsg(idx)}
                    >
                      <FontAwesomeIcon 
                        icon={isChecked ? faCheckSquare : faSquare} 
                        className={`staging-checkbox ${isChecked ? 'checked' : ''}`} 
                      />
                      <div className="staging-msg-content">
                        <span className="staging-msg-author">
                          #{idx + 1} {authorLabel}
                        </span>
                        <span className="staging-msg-text">{msg.text}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Estilo Visual, Formato y Detalles */}
          <div className="staging-section horizontal">
            <div>
              <label className="staging-label">3. Estilo visual</label>
              <select 
                data-testid="staging-style-select"
                className="staging-select" 
                value={stylePreset} 
                onChange={(e) => setStylePreset(e.target.value)}
              >
                <option value="Fantasía Oscura / Entornos">Fantasía Oscura / Entornos</option>
                <option value="Anime / Ilustración Estilizada 2.5D">Anime / Ilustración Estilizada 2.5D</option>
                <option value="Fotorrealista Cinematic / 8K">Fotorrealista Cinematic / 8K</option>
                <option value="Cyberpunk / Neón">Cyberpunk / Neón</option>
                <option value="Óleo Clásico / Época">Óleo Clásico / Pintura</option>
                <option value="Cómic / Novela Gráfica">Cómic / Novela Gráfica</option>
              </select>
            </div>

            <div>
              <label className="staging-label">Proporción de imagen</label>
              <select
                data-testid="staging-aspect-select"
                className="staging-select"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="landscape">Panorámica (16:9 - 768x512)</option>
                <option value="portrait">Retrato Vertical (3:4 - 512x768)</option>
                <option value="square">Cuadrada (1:1 - 512x512)</option>
              </select>
            </div>
          </div>

          <div className="staging-section">
            <label className="staging-label">Detalles adicionales (opcional)</label>
            <input 
              type="text" 
              className="staging-input" 
              placeholder="Ej: Iluminación, clima, composición, detalles del plano..."
              value={promptExtra}
              onChange={(e) => setPromptExtra(e.target.value)}
            />
          </div>

          {/* Previsualización del Prompt Comprimido */}
          <div className="staging-preview-box">
            <span className="staging-preview-title">
              <FontAwesomeIcon icon={faMagic} /> Prompt de Escena compuesto:
            </span>
            <p className="staging-preview-text">
              {composedPrompt || 'Selecciona personajes o mensajes para componer la escena.'}
            </p>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="staging-footer">
          <button type="button" className="staging-cancel-btn" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </button>
          <button 
            type="button" 
            className="staging-submit-btn" 
            onClick={handleGenerate} 
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Generando escena...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faMagic} /> Generar Imagen de Escena
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
