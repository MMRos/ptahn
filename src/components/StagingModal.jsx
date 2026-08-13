import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic, faTimes, faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons';
import './stagingModal.css';

export default function StagingModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  characters = [], 
  onGenerateImage 
}) {
  const [selectedMsgIndexes, setSelectedMsgIndexes] = useState(() => 
    messages.slice(-3).map((_, idx) => messages.length - 3 + idx).filter(i => i >= 0)
  );
  const [selectedCharIds, setSelectedCharIds] = useState([]);
  const [stylePreset, setStylePreset] = useState('Fantasía Oscura');
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Construir la descripción de contexto seleccionada
    const contextMsgs = selectedMsgIndexes.map(i => messages[i]?.text).filter(Boolean).join(' ');
    const selectedCharsNames = characters.filter(c => selectedCharIds.includes(c.id)).map(c => c.name).join(', ');

    const fullPrompt = `Escena estilo ${stylePreset}. Personajes: ${selectedCharsNames || 'Ninguno especificado'}. Contexto: ${contextMsgs}. Detalle extra: ${promptExtra}`;
    
    await onGenerateImage({
      prompt: fullPrompt,
      style: stylePreset,
      messageIndexes: selectedMsgIndexes,
      characterIds: selectedCharIds
    });

    setIsGenerating(false);
    onClose();
  };

  return (
    <div className="staging-modal-overlay">
      <div className="staging-modal">
        <div className="staging-header">
          <h3>
            <FontAwesomeIcon icon={faMagic} className="staging-icon" /> Escenificación (Generar Imagen de la Escena)
          </h3>
          <button className="staging-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="staging-body">
          {/* Selección de Personajes */}
          <div className="staging-section">
            <label className="staging-label">1. Personajes presentes en la escena</label>
            <div className="staging-grid">
              {characters.length === 0 ? (
                <div className="staging-empty">No se detectaron tarjetas de personajes vinculadas.</div>
              ) : (
                characters.map(char => {
                  const isChecked = selectedCharIds.includes(char.id);
                  return (
                    <div 
                      key={char.id} 
                      className={`staging-card-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleChar(char.id)}
                    >
                      <FontAwesomeIcon icon={isChecked ? faCheckSquare : faSquare} className="staging-checkbox" />
                      <span>{char.name || char.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selección de Mensajes de Contexto */}
          <div className="staging-section">
            <label className="staging-label">2. Marcar mensajes que forman parte del contexto visual</label>
            <div className="staging-msgs-list">
              {messages.length === 0 ? (
                <div className="staging-empty">No hay mensajes aún en la conversación.</div>
              ) : (
                messages.map((msg, idx) => {
                  const isChecked = selectedMsgIndexes.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`staging-msg-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleMsg(idx)}
                    >
                      <FontAwesomeIcon icon={isChecked ? faCheckSquare : faSquare} className="staging-checkbox" />
                      <div className="staging-msg-content">
                        <span className="staging-msg-author">#{idx + 1} {msg.from === 'user' ? 'Tú' : 'IA'}:</span>
                        <span className="staging-msg-text">{msg.text}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Estilo Visual y Detalles */}
          <div className="staging-section horizontal">
            <div>
              <label className="staging-label">3. Estilo visual</label>
              <select 
                className="staging-select" 
                value={stylePreset} 
                onChange={(e) => setStylePreset(e.target.value)}
              >
                <option value="Fantasía Oscura">Fantasía Oscura</option>
                <option value="Anime / Cel Shaded">Anime / Cel Shaded</option>
                <option value="Fotorrealista Cinematic">Fotorrealista Cinematic</option>
                <option value="Óleo Clásico">Óleo Clásico</option>
                <option value="Cyberpunk Noir">Cyberpunk Noir</option>
              </select>
            </div>

            <div>
              <label className="staging-label">Detalles adicionales (opcional)</label>
              <input 
                type="text" 
                className="staging-input" 
                placeholder="Ej: Iluminación de antorcha, niebla densa..."
                value={promptExtra}
                onChange={(e) => setPromptExtra(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="staging-footer">
          <button className="staging-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="staging-submit-btn" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generando escena...' : 'Generar Imagen de Escena'}
          </button>
        </div>
      </div>
    </div>
  );
}
