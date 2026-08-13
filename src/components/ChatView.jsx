import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUndo, 
  faCodeBranch, 
  faEdit, 
  faHistory, 
  faImage, 
  faPaperPlane, 
  faCheck, 
  faTimes,
  faPlay,
  faBold,
  faItalic,
  faQuoteRight,
  faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import { sendChatMessage, generateImageLocal, generateAudioLocal } from '../utils/lmstudio';
import { saveChatToFolder } from '../utils/storage';
import { addChat } from '../utils/db';
import StagingModal from './StagingModal';
import './chats.css';

function FormattedMessageText({ text }) {
  if (!text) return null;
  const parts = text.split(/(".*?"|\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('"') && part.endsWith('"')) return <span key={i} className="msg-dialogue">{part}</span>;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="msg-action">{part.slice(1, -1)}</em>;
        return part;
      })}
    </span>
  );
}

export default function ChatView({ chat, folderHandle, onBranchChat, appData, onUpdateAppData }) {
  const [messages, setMessages] = useState(chat?.messages || []);
  const [inputMsg, setInputMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // States para generación manual y automática de tarjetas
  const [autoGenCards, setAutoGenCards] = useState(false);
  const [isSelectingForCard, setIsSelectingForCard] = useState(false);
  const [selectedMessagesForCard, setSelectedMessagesForCard] = useState([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState('Personaje');
  const [newCardText, setNewCardText] = useState('');

  useEffect(() => {
    setMessages(chat?.messages || []);
  }, [chat]);

  useEffect(() => {
    if (isSelectingForCard) {
      const refText = selectedMessagesForCard
        .map(idx => {
          const m = messages[idx];
          const author = m.from === 'user' ? 'Tú' : 'Narrador';
          return `${author}: ${m.text}`;
        })
        .join('\n\n');
      setNewCardText(refText);
    } else {
      setNewCardText('');
    }
  }, [selectedMessagesForCard, isSelectingForCard, messages]);

  const persistMessages = async (nextMsgs) => {
    setMessages(nextMsgs);
    const updatedChat = { ...chat, messages: nextMsgs };
    try { await addChat(updatedChat); } catch(err) { console.warn('IndexedDB save err:', err); }
    if (folderHandle) {
      try { await saveChatToFolder(updatedChat, folderHandle); } catch (err) {}
    }
  };

  const handleSpeakMessage = async (message, idx) => {
    const msgId = `${message.from}-${idx}`;
    if (speakingMessageId === msgId) {
      if (window.activeAudioElement) {
        window.activeAudioElement.pause();
        window.activeAudioElement = null;
      } else {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);

    // Encontrar el narrador activo del escenario actual
    const scenario = appData?.scenarios?.find(s => s.id === chat.scenarioId);
    const narrator = (appData?.narrators || []).find(n => n.id === scenario?.narrator);

    const textToSpeak = message.text;

    // Si hay un narrador asignado y tiene motor de LM Studio configurado
    if (narrator && narrator.voiceEngine === 'lmstudio') {
      try {
        const audioUrl = await generateAudioLocal(
          textToSpeak,
          narrator.voicePreset || 'default',
          narrator.bio || '',
          narrator.pitch || 1.0,
          narrator.rate || 1.0
        );
        if (audioUrl) {
          if (window.activeAudioElement) {
            window.activeAudioElement.pause();
          }
          const audio = new Audio(audioUrl);
          window.activeAudioElement = audio;
          audio.onended = () => {
            setSpeakingMessageId(null);
            window.activeAudioElement = null;
          };
          audio.onerror = () => {
            setSpeakingMessageId(null);
            playMessageSpeechSynthesis(textToSpeak, narrator);
          };
          audio.play().catch(() => {
            setSpeakingMessageId(null);
          });
        } else {
          playMessageSpeechSynthesis(textToSpeak, narrator);
        }
      } catch (err) {
        playMessageSpeechSynthesis(textToSpeak, narrator);
      }
    } else {
      playMessageSpeechSynthesis(textToSpeak, narrator);
    }
  };

  const playMessageSpeechSynthesis = (text, narrator) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (narrator && narrator.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === narrator.voiceURI);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
    } else {
      utterance.lang = 'es-ES';
    }

    utterance.pitch = narrator?.pitch || 1.0;
    utterance.rate = narrator?.rate || 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputMsg;
    if ((!textToSend.trim() && overrideText === null) || isSending) return;

    const newMsg = { from: 'user', text: textToSend.trim() || '...', timestamp: new Date().toISOString() };
    const nextMsgs = textToSend.trim() ? [...messages, newMsg] : messages;
    
    if (textToSend.trim()) {
      await persistMessages(nextMsgs);
    } else {
      setMessages(nextMsgs);
    }
    
    if (overrideText === null) setInputMsg('');
    setIsSending(true);

    try {
      const memoryContext = (chat.memoryCards || []).map(m => `[Memoria]: ${m}`).join('\n');
      const systemPrompt = `Escenario: ${chat.scenario}. ${chat.constantPrompt ? `ÓRDENES CONSTANTES: ${chat.constantPrompt}.` : ''} 
INSTRUCCIONES DE FORMATO:
- Diálogos de personajes EXCLUSIVAMENTE entre comillas dobles: "Hola".
- Acciones, narrativa y pensamientos EXCLUSIVAMENTE entre asteriscos: *Miró hacia la puerta*.
- Escribe en un estilo literario e inmersivo.
${memoryContext}`.trim();

      const res = await sendChatMessage({
        messages: nextMsgs,
        systemInstruction: systemPrompt,
        contextDocuments: chat.contextDocuments || []
      });

      const aiMsg = { from: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date().toISOString() };
      const finalMsgs = [...nextMsgs, aiMsg];
      await persistMessages(finalMsgs);

    } catch (err) {
      console.error("Error al enviar chat:", err);
      const errorMsg = { from: 'ai', text: `[Error de conexión con IA]: ${err.message || 'LM Studio no accesible.'}`, timestamp: new Date().toISOString() };
      await persistMessages([...nextMsgs, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Función "Continuar" para pedir a la IA que prosiga la narrativa sin mensaje nuevo de usuario
  const handleContinue = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const memoryContext = (chat.memoryCards || []).map(m => `[Memoria]: ${m}`).join('\n');
      const systemPrompt = `Escenario: ${chat.scenario}. Continúa la narración desde el punto exacto donde quedó. ${chat.constantPrompt ? `ÓRDENES CONSTANTES: ${chat.constantPrompt}.` : ''}
INSTRUCCIONES DE FORMATO:
- Diálogos de personajes EXCLUSIVAMENTE entre comillas dobles: "Hola".
- Acciones, narrativa y pensamientos EXCLUSIVAMENTE entre asteriscos: *Miró hacia la puerta*.
- Escribe en un estilo literario e inmersivo.
${memoryContext}`.trim();

      const res = await sendChatMessage({
        messages: messages,
        systemInstruction: systemPrompt,
        contextDocuments: chat.contextDocuments || []
      });

      const aiMsg = { from: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date().toISOString() };
      const finalMsgs = [...messages, aiMsg];
      await persistMessages(finalMsgs);

    } catch (err) {
      console.error("Error al continuar chat:", err);
      const errorMsg = { from: 'ai', text: `[Error de conexión con IA]: ${err.message || 'LM Studio no accesible.'}`, timestamp: new Date().toISOString() };
      await persistMessages([...messages, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Insertar formateadores rápido ("...", *...*, **...**) en el textarea
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const insertFormatting = (symbol) => {
    let wrap = '';
    if (symbol === 'quote') wrap = '"';
    if (symbol === 'italic') wrap = '*';
    if (symbol === 'bold') wrap = '**';

    if (inputRef.current) {
      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;
      const text = inputMsg;
      const before = text.substring(0, start);
      const selected = text.substring(start, end);
      const after = text.substring(end);
      
      const newText = before + wrap + selected + wrap + after;
      setInputMsg(newText);
      
      setTimeout(() => {
        inputRef.current.focus();
        const newPos = start + wrap.length + selected.length;
        if (selected.length === 0) {
           inputRef.current.setSelectionRange(newPos, newPos);
        } else {
           inputRef.current.setSelectionRange(start + wrap.length, newPos);
        }
      }, 0);
    }
  };

  return (
    <div className="chat-container">
      {/* Historial de Mensajes Principal (Ocupa todo el alto disponible) */}
      <div className="chat-messages" ref={chatRef}>
        {messages.length === 0 && (
          <div className="chat-empty-intro">
            <h3>{chat.scenario || 'Escenario'}</h3>
            <p>La aventura comienza. Escribe tu primera acción o diálogo abajo.</p>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {isSelectingForCard && (
              <input 
                type="checkbox"
                checked={selectedMessagesForCard.includes(idx)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMessagesForCard(prev => [...prev, idx]);
                  } else {
                    setSelectedMessagesForCard(prev => prev.filter(x => x !== idx));
                  }
                }}
                style={{ 
                  marginRight: '12px', 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#ffd36b', 
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
            )}
            <div className={`chat-message-bubble ${m.from === 'user' ? 'user' : 'ai'}`} style={{ flex: 1 }}>
              <div className="msg-header">
                <span className="msg-author">
                  {m.from === 'user' 
                    ? 'Tú' 
                    : (appData?.scenarios?.find(s => s.id === chat.scenarioId)?.narrator ? '🧙 Narrador (IA)' : 'Narrador (IA)')
                  }
                </span>
                <div className="msg-toolbar">
                  <button 
                    title={speakingMessageId === `${m.from}-${idx}` ? "Detener voz" : "Escuchar mensaje"} 
                    onClick={() => handleSpeakMessage(m, idx)}
                    style={{ color: speakingMessageId === `${m.from}-${idx}` ? '#ffd36b' : 'inherit' }}
                  >
                    <FontAwesomeIcon icon={speakingMessageId === `${m.from}-${idx}` ? faTimes : faVolumeUp} />
                  </button>
                  <button title="Editar mensaje" onClick={() => { setEditingIndex(idx); setEditText(m.text); }}><FontAwesomeIcon icon={faEdit} /></button>
                  <button title="Bifurcar chat aquí (Branch)" onClick={() => onBranchChat && onBranchChat(chat, messages.slice(0, idx + 1))}><FontAwesomeIcon icon={faCodeBranch} /></button>
                  <button title="Rebobinar hasta aquí (Rewind)" onClick={() => {
                    if (window.confirm('¿Rebobinar chat?')) persistMessages(messages.slice(0, idx + 1));
                  }}><FontAwesomeIcon icon={faHistory} /></button>
                </div>
              </div>

              {editingIndex === idx ? (
                <div className="msg-edit-box">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <div className="msg-edit-actions">
                    <button onClick={() => {
                      const next = [...messages];
                      next[idx].text = editText;
                      setEditingIndex(null);
                      persistMessages(next);
                    }}><FontAwesomeIcon icon={faCheck} /> Guardar</button>
                    <button onClick={() => setEditingIndex(null)}><FontAwesomeIcon icon={faTimes} /> Cancelar</button>
                  </div>
                </div>
              ) : m.isImage ? (
                <div className="msg-image-container">
                  <img src={m.imageUrl} alt="Escenificación" className="msg-staged-img" />
                  <p className="msg-image-caption">{m.text}</p>
                </div>
              ) : (
                <div className="msg-body">
                  <FormattedMessageText text={m.text} />
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="chat-message-bubble ai typing">
            <span className="typing-dots">*El narrador está procesando su respuesta...*</span>
          </div>
        )}
      </div>

      {/* ÁREA INFERIOR SIEMPRE FIJA ABAJO */}
      <div className="chat-bottom-dock">
        {/* Panel de Creación Manual de Tarjeta (Aparece si está en modo selección) */}
        {isSelectingForCard && selectedMessagesForCard.length > 0 && (
          <div style={{
            background: '#14141f',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.9rem', fontWeight: '700' }}>Crear Tarjeta desde Mensajes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Nombre de tarjeta</label>
                <input 
                  value={newCardName} 
                  onChange={(e) => setNewCardName(e.target.value)} 
                  placeholder="Ej. Espada de Fuego, René..."
                  style={{ width: '100%', padding: '6px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Tipo</label>
                <select 
                  value={newCardType} 
                  onChange={(e) => setNewCardType(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                >
                  <option value="Personaje">Personaje</option>
                  <option value="Lugar">Lugar</option>
                  <option value="Facción">Facción</option>
                  <option value="Raza">Raza</option>
                  <option value="Criatura">Criatura</option>
                  <option value="Objeto">Objeto</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Lore / Detalles (Generado de Selección)</label>
              <textarea 
                value={newCardText} 
                onChange={(e) => setNewCardText(e.target.value)} 
                rows={3}
                style={{ width: '100%', padding: '6px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsSelectingForCard(false);
                  setSelectedMessagesForCard([]);
                  setNewCardName('');
                  setNewCardText('');
                }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const n = newCardName.trim();
                  if (!n) {
                    alert('El nombre es obligatorio.');
                    return;
                  }
                  const newCardObj = {
                    id: `card-${Date.now()}`,
                    type: newCardType,
                    title: n,
                    intro: newCardText.substring(0, 100) + '...',
                    text: newCardText,
                    cover: '',
                    nsfw: false,
                    public: false,
                    tags: [],
                    connectedCards: [],
                    traits: [],
                    createdAt: new Date().toISOString()
                  };
                  if (appData && onUpdateAppData) {
                    const nextData = {
                      ...appData,
                      cards: [newCardObj, ...(appData.cards || [])]
                    };
                    onUpdateAppData(nextData);
                    alert(`Tarjeta "${n}" creada de forma manual.`);
                  }
                  setIsSelectingForCard(false);
                  setSelectedMessagesForCard([]);
                  setNewCardName('');
                  setNewCardText('');
                }}
                style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '5px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Guardar Tarjeta
              </button>
            </div>
          </div>
        )}

        {/* Barra de Acciones y Formateadores Rápidos justo encima del Textarea */}
        <div className="chat-tools-bar">
          <div className="tools-left" style={{ display: 'flex', alignItems: 'center' }}>
            <button type="button" className="tool-btn" title="Insertar Diálogo comillas" onClick={() => insertFormatting('quote')}>
              <FontAwesomeIcon icon={faQuoteRight} /> <span>"..."</span>
            </button>
            <button type="button" className="tool-btn" title="Insertar Acción cursiva" onClick={() => insertFormatting('italic')}>
              <FontAwesomeIcon icon={faItalic} /> <span>*...*</span>
            </button>
            <button type="button" className="tool-btn" title="Insertar Negrita" onClick={() => insertFormatting('bold')}>
              <FontAwesomeIcon icon={faBold} /> <span>**...**</span>
            </button>
            
            {/* Toggle de Generación Automática */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '12px' }}>
              <input 
                type="checkbox" 
                id="autoGenCardsCheck" 
                checked={autoGenCards} 
                onChange={(e) => {
                  setAutoGenCards(e.target.checked);
                  if (e.target.checked) {
                    setIsSelectingForCard(false);
                    setSelectedMessagesForCard([]);
                  }
                }} 
                style={{ cursor: 'pointer', accentColor: '#ffd36b' }}
              />
              <label htmlFor="autoGenCardsCheck" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }} title="Permite a la IA Dungeon Mind sugerir y crear tarjetas de lore de forma automática">
                Generar tarjetas con IA
              </label>
            </div>
            
            {/* Si está inactivo el automático, mostramos el botón Crear Tarjeta */}
            {!autoGenCards && (
              <button 
                type="button" 
                onClick={() => {
                  setIsSelectingForCard(prev => !prev);
                  setSelectedMessagesForCard([]);
                }}
                style={{ 
                  marginLeft: '12px', 
                  background: isSelectingForCard ? 'rgba(235, 87, 87, 0.15)' : 'rgba(255, 211, 107, 0.12)', 
                  border: isSelectingForCard ? '1px solid rgba(235, 87, 87, 0.3)' : '1px solid rgba(255, 211, 107, 0.3)', 
                  color: isSelectingForCard ? '#eb5757' : '#ffd36b', 
                  borderRadius: '4px', 
                  padding: '3px 10px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  cursor: 'pointer' 
                }}
              >
                {isSelectingForCard ? 'Cancelar creación' : 'Crear tarjeta'}
              </button>
            )}
          </div>

          <div className="tools-right">
            <button type="button" className="tool-btn action" title="Pedir a la IA que continúe" onClick={handleContinue} disabled={isSending}>
              <FontAwesomeIcon icon={faPlay} /> <span>Continuar</span>
            </button>
            <button type="button" className="tool-btn action" title="Rehacer última respuesta" onClick={() => handleSend('')} disabled={isSending}>
              <FontAwesomeIcon icon={faUndo} /> <span>Rehacer</span>
            </button>
            <button type="button" className="tool-btn action" title="Escenificar (Generar Imagen)" onClick={() => setIsStagingOpen(true)}>
              <FontAwesomeIcon icon={faImage} /> <span>Escenificar</span>
            </button>
            <button type="button" className="tool-btn action" title="Ramificar/Bifurcar chat" onClick={() => onBranchChat && onBranchChat(chat, messages)}>
              <FontAwesomeIcon icon={faCodeBranch} /> <span>Ramificar</span>
            </button>
          </div>
        </div>

        {/* Input de Mensajes */}
        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            className="chat-textarea"
            placeholder='Escribe tu acción o diálogo... Usa "para hablar" o *para acciones*'
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }
            }}
            rows={2}
          />
          <button className="chat-send-btn" title="Enviar (Shift + Enter)" onClick={() => handleSend()} disabled={isSending}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </div>

      <StagingModal 
        isOpen={isStagingOpen}
        onClose={() => setIsStagingOpen(false)}
        messages={messages}
        characters={chat.characters || []}
        onGenerateImage={async (stagingData) => {
          const localUrl = await generateImageLocal(stagingData.prompt, stagingData.style);
          const imageMsg = {
            from: 'ai',
            isImage: true,
            imageUrl: localUrl,
            text: `[Escena generada]: ${stagingData.prompt}`,
            timestamp: new Date().toISOString()
          };
          persistMessages([...messages, imageMsg]);
        }}
      />
    </div>
  );
}
