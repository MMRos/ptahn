import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, 
  faBell, 
  faUser, 
  faStar, 
  faShareAlt, 
  faFolderOpen,
  faSlidersH,
  faLanguage,
  faTextHeight,
  faFileExport,
  faBrain,
  faTerminal,
  faUserAstronaut
} from '@fortawesome/free-solid-svg-icons';
import './topbar.css';

export default function TopBar({ 
  currentView, 
  onNavigate, 
  onChooseFolder, 
  storageStatus,
  isFavorite,
  onToggleFavorite,
  onShareChat,
  chatSettings = {},
  onUpdateChatSettings = () => {},
  activeChat = null,
  dmName = null,
  onOpenScenarioPopup = () => {},
  onExportChat = () => {},
  onOpenCharModal = () => {},
  constantPrompt = '',
  onChangeConstantPrompt = () => {},
  memoryCards = [],
  onAddMemory = () => {},
  onRemoveMemory = () => {}
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showMemoryInput, setShowMemoryInput] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const dropdownRef = useRef(null);

  const toggleSettings = () => setSettingsOpen(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isChatView = currentView === 'chat';

  // Valores de los ajustes de chat
  const preferredModel = chatSettings.preferredModel || 'deepseek-r1-distill-qwen-7b';
  const preferredLanguage = chatSettings.preferredLanguage || 'Español';
  const responseLength = chatSettings.responseLength || 1000;

  return (
    <header className="top-bar">
      {/* Título de la cabecera del escenario (pequeña e interactiva) si estamos en un chat */}
      {isChatView && activeChat ? (
        <div className="top-bar-title-click" onClick={() => onOpenScenarioPopup(activeChat)}>
          <span className="top-bar-scenario-name">
            {activeChat.scenario || 'Escenario Ptah'}
            {dmName && (
              <span style={{ 
                marginLeft: '10px', 
                fontSize: '0.78rem', 
                color: '#ffd36b', 
                background: 'rgba(255, 211, 107, 0.1)', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                border: '1px solid rgba(255, 211, 107, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🧙 DM: {dmName}
              </span>
            )}
          </span>
          <span className="top-bar-scenario-meta">👁️ 534 • ★ 7.0/10</span>
        </div>
      ) : <div />}

      <div className="top-bar-actions" ref={dropdownRef}>
        {isChatView ? (
          <>
            <button 
              className={`top-bar-btn ${isFavorite ? 'active' : ''}`}
              title="Favorito" 
              aria-label="Favorito"
              onClick={onToggleFavorite}
            >
              <FontAwesomeIcon icon={faStar} />
            </button>

            <button 
              className="top-bar-btn" 
              title="Compartir chat" 
              aria-label="Compartir chat"
              onClick={onShareChat}
            >
              <FontAwesomeIcon icon={faShareAlt} />
            </button>
          </>
        ) : (
          <>
            <button 
              className="top-bar-btn" 
              title="Notificaciones" 
              aria-label="Notificaciones"
              onClick={() => alert('No hay notificaciones pendientes')}
            >
              <FontAwesomeIcon icon={faBell} />
            </button>

            <button 
              className="top-bar-btn" 
              title="Perfil" 
              aria-label="Perfil"
              onClick={() => onNavigate('profile')}
            >
              <FontAwesomeIcon icon={faUser} />
            </button>
          </>
        )}

        <button 
          className={`top-bar-btn ${settingsOpen ? 'active' : ''}`} 
          title="Ajustes" 
          aria-label="Ajustes"
          onClick={toggleSettings}
        >
          <FontAwesomeIcon icon={faCog} />
        </button>

        {settingsOpen && (
          <div className="settings-dropdown">
            <div className="dropdown-header">
              {isChatView ? 'Ajustes de este Chat' : 'Ajustes Predeterminados Globales'}
            </div>

            {/* Modelo Favorito */}
            <div className="settings-group">
              <label><FontAwesomeIcon icon={faSlidersH} /> Modelo Favorito</label>
              <select 
                value={preferredModel}
                onChange={(e) => onUpdateChatSettings({ ...chatSettings, preferredModel: e.target.value })}
              >
                <option value="deepseek-r1-distill-qwen-7b">DeepSeek R1 Distill Qwen 7B</option>
                <option value="qwen2.5-coder-7b-instruct">Qwen 2.5 7B Instruct</option>
                <option value="llama-3-8b-instruct">Llama 3 8B Instruct</option>
              </select>
            </div>

            {/* Idioma Favorito */}
            <div className="settings-group">
              <label><FontAwesomeIcon icon={faLanguage} /> Idioma Favorito</label>
              <select 
                value={preferredLanguage}
                onChange={(e) => onUpdateChatSettings({ ...chatSettings, preferredLanguage: e.target.value })}
              >
                <option value="Español">Español</option>
                <option value="English">English</option>
                <option value="Français">Français</option>
                <option value="Deutsch">Deutsch</option>
              </select>
            </div>

            {/* Longitud de Respuesta */}
            <div className="settings-group">
              <label><FontAwesomeIcon icon={faTextHeight} /> Longitud Máxima de Respuesta</label>
              <select 
                value={responseLength}
                onChange={(e) => onUpdateChatSettings({ ...chatSettings, responseLength: Number(e.target.value) })}
              >
                <option value={600}>Corto (600 caracteres)</option>
                <option value={1000}>Medio (1000 caracteres)</option>
                <option value={2500}>Largo (2500 caracteres)</option>
              </select>
            </div>

            {/* Opciones Específicas del Chat movidas al desplegable por petición */}
            {isChatView && (
              <>
                <div className="dropdown-divider" />
                
                <button className="dropdown-action-btn" onClick={() => onExportChat('json')}>
                  <FontAwesomeIcon icon={faFileExport} /> Exportar Historial (JSON/Texto)
                </button>

                <button className="dropdown-action-btn" onClick={() => setShowPromptInput(!showPromptInput)}>
                  <FontAwesomeIcon icon={faTerminal} /> Órdenes Constantes a la IA
                </button>
                {showPromptInput && (
                  <div className="settings-group">
                    <textarea 
                      placeholder="Órdenes permanentes..."
                      value={constantPrompt}
                      onChange={(e) => onChangeConstantPrompt(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}

                <button className="dropdown-action-btn" onClick={() => setShowMemoryInput(!showMemoryInput)}>
                  <FontAwesomeIcon icon={faBrain} /> Tarjetas de Memoria ({memoryCards.length})
                </button>
                {showMemoryInput && (
                  <div className="settings-group">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        placeholder="Nueva memoria..."
                        value={newMemoryText}
                        onChange={(e) => setNewMemoryText(e.target.value)}
                      />
                      <button 
                        style={{ background: '#ffd36b', border: 'none', borderRadius: '6px', color: '#000', fontWeight: '700', padding: '0 10px', cursor: 'pointer' }}
                        onClick={() => {
                          if (newMemoryText.trim()) {
                            onAddMemory(newMemoryText.trim());
                            setNewMemoryText('');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <button className="dropdown-action-btn" onClick={onOpenCharModal}>
                  <FontAwesomeIcon icon={faUserAstronaut} /> Editar Personaje Interpretado
                </button>
              </>
            )}

            <div className="dropdown-divider" />

            {/* Dirección de Carpeta Local con icono interactivo */}
            <div className="settings-group">
              <label><FontAwesomeIcon icon={faFolderOpen} /> Carpeta Local de Guardado</label>
              <div className="folder-path-box">
                <button 
                  className="folder-btn-icon" 
                  title="Cambiar carpeta local"
                  onClick={() => {
                    setSettingsOpen(false);
                    if (onChooseFolder) onChooseFolder();
                  }}
                >
                  <FontAwesomeIcon icon={faFolderOpen} />
                </button>
                <span>{storageStatus || '/ptah-data/'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
