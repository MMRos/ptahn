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
  faUserAstronaut,
  faPaintBrush,
  faRobot,
  faScroll,
  faUndo,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import { getAvailableModels } from '../utils/lmstudio';
import './topbar.css';

const FONT_FAMILIES = [
  { id: 'default', name: 'Inter (Estándar Moderna)' },
  { id: 'serif', name: 'Merriweather (Literaria / Novela)' },
  { id: 'fantasy', name: 'Cinzel (Fantasía & Rol Clásico)' },
  { id: 'mono', name: 'Fira Code (Consola / Monospace)' },
  { id: 'round', name: 'Quicksand (Redondeada / Suave)' }
];

const FONT_SIZES = [
  { id: 'small', name: 'Pequeña (13.5px)' },
  { id: 'normal', name: 'Normal (15px)' },
  { id: 'medium', name: 'Mediana (17px)' },
  { id: 'large', name: 'Grande (19.5px)' },
  { id: 'xlarge', name: 'Muy Grande (22px)' }
];

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
  onUpdateChatCustomStyle = () => {},
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
  const [settingsTab, setSettingsTab] = useState('appearance'); // 'appearance' | 'ai' | 'chat'
  const [styleScope, setStyleScope] = useState('specific'); // 'specific' | 'global'
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showMemoryInput, setShowMemoryInput] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [availableLmModels, setAvailableLmModels] = useState([]);
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

  // Cargar modelos reales conectados desde LM Studio al abrir ajustes o cambiar URL
  useEffect(() => {
    if (settingsOpen) {
      getAvailableModels(chatSettings.lmStudioUrl)
        .then(models => {
          if (Array.isArray(models) && models.length > 0) {
            setAvailableLmModels(models);
          }
        })
        .catch(() => {});
    }
  }, [settingsOpen, chatSettings.lmStudioUrl]);

  const isChatView = currentView === 'chat';

  // Obtener estilos efectivos según el ámbito seleccionado
  const isEditingSpecific = isChatView && activeChat && styleScope === 'specific';
  const custom = activeChat?.customStyle || {};
  const global = chatSettings || {};

  const currentFontFamily = isEditingSpecific 
    ? (custom.fontFamily || global.fontFamily || 'default')
    : (global.fontFamily || 'default');

  const currentFontSize = isEditingSpecific 
    ? (custom.fontSize || global.fontSize || 'normal')
    : (global.fontSize || 'normal');

  const currentTextColor = isEditingSpecific 
    ? (custom.textColor || global.textColor || '#eaeaea')
    : (global.textColor || '#eaeaea');

  const currentDialogueColor = isEditingSpecific 
    ? (custom.dialogueColor || global.dialogueColor || '#ffd36b')
    : (global.dialogueColor || '#ffd36b');

  const currentActionColor = isEditingSpecific 
    ? (custom.actionColor || global.actionColor || '#6ee7b7')
    : (global.actionColor || '#6ee7b7');

  const currentThoughtColor = isEditingSpecific 
    ? (custom.thoughtColor || global.thoughtColor || '#c084fc')
    : (global.thoughtColor || '#c084fc');

  const currentAiBubbleBg = isEditingSpecific 
    ? (custom.aiBubbleBg || global.aiBubbleBg || 'rgba(255, 255, 255, 0.03)')
    : (global.aiBubbleBg || 'rgba(255, 255, 255, 0.03)');

  const updateStyleProp = (prop, value) => {
    if (isEditingSpecific) {
      onUpdateChatCustomStyle({
        ...(activeChat.customStyle || {}),
        [prop]: value
      });
    } else {
      onUpdateChatSettings({
        ...chatSettings,
        [prop]: value
      });
    }
  };

  const handleResetToGlobal = () => {
    if (activeChat && onUpdateChatCustomStyle) {
      onUpdateChatCustomStyle(null);
    }
  };

  const preferredModel = chatSettings.preferredModel || 'Precog-Magnum-31B-i1-GGUF';
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
            {/* Barra de Pestañas de Ajustes */}
            <div className="settings-tabs-bar">
              <button 
                type="button"
                className={`settings-tab-btn ${settingsTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setSettingsTab('appearance')}
              >
                <FontAwesomeIcon icon={faPaintBrush} /> Visual
              </button>
              <button 
                type="button"
                className={`settings-tab-btn ${settingsTab === 'ai' ? 'active' : ''}`}
                onClick={() => setSettingsTab('ai')}
              >
                <FontAwesomeIcon icon={faRobot} /> Motor IA
              </button>
              {isChatView && (
                <button 
                  type="button"
                  className={`settings-tab-btn ${settingsTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('chat')}
                >
                  <FontAwesomeIcon icon={faScroll} /> Partida
                </button>
              )}
            </div>

            {/* PESTAÑA 1: APARIENCIA & TIPOGRAFÍA */}
            {settingsTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Selector de Ámbito cuando se está en un Chat */}
                {isChatView && activeChat && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setStyleScope('specific')}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          background: styleScope === 'specific' ? '#ffd36b' : 'transparent',
                          color: styleScope === 'specific' ? '#000' : 'rgba(255,255,255,0.7)',
                          fontWeight: 'bold',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🎯 Este Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setStyleScope('global')}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          background: styleScope === 'global' ? '#ffd36b' : 'transparent',
                          color: styleScope === 'global' ? '#000' : 'rgba(255,255,255,0.7)',
                          fontWeight: 'bold',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🌐 Global (Todos)
                      </button>
                    </div>

                    {isEditingSpecific && activeChat?.customStyle && (
                      <button
                        type="button"
                        onClick={handleResetToGlobal}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px dashed rgba(255,255,255,0.2)',
                          color: 'rgba(255,255,255,0.75)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          marginTop: '2px'
                        }}
                        title="Eliminar personalizaciones de este chat y usar el estilo global"
                      >
                        <FontAwesomeIcon icon={faUndo} /> Restablecer a valores globales
                      </button>
                    )}
                  </div>
                )}

                {/* Tipo de Letra */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faPaintBrush} /> Tipografía / Fuente</label>
                  <select 
                    value={currentFontFamily}
                    onChange={(e) => updateStyleProp('fontFamily', e.target.value)}
                  >
                    {FONT_FAMILIES.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tamaño de Letra */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faTextHeight} /> Tamaño de Letra</label>
                  <select 
                    value={currentFontSize}
                    onChange={(e) => updateStyleProp('fontSize', e.target.value)}
                  >
                    {FONT_SIZES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Paleta de Colores */}
                <div className="settings-group">
                  <label>🎨 Colores de Elementos de Texto</label>
                  <div className="color-picker-grid">
                    <div className="color-picker-item">
                      <label>💬 Diálogos ("...")</label>
                      <div className="color-input-row">
                        <input 
                          type="color" 
                          className="color-input-swatch"
                          value={currentDialogueColor}
                          onChange={(e) => updateStyleProp('dialogueColor', e.target.value)}
                        />
                        <span style={{ fontSize: '0.74rem', color: currentDialogueColor, fontWeight: 'bold' }}>
                          {currentDialogueColor}
                        </span>
                      </div>
                    </div>

                    <div className="color-picker-item">
                      <label>🏃 Acciones (*...*)</label>
                      <div className="color-input-row">
                        <input 
                          type="color" 
                          className="color-input-swatch"
                          value={currentActionColor}
                          onChange={(e) => updateStyleProp('actionColor', e.target.value)}
                        />
                        <span style={{ fontSize: '0.74rem', color: currentActionColor, fontWeight: 'bold' }}>
                          {currentActionColor}
                        </span>
                      </div>
                    </div>

                    <div className="color-picker-item">
                      <label>🧠 Pensamientos (~...~)</label>
                      <div className="color-input-row">
                        <input 
                          type="color" 
                          className="color-input-swatch"
                          value={currentThoughtColor}
                          onChange={(e) => updateStyleProp('thoughtColor', e.target.value)}
                        />
                        <span style={{ fontSize: '0.74rem', color: currentThoughtColor, fontWeight: 'bold' }}>
                          {currentThoughtColor}
                        </span>
                      </div>
                    </div>

                    <div className="color-picker-item">
                      <label>📄 Texto General</label>
                      <div className="color-input-row">
                        <input 
                          type="color" 
                          className="color-input-swatch"
                          value={currentTextColor}
                          onChange={(e) => updateStyleProp('textColor', e.target.value)}
                        />
                        <span style={{ fontSize: '0.74rem', color: currentTextColor, fontWeight: 'bold' }}>
                          {currentTextColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previsualización en Vivo */}
                <div style={{
                  background: currentAiBubbleBg,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FontAwesomeIcon icon={faEye} /> Previsualización en vivo:
                  </div>
                  <div style={{ color: currentTextColor, fontSize: '0.84rem' }}>
                    <span style={{ color: currentActionColor, fontStyle: 'italic' }}>*El tabernero asiente.*</span>
                    {' '}
                    <span style={{ color: currentDialogueColor, fontWeight: '500' }}>"Bienvenido forastero."</span>
                    {' '}
                    <span style={{ color: currentThoughtColor, fontStyle: 'italic' }}>~Parece tranquilo.~</span>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: MOTOR IA & CONEXIÓN */}
            {settingsTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Modelo Favorito */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faSlidersH} /> Modelo de Narración & Rol</label>
                  <select 
                    value={preferredModel}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, preferredModel: e.target.value })}
                  >
                    {availableLmModels.length > 0 && (
                      <optgroup label="🟢 Detectados en tu LM Studio">
                        {availableLmModels.map(m => (
                          <option key={m.id} value={m.id}>{m.id}</option>
                        ))}
                      </optgroup>
                    )}
                    
                    <optgroup label="👑 Modelos Recomendados">
                      <option value="Precog-Magnum-31B-i1-GGUF">Precog-Magnum 31B I1 (mradermacher)</option>
                      <option value="Magnum_Lyra_Darkness_12B-Heretic-GGUF">Magnum Lyra Darkness 12B Heretic</option>
                      <option value="Magnum-v4-12B-GGUF">Magnum v4 12B (anthracite-org)</option>
                      <option value="Mistral-Nemo-Instruct-2407-GGUF">Mistral Nemo Instruct 2407</option>
                    </optgroup>
                  </select>
                </div>

                {/* URL del Servidor LM Studio */}
                <div className="settings-group">
                  <label>🌐 URL LM Studio</label>
                  <input 
                    type="text" 
                    value={chatSettings.lmStudioUrl || 'http://localhost:1234'}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, lmStudioUrl: e.target.value })}
                    placeholder="http://localhost:1234"
                  />
                </div>

                {/* URL del Servidor de Imágenes */}
                <div className="settings-group">
                  <label>🎨 URL Generador de Imágenes (Pinokio)</label>
                  <input 
                    type="text" 
                    value={chatSettings.imageServerUrl || 'http://127.0.0.1:42016'}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, imageServerUrl: e.target.value })}
                    placeholder="http://127.0.0.1:42016"
                  />
                </div>

                {/* Idioma Favorito */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faLanguage} /> Idioma de Respuesta</label>
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
                  <label><FontAwesomeIcon icon={faTextHeight} /> Longitud Máxima</label>
                  <select 
                    value={responseLength}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, responseLength: Number(e.target.value) })}
                  >
                    <option value={600}>Corto (600 caracteres)</option>
                    <option value={1000}>Medio (1000 caracteres)</option>
                    <option value={2500}>Largo (2500 caracteres)</option>
                  </select>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: PARTIDA & LORE */}
            {settingsTab === 'chat' && isChatView && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                <div className="dropdown-divider" />

                {/* Dirección de Carpeta Local */}
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
        )}
      </div>
    </header>
  );
}
