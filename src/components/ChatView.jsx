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
  faVolumeUp, 
  faCommentDots, 
  faRunning, 
  faBrain, 
  faHighlighter,
  faTrashAlt,
  faBookOpen,
  faMagic,
  faSave,
  faEye,
  faPlus,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { sendChatMessage, generateImageLocal, generateAudioLocal, sendContextSummarizationTask } from '../utils/lmstudio';
import { saveChatToFolder } from '../utils/storage';
import { addChat } from '../utils/db';
import StagingModal from './StagingModal';
import CharacterPopup from './CharacterPopup';
import './chats.css';

function renderInlineFormattedText(rawText, onTagClick, appData) {
  if (!rawText) return null;
  // Regex para capturar resaltados ==...==, negritas **...**, pensamientos ~...~, o diálogos "..."
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

function FormattedMessageText({ text, onTagClick, appData }) {
  const [showThinking, setShowThinking] = useState(false);
  if (!text) return null;

  // Extraer bloque de razonamiento / pensamiento <think>...</think> si el modelo lo incluye
  let thinkingContent = null;
  let cleanText = text;

  const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    cleanText = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/i, '').trim();
    if (!cleanText && thinkingContent) {
      cleanText = thinkingContent;
      thinkingContent = null;
    }
  }

  // Regex para bloques principales: asteriscos *...*, comillas "...", o resaltar ==...==
  const regex = /(\*[^*]+\*|"[^"]+"|\*\*[^*]+\*\*|~[^~]+~|==[^=]+==)/g;
  const parts = cleanText.split(regex);

  return (
    <span>
      {thinkingContent && (
        <div className="msg-think-box" style={{
          background: 'rgba(192, 132, 252, 0.04)',
          border: '1px solid rgba(192, 132, 252, 0.2)',
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
              <FontAwesomeIcon icon={faBrain} /> Pensamiento del Narrador
            </span>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              {showThinking ? '▼ Ocultar' : '▶ Ver pensamiento'}
            </span>
          </div>
          {showThinking && (
            <div style={{ padding: '8px 12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {thinkingContent}
            </div>
          )}
        </div>
      )}
      {parts.map((part, i) => {
        if (!part) return null;
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

export default function ChatView({ chat, onBack, onBranchChat, onUpdateChat, folderHandle, appData, onUpdateAppData, chatSettings = {}, onOpenCreateModal }) {
  const [messages, setMessages] = useState(chat?.messages || []);
  const [inputMsg, setInputMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [popupCharacter, setPopupCharacter] = useState(null);
  const [activeEntityModal, setActiveEntityModal] = useState(null);
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const inputRef = useRef(null);

  // States para generación manual y automática de tarjetas
  const [autoGenCards, setAutoGenCards] = useState(false);
  const [isSelectingForCard, setIsSelectingForCard] = useState(false);
  const [selectedMessagesForCard, setSelectedMessagesForCard] = useState([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState('Personaje');
  const [newCardText, setNewCardText] = useState('');

  // Manejar clic en etiquetas doradas/verdes ==texto==
  const handleTagClick = (tagContent, existingEntity) => {
    setActiveEntityModal({
      tagName: tagContent,
      existing: existingEntity || null,
      draftType: existingEntity ? (existingEntity.type || 'Lugar') : 'Personaje',
      draftTitle: tagContent,
      draftIntro: existingEntity ? (existingEntity.intro || '') : '',
      draftText: existingEntity ? (existingEntity.text || existingEntity.desc || '') : '',
      draftTraits: existingEntity ? (existingEntity.traits || []) : []
    });
  };

  // Generar lore automático para la tarjeta basada en el término y contexto
  const handleGenerateTagLore = async () => {
    if (!activeEntityModal || isGeneratingLore) return;
    setIsGeneratingLore(true);
    try {
      const prompt = `Describe brevemente (2-3 frases evocadoras e inmersivas en español) la entidad, personaje, lugar u objeto "${activeEntityModal.draftTitle}" de tipo "${activeEntityModal.draftType}" dentro de una partida de rol de fantasía.`;
      const res = await sendChatMessage({
        messages: [{ from: 'user', text: prompt }],
        systemInstruction: 'Eres un generador de fichas de compendio y lore de alta fantasía. Responde directamente con el texto descriptivo sin rodeos.',
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl
      });
      if (res && res.text) {
        const cleanLore = res.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        setActiveEntityModal(prev => ({
          ...prev,
          draftText: cleanLore,
          draftIntro: cleanLore.length > 80 ? cleanLore.substring(0, 80) + '...' : cleanLore
        }));
      }
    } catch (e) {
      console.warn('Error generating lore for tag:', e);
    } finally {
      setIsGeneratingLore(false);
    }
  };

  // Guardar la tarjeta en el compendio de appData
  const handleSaveTagCard = () => {
    if (!activeEntityModal) return;
    const title = activeEntityModal.draftTitle.trim();
    if (!title) return;

    if (activeEntityModal.existing) {
      const updatedCard = {
        ...activeEntityModal.existing,
        type: activeEntityModal.draftType,
        title: title,
        intro: activeEntityModal.draftIntro,
        text: activeEntityModal.draftText
      };
      if (appData && onUpdateAppData) {
        const nextCards = (appData.cards || []).map(c => c.id === updatedCard.id ? updatedCard : c);
        const nextData = { ...appData, cards: nextCards };
        onUpdateAppData(nextData);
        if (folderHandle) saveAppDataToFolder(folderHandle, nextData).catch(console.warn);
      }
    } else {
      const newCard = {
        id: `card_${Date.now()}`,
        type: activeEntityModal.draftType,
        title: title,
        intro: activeEntityModal.draftIntro || (activeEntityModal.draftText ? activeEntityModal.draftText.substring(0, 80) + '...' : ''),
        text: activeEntityModal.draftText || '',
        cover: '',
        tags: [],
        traits: [],
        createdAt: new Date().toISOString()
      };
      if (appData && onUpdateAppData) {
        const nextData = {
          ...appData,
          cards: [newCard, ...(appData.cards || [])]
        };
        onUpdateAppData(nextData);
        if (folderHandle) saveAppDataToFolder(folderHandle, nextData).catch(console.warn);
      }
    }
    setActiveEntityModal(null);
  };

  useEffect(() => {
    let currentMsgs = chat?.messages || [];
    if (currentMsgs.length === 0 && chat?.scenarioId) {
      const scenario = (appData?.scenarios || []).find(s => s.id === chat.scenarioId) || 
                       (appData?.cards || []).find(c => c.id === chat.scenarioId);
      const firstText = (scenario?.presentation || scenario?.intro || '').trim();
      if (firstText) {
        currentMsgs = [
          {
            from: 'narrator',
            text: firstText,
            createdAt: new Date().toISOString()
          }
        ];
        persistMessages(currentMsgs);
      }
    }
    setMessages(currentMsgs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, appData]);

  const insertFormatting = (type) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentText = inputMsg;
    const selectedText = currentText.substring(start, end);

    let prefix = '';
    let suffix = '';
    let placeholder = '';

    switch (type) {
      case 'dialogue':
        prefix = '"';
        suffix = '"';
        placeholder = 'diálogo';
        break;
      case 'action':
        prefix = '*';
        suffix = '*';
        placeholder = 'acción';
        break;
      case 'thought':
        prefix = '~';
        suffix = '~';
        placeholder = 'pensamiento';
        break;
      case 'highlight':
        prefix = '==';
        suffix = '==';
        placeholder = 'texto resaltado';
        break;
      default:
        break;
    }

    const insertedContent = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${placeholder}${suffix}`;
    const newText = currentText.substring(0, start) + insertedContent + currentText.substring(end);
    setInputMsg(newText);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + insertedContent.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      }
    }, 10);
  };

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
    if (onUpdateChat) {
      onUpdateChat(updatedChat);
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

  // Construcción unificada y estructurada del systemPrompt (arnés de contexto).
  // Consolida los detalles del escenario, narrador, herramientas del taller, jugador, inventario y memorias.
  const buildSystemPrompt = () => {
    // 1. Obtener escenario y narrador vinculados
    const scenario = appData?.scenarios?.find(s => s.id === chat.scenarioId);
    const narrator = (appData?.narrators || []).find(n => n.id === scenario?.narrator);

    // 2. Obtener ficha del personaje interpretado por el usuario
    const userChar = (appData?.cards || []).find(c => c.id === chat.characterId);

    // 3. Formatear los detalles del perfil del narrador (Instrucciones narrativas, Estilo, Tono, Reglas)
    let narratorDetails = '';
    if (narrator) {
      narratorDetails = `
[NARRADOR / DM ACTIVO]:
- Nombre: ${narrator.name}
${narrator.bio ? `- Instrucciones narrativas: ${narrator.bio}` : ''}
${narrator.style ? `- Estilo Narrativo: ${narrator.style}` : ''}
${narrator.tone ? `- Tono: ${narrator.tone}` : ''}
${narrator.rules ? `- Reglas del Narrador: ${narrator.rules}` : ''}
${narrator.randomization ? `- Azar/Mecánicas: ${narrator.randomization}` : ''}
`.trim();
    }

    // 4. Formatear herramientas del taller asignadas al narrador
    let narratorToolsDetails = '';
    if (narrator && narrator.tools && narrator.tools.length > 0) {
      const assignedTools = (appData?.tools || []).filter(t => narrator.tools.includes(t.id));
      if (assignedTools.length > 0) {
        const toolsText = assignedTools.map(tool => {
          let mechanics = '';
          if (tool.toolType === 'attributes') {
            const attrs = tool.config?.attributes || [];
            mechanics = `Barras de Atributos del Sistema:\n` + attrs.map(a => `  * ${a.name} [${a.current ?? a.max}/${a.max}] (Color: ${a.color || 'auto'}) - ${a.desc || 'Recurso/Métrica'}`).join('\n');
          } else if (tool.toolType === 'progression') {
            const levels = tool.config?.levels || [];
            mechanics = `Tabla de Progresión (${tool.config?.scaleName || 'Nivel'}):\n` + levels.map(l => `  * Nivel ${l.level} (${l.title}): ${l.perks || 'Requisitos/Ventajas'}`).join('\n');
          } else if (tool.toolType === 'dice') {
            const dice = tool.config?.diceType || '1d20';
            const dc = tool.config?.defaultDC || '12';
            mechanics = `Sistema de Resolución y Azar: Dados ${dice} (DC base: ${dc}). Críticos: Éxito en ${tool.config?.critSuccess || 20}, Pifia en ${tool.config?.critFail || 1}. Modificadores: ${tool.config?.statModifier || 'Atributo relevante'}.`;
          } else if (tool.toolType === 'events') {
            const evts = tool.config?.events || [];
            mechanics = `Tabla de Encuentros y Eventos (${tool.config?.diceType || '1d20'}):\n` + evts.map(e => `  * Rango [${e.min}-${e.max}]: ${e.event} (${e.severity || 'Normal'})`).join('\n');
          } else {
            mechanics = `Reglas / Mecánica Personalizada:\n${tool.config?.customRules || tool.description || 'Sin reglas especificadas.'}`;
          }
          return `--- [HERRAMIENTA: ${tool.name} (${(tool.toolType || 'custom').toUpperCase()})] ---\nDescripción: ${tool.description || 'Herramienta de juego'}\n${mechanics}`;
        }).join('\n\n');

        narratorToolsDetails = `
[HERRAMIENTAS Y MECÁNICAS MODULARES (TALLER DE FUNCIONES)]:
El narrador tiene acceso a las siguientes herramientas y presets para modularizar la partida. Úsalos como referencia para resolver acciones, calcular daño/éxitos o detonar eventos cuando la situación lo amerite:
${toolsText}
`.trim();
      }
    }

    // 5. Formatear la descripción del personaje del usuario
    let userCharDetails = '';
    if (userChar) {
      userCharDetails = `
[PERSONAJE DEL JUGADOR ({{user}})]:
- Nombre: ${userChar.title || userChar.name}
${userChar.intro ? `- Descripción corta: ${userChar.intro}` : ''}
${userChar.text ? `- Detalles/Historia: ${userChar.text}` : ''}
${userChar.traits && userChar.traits.length > 0 ? `- Rasgos: ${userChar.traits.join(', ')}` : ''}
`.trim();
    }

    // 6. Formatear inventario del personaje
    let userInventoryDetails = '';
    if (userChar) {
      const userInventories = (appData?.cards || []).filter(c => c.type === 'Inventario' && (c.linkedCharacterId === userChar.id || c.linkedCharacterId === userChar.title));
      if (userInventories.length > 0) {
        const invText = userInventories.map(inv => {
          const itemsList = (inv.items || []).map(it => `  * [${it.equipped ? 'EQUIPADO' : 'EN BOLSA'}] ${it.name} (x${it.qty || 1}, ${it.rarity || 'Común'}) - ${it.desc || ''}`).join('\n');
          return `Mochila/Inventario "${inv.title}" (Capacidad: ${inv.capacity || 'Estándar'}):\n${itemsList || '  (Vacío)'}`;
        }).join('\n\n');

        userInventoryDetails = `
[INVENTARIO Y EQUIPAMIENTO DE {{user}}]:
${invText}
`.trim();
      }
    }

    // 7. Formatear los detalles del escenario y reglas adicionales del formulario (Contexto Extra)
    let scenarioDetails = `Escenario: ${chat.scenario}.`;
    if (scenario) {
      scenarioDetails = `
[ESCENARIO JUGABLE]:
- Título: ${scenario.title}
${scenario.intro ? `- Introducción: ${scenario.intro}` : ''}
${scenario.baseContext ? `- Lore / Contexto base: ${scenario.baseContext}` : ''}
${scenario.aiInstructions ? `- Instrucciones adicionales del GM (Contexto Extra): ${scenario.aiInstructions}` : ''}
`.trim();
    }

    // 8. Formatear memorias e hitos (tanto del chat como tarjetas de memoria enlazadas)
    const inChatMemories = (chat.memoryCards || []).map(m => `* ${m}`);
    const cardMemories = (appData?.cards || []).filter(c => c.type === 'Memoria' && (
      c.linkedScenario === chat.scenarioId || 
      (Array.isArray(c.linkedCharacters) && userChar && (c.linkedCharacters.includes(userChar.id) || c.linkedCharacters.includes(userChar.title)))
    )).map(m => `* [Impacto: ${m.impact || 'Medio'}] (${m.timeline || 'Hito'}) ${m.title}: ${m.summary || m.text}`);

    const allMemories = [...inChatMemories, ...cardMemories];
    const memoryContext = allMemories.length > 0 ? allMemories.join('\n') : 'No hay memorias previas registradas.';

    return `
${scenarioDetails}

${narratorDetails}

${narratorToolsDetails ? `${narratorToolsDetails}\n\n` : ''}${userCharDetails}

${userInventoryDetails ? `${userInventoryDetails}\n\n` : ''}[ÓRDENES CONSTANTES DE LA IA]:
${chat.constantPrompt ? chat.constantPrompt : 'Interpreta de manera inmersiva.'}

[REGLAS CRÍTICAS DEL ARNÉS (DIRECTIVAS INVIOLABLES DE NARRACIÓN)]:
1. PROHIBICIÓN TOTAL DE DESCRIBIR EL ASPECTO, CUERPO O INVENTARIO DEL JUGADOR:
   - El jugador YA CONOCE perfectamente cómo es su personaje, qué ropa lleva y qué armas porta.
   - NUNCA malgastes texto ni párrafos describiendo la apariencia física de {{user}}, su musculatura, su equipo al cinto, ni inventes mutaciones o rasgos anatómicos arbitrarios (como orejas de animal, colas, edad o etiquetas). {{user}} es estrictamente humano según su ficha.
   - PROHIBIDO el estilo invasivo de segunda persona ("Eres...", "Tu cuerpo...", "Sientes...", "Tus ojos...").

2. PROHIBICIÓN ABSOLUTA DE ACTUAR O DECIDIR POR EL JUGADOR (NO AUTOPLAY/GODMODING):
   - NUNCA hables, actúes, tomes decisiones, ni describas los pensamientos, intenciones o reacciones físicas de {{user}} (${userChar ? userChar.title || userChar.name : 'el personaje del jugador'}).
   - Limítate a describir cómo reacciona el entorno y qué hacen o dicen los PNJs.
   - Al concluir las consecuencias inmediatas, detén la narración para ceder el turno al jugador.

3. ENFOQUE TOTAL EN EL MUNDO EXTERNO, AMBIENTACIÓN Y PNJS:
   - Centra el 100% de tu vocabulario y esfuerzo descriptivo en lo que rodea a {{user}}: los edificios del poblado, el clima, los olores, la tensión en el aire y, sobre todo, las acciones, diálogos, posturas y miradas de los PNJs que habitan el mundo.

4. CERO ECO / SIN PARAFRASEO REPETITIVO:
   - NO comiences tu respuesta resumiendo, repitiendo o haciendo eco de lo que el usuario acaba de escribir.
   - Entra de lleno en la acción con las consecuencias y reacciones vivas del mundo.

5. LOS PERSONAJES Y PNJs NO SON OMNISCIENTES:
   - Los PNJs y criaturas del mundo poseen conocimiento limitado y subjetivo: solo saben lo que han visto, oído o aprendido en su vida.
   - Ningún PNJ puede leer la mente de {{user}}, conocer sus planes ocultos, intenciones secretas ni adivinar los objetos guardados en su inventario a menos que se les muestre o mencione de forma explícita.

6. MUNDO VIVO, ORGÁNICO Y COHERENTE:
   - El mundo no gira de forma sumisa ante el jugador; las acciones imprudentes conllevan riesgos, consecuencias lógicas y oposición verosímil.
   - Mantén consistencia estricta con el lore del escenario, el inventario y las memorias acumuladas.

7. FORMATO TIPOGRÁFICO ESTRICTO (PARA EL MOTOR VISUAL):
   - Diálogos hablados: EXCLUSIVAMENTE entre comillas dobles: "Hola, forastero."
   - Acciones, descripciones y narrativa del mundo: EXCLUSIVAMENTE entre asteriscos: *El tabernero limpió la mesa con un trapo húmedo.*
   - Pensamientos o monólogos internos: entre virgulillas: ~¿Estará diciendo la verdad?~
   - Términos, pistas, lugares o nombres clave: entre signos de igual: ==Vallebruma==

[MEMORIAS Y HECHOS DE LA HISTORIA]:
${memoryContext}
`.trim();
  };

  // Función asíncrona en segundo plano para realizar el resumen de contexto y generar memorias.
  // Protegida ante fallos por try-catch y persistida en almacenamiento local e IndexedDB.
  const runBackgroundSummarization = (finalMsgs) => {
    setTimeout(async () => {
      try {
        const newSummary = await sendContextSummarizationTask({
          messages: finalMsgs,
          currentMemory: chat.memoryCards || [],
          modelId: chatSettings?.preferredModel,
          baseUrl: chatSettings?.lmStudioUrl
        });
        if (newSummary && typeof newSummary === 'string' && newSummary.trim()) {
          console.log('[Context Summary Task]: Nueva memoria generada:', newSummary);
          const nextMemory = [...(chat.memoryCards || []), newSummary.trim()];
          
          // Mutación segura en el objeto para sincronizar la vista del TopBar y persistencia
          chat.memoryCards = nextMemory;
          
          const updatedChat = { ...chat, messages: finalMsgs, memoryCards: nextMemory };
          const { addChat } = await import('../utils/db');
          await addChat(updatedChat);
          if (folderHandle) {
            try { await saveChatToFolder(updatedChat, folderHandle); } catch (e) {}
          }
          
          setMessages(finalMsgs);
        }
      } catch (sumErr) {
        console.warn('[Context Summary Task]: Fallo en la tarea de resumen:', sumErr);
      }
    }, 1000);
  };

  const handleDeleteMessage = async (idxToDelete) => {
    if (window.confirm('¿Eliminar este mensaje del historial?')) {
      const nextMsgs = messages.filter((_, i) => i !== idxToDelete);
      await persistMessages(nextMsgs);
    }
  };

  const handleRewindToMessage = async (idx) => {
    if (window.confirm(`¿Rebobinar chat hasta este mensaje (#${idx + 1})? Los mensajes posteriores se eliminarán.`)) {
      const nextMsgs = messages.slice(0, idx + 1);
      await persistMessages(nextMsgs);
    }
  };

  const handleRedo = async (specificIdx = null) => {
    if (isSending || messages.length === 0) return;

    let targetIdx = specificIdx;
    if (targetIdx === null) {
      // Buscar el último mensaje de la IA / Narrador
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].from !== 'user') {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx === null || targetIdx < 0) {
      return;
    }

    // Contexto previo: todos los mensajes anteriores a esta respuesta
    const historyBefore = messages.slice(0, targetIdx);
    if (historyBefore.length === 0) {
      alert('No hay prompt previo para regenerar esta respuesta.');
      return;
    }

    const aiRole = messages[targetIdx]?.from || 'narrator';
    const streamingPlaceholder = {
      from: aiRole,
      text: '',
      timestamp: new Date().toISOString()
    };

    // Truncar historial para eliminar la respuesta anterior e insertar el placeholder de stream
    await persistMessages(historyBefore);
    setMessages([...historyBefore, streamingPlaceholder]);
    setIsSending(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const res = await sendChatMessage({
        messages: historyBefore,
        systemInstruction: systemPrompt,
        contextDocuments: chat.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          setMessages(prev => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
            }
            return copy;
          });
        }
      });

      const newAiMsg = {
        from: aiRole,
        text: res.text || 'Sin respuesta.',
        timestamp: new Date().toISOString()
      };
      const finalMsgs = [...historyBefore, newAiMsg];
      await persistMessages(finalMsgs);
      runBackgroundSummarization(finalMsgs);

    } catch (err) {
      console.error("Error al rehacer respuesta:", err);
      const errorMsg = {
        from: 'ai',
        text: `[Error al rehacer]: ${err.message || 'LM Studio no accesible.'}`,
        timestamp: new Date().toISOString()
      };
      await persistMessages([...historyBefore, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputMsg;
    if ((!textToSend.trim() && overrideText === null) || isSending) return;

    const newMsg = { from: 'user', text: textToSend.trim() || '...', timestamp: new Date().toISOString() };
    const nextMsgs = textToSend.trim() ? [...messages, newMsg] : messages;
    
    const streamingAiMsg = { from: 'ai', text: '', timestamp: new Date().toISOString() };
    
    if (textToSend.trim()) {
      await persistMessages(nextMsgs);
    }
    setMessages([...nextMsgs, streamingAiMsg]);
    
    if (overrideText === null) setInputMsg('');
    setIsSending(true);

    try {
      const systemPrompt = buildSystemPrompt();

      const res = await sendChatMessage({
        messages: nextMsgs,
        systemInstruction: systemPrompt,
        contextDocuments: chat.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          setMessages(prev => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
            }
            return copy;
          });
        }
      });

      const aiMsg = { from: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date().toISOString() };
      const finalMsgs = [...nextMsgs, aiMsg];
      await persistMessages(finalMsgs);

      // Lanzar el resumen de contexto automático en segundo plano
      runBackgroundSummarization(finalMsgs);

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
    
    const streamingAiMsg = { from: 'ai', text: '', timestamp: new Date().toISOString() };
    setMessages([...messages, streamingAiMsg]);
    setIsSending(true);

    try {
      const basePrompt = buildSystemPrompt();
      const systemPrompt = `${basePrompt}\n\n[ÓRDENE EXTRA DE INMEDIATA]: Continúa la narración desde el punto exacto donde quedó.`;

      const res = await sendChatMessage({
        messages: messages,
        systemInstruction: systemPrompt,
        contextDocuments: chat.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          setMessages(prev => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
            }
            return copy;
          });
        }
      });

      const aiMsg = { from: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date().toISOString() };
      const finalMsgs = [...messages, aiMsg];
      await persistMessages(finalMsgs);

      // Lanzar el resumen de contexto automático en segundo plano
      runBackgroundSummarization(finalMsgs);

    } catch (err) {
      console.error("Error al continuar chat:", err);
      const errorMsg = { from: 'ai', text: `[Error de conexión con IA]: ${err.message || 'LM Studio no accesible.'}`, timestamp: new Date().toISOString() };
      await persistMessages([...messages, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const chatRef = useRef(null);

  const custom = chat?.customStyle || {};
  const global = chatSettings || {};

  const effectiveFontFamily = custom.fontFamily || global.fontFamily || 'default';
  const effectiveFontSize = custom.fontSize || global.fontSize || 'normal';
  const effectiveTextColor = custom.textColor || global.textColor || '#eaeaea';
  const effectiveDialogueColor = custom.dialogueColor || global.dialogueColor || '#ffd36b';
  const effectiveActionColor = custom.actionColor || global.actionColor || '#6ee7b7';
  const effectiveThoughtColor = custom.thoughtColor || global.thoughtColor || '#c084fc';
  const effectiveAiBubbleBg = custom.aiBubbleBg || global.aiBubbleBg || 'rgba(255, 255, 255, 0.03)';
  const effectiveUserBubbleBg = custom.userBubbleBg || global.userBubbleBg || 'rgba(255, 211, 107, 0.1)';

  const fontFamiliesMap = {
    default: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "'Merriweather', 'Georgia', 'Crimson Text', serif",
    fantasy: "'Cinzel', 'Palatino', 'Book Antiqua', serif",
    mono: "'Fira Code', 'Consolas', 'Courier New', monospace",
    round: "'Quicksand', 'Nunito', 'Segoe UI', sans-serif"
  };

  const fontSizesMap = {
    small: '0.85rem',
    normal: '0.95rem',
    medium: '1.08rem',
    large: '1.22rem',
    xlarge: '1.38rem'
  };

  const containerStyle = {
    '--chat-font-family': fontFamiliesMap[effectiveFontFamily] || fontFamiliesMap.default,
    '--chat-font-size': fontSizesMap[effectiveFontSize] || fontSizesMap.normal,
    '--chat-text-color': effectiveTextColor,
    '--chat-dialogue-color': effectiveDialogueColor,
    '--chat-action-color': effectiveActionColor,
    '--chat-thought-color': effectiveThoughtColor,
    '--chat-ai-bubble-bg': effectiveAiBubbleBg,
    '--chat-user-bubble-bg': effectiveUserBubbleBg,
  };

  return (
    <div className="chat-container" style={containerStyle}>
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
                  {m.from !== 'user' && (
                    <button 
                      title="Rehacer esta respuesta de la IA" 
                      onClick={() => handleRedo(idx)}
                      disabled={isSending}
                    >
                      <FontAwesomeIcon icon={faUndo} />
                    </button>
                  )}
                  <button 
                    title={speakingMessageId === `${m.from}-${idx}` ? "Detener voz" : "Escuchar mensaje"} 
                    onClick={() => handleSpeakMessage(m, idx)}
                    style={{ color: speakingMessageId === `${m.from}-${idx}` ? '#ffd36b' : 'inherit' }}
                  >
                    <FontAwesomeIcon icon={speakingMessageId === `${m.from}-${idx}` ? faTimes : faVolumeUp} />
                  </button>
                  <button title="Editar mensaje" onClick={() => { setEditingIndex(idx); setEditText(m.text); }}><FontAwesomeIcon icon={faEdit} /></button>
                  <button title="Bifurcar chat aquí (Branch)" onClick={() => onBranchChat && onBranchChat(chat, messages.slice(0, idx + 1))}><FontAwesomeIcon icon={faCodeBranch} /></button>
                  <button title="Rebobinar hasta aquí (Rewind)" onClick={() => handleRewindToMessage(idx)}><FontAwesomeIcon icon={faHistory} /></button>
                  <button title="Eliminar mensaje" onClick={() => handleDeleteMessage(idx)} style={{ color: '#eb5757' }}><FontAwesomeIcon icon={faTrashAlt} /></button>
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
                  {!m.text && isSending && idx === messages.length - 1 ? (
                    <span className="typing-dots" style={{ fontStyle: 'italic', color: 'rgba(255, 211, 107, 0.8)' }}>
                      *El narrador procesa y redacta su respuesta...*
                    </span>
                  ) : (
                    <>
                      <FormattedMessageText text={m.text} />
                      {isSending && idx === messages.length - 1 && (
                        <span className="streaming-cursor" style={{ display: 'inline-block', width: '7px', height: '14px', background: '#ffd36b', marginLeft: '4px', verticalAlign: '-1px', borderRadius: '1px', opacity: 0.8 }} />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
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
                  }
                  if (newCardType === 'Personaje') {
                    setPopupCharacter(newCardObj);
                  } else {
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
          <div className="tools-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" className="tool-btn format-dialogue" title="Insertar Diálogo ('...')" onClick={() => insertFormatting('dialogue')}>
              <FontAwesomeIcon icon={faCommentDots} style={{ color: '#ffd36b' }} /> <span>Diálogo</span>
            </button>
            <button type="button" className="tool-btn format-action" title="Insertar Acción (*...*)" onClick={() => insertFormatting('action')}>
              <FontAwesomeIcon icon={faRunning} style={{ color: '#6ee7b7' }} /> <span>Acción</span>
            </button>
            <button type="button" className="tool-btn format-thought" title="Insertar Pensamiento (~...~)" onClick={() => insertFormatting('thought')}>
              <FontAwesomeIcon icon={faBrain} style={{ color: '#c084fc' }} /> <span>Pensamiento</span>
            </button>
            <button type="button" className="tool-btn format-highlight" title="Insertar Resaltado (==...==)" onClick={() => insertFormatting('highlight')}>
              <FontAwesomeIcon icon={faHighlighter} style={{ color: '#fbbf24' }} /> <span>Resaltar</span>
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
            <button type="button" className="tool-btn action" title="Rehacer última respuesta de la IA" onClick={() => handleRedo()} disabled={isSending}>
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

      <CharacterPopup 
        scenario={popupCharacter}
        isOpen={!!popupCharacter}
        onClose={() => setPopupCharacter(null)}
      />
    </div>
  );
}
