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
  faKeyboard,
  faMobileAlt,
  faImage,
  faServer,
  faMicrochip,
  faSyncAlt,
  faPalette,
  faPlay,
  faStop,
  faRedo,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

import { getAvailableModels, AVAILABLE_IMAGE_MODELS } from '../utils/localAIStudio';
import { SUPPORTED_LANGUAGES } from '../utils/language';
import { 
  fetchServerStatus, 
  fetchAvailableModels, 
  loadModelOnServer,
  startServerService,
  stopServerService,
  restartServerService,
  pollServerOnline
} from '../utils/serverApi';
import RemoteConnectModal from './RemoteConnectModal';
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
  onRemoveMemory = () => {},
  currentUser = null,
  onOpenAuthModal,
  onLogout
}) {

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('appearance'); // 'appearance' | 'ai' | 'chat'
  const [styleScope, setStyleScope] = useState('specific'); // 'specific' | 'global'
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showMemoryInput, setShowMemoryInput] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [availableLmModels, setAvailableLmModels] = useState([]);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState({ online: false });
  const [nativeGgufModels, setNativeGgufModels] = useState([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('idle'); // 'idle' | 'starting' | 'stopping' | 'restarting'
  const [serverNotice, setServerNotice] = useState(null);
  const dropdownRef = useRef(null);

  const toggleSettings = () => setSettingsOpen(prev => !prev);

  const refreshServerInfo = async () => {
    try {
      const st = await fetchServerStatus();
      setServerInfo(st);
      if (st && st.online) {
        setServerNotice(null);
      }
    } catch (e) {
      setServerInfo({ online: false });
    }

    try {
      const res = await fetchAvailableModels();
      if (res && res.success && Array.isArray(res.models)) {
        setNativeGgufModels(res.models);
      }
    } catch (e) {}
  };

  const handleStartServer = async () => {
    setLifecycleStatus('starting');
    setServerNotice(null);
    try {
      await startServerService('all');
    } catch (e) {}
    const isOnline = await pollServerOnline({ intervalMs: 600, maxRetries: 4 });
    await refreshServerInfo();
    setLifecycleStatus('idle');
    if (!isOnline) {
      setServerNotice('Servidor no detectado en el puerto 3001. Inícialo ejecutando "npm start" o haciendo doble clic en "iniciar-ptahn.bat".');
    } else {
      setServerNotice(null);
    }
  };


  const handleStopServer = async () => {
    setLifecycleStatus('stopping');
    setServerNotice(null);
    try {
      await stopServerService('all');
    } catch (e) {}
    await refreshServerInfo();
    setLifecycleStatus('idle');
  };

  const handleRestartServer = async () => {
    setLifecycleStatus('restarting');
    setServerNotice(null);
    try {
      await restartServerService('all');
    } catch (e) {}
    await refreshServerInfo();
    setLifecycleStatus('idle');
  };



  useEffect(() => {
    refreshServerInfo();
  }, [settingsOpen]);

  const handleSwitchNativeModel = async (modelName) => {
    setLoadingModel(true);
    try {
      await loadModelOnServer(modelName);
      refreshServerInfo();
    } catch (e) {
      console.warn('Failed to switch native model:', e);
    } finally {
      setLoadingModel(false);
    }
  };


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
  const preferredLanguage = chatSettings.preferredLanguage || 'auto';
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
          <button 
            className="top-bar-btn" 
            title="Notificaciones" 
            aria-label="Notificaciones"
            onClick={() => alert('No hay notificaciones pendientes')}
          >
            <FontAwesomeIcon icon={faBell} />
          </button>
        )}

        <button 
          className={`top-bar-btn ${currentUser ? 'active' : ''}`} 
          title={currentUser ? `Identificado como: ${currentUser.username}` : "Iniciar Sesión / Identificarse"} 
          aria-label="Perfil de Usuario"
          onClick={() => {
            if (currentUser) {
              onNavigate('profile');
            } else if (onOpenAuthModal) {
              onOpenAuthModal('login');
            }
          }}
          style={currentUser ? { color: '#ffd36b', background: 'rgba(255, 211, 107, 0.12)' } : {}}
        >
          <FontAwesomeIcon icon={faUser} />
        </button>

        <button 
          className="top-bar-btn" 
          title="Conectar Móvil / Código QR" 
          aria-label="Conectar Móvil"
          onClick={() => setRemoteModalOpen(true)}
        >
          <FontAwesomeIcon icon={faMobileAlt} />
        </button>



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

                {/* Fondos Dinámicos & Zona B (Panel de Personajes) */}
                <div className="settings-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '0 0 6px 0', fontWeight: '500', color: '#ffffff' }}>
                    <input 
                      type="checkbox" 
                      checked={chatSettings.showLocationBackground !== false}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, showLocationBackground: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#ffd36b', width: '16px', height: '16px' }}
                    />
                    <span><FontAwesomeIcon icon={faImage} /> Fondo de Localización Dinámico</span>
                  </label>
                  <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', display: 'block', lineHeight: 1.4, marginBottom: '8px' }}>
                    Muestra ilustraciones de fondo coherentes con el escenario o lugar actual.
                  </small>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '6px 0', fontWeight: '500', color: '#ffffff' }}>
                    <input 
                      type="checkbox" 
                      checked={chatSettings.showCharacterSidebar !== false}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, showCharacterSidebar: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#ffd36b', width: '16px', height: '16px' }}
                    />
                    <span><FontAwesomeIcon icon={faUserAstronaut} /> Retrato de Personaje Lateral (Zona B)</span>
                  </label>
                  <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', display: 'block', lineHeight: 1.4, marginBottom: '10px' }}>
                    Muestra el retrato vertical del personaje activo y adapta su expresión según el texto.
                  </small>

                  {/* Slider de Opacidad del Chat */}
                  {chatSettings.showLocationBackground !== false && (
                    <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#ffd36b', fontWeight: '600' }}>
                          Opacidad del Chat sobre el Fondo:
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {Math.round((chatSettings.chatBackgroundOpacity ?? 0.85) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0.20" 
                        max="1.0" 
                        step="0.05"
                        value={chatSettings.chatBackgroundOpacity ?? 0.85}
                        onChange={(e) => onUpdateChatSettings({ ...chatSettings, chatBackgroundOpacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer', accentColor: '#ffd36b' }}
                      />
                      <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>
                        Ajusta la transparencia para facilitar la lectura sobre la imagen de fondo.
                      </small>
                    </div>
                  )}
                </div>

                {/* Comportamiento del Teclado / Entrada */}
                <div className="settings-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500', color: '#ffffff' }}>
                    <input 
                      type="checkbox" 
                      checked={chatSettings.sendOnShiftEnter !== false}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, sendOnShiftEnter: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#ffd36b', width: '16px', height: '16px' }}
                    />
                    <span><FontAwesomeIcon icon={faKeyboard} /> Enviar con Shift + Enter</span>
                  </label>
                  <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
                    {chatSettings.sendOnShiftEnter !== false 
                      ? 'Activado: Shift + Enter envía el mensaje, Enter añade una línea.' 
                      : 'Desactivado: Shift + Enter añade una línea. Solo se envía con el botón.'}
                  </small>
                </div>

                {/* Control de Contenido Maduro / NSFW */}
                <div className="settings-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500', color: '#ffffff' }}>
                    <input 
                      type="checkbox" 
                      checked={chatSettings.nsfwAllowed === true}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, nsfwAllowed: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#ffd36b', width: '16px', height: '16px' }}
                    />
                    <span>🔞 Contenido Adulto / NSFW Permitido</span>
                  </label>
                  <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
                    {chatSettings.nsfwAllowed === true 
                      ? 'Activado: Se permiten temas maduros y narrativas sin censura en tus historias.' 
                      : 'Desactivado: Modo apto para todo público y narrativas estándar.'}
                  </small>
                </div>
              </div>
            )}


            {/* PESTAÑA 2: MOTOR IA & CONEXIÓN */}
            {settingsTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Panel de Control de Ciclo de Vida del Servidor */}
                <div className={`server-lifecycle-card ${serverInfo.online ? 'online' : 'offline'} ${lifecycleStatus !== 'idle' ? 'transitioning' : ''}`}>
                  <div className="server-lifecycle-header">
                    <div className="server-lifecycle-status-badge" style={{ color: serverInfo.online ? '#6ee7b7' : '#ffd36b' }}>
                      <FontAwesomeIcon icon={serverInfo.online ? faServer : faMicrochip} />
                      <span>
                        {lifecycleStatus === 'starting' && '🟡 Iniciando Servidor...'}
                        {lifecycleStatus === 'stopping' && '🟠 Deteniendo Motores...'}
                        {lifecycleStatus === 'restarting' && '🔄 Reiniciando Servidor...'}
                        {lifecycleStatus === 'idle' && (serverInfo.online ? '🟢 Servidor Nativo En Línea' : '⚪ Servidor Standalone (Offline)')}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={refreshServerInfo} 
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem' }}
                      title="Refrescar estado del servidor"
                    >
                      <FontAwesomeIcon icon={faSyncAlt} spin={lifecycleStatus !== 'idle'} />
                    </button>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                    {serverInfo.online 
                      ? `Hardware: ${serverInfo.gpu || 'Auto'} | Modelo en VRAM: ${serverInfo.activeModel || 'Ninguno'}`
                      : 'Activa el servidor nativo para habilitar inferencia GPU y acceso LAN/móvil.'}
                  </div>

                  {(currentUser?.role === 'user' || currentUser?.role === 'guest') ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      fontSize: '0.73rem',
                      color: 'rgba(255, 255, 255, 0.65)'
                    }}>
                      🔒 <strong>Modo {currentUser?.role === 'guest' ? 'Invitado (Solo Chats)' : 'Usuario'}:</strong> El control de activación, detención y reinicio del servidor está reservado a Administrador e IT.
                    </div>
                  ) : (

                    <div className="server-lifecycle-actions">
                      {!serverInfo.online ? (
                        <button
                          type="button"
                          className="server-btn-primary"
                          onClick={handleStartServer}
                          disabled={lifecycleStatus !== 'idle'}
                        >
                          <FontAwesomeIcon icon={lifecycleStatus === 'starting' ? faSpinner : faPlay} spin={lifecycleStatus === 'starting'} />
                          <span>{lifecycleStatus === 'starting' ? 'Iniciando...' : 'Activar Servidor'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="server-btn-danger"
                            onClick={handleStopServer}
                            disabled={lifecycleStatus !== 'idle'}
                          >
                            <FontAwesomeIcon icon={lifecycleStatus === 'stopping' ? faSpinner : faStop} spin={lifecycleStatus === 'stopping'} />
                            <span>{lifecycleStatus === 'stopping' ? 'Deteniendo...' : 'Detener Servidor'}</span>
                          </button>
                          <button
                            type="button"
                            className="server-btn-secondary"
                            onClick={handleRestartServer}
                            disabled={lifecycleStatus !== 'idle'}
                          >
                            <FontAwesomeIcon icon={lifecycleStatus === 'restarting' ? faSpinner : faRedo} spin={lifecycleStatus === 'restarting'} />
                            <span>{lifecycleStatus === 'restarting' ? 'Reiniciando...' : 'Reiniciar'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {serverNotice && !serverInfo.online && currentUser?.role !== 'user' && (
                    <div style={{
                      background: 'rgba(255, 211, 107, 0.1)',
                      border: '1px solid rgba(255, 211, 107, 0.25)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '0.74rem',
                      color: '#ffd36b',
                      lineHeight: '1.4'
                    }}>
                      💡 {serverNotice}
                    </div>
                  )}
                </div>




                {/* Acceso Remoto / QR */}
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => {
                    setSettingsOpen(false);
                    setRemoteModalOpen(true);
                  }}
                  style={{ background: 'rgba(255, 211, 107, 0.12)', border: '1px solid rgba(255, 211, 107, 0.3)', color: '#ffd36b', fontWeight: 'bold' }}
                >
                  <FontAwesomeIcon icon={faMobileAlt} /> Conectar Móvil / Ver Código QR
                </button>

                {/* Selector de Modelos GGUF Nativos en ./models/ */}
                {nativeGgufModels.length > 0 && (
                  <div className="settings-group">
                    <label><FontAwesomeIcon icon={faMicrochip} /> Modelo GGUF Nativo (en ./models/)</label>
                    <select 
                      value={serverInfo.activeModel || ''}
                      onChange={(e) => handleSwitchNativeModel(e.target.value)}
                      disabled={loadingModel}
                    >
                      {nativeGgufModels.map(m => (
                        <option key={m.id} value={m.filename}>{m.filename} ({m.formattedSize})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Modelo Favorito (LM Studio / Fallback) */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faSlidersH} /> Modelo de Narración & Rol (Externo)</label>
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

                {/* Modelo Intermediario / Orquestador SLM (F023) */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faBrain} /> Modelo Intermediario / Orquestador (Pipeline SLM)</label>
                  <select 
                    value={chatSettings.orchestratorModel || ''}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, orchestratorModel: e.target.value })}
                  >
                    <option value="">⚡ Automático (Usar modelo principal o SLM rápido)</option>
                    {availableLmModels.length > 0 && (
                      <optgroup label="🟢 Detectados en LM Studio">
                        {availableLmModels.map(m => (
                          <option key={`orch-${m.id}`} value={m.id}>{m.id}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="⚡ Modelos Ligeros Recomendados (0.5B - 3B)">
                      <option value="Qwen2.5-1.5B-Instruct-GGUF">Qwen 2.5 1.5B Instruct (Ultra Rápido)</option>
                      <option value="Llama-3.2-1B-Instruct-GGUF">Llama 3.2 1B Instruct</option>
                      <option value="Llama-3.2-3B-Instruct-GGUF">Llama 3.2 3B Instruct</option>
                      <option value="gemma-2-2b-it-GGUF">Gemma 2 2B IT</option>
                    </optgroup>
                  </select>
                  <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Se encarga de pre-filtrar lore, traducir, formatear diálogos/acciones y preparar prompts de difusión.
                  </small>
                </div>

                {/* Automatización: Creación de Tarjetas y Difusión */}
                <div className="settings-group" style={{ background: 'rgba(255, 211, 107, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 211, 107, 0.15)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', marginBottom: '8px' }}>
                    🤖 Automatizaciones del Asistente
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.74rem', color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                      🗂️ Creación de Tarjetas de Lore:
                    </label>
                    <select
                      value={chatSettings.autoCardCreation || 'auto'}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, autoCardCreation: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '5px', color: '#fff', fontSize: '0.76rem' }}
                    >
                      <option value="auto">✨ Automática (Crea tarjetas al descubrir entidades)</option>
                      <option value="manual">🔘 Manual (Sugerir con botón de 1 clic)</option>
                      <option value="off">🚫 Desactivada</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                      🎨 Generación de Ilustraciones (Difusor):
                    </label>
                    <select
                      value={chatSettings.autoImageDiffusion || 'manual'}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, autoImageDiffusion: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '5px', color: '#fff', fontSize: '0.76rem' }}
                    >
                      <option value="manual">🔘 Manual (Prepara prompt y muestra botón de ilustrar)</option>
                      <option value="auto">⚡ Automática (Dispara difusor si no existe imagen)</option>
                      <option value="off">🚫 Desactivada</option>
                    </select>
                  </div>
                </div>

                {/* Selector de Modelo de Difusión / Generación de Imágenes */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faPalette} /> Modelo de Generación de Imágenes (Difusión)</label>
                  <select 
                    value={chatSettings.preferredImageModel || 'DreamShaperXL_Lightning.safetensors'}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, preferredImageModel: e.target.value })}
                  >
                    {AVAILABLE_IMAGE_MODELS.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Idioma Favorito / Detección Automática */}
                <div className="settings-group">
                  <label><FontAwesomeIcon icon={faLanguage} /> Idioma de Respuesta</label>
                  <select 
                    value={preferredLanguage}
                    onChange={(e) => onUpdateChatSettings({ ...chatSettings, preferredLanguage: e.target.value })}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
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

                {/* Comportamiento del Teclado / Entrada */}
                <div className="settings-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500', color: '#ffffff' }}>
                    <input 
                      type="checkbox" 
                      checked={chatSettings.sendOnShiftEnter !== false}
                      onChange={(e) => onUpdateChatSettings({ ...chatSettings, sendOnShiftEnter: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#ffd36b', width: '16px', height: '16px' }}
                    />
                    <span><FontAwesomeIcon icon={faKeyboard} /> Enviar con Shift + Enter</span>
                  </label>
                  <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
                    {chatSettings.sendOnShiftEnter !== false 
                      ? 'Activado: Shift + Enter envía el mensaje, Enter añade una línea.' 
                      : 'Desactivado: Shift + Enter añade una línea. Solo se envía con el botón.'}
                  </small>
                </div>

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

      <RemoteConnectModal 
        isOpen={remoteModalOpen} 
        onClose={() => setRemoteModalOpen(false)} 
      />
    </header>
  );
}
