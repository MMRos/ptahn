import React, { useEffect, useRef } from 'react';
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
  faPaperPlane,
  faStop,
  faEye,
  faImage,
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
  onOpenSidebar,
  onStop
}) {
  const localTextareaRef = useRef(null);
  const actualTextareaRef = textareaRef || localTextareaRef;

  // Auto-ajustar altura del textarea para contener el texto conforme el usuario escribe
  useEffect(() => {
    const textarea = actualTextareaRef.current;
    if (!textarea) return;

    // Reiniciar temporalmente para medir scrollHeight exacto al borrar texto
    textarea.style.height = 'auto';

    const minHeight = 44;
    const maxHeight = 220;
    const scrollHeight = textarea.scrollHeight;
    const targetHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${targetHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input, actualTextareaRef]);

  const insertFormattingToken = (prefix, suffix = prefix) => {
    if (!actualTextareaRef.current) return;
    const start = actualTextareaRef.current.selectionStart;
    const end = actualTextareaRef.current.selectionEnd;
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
            title='Diálogo: Insertar diálogo hablado ("Hola")'
            aria-label="Diálogo"
          >
            <FontAwesomeIcon icon={faCommentDots} />
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('*', '*')}
            title="Acción: Insertar acción o acotación (*Camina en silencio*)"
            aria-label="Acción"
          >
            <FontAwesomeIcon icon={faRunning} />
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('~', '~')}
            title="Pensamiento: Insertar pensamiento interno (~No sé si confiar en él~)"
            aria-label="Pensamiento"
          >
            <FontAwesomeIcon icon={faBrain} />
          </button>

          <button 
            type="button" 
            className="tool-btn" 
            onClick={() => insertFormattingToken('==', '==')}
            title="Resaltar: Resaltar entidad o lugar clave (==Entidad==)"
            aria-label="Resaltar"
          >
            <FontAwesomeIcon icon={faHighlighter} />
          </button>

          {/* Selector de Transparencia Peek */}
          <button
            type="button"
            className="tool-btn"
            onClick={onTogglePeek}
            title="Ver Fondo: Alternar vista transparente para apreciar el fondo del escenario"
            aria-label="Ver Fondo"
            style={{
              background: isPeekTransparent ? 'rgba(255, 211, 107, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: isPeekTransparent ? '#ffd36b' : 'rgba(255, 255, 255, 0.8)',
              border: isPeekTransparent ? '1px solid rgba(255, 211, 107, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <FontAwesomeIcon icon={faEye} />
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
            title="Continuar: Pide al narrador que continúe describiendo los eventos o el entorno"
            aria-label="Continuar"
          >
            <FontAwesomeIcon icon={faPlay} />
          </button>

          <button
            type="button"
            className="tool-btn action"
            onClick={() => onRedo(null)}
            disabled={isSending}
            title="Rehacer: Regenera el último turno del narrador con una respuesta diferente"
            aria-label="Rehacer"
          >
            <FontAwesomeIcon icon={faRedo} />
          </button>

          {onOpenStaging && (
            <button
              type="button"
              className="tool-btn action"
              onClick={onOpenStaging}
              disabled={isSending}
              title="Escenificar: Generar imagen de la escena a partir de mensajes y personajes del chat"
              aria-label="Escenificar"
            >
              <FontAwesomeIcon icon={faImage} />
            </button>
          )}

          <button
            type="button"
            className="tool-btn action"
            onClick={onBranchChat}
            disabled={isSending}
            title="Ramificar: Crea una línea temporal paralela (ramificación) a partir de este punto"
            aria-label="Ramificar"
          >
            <FontAwesomeIcon icon={faCodeBranch} />
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
              title="Retrato: Mostrar panel de personaje (Zona B)"
              aria-label="Retrato"
            >
              <FontAwesomeIcon icon={faUserCircle} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Área de Entrada de Mensaje con Textarea expansible y botones laterales */}
      <form className="chat-input-area" onSubmit={onSendMessage}>
        <textarea
          ref={actualTextareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Escribe tu acción o diálogo... ("diálogo", *acción*, o /ooc para dirigir al narrador)'
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
            width: '44px',
            height: '44px',
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

        {/* Botón de Enviar Mensaje / Detener Generación (Stop) */}
        <button 
          type={isSending ? "button" : "submit"} 
          className={`chat-send-btn ${isSending ? 'is-stopping' : ''}`}
          disabled={!isSending && (!input.trim() && !isRecordingAudio)}
          onClick={isSending ? (e) => { e.preventDefault(); if (onStop) onStop(); } : undefined}
          title={isSending ? "Detener respuesta (Stop)" : (chatSettings?.sendOnShiftEnter !== false ? "Enviar (Shift + Enter)" : "Enviar (Enter)")} 
          aria-label={isSending ? "Detener respuesta" : "Enviar mensaje"}
        >
          {isSending ? (
            <FontAwesomeIcon icon={faStop} />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>
    </div>
  );
}
