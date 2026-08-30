import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCommentDots, 
  faRunning, 
  faBrain, 
  faHighlighter, 
  faRedo, 
  faPlay, 
  faCodeBranch, 
  faMicrophone, 
  faSpinner, 
  faPaperPlane,
  faEye,
  faLayerGroup,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';

/**
 * Panel inferior (Dock) para el input de texto, selección rápida de formato tipográfico,
 * grabación por voz, controles de generación de tarjetas y botones de acción (Continuar, Rehacer, Ramificar, Escenificar).
 */
export default function ChatInputDock({
  input,
  setInput,
  isSending,
  onSendMessage,
  onContinue,
  onRedo,
  onOpenStaging,
  onBranchChat,
  onTogglePeek,
  isPeekTransparent,
  autoGenCards,
  onToggleAutoGenCards,
  isSelectingForCard,
  onToggleSelectingForCard,
  chatSettings,
  onUpdateChatSettings,
  isRecordingAudio,
  onToggleAudioRecording,
  textareaRef,
  isSidebarVisible,
  isCharacterSidebarClosed,
  activeCharacter,
  onOpenSidebar
}) {
  const insertFormattingToken = (prefix, suffix = prefix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentVal = input || '';
    const selected = currentVal.substring(start, end);

    const replacement = selected 
      ? `${prefix}${selected}${suffix}`
      : `${prefix}${suffix}`;

    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setInput(nextVal);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursor = selected ? start + replacement.length : start + prefix.length;
        textareaRef.current.setSelectionRange(cursor, cursor);
      }
    }, 10);
  };

  const handleKeyDown = (e) => {
    const sendWithShift = chatSettings?.sendOnShiftEnter !== false;
    if (sendWithShift) {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onSendMessage(e);
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendMessage(e);
      }
    }
  };

  return (
    <div className="chat-bottom-dock">
      {/* 1. Barra superior de herramientas y acciones */}
      <div className="chat-tools-bar">
        {/* Lado izquierdo: Tokens de formato y opciones */}
        <div className="tools-left">
          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('"', '"')}
            title='Insertar diálogo hablado: "Hola"'
          >
            <FontAwesomeIcon icon={faCommentDots} />
            <span>Diálogo</span>
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('*', '*')}
            title="Insertar acción o acotación: *Camina en silencio*"
          >
            <FontAwesomeIcon icon={faRunning} />
            <span>Acción</span>
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('~', '~')}
            title="Insertar pensamiento interno del personaje: ~No sé si confiar en él~"
          >
            <FontAwesomeIcon icon={faBrain} />
            <span>Pensamiento</span>
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('==', '==')}
            title="Resaltar entidad o lugar clave: ==Garrison=="
          >
            <FontAwesomeIcon icon={faHighlighter} />
            <span>Resaltar</span>
          </button>

          {/* Selector de Transparencia Peek */}
          <button
            type="button"
            className="tool-btn"
            onClick={onTogglePeek}
            title="Alternar vista transparente para apreciar el fondo del escenario"
            style={{
              background: isPeekTransparent ? 'rgba(255, 211, 107, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: isPeekTransparent ? '#ffd36b' : 'rgba(255, 255, 255, 0.8)',
              border: isPeekTransparent ? '1px solid rgba(255, 211, 107, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <FontAwesomeIcon icon={faEye} />
            <span>Ver Fondo</span>
          </button>

          {/* Checkbox Generar tarjetas con IA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
            <input 
              type="checkbox" 
              id="autoGenCardsCheck"
              checked={autoGenCards} 
              onChange={(e) => onToggleAutoGenCards(e.target.checked)} 
              style={{ cursor: 'pointer', accentColor: '#ffd36b' }}
            />
            <label 
              htmlFor="autoGenCardsCheck" 
              style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }} 
              title="Permite a la IA sugerir y crear tarjetas de lore 100% rellenadas de forma automática"
            >
              Generar tarjetas con IA
            </label>
          </div>
          
          {!autoGenCards && (
            <button 
              type="button" 
              onClick={onToggleSelectingForCard}
              style={{ 
                marginLeft: '6px', 
                background: isSelectingForCard ? 'rgba(235, 87, 87, 0.15)' : 'rgba(255, 211, 107, 0.12)', 
                border: isSelectingForCard ? '1px solid rgba(235, 87, 87, 0.3)' : '1px solid rgba(255, 211, 107, 0.3)', 
                color: isSelectingForCard ? '#eb5757' : '#ffd36b', 
                borderRadius: '4px', 
                padding: '2px 8px', 
                fontSize: '0.72rem', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              {isSelectingForCard ? 'Cancelar creación' : 'Crear tarjeta'}
            </button>
          )}

          {/* Conmutador Rápido Shift+Enter para enviar */}
          <button 
            type="button" 
            onClick={() => {
              const nextVal = chatSettings?.sendOnShiftEnter === false ? true : false;
              onUpdateChatSettings({ ...chatSettings, sendOnShiftEnter: nextVal });
            }}
            style={{
              marginLeft: '4px',
              background: chatSettings?.sendOnShiftEnter !== false ? 'rgba(255, 211, 107, 0.12)' : 'rgba(255, 255, 255, 0.05)', 
              border: chatSettings?.sendOnShiftEnter !== false ? '1px solid rgba(255, 211, 107, 0.35)' : '1px solid rgba(255, 255, 255, 0.15)', 
              color: chatSettings?.sendOnShiftEnter !== false ? '#ffd36b' : 'rgba(255, 255, 255, 0.45)', 
              borderRadius: '4px', 
              padding: '2px 6px', 
              fontSize: '0.68rem', 
              fontWeight: '600', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={chatSettings?.sendOnShiftEnter !== false ? "Shift+Enter para enviar: ACTIVADO (clic para desactivar)" : "Shift+Enter para enviar: DESACTIVADO (clic para activar)"}
          >
            <span>Shift+↵ {chatSettings?.sendOnShiftEnter !== false ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Lado derecho: Acciones de historia */}
        <div className="tools-right">
          <button
            type="button"
            className="tool-btn action"
            onClick={onContinue}
            disabled={isSending}
            title="Pide al narrador que continúe describiendo los eventos o el entorno"
          >
            <FontAwesomeIcon icon={faPlay} />
            <span>Continuar</span>
          </button>

          <button
            type="button"
            className="tool-btn action"
            onClick={() => onRedo(null)}
            disabled={isSending}
            title="Regenera el último turno del narrador con una respuesta diferente"
          >
            <FontAwesomeIcon icon={faRedo} />
            <span>Rehacer</span>
          </button>

          {onOpenStaging && (
            <button
              type="button"
              className="tool-btn action"
              onClick={onOpenStaging}
              disabled={isSending}
              title="Abre la ventana de escenificación para inyectar eventos, PNJ o cambios de rumbo en la historia"
            >
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>Escenificar</span>
            </button>
          )}

          <button
            type="button"
            className="tool-btn action"
            onClick={onBranchChat}
            disabled={isSending}
            title="Crea una línea temporal paralela (ramificación) a partir de este punto"
          >
            <FontAwesomeIcon icon={faCodeBranch} />
            <span>Ramificar</span>
          </button>

          {chatSettings.showCharacterSidebar !== false && isCharacterSidebarClosed && activeCharacter && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="tool-btn action"
              style={{
                background: 'rgba(255, 211, 107, 0.1)',
                border: '1px solid rgba(255, 211, 107, 0.3)',
                color: '#ffd36b'
              }}
              title="Mostrar panel de personaje (Zona B)"
            >
              <FontAwesomeIcon icon={faUserCircle} />
              <span>Retrato</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Área de Entrada de Mensaje con Textarea expansible y botones laterales */}
      <form className="chat-input-area" onSubmit={onSendMessage}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Escribe tu acción o diálogo... Usa "para hablar" o *para acciones*'
          className="chat-textarea"
          rows={1}
          disabled={isSending}
        />

        {/* Botón de Grabación por Voz */}
        <button
          type="button"
          onClick={onToggleAudioRecording}
          disabled={isSending}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: isRecordingAudio ? 'rgba(235, 87, 87, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: isRecordingAudio ? '1px solid #eb5757' : '1px solid rgba(255, 255, 255, 0.12)',
            color: isRecordingAudio ? '#eb5757' : '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          title={isRecordingAudio ? "Detener dictado por voz" : "Dictar mensaje con el micrófono (reconocimiento de voz)"}
        >
          <FontAwesomeIcon icon={faMicrophone} />
        </button>

        {/* Botón de Enviar Mensaje */}
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={isSending || (!input.trim() && !isRecordingAudio)}
          title={chatSettings?.sendOnShiftEnter !== false ? "Enviar (Shift + Enter)" : "Enviar (Enter)"} 
        >
          {isSending ? (
            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>
    </div>
  );
}
