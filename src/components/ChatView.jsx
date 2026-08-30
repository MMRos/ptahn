import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  faMagic,
  faLanguage,
  faSpinner,
  faKeyboard,
  faEye,
  faEyeSlash,
  faUserCircle,
  faExternalLinkAlt,
  faSave
} from '@fortawesome/free-solid-svg-icons';
import { sendChatMessage, generateImageLocal, generateCharacterPortrait, generateLocationWallpaper, generateAudioLocal, sendContextSummarizationTask, sendExtractCardsTask, translateChatMessage } from '../utils/localAIStudio';
import { resolveTargetLanguage, getLanguageDirective } from '../utils/language';
import { autoCompleteEntityWithAI } from '../utils/aiEnhancer';
import { saveChatToFolder, saveAppDataToFolder } from '../utils/storage';
import { speakBrowserUtterance, cancelBrowserSpeech } from '../utils/speechTTS';
import { FormattedMessageText, findMatchingEntity, normalizeEntityName } from '../utils/textFormatter';
import { detectActiveCharacter, matchCharacterExpression, resolveLocationWallpaper } from '../utils/characterMatcher';
import { getNsfwDynamicsDirective } from '../utils/nsfwDynamics';
import { executeInboundOrchestration, executeOutboundOrchestration } from '../utils/orchestratorPipeline';
import { filterAndSortRelevantCards } from '../utils/weightCalculator';
import { addChat } from '../utils/db';


import StagingModal from './StagingModal';
import CharacterPopup from './CharacterPopup';
import CharacterSidebar from './CharacterSidebar';
import ConfirmModal from './ConfirmModal';
import './chats.css';

export function getScenarioCards(scenario, chat, appData, userChar) {
  const allCards = appData?.cards || [];
  const scenarioCardIdsOrTitles = Array.isArray(scenario?.cards) ? scenario.cards : [];
  const chatCharacterIdsOrTitles = Array.isArray(chat?.characters) ? chat.characters.map(c => c.id || c.name) : [];

  return allCards.filter(c => {
    if (!c) return false;
    if (userChar && (c.id === userChar.id || c.title === userChar.title)) return false;
    if (c.type === 'Inventario' || c.type === 'Memoria') return false;

    // 1. Direct link in scenario.cards
    const isDirectlyLinked = scenarioCardIdsOrTitles.some(idOrTitle => 
      idOrTitle === c.id || 
      idOrTitle === c.title || 
      (c.title && idOrTitle && normalizeEntityName(c.title) === normalizeEntityName(idOrTitle))
    );
    if (isDirectlyLinked) return true;

    // 2. Direct link in chat.characters
    const isChatLinked = chatCharacterIdsOrTitles.some(idOrTitle => 
      idOrTitle === c.id || 
      idOrTitle === c.title || 
      (c.title && idOrTitle && normalizeEntityName(c.title) === normalizeEntityName(idOrTitle))
    );
    if (isChatLinked) return true;

    // 3. Card has linkedScenario matching scenario ID or title
    const isScenarioLinked = c.linkedScenario === chat?.scenarioId || 
                             c.linkedScenario === scenario?.title || 
                             c.linkedScenario === scenario?.id || 
                             (scenario?.title && c.linkedScenario && normalizeEntityName(c.linkedScenario) === normalizeEntityName(scenario.title));
    if (isScenarioLinked) return true;

    // 4. Connected cards matching scenario
    const isConnected = Array.isArray(c.connectedCards) && (
      (chat?.scenarioId && c.connectedCards.includes(chat.scenarioId)) || 
      (scenario?.title && c.connectedCards.includes(scenario.title)) || 
      (scenario?.id && c.connectedCards.includes(scenario.id)) ||
      (scenario?.title && c.connectedCards.some(cc => normalizeEntityName(cc) === normalizeEntityName(scenario.title)))
    );
    if (isConnected) return true;

    return false;
  });
}

export default function ChatView({ chat, onBack, onBranchChat, onUpdateChat, onDeleteChat, folderHandle, appData, onUpdateAppData, chatSettings = {}, onUpdateChatSettings = () => {}, onOpenCreateModal }) {
  const [messages, setMessages] = useState(chat?.messages || []);
  const [inputMsg, setInputMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ percent: 0, status: 'Iniciando...' });
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [popupCharacter, setPopupCharacter] = useState(null);
  const [activeEntityModal, setActiveEntityModal] = useState(null);
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [isGeneratingTagCover, setIsGeneratingTagCover] = useState(false);
  const [isGeneratingSidebarPortrait, setIsGeneratingSidebarPortrait] = useState(false);
  const [translatingMsgId, setTranslatingMsgId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isPeekTransparent, setIsPeekTransparent] = useState(false);
  const [isCharacterSidebarClosed, setIsCharacterSidebarClosed] = useState(false);
  const [manualCharacterImageId, setManualCharacterImageId] = useState(null);
  const [manualCharacterOverride, setManualCharacterOverride] = useState(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef(chat?.id);

  useEffect(() => {
    activeChatIdRef.current = chat?.id;
  }, [chat?.id]);

  // Sincronizar apertura de la Zona B si el usuario la activa desde el menú de Ajustes
  useEffect(() => {
    if (chatSettings?.showCharacterSidebar !== false) {
      setIsCharacterSidebarClosed(false);
    }
  }, [chatSettings?.showCharacterSidebar]);

  // Auto-scroll para mostrar siempre la última interacción al abrir, refrescar o recibir mensajes
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    } else if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };

  // Scroll instantáneo y sincronización de mensajes al montar o cambiar de chat
  useEffect(() => {
    activeChatIdRef.current = chat?.id;
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
        persistChatMessages(chat?.id, chat, currentMsgs);
      }
    }
    setMessages(currentMsgs);
    setManualCharacterOverride(null);
    setManualCharacterImageId(null);
    scrollToBottom('auto');
    const timer = setTimeout(() => scrollToBottom('auto'), 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);

  // Scroll dinámico cuando cambian los mensajes o durante el streaming
  useEffect(() => {
    if (isSending) {
      scrollToBottom('auto');
    } else {
      scrollToBottom('smooth');
    }
  }, [messages.length, isSending]);

  // States para generación manual y automática de tarjetas (persistido en localStorage)
  const [autoGenCards, setAutoGenCards] = useState(() => {
    try {
      const saved = localStorage.getItem('ptahn_auto_gen_cards');
      return saved !== null ? saved === 'true' : false;
    } catch (e) {
      return false;
    }
  });

  const handleToggleAutoGenCards = (checked) => {
    setAutoGenCards(checked);
    try {
      localStorage.setItem('ptahn_auto_gen_cards', checked ? 'true' : 'false');
    } catch (e) {}
  };

  const [isSelectingForCard, setIsSelectingForCard] = useState(false);
  const [selectedMessagesForCard, setSelectedMessagesForCard] = useState([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState('Personaje');
  const [newCardText, setNewCardText] = useState('');

  // Manejar clic en etiquetas doradas/verdes ==texto==
  const handleTagClick = (tagContent, existingEntity) => {
    const resolvedEntity = existingEntity || findMatchingEntity(tagContent, appData);
    setActiveEntityModal({
      tagName: tagContent,
      existing: resolvedEntity || null,
      draftType: resolvedEntity ? (resolvedEntity.type || 'Lugar') : 'Personaje',
      draftTitle: resolvedEntity ? (resolvedEntity.title || resolvedEntity.name || tagContent) : tagContent,
      draftIntro: resolvedEntity ? (resolvedEntity.intro || '') : '',
      draftText: resolvedEntity ? (resolvedEntity.text || resolvedEntity.desc || '') : '',
      draftCover: resolvedEntity ? (resolvedEntity.cover || '') : '',
      draftTraits: resolvedEntity ? (resolvedEntity.traits || []) : []
    });
  };

  // Generar lore automático para la tarjeta basada en el término y contexto
  const handleGenerateTagLore = async () => {
    if (!activeEntityModal || isGeneratingLore) return;
    setIsGeneratingLore(true);
    try {
      const scenario = (appData?.scenarios || []).find(s => s.id === chat?.scenarioId || s.title?.toLowerCase() === (chat?.scenario || '').toLowerCase()) ||
                       (appData?.cards || []).find(c => c.id === chat?.scenarioId || c.title?.toLowerCase() === (chat?.scenario || '').toLowerCase()) ||
                       findMatchingEntity(chat?.scenario, appData);
      const recentHistory = messages.slice(-8).map(m => (m.from === 'user' ? 'Jugador: ' : 'Narrador: ') + m.text).join('\n');
      const scenarioContext = scenario ? `[Escenario: ${scenario.title}. Lore base: ${scenario.baseContext || scenario.intro || 'Sin contexto adicional'}]` : `[Escenario: ${chat?.scenario || 'Fantasía'}]`;
      const targetLang = resolveTargetLanguage(chatSettings?.preferredLanguage, [recentHistory, scenario?.baseContext, activeEntityModal.draftTitle]);

      const prompt = `Provide a rich, precise, and highly atmospheric 2-3 sentence description for the entity "${activeEntityModal.draftTitle}" of type "${activeEntityModal.draftType}".

[SCENARIO CONTEXT & WORLD LORE]:
${scenarioContext}

[RECENT STORY EVENTS WHERE THIS ENTITY APPEARS]:
${recentHistory || 'Beginning of the game session.'}

[MANDATORY SITUATIONAL COHERENCE RULES]:
1. If the character has a specific role, physical condition, or situation in the ongoing scene (e.g. captive, enslaved, merchant, injured guard, etc.), your description MUST strictly reflect that exact reality.
2. STRICTLY FORBIDDEN to invent generic, ungrounded mythological archetypes that contradict the ongoing scene (e.g. do not invent free forest guardians if the scene portrays an enslaved captive in a town square).
3. Output language: Write the description strictly in ${targetLang.name} (${targetLang.code}).`;

      const res = await sendChatMessage({
        messages: [{ from: 'user', text: prompt }],
        systemInstruction: `You are the Compendium Lorekeeper of a tabletop RPG.
Generate rich, highly atmospheric, and strictly context-grounded compendium descriptions.
Language: Output MUST be strictly in ${targetLang.name} (${targetLang.code}).
Respond directly with the descriptive lore text without introductory fluff or preamble.`,
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

  // Generar portada o retrato para el popup de entidad
  const handleGenerateTagCover = async () => {
    if (!activeEntityModal || isGeneratingTagCover) return;
    setIsGeneratingTagCover(true);
    try {
      const isChar = activeEntityModal.draftType === 'Personaje';
      const isLocation = activeEntityModal.draftType === 'Lugar';
      const promptTitle = activeEntityModal.draftTitle;
      const promptIntro = activeEntityModal.draftIntro || activeEntityModal.draftText || '';
      let url = '';
      if (isChar) {
        url = await generateCharacterPortrait(promptTitle, activeEntityModal.draftTraits || [], promptIntro, chatSettings?.preferredImageModel);
      } else if (isLocation) {
        url = await generateLocationWallpaper(promptTitle, activeEntityModal.draftIntro, activeEntityModal.draftText, chatSettings?.preferredImageModel);
      } else {
        url = await generateImageLocal(`${promptTitle}, ${activeEntityModal.draftType}, ${promptIntro}`, 'Fantasía Oscura / Entornos', '', chatSettings?.preferredImageModel);
      }
      if (url) {
        setActiveEntityModal(prev => ({
          ...prev,
          draftCover: url
        }));
      }
    } catch (err) {
      console.warn('Error generating cover for entity modal:', err);
    } finally {
      setIsGeneratingTagCover(false);
    }
  };

  // Generar retrato para personaje enfocado en Zona B
  const handleGenerateSidebarPortrait = async (char) => {
    if (!char || isGeneratingSidebarPortrait) return;
    setIsGeneratingSidebarPortrait(true);
    try {
      const portraitUrl = await generateCharacterPortrait(
        char.title || char.name,
        char.traits || [],
        char.intro || char.text || '',
        chatSettings?.preferredImageModel
      );
      if (portraitUrl && appData && onUpdateAppData) {
        const newImageObj = { id: `img-${Date.now()}`, url: portraitUrl, label: 'Retrato IA', isDefault: true };
        const existingImages = Array.isArray(char.images || char.characterImages) ? (char.images || char.characterImages) : [];
        const nextImages = [newImageObj, ...existingImages.map(img => ({ ...img, isDefault: false }))];
        
        const updatedChar = {
          ...char,
          cover: portraitUrl,
          characterImages: nextImages,
          images: nextImages
        };
        const nextCards = (appData.cards || []).map(c => c.id === char.id ? updatedChar : c);
        const nextData = { ...appData, cards: nextCards };
        onUpdateAppData(nextData);
        if (folderHandle) saveAppDataToFolder(folderHandle, nextData).catch(console.warn);
      }
    } catch (e) {
      console.warn('[Sidebar Portrait Gen]: Failed to generate portrait:', e);
      alert(`[Generador de Imágenes]: ${e.message || 'No se pudo generar la ilustración. Verifica que el servidor de difusión esté activo.'}`);
    } finally {
      setIsGeneratingSidebarPortrait(false);
    }
  };

  // Guardar la tarjeta en el compendio de appData
  const handleSaveTagCard = () => {
    if (!activeEntityModal) return;
    const title = activeEntityModal.draftTitle.trim();
    if (!title) return;

    if (activeEntityModal.existing) {
      const isChar = activeEntityModal.draftType === 'Personaje';
      const updatedCard = {
        ...activeEntityModal.existing,
        type: activeEntityModal.draftType,
        title: title,
        intro: activeEntityModal.draftIntro,
        text: activeEntityModal.draftText,
        cover: activeEntityModal.draftCover || activeEntityModal.existing.cover || '',
        characterImages: (isChar && activeEntityModal.draftCover) 
          ? [{ id: `img-${Date.now()}`, url: activeEntityModal.draftCover, label: 'Principal', isDefault: true }, ...(activeEntityModal.existing.characterImages || [])]
          : (activeEntityModal.existing.characterImages || [])
      };
      if (appData && onUpdateAppData) {
        const nextCards = (appData.cards || []).map(c => c.id === updatedCard.id ? updatedCard : c);
        const nextData = { ...appData, cards: nextCards };
        onUpdateAppData(nextData);
        if (folderHandle) saveAppDataToFolder(folderHandle, nextData).catch(console.warn);
      }
    } else {
      const isChar = activeEntityModal.draftType === 'Personaje';
      const coverUrl = activeEntityModal.draftCover || '';
      const newCard = {
        id: `card_${Date.now()}`,
        type: activeEntityModal.draftType,
        title: title,
        intro: activeEntityModal.draftIntro || (activeEntityModal.draftText ? activeEntityModal.draftText.substring(0, 80) + '...' : ''),
        text: activeEntityModal.draftText || '',
        cover: coverUrl,
        characterImages: (isChar && coverUrl) ? [{ id: 'img-1', url: coverUrl, label: 'Principal', isDefault: true }] : [],
        tags: [],
        traits: activeEntityModal.draftTraits || [],
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

  const persistChatMessages = async (targetChatId, targetChatMeta, nextMsgs) => {
    if (!targetChatId) return;
    const now = new Date().toISOString();
    const updatedChat = { 
      ...(targetChatMeta || {}),
      id: targetChatId,
      messages: nextMsgs,
      updatedAt: now
    };
    try { await addChat(updatedChat); } catch(err) { console.warn('IndexedDB save err:', err); }
    if (folderHandle) {
      try { await saveChatToFolder(updatedChat, folderHandle); } catch (err) {}
    }
    if (activeChatIdRef.current === targetChatId) {
      setMessages(nextMsgs);
      if (onUpdateChat) {
        onUpdateChat(updatedChat);
      }
    }
  };

  const persistMessages = async (nextMsgs) => {
    return persistChatMessages(chat?.id, chat, nextMsgs);
  };

  const handleSpeakMessage = async (message, idx) => {
    const msgId = `${message.from}-${idx}`;
    if (speakingMessageId === msgId) {
      if (window.activeAudioElement) {
        window.activeAudioElement.pause();
        window.activeAudioElement = null;
      } else {
        cancelBrowserSpeech();
      }
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);

    // Encontrar el narrador activo del escenario actual
    const scenario = appData?.scenarios?.find(s => s.id === chat.scenarioId);
    const narrator = (appData?.narrators || []).find(n => n.id === scenario?.narrator);

    const textToSpeak = message.text;

    const fallbackBrowserSpeech = () => {
      speakBrowserUtterance({
        text: textToSpeak,
        voiceURI: narrator?.voiceURI,
        pitch: narrator?.pitch || 1.0,
        rate: narrator?.rate || 1.0,
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null)
      });
    };

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
            fallbackBrowserSpeech();
          };
          audio.play().catch(() => {
            setSpeakingMessageId(null);
          });
        } else {
          fallbackBrowserSpeech();
        }
      } catch (err) {
        fallbackBrowserSpeech();
      }
    } else {
      fallbackBrowserSpeech();
    }
  };

  // Traducción a demanda del mensaje al idioma predeterminado
  const handleTranslateMessage = async (m, idx) => {
    if (translatingMsgId !== null || !m?.text) return;
    const msgId = `${m.from}-${idx}`;
    setTranslatingMsgId(msgId);
    try {
      const targetLang = chatSettings?.preferredLanguage || 'es';
      const translated = await translateChatMessage({
        text: m.text,
        targetLanguage: targetLang,
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl
      });
      if (translated && translated.trim()) {
        const next = [...messages];
        next[idx] = { ...next[idx], text: translated.trim() };
        setMessages(next);
        await persistMessages(next);
      }
    } catch (err) {
      console.warn('[Translate Message Error]:', err);
      alert('No se pudo traducir el mensaje. Comprueba que el servidor de IA local esté activo.');
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // Construcción unificada y estructurada del systemPrompt (arnés de contexto).
  // Consolida los detalles del escenario, personajes/PNJs preestablecidos, narrador, herramientas del taller, jugador, inventario y memorias.
  const buildSystemPrompt = (preFilteredEntities = null) => {
    // 1. Resolve linked scenario and narrator
    const scenario = (appData?.scenarios || []).find(s => s.id === chat.scenarioId || s.title?.toLowerCase() === (chat.scenario || '').toLowerCase()) ||
                     (appData?.cards || []).find(c => c.id === chat.scenarioId || c.title?.toLowerCase() === (chat.scenario || '').toLowerCase()) ||
                     findMatchingEntity(chat.scenario, appData);
    const narrator = (appData?.narrators || []).find(n => n.id === scenario?.narrator);

    // 2. Resolve player character sheet
    const userChar = (appData?.cards || []).find(c => c.id === chat.characterId || c.title?.toLowerCase() === (chat.character || '').toLowerCase()) ||
                     findMatchingEntity(chat.character, appData?.cards);

    // 3. Format Narrator/DM Profile
    let narratorDetails = '';
    if (narrator) {
      narratorDetails = `
[ACTIVE GAME MASTER / NARRATOR PROFILE]:
- Name: ${narrator.name}
${narrator.bio ? `- Narrative Directives: ${narrator.bio}` : ''}
${narrator.style ? `- Prose Style: ${narrator.style}` : ''}
${narrator.tone ? `- Tone: ${narrator.tone}` : ''}
${narrator.rules ? `- Narrator Rules: ${narrator.rules}` : ''}
${narrator.randomization ? `- Mechanics/Randomness: ${narrator.randomization}` : ''}
`.trim();
    }

    // 4. Format modular tools from workshop
    let narratorToolsDetails = '';
    if (narrator && narrator.tools && narrator.tools.length > 0) {
      const assignedTools = (appData?.tools || []).filter(t => narrator.tools.includes(t.id));
      if (assignedTools.length > 0) {
        const toolsText = assignedTools.map(tool => {
          let mechanics = '';
          if (tool.toolType === 'attributes') {
            const attrs = tool.config?.attributes || [];
            mechanics = `System Attribute Bars:\n` + attrs.map(a => `  * ${a.name} [${a.current ?? a.max}/${a.max}] (Color: ${a.color || 'auto'}) - ${a.desc || 'Metric/Resource'}`).join('\n');
          } else if (tool.toolType === 'progression') {
            const levels = tool.config?.levels || [];
            mechanics = `Progression Scale (${tool.config?.scaleName || 'Level'}):\n` + levels.map(l => `  * Level ${l.level} (${l.title}): ${l.perks || 'Requirements/Perks'}`).join('\n');
          } else if (tool.toolType === 'dice') {
            const dice = tool.config?.diceType || '1d20';
            const dc = tool.config?.defaultDC || '12';
            mechanics = `Resolution System: Dice ${dice} (Base DC: ${dc}). Crits: Success on ${tool.config?.critSuccess || 20}, Fail on ${tool.config?.critFail || 1}. Modifiers: ${tool.config?.statModifier || 'Relevant Attribute'}.`;
          } else if (tool.toolType === 'events') {
            const evts = tool.config?.events || [];
            mechanics = `Event & Encounter Table (${tool.config?.diceType || '1d20'}):\n` + evts.map(e => `  * Range [${e.min}-${e.max}]: ${e.event} (${e.severity || 'Normal'})`).join('\n');
          } else {
            mechanics = `Custom Mechanics & Rules:\n${tool.config?.customRules || tool.description || 'No specific rules.'}`;
          }
          return `--- [TOOL: ${tool.name} (${(tool.toolType || 'custom').toUpperCase()})] ---\nDescription: ${tool.description || 'Game Mechanic Tool'}\n${mechanics}`;
        }).join('\n\n');

        narratorToolsDetails = `
[MODULAR GAME MECHANICS & TOOL WORKSHOP]:
The Game Master has access to the following modular tools and mechanics. Reference them when resolving checks, damage, DC tests, or triggering events:
${toolsText}
`.trim();
      }
    }

    // 5. Format Player Character dossier
    let userCharDetails = '';
    if (userChar) {
      userCharDetails = `
[PLAYER CHARACTER DOSSIER ({{user}})]:
- Name: ${userChar.title || userChar.name}
${userChar.intro ? `- Brief Summary: ${userChar.intro}` : ''}
${userChar.text ? `- Background/Details: ${userChar.text}` : ''}
${userChar.traits && userChar.traits.length > 0 ? `- Traits: ${userChar.traits.join(', ')}` : ''}
`.trim();
    }

    // 6. Format Player Inventory
    let userInventoryDetails = '';
    if (userChar) {
      const userInventories = (appData?.cards || []).filter(c => c.type === 'Inventario' && (c.linkedCharacterId === userChar.id || c.linkedCharacterId === userChar.title));
      if (userInventories.length > 0) {
        const invText = userInventories.map(inv => {
          const itemsList = (inv.items || []).map(it => `  * [${it.equipped ? 'EQUIPPED' : 'IN BAG'}] ${it.name} (x${it.qty || 1}, ${it.rarity || 'Common'}) - ${it.desc || ''}`).join('\n');
          return `Inventory/Bag "${inv.title}" (Capacity: ${inv.capacity || 'Standard'}):\n${itemsList || '  (Empty)'}`;
        }).join('\n\n');

        userInventoryDetails = `
[PLAYER INVENTORY & EQUIPMENT ({{user}})]:
${invText}
`.trim();
      }
    }

    // 7. Format Playable Scenario details
    let scenarioDetails = `Scenario: ${chat.scenario}.`;
    if (scenario) {
      scenarioDetails = `
[ACTIVE PLAYABLE SCENARIO]:
- Scenario Title: ${scenario.title}
${scenario.intro ? `- Introduction: ${scenario.intro}` : ''}
${scenario.baseContext ? `- Base Lore / World Context: ${scenario.baseContext}` : ''}
${scenario.aiInstructions ? `- Game Master Custom Directives (Extra Context): ${scenario.aiInstructions}` : ''}
`.trim();
    }

    // 7.1 Format Pre-established Scenario Entities by Exact Category (Strict Typological Separation)
    let scenarioEntitiesDetails = '';
    const scenarioCards = getScenarioCards(scenario, chat, appData, userChar);

    const relevantEntities = (preFilteredEntities && Array.isArray(preFilteredEntities) && preFilteredEntities.length > 0)
      ? preFilteredEntities.filter(p => scenarioCards.some(sc => sc.id === p.id || sc.title === p.title))
      : filterAndSortRelevantCards(scenarioCards, {
          recentText: messages.slice(-3).map(m => m.text || '').join(' '),
          maxLimit: 8
        });

    if (relevantEntities.length > 0) {
      const formatCardEntry = (ent, label) => {
        const traitsStr = ent.traits && ent.traits.length > 0 ? `  * Personality & Traits: ${ent.traits.join(', ')}\n` : '';
        const tagsStr = ent.tags && ent.tags.length > 0 ? `  * Tags: ${ent.tags.join(', ')}\n` : '';
        const introStr = ent.intro ? `  * Summary: ${ent.intro}\n` : '';
        const bioStr = (ent.description || ent.text) ? `  * Lore & Description: ${ent.description || ent.text}\n` : '';
        return `--- [${label}: ${ent.title || ent.name || 'Entidad'}${ent.subtype ? ` (${ent.subtype})` : ''}] ---\n${introStr}${bioStr}${traitsStr}${tagsStr}`.trim();
      };

      const locationCards = relevantEntities.filter(e => (e.type || '').toLowerCase() === 'lugar');
      const raceCards = relevantEntities.filter(e => (e.type || '').toLowerCase() === 'raza');
      const characterCards = relevantEntities.filter(e => {
        const t = (e.type || '').toLowerCase();
        return t === 'personaje' || t === 'npc' || (!t && !e.subtype);
      });
      const factionCards = relevantEntities.filter(e => {
        const t = (e.type || '').toLowerCase();
        return t === 'facción' || t === 'faccion';
      });
      const itemCards = relevantEntities.filter(e => {
        const t = (e.type || '').toLowerCase();
        return t === 'objeto' || t === 'inventario' || t === 'item';
      });
      const otherCards = relevantEntities.filter(e => 
        !locationCards.includes(e) && !raceCards.includes(e) && !characterCards.includes(e) && !factionCards.includes(e) && !itemCards.includes(e)
      );

      const sections = [];

      if (locationCards.length > 0) {
        sections.push(`[SCENARIO LOCATIONS, TOWNS & GEOGRAPHY (PLACES / LUGAR)]:
CRITICAL NOTE: The following entries are PHYSICAL PLACES, TOWNS, BUILDINGS, OR GEOGRAPHY. They are INANIMATE ENVIRONMENTS, NOT living persons or NPCs. NEVER personify, give dialogue, thoughts, animal body parts, or ears to a location.
${locationCards.map(c => formatCardEntry(c, 'LOCATION')).join('\n\n')}`);
      }

      if (raceCards.length > 0) {
        sections.push(`[SCENARIO RACES & SPECIES PHYSIOLOGY (RAZAS)]:
The following describe biological traits, species anatomy, and physiology of inhabitants in this world:
${raceCards.map(c => formatCardEntry(c, 'RACE / SPECIES')).join('\n\n')}`);
      }

      if (characterCards.length > 0) {
        sections.push(`[SCENARIO LIVING CHARACTERS & NPCS (PERSONAJES)]:
The following are living individual beings/NPCs that exist in this scenario. YOU (Game Master) roleplay and speak for them when they are present:
${characterCards.map(c => formatCardEntry(c, 'NPC / CHARACTER')).join('\n\n')}`);
      }

      if (factionCards.length > 0) {
        sections.push(`[SCENARIO FACTIONS & ORGANIZATIONS (FACCIONES)]:
${factionCards.map(c => formatCardEntry(c, 'FACTION')).join('\n\n')}`);
      }

      if (itemCards.length > 0) {
        sections.push(`[SCENARIO SPECIAL ITEMS & OBJECTS (OBJETOS)]:
${itemCards.map(c => formatCardEntry(c, 'ITEM / OBJECT')).join('\n\n')}`);
      }

      if (otherCards.length > 0) {
        sections.push(`[SCENARIO COMPENDIUM LORE ENTITIES]:
${otherCards.map(c => formatCardEntry(c, 'ENTITY')).join('\n\n')}`);
      }

      scenarioEntitiesDetails = sections.join('\n\n');
    }

    // 8. Format Memories & Milestones (strictly scoped to this chat and scenario)
    const inChatMemories = (chat.memoryCards || []).map(m => `* ${m}`);
    const cardMemories = scenarioCards.filter(c => c.type === 'Memoria' && (
      c.linkedScenario === chat.scenarioId || 
      (Array.isArray(c.linkedCharacters) && userChar && (c.linkedCharacters.includes(userChar.id) || c.linkedCharacters.includes(userChar.title)))
    )).map(m => `* [Impact: ${m.impact || 'Medium'}] (${m.timeline || 'Milestone'}) ${m.title}: ${m.summary || m.text}`);

    const allMemories = [...inChatMemories, ...cardMemories];
    const memoryContext = allMemories.length > 0 ? allMemories.join('\n') : 'No previous memories recorded.';

    const targetLang = resolveTargetLanguage(chatSettings?.preferredLanguage, messages);
    const languageDirective = getLanguageDirective(targetLang);

    // 9. Format NSFW, Eroticism & Intimacy Dynamics Matrix
    const nsfwDynamicsDirective = getNsfwDynamicsDirective({
      scenario,
      userChar,
      npcs: relevantEntities
    });

    return `
${languageDirective}

[FUNDAMENTAL IDENTITY & NARRATIVE PERSPECTIVE]:
- YOUR ROLE IS: External Game Master / Storyteller (Game Master / DM). You are the living world, the environment, the weather, and all Non-Player Characters (NPCs).
- THE USER IS: {{user}} (${userChar ? userChar.title || userChar.name : 'the player character'}). Only the user controls {{user}}.
- NARRATION PERSPECTIVE: STRICT THIRD-PERSON. Describe the world, surroundings, and NPCs from an immersive external perspective.
- STRICT PROHIBITION AGAINST FIRST-PERSON PLAYER NARRATION:
  * NEVER narrate in the first person ("I observe...", "I approach...", "I feel..."). That usurps the player.
  * NEVER invent dialogue, thoughts, feelings, or actions for {{user}}.
  * NEVER generate prefixes like "You:", "{{user}}:", "Player:".
  * Your response must contain ONLY how the world reacts and what NPCs say or do in response to what the player did.

${scenarioDetails}

${scenarioEntitiesDetails ? `${scenarioEntitiesDetails}\n\n` : ''}${narratorDetails}

${narratorToolsDetails ? `${narratorToolsDetails}\n\n` : ''}${userCharDetails}

${userInventoryDetails ? `${userInventoryDetails}\n\n` : ''}${nsfwDynamicsDirective}

[PERSISTENT AI ORDERS]:
${chat.constantPrompt ? chat.constantPrompt : 'Perform immersively as external Game Master in strict third-person.'}

[CORE SYSTEM DIRECTIVES & INVIOLABLE HARNESS RULES]:

1. STRICT PROHIBITION AGAINST OVER-DESCRIBING PLAYER APPEARANCE OR INVENTORY:
   - The player ALREADY knows their character's appearance, equipment, and clothing.
   - NEVER waste output describing {{user}}'s muscles, physique, attire, or invent random anatomical traits. {{user}} is strictly human according to their sheet.
   - FORBIDDEN to use invasive second-person style ("You are...", "Your body feels...", "Your eyes see...").

2. STRICT PROHIBITION AGAINST ACTING OR DECIDING FOR THE PLAYER (NO AUTOPLAY / NO GODMODING):
   - NEVER speak, act, decide, or describe thoughts/feelings for {{user}} (${userChar ? userChar.title || userChar.name : 'the player character'}).
   - Limit yourself strictly to world consequences and NPC reactions in third-person.
   - Conclude immediate consequences and stop to yield the turn to the player.

3. TOTAL FOCUS ON EXTERNAL ENVIRONMENT & LIVING NPCS:
   - Focus 100% of descriptive vocabulary and effort on what surrounds {{user}}: buildings, weather, scents, tension, and especially the actions, posture, dialogue, and glances of NPCs.

4. ZERO ECHO / NO REPETITIVE PARAPHRASING:
   - Do NOT begin your response by summarizing, repeating, or echoing what the player just wrote.
   - Step directly into the action with immediate world consequences and live reactions.

5. NPCS HAVE LIMITED SUBJECTIVE KNOWLEDGE (NO OMNISCIENCE):
   - NPCs and creatures possess limited, subjective knowledge: they only know what they have personally seen, heard, or learned.
   - No NPC can read {{user}}'s mind, know their secret plans, or guess items in their inventory unless explicitly shown or mentioned.

6. LIVING, ORGANIC, AND COHERENT WORLD:
   - The world does not revolve subserviently around the player; reckless actions carry realistic risks, logical consequences, and believable opposition.
   - Maintain strict consistency with scenario lore, inventory, and accumulated memories.

7. STRICT TYPOGRAPHICAL FORMATTING, DELIMITERS & ENTITY HIGHLIGHTS:
   - SPOKEN NPC DIALOGUE (ALOUD): MUST be wrapped EXCLUSIVELY in double quotes without internal asterisks: "Hello, traveler."
     * Any vocal speech, conversation, shouts, or verbal responses MUST be inside double quotes: "¡Dueño!", "¡Espera!".
     * FORBIDDEN to put asterisks inside quotes (NEVER write "*Hello*" or "*¡Dueño!*").
     * FORBIDDEN to wrap dialogue quotes with asterisks (NEVER write *"Hello"*).
     * FORBIDDEN to put spoken dialogue in tildes (~...~).
   - SILENT INTERNAL THOUGHTS (UNSPOKEN): MUST be wrapped EXCLUSIVELY in tildes: ~What a strange presence this newcomer has...~
     * Tildes (~...~) are ONLY for SHORT (1-2 sentences) silent, private inner thoughts inside an NPC's mind.
     * STRICTLY FORBIDDEN to wrap scene descriptions, narrative paragraphs, actions, or dialogues in tildes (~...~).
     * FORBIDDEN to combine with asterisks (NEVER write *~thought~*).
   - GENERAL NARRATIVE PROSE & ACTIONS:
     * Write standard, clean literary paragraphs for descriptions, sensory details, and world reactions WITHOUT wrapping whole sentences or descriptions in asterisks (*...*) or tildes (~...~).
     * Asterisks (*...*) are reserved ONLY for short, specific inline actions or gestures (e.g. *sonríe con picardía*, *desenvaina su espada*).
   - MANDATORY ENTITY HIGHLIGHTS (==...==):
     * You MUST wrap ALL key proper names, locations, towns, characters, factions, and notable items in double equal signs (==...==).
     * Examples: ==Garrison==, ==Tierra de Bestias==, ==La Forja==, ==Garrick==, ==Mari Setogaya==, ==Taberna del Búho==, ==Armadillo y Martillo==, ==Fosas Miasmáticas==, ==Leporinos==.
     * This triggers interactive compendium linking in the reader's interface. Failure to wrap important entities and places in ==...== breaks the user's interface.

8. MANDATORY 4-PHASE REASONING & SELF-CORRECTION PROTOCOL (<think>):
   Before delivering your final story response, you MUST execute a silent 4-phase scratchpad inside a <think> ... </think> block:

   [FASE 1: PLANIFICACIÓN]
   - NPC Intent & Emotion: What is the NPC's psychological drive and what reaction do they seek from {{user}}?
   - Atmosphere & Sensory Anchoring: Scent, temperature, textures, lighting, breath, and heartbeat.
   - Lore & Entity Categorization: Verify active locations, species, and characters. Ensure locations (e.g. ==Garrison==) are treated as geographical places, NOT as speaking NPCs.
   - Rhythm & Direction: How to advance the scene without rushing or stalling.

   [FASE 2: REDACCIÓN (BORRADOR INTERNO)]
   - Draft a preliminary mental version of how the environment and NPCs react to the player's action.

   [FASE 3: AUTO-CRÍTICA (CONTROL DE CALIDAD)]
   - Autonomy Audit: Did my draft usurp, speak, think, or act for {{user}}? -> If yes, immediately purge it.
   - Location vs Character Audit: Did I accidentally give voice or body parts to a place or town? -> Purge immediately; places are environments.
   - Mandatory Entity Wrapping Audit (==...==): Did I wrap all key proper names, places, species, and NPCs in double equals (e.g. ==Garrison==, ==Leporinos==, ==Taberna del Búho==)? -> Wrap all proper nouns in ==...==.
   - Typographical Check: Ensure spoken dialogue uses double quotes ("..."), physical gestures use asterisks (*...*), and unspoken inner thoughts use tildes (~...~).
   - Anti-Cliché & Prose Freshness: Elevate to rich, visceral prose.
   - Final Adjustments & Greenlight: Apply corrections.

   [FASE 4: MENSAJE FINAL]
   - Close </think> and output ONLY the final, polished, and immersive narrative prose for the reader.

[RECORDED STORY MEMORIES & MILESTONES]:
${memoryContext}

${languageDirective}
`.trim();
  };

  // Función asíncrona en segundo plano para realizar el resumen de contexto y generar memorias.
  // Protegida ante fallos por try-catch y persistida en almacenamiento local e IndexedDB.
  const runBackgroundSummarization = (finalMsgs, targetChatSnapshot = chat) => {
    setTimeout(async () => {
      try {
        const targetChat = targetChatSnapshot || chat;
        const targetChatId = targetChat?.id;
        if (!targetChatId) return;

        const newSummary = await sendContextSummarizationTask({
          messages: finalMsgs,
          currentMemory: targetChat.memoryCards || [],
          modelId: chatSettings?.preferredModel,
          preferredLanguage: chatSettings?.preferredLanguage || 'auto',
          baseUrl: chatSettings?.lmStudioUrl
        });
        if (newSummary && typeof newSummary === 'string' && newSummary.trim()) {
          console.log('[Context Summary Task]: Nueva memoria generada:', newSummary);
          const nextMemory = [...(targetChat.memoryCards || []), newSummary.trim()];
          
          targetChat.memoryCards = nextMemory;
          
          const updatedChat = { ...targetChat, messages: finalMsgs, memoryCards: nextMemory };
          const { addChat } = await import('../utils/db');
          await addChat(updatedChat);
          if (folderHandle) {
            try { await saveChatToFolder(updatedChat, folderHandle); } catch (e) {}
          }
          
          if (activeChatIdRef.current === targetChatId) {
            setMessages(finalMsgs);
          }
        }
      } catch (sumErr) {
        console.warn('[Context Summary Task]: Fallo en la tarea de resumen:', sumErr);
      }
    }, 1000);
  };

  // Función asíncrona en segundo plano para extraer entidades y generar tarjetas automáticas con imágenes.
  const runBackgroundCardGeneration = (finalMsgs, targetChatSnapshot = chat) => {
    if (!autoGenCards) return;
    setTimeout(async () => {
      try {
        const targetChat = targetChatSnapshot || chat;
        const scenario = (appData?.scenarios || []).find(s => s.id === targetChat?.scenarioId || s.title?.toLowerCase() === (targetChat?.scenario || '').toLowerCase()) ||
                         (appData?.cards || []).find(c => c.id === targetChat?.scenarioId || c.title?.toLowerCase() === (targetChat?.scenario || '').toLowerCase());
        const existingCards = appData?.cards || [];
        const existingScenarios = appData?.scenarios || [];
        const extractedEntities = await sendExtractCardsTask({
          messages: finalMsgs,
          existingCards: existingCards,
          existingScenarios: existingScenarios,
          activeScenario: scenario,
          modelId: chatSettings?.preferredModel,
          preferredLanguage: chatSettings?.preferredLanguage || 'auto',
          baseUrl: chatSettings?.lmStudioUrl
        });

        if (Array.isArray(extractedEntities) && extractedEntities.length > 0) {
          console.log(`[Auto-Card Task]: ${extractedEntities.length} entidades detectadas por IA:`, extractedEntities);
          const newCardObjects = [];
          const recentStoryContext = finalMsgs.slice(-6).map(m => `${m.from === 'user' ? 'Jugador' : 'Narrador'}: ${m.text}`).join('\n\n');

          for (const entity of extractedEntities) {
            let workingEntity = { ...entity };

            // Rellenado inteligente obligatorio con IA si los campos vienen vacíos o escuetos (< 40 caracteres)
            if (!workingEntity.text || workingEntity.text.trim().length < 40 || !workingEntity.intro || workingEntity.intro.trim().length < 15 || !workingEntity.traits || workingEntity.traits.length === 0) {
              try {
                const autoCompleted = await autoCompleteEntityWithAI({
                  name: workingEntity.title,
                  type: workingEntity.type || 'Personaje',
                  existingData: workingEntity,
                  context: recentStoryContext,
                  language: chatSettings?.preferredLanguage || 'es'
                });
                if (autoCompleted) {
                  workingEntity.intro = workingEntity.intro || autoCompleted.intro || '';
                  workingEntity.text = (workingEntity.text && workingEntity.text.length >= 40) ? workingEntity.text : (autoCompleted.text || '');
                  if (!workingEntity.traits || workingEntity.traits.length === 0) {
                    workingEntity.traits = autoCompleted.traits || [];
                  }
                  if (!workingEntity.tags || workingEntity.tags.length === 0) {
                    workingEntity.tags = autoCompleted.tags || [];
                  }
                  if (!workingEntity.imagePrompt && autoCompleted.imagePrompt) {
                    workingEntity.imagePrompt = autoCompleted.imagePrompt;
                  }
                }
              } catch (enrichErr) {
                console.warn(`[Auto-Card Lore Enrichment]: No se pudo autocompletar ${workingEntity.title}:`, enrichErr);
              }
            }

            // Generar ilustración/imagen local para la nueva entidad
            let coverUrl = '';
            try {
              if (workingEntity.type === 'Lugar') {
                coverUrl = await generateLocationWallpaper(workingEntity.title, workingEntity.intro, workingEntity.text, chatSettings?.preferredImageModel);
              } else if (workingEntity.type === 'Personaje') {
                coverUrl = await generateCharacterPortrait(workingEntity.title, workingEntity.traits || [], workingEntity.intro || workingEntity.text, chatSettings?.preferredImageModel);
              } else {
                const promptForImg = workingEntity.imagePrompt || `${workingEntity.title}, ${workingEntity.type}, ${workingEntity.intro || workingEntity.text}`;
                coverUrl = await generateImageLocal(promptForImg, 'Fantasía Oscura / Entornos', chatSettings?.imageServerUrl);
              }
            } catch (imgErr) {
              console.warn(`[Auto-Card Image]: Error al generar imagen para ${workingEntity.title}:`, imgErr);
            }

            const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const isChar = workingEntity.type === 'Personaje';

            const cardObj = {
              id: cardId,
              type: workingEntity.type || 'Personaje',
              characterRole: isChar ? 'npc' : undefined,
              title: workingEntity.title,
              intro: workingEntity.intro || (workingEntity.text ? workingEntity.text.substring(0, 100) + '...' : ''),
              text: workingEntity.text || '',
              cover: coverUrl || '',
              characterImages: (isChar && coverUrl) ? [{ id: 'img-1', url: coverUrl, label: 'Principal', isDefault: true }] : [],
              tags: Array.isArray(workingEntity.tags) ? workingEntity.tags : [],
              traits: Array.isArray(workingEntity.traits) ? workingEntity.traits : [],
              connectedCards: [],
              nsfw: false,
              public: false,
              createdAt: new Date().toISOString()
            };

            newCardObjects.push(cardObj);
          }

          if (newCardObjects.length > 0 && appData && onUpdateAppData) {
            const nextCards = [...newCardObjects, ...(appData.cards || [])];
            const nextData = { ...appData, cards: nextCards };
            onUpdateAppData(nextData);
            if (folderHandle) {
              try { await saveAppDataToFolder(nextData, folderHandle); } catch (e) {}
            }
            console.log(`[Auto-Card Task]: ${newCardObjects.length} tarjetas añadidas y 100% rellenadas al compendio.`);
          }
        }
      } catch (cardErr) {
        console.warn('[Auto-Card Task]: Fallo en la extracción automática:', cardErr);
      }
    }, 1500);
  };

  const handleDeleteMessage = (idxToDelete) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar mensaje?',
      message: '¿Estás seguro de que deseas eliminar este mensaje del historial? Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmDialog(null);
        const nextMsgs = messages.filter((_, i) => i !== idxToDelete);
        await persistMessages(nextMsgs);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleRewindToMessage = (idx) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Rebobinar chat?',
      message: `¿Rebobinar chat hasta este mensaje (#${idx + 1})? Los mensajes posteriores se eliminarán definitivamente.`,
      type: 'rewind',
      confirmText: 'Rebobinar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmDialog(null);
        const nextMsgs = messages.slice(0, idx + 1);
        await persistMessages(nextMsgs);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleRedo = async (specificIdx = null) => {
    if (isSending || messages.length === 0) return;

    const executionChatId = chat?.id;
    const targetChatSnapshot = { ...chat };

    let targetIdx = specificIdx;
    
    // Si se pulsa desde la barra de herramientas inferior
    if (targetIdx === null) {
      // Si el último mensaje es del usuario, enviar respuesta para ese mensaje
      if (messages[messages.length - 1].from === 'user') {
        handleSend(null);
        return;
      }

      // Buscar el último mensaje del narrador / IA para rehacerlo
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].from !== 'user') {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx === null || targetIdx < 0) {
      handleSend(null);
      return;
    }

    // Contexto previo: todos los mensajes anteriores a esta respuesta
    const historyBefore = messages.slice(0, targetIdx);
    let promptMessages = historyBefore;

    // Si targetIdx es 0 (primer mensaje del chat), recrear con la intro del escenario
    if (historyBefore.length === 0) {
      promptMessages = [{ from: 'user', text: `Inicia la narración del escenario "${chat.scenario}". Describe el entorno y la escena inicial en tercera persona como Narrador.` }];
    }

    const aiRole = messages[targetIdx]?.from || 'narrator';
    const streamingPlaceholder = {
      from: aiRole,
      text: '',
      timestamp: new Date().toISOString()
    };

    // Truncar historial para eliminar la respuesta anterior e insertar el placeholder de stream
    await persistChatMessages(executionChatId, targetChatSnapshot, historyBefore);
    if (activeChatIdRef.current === executionChatId) {
      setMessages([...historyBefore, streamingPlaceholder]);
      setIsSending(true);
      setGenerationProgress({ percent: 15, status: '🧠 Orquestador: Evaluando intención y filtrando lore...' });
    }

    try {
      // 1. Orquestación Inbound (Pre-Vuelo con estricto ámbito de escenario)
      const activeScenarioCards = getScenarioCards(scenario, targetChatSnapshot, appData, userChar);
      const lastUserPrompt = promptMessages[promptMessages.length - 1]?.text || '';
      const inbound = await executeInboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        userMessage: lastUserPrompt,
        cards: activeScenarioCards,
        recentMessages: historyBefore,
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl
      });

      const systemPrompt = buildSystemPrompt(inbound.filteredCards);
      const res = await sendChatMessage({
        messages: promptMessages,
        systemInstruction: systemPrompt,
        contextDocuments: targetChatSnapshot.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          if (activeChatIdRef.current === executionChatId) {
            const targetLen = chatSettings?.responseLength || 1000;
            const streamPct = Math.min(96, Math.max(30, Math.round(30 + (accumulated.length / targetLen) * 66)));
            setGenerationProgress({
              percent: streamPct,
              status: `⚡ Redactando respuesta (${streamPct}%)...`
            });
            setMessages(prev => {
              const copy = [...prev];
              if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
              }
              return copy;
            });
          }
        }
      });

      // 2. Orquestación Outbound (Post-Vuelo con ámbito de escenario)
      const targetLang = resolveTargetLanguage(chatSettings?.preferredLanguage, messages);
      const targetLangCode = typeof targetLang === 'object' ? (targetLang.code || 'es') : targetLang;
      const outbound = await executeOutboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        rawNarrative: res.text || '',
        targetLang: targetLangCode,
        compendiumCards: activeScenarioCards,
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl
      });

      const finalNarrative = (outbound?.formattedText && outbound.formattedText.trim().length > 0)
        ? outbound.formattedText.trim()
        : ((res?.text && res.text.trim().length > 0) ? res.text.trim() : 'Sin respuesta.');
      const newAiMsg = {
        from: aiRole,
        text: finalNarrative,
        timestamp: new Date().toISOString()
      };
      const finalMsgs = [...historyBefore, newAiMsg];
      await persistChatMessages(executionChatId, targetChatSnapshot, finalMsgs);
      runBackgroundSummarization(finalMsgs, targetChatSnapshot);
      runBackgroundCardGeneration(finalMsgs, targetChatSnapshot);

    } catch (err) {
      console.error("Error al rehacer respuesta:", err);
      const errorMsg = {
        from: 'ai',
        text: `[Error al rehacer]: ${err.message || 'Servidor de IA no accesible.'}`,
        timestamp: new Date().toISOString()
      };
      await persistChatMessages(executionChatId, targetChatSnapshot, [...historyBefore, errorMsg]);
    } finally {
      if (activeChatIdRef.current === executionChatId) {
        setIsSending(false);
        setGenerationProgress({ percent: 100, status: 'Completado' });
      }
    }
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputMsg;
    if ((!textToSend.trim() && overrideText === null) || isSending) return;

    const executionChatId = chat?.id;
    const targetChatSnapshot = { ...chat };

    const newMsg = { from: 'user', text: textToSend.trim() || '...', timestamp: new Date().toISOString() };
    const nextMsgs = textToSend.trim() ? [...messages, newMsg] : messages;
    
    const streamingAiMsg = { from: 'ai', text: '', timestamp: new Date().toISOString() };
    
    if (textToSend.trim()) {
      await persistChatMessages(executionChatId, targetChatSnapshot, nextMsgs);
    }
    
    if (activeChatIdRef.current === executionChatId) {
      setMessages([...nextMsgs, streamingAiMsg]);
      if (overrideText === null) setInputMsg('');
      setIsSending(true);
      setGenerationProgress({ percent: 15, status: '🧠 Orquestador: Analizando intención y relevancia de lore...' });
    }

    try {
      // 1. Orquestación Inbound (Pre-Vuelo con aislamiento estricto de tarjetas del escenario)
      const activeScenarioCards = getScenarioCards(scenario, targetChatSnapshot, appData, userChar);
      const inbound = await executeInboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        userMessage: textToSend.trim(),
        cards: activeScenarioCards,
        recentMessages: messages,
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl
      });

      // 2. Generación Principal con Storyteller
      const systemPrompt = buildSystemPrompt(inbound.filteredCards);

      const res = await sendChatMessage({
        messages: nextMsgs,
        systemInstruction: systemPrompt,
        contextDocuments: targetChatSnapshot.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          if (activeChatIdRef.current === executionChatId) {
            const targetLen = chatSettings?.responseLength || 1000;
            const streamPct = Math.min(96, Math.max(30, Math.round(30 + (accumulated.length / targetLen) * 66)));
            setGenerationProgress({
              percent: streamPct,
              status: `⚡ Redactando respuesta (${streamPct}%)...`
            });
            setMessages(prev => {
              const copy = [...prev];
              if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
              }
              return copy;
            });
          }
        }
      });

      // 3. Orquestación Outbound (Post-Vuelo con ámbito de escenario)
      const targetLang = resolveTargetLanguage(chatSettings?.preferredLanguage, messages);
      const targetLangCode = typeof targetLang === 'object' ? (targetLang.code || 'es') : targetLang;
      const outbound = await executeOutboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        rawNarrative: res.text || '',
        targetLang: targetLangCode,
        compendiumCards: activeScenarioCards,
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl
      });

      const finalNarrative = (outbound?.formattedText && outbound.formattedText.trim().length > 0)
        ? outbound.formattedText.trim()
        : ((res?.text && res.text.trim().length > 0) ? res.text.trim() : 'Sin respuesta.');
      const aiMsg = { from: 'ai', text: finalNarrative, timestamp: new Date().toISOString() };
      const finalMsgs = [...nextMsgs, aiMsg];
      await persistChatMessages(executionChatId, targetChatSnapshot, finalMsgs);

      // 4. Auto-creación de tarjetas de entidades descubiertas
      if (chatSettings?.autoCardCreation !== 'off' && outbound.discoveredEntities?.length > 0 && appData && onUpdateAppData) {
        const existingTitles = new Set((appData.cards || []).map(c => (c.title || c.name || '').toLowerCase()));
        const newCards = outbound.discoveredEntities
          .filter(e => e.name && !existingTitles.has(e.name.toLowerCase()))
          .map(e => ({
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: e.name,
            name: e.name,
            type: e.type || 'Objeto',
            linkedScenario: targetChatSnapshot.scenarioId || scenario?.id || scenario?.title || '',
            intro: e.description || '',
            text: e.description || '',
            tags: [e.type || 'Descubierto', scenario?.title || 'Escenario'].filter(Boolean),
            traits: []
          }));

        if (newCards.length > 0) {
          const updatedAppData = {
            ...appData,
            cards: [...(appData.cards || []), ...newCards]
          };
          onUpdateAppData(updatedAppData);
          if (folderHandle) {
            saveAppDataToFolder(folderHandle, updatedAppData).catch(e => console.warn('Error auto-guardando tarjetas:', e));
          }
        }
      }

      // 5. Lanzar el resumen de contexto automático y la generación de tarjetas en segundo plano
      runBackgroundSummarization(finalMsgs, targetChatSnapshot);
      runBackgroundCardGeneration(finalMsgs, targetChatSnapshot);

    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      const errorMsg = {
        from: 'ai',
        text: `[Error de conexión con IA]: ${err.message || 'Servidor de IA no accesible.'}`,
        timestamp: new Date().toISOString()
      };
      await persistChatMessages(executionChatId, targetChatSnapshot, [...nextMsgs, errorMsg]);
    } finally {
      if (activeChatIdRef.current === executionChatId) {
        setIsSending(false);
        setGenerationProgress({ percent: 100, status: 'Completado' });
      }
    }
  };

  // Función "Continuar" para pedir a la IA que prosiga la narrativa sin mensaje nuevo de usuario
  const handleContinue = async () => {
    if (messages.length === 0 || isSending) return;
    
    const executionChatId = chat?.id;
    const targetChatSnapshot = { ...chat };

    const streamingAiMsg = { from: 'ai', text: '', timestamp: new Date().toISOString() };
    if (activeChatIdRef.current === executionChatId) {
      setMessages([...messages, streamingAiMsg]);
      setIsSending(true);
      setGenerationProgress({ percent: 15, status: '🧠 Evaluando continuación...' });
    }

    try {
      const activeScenarioCards = getScenarioCards(scenario, targetChatSnapshot, appData, userChar);
      const basePrompt = buildSystemPrompt();
      const systemPrompt = `${basePrompt}\n\n[ÓRDENE EXTRA DE INMEDIATA]: Continúa la narración desde el punto exacto donde quedó.`;

      const res = await sendChatMessage({
        messages: messages,
        systemInstruction: systemPrompt,
        contextDocuments: targetChatSnapshot.contextDocuments || [],
        modelId: chatSettings?.preferredModel,
        baseUrl: chatSettings?.lmStudioUrl,
        onChunk: (accumulated) => {
          if (activeChatIdRef.current === executionChatId) {
            const targetLen = chatSettings?.responseLength || 1000;
            const streamPct = Math.min(96, Math.max(30, Math.round(30 + (accumulated.length / targetLen) * 66)));
            setGenerationProgress({
              percent: streamPct,
              status: `⚡ Redactando respuesta (${streamPct}%)...`
            });
            setMessages(prev => {
              const copy = [...prev];
              if (copy.length > 0 && copy[copy.length - 1].from !== 'user') {
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated };
              }
              return copy;
            });
          }
        }
      });

      const targetLang = resolveTargetLanguage(chatSettings?.preferredLanguage, messages);
      const targetLangCode = typeof targetLang === 'object' ? (targetLang.code || 'es') : targetLang;
      const outbound = await executeOutboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        rawNarrative: res.text || '',
        targetLang: targetLangCode,
        compendiumCards: activeScenarioCards,
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl
      });

      const finalNarrative = (outbound?.formattedText && outbound.formattedText.trim().length > 0)
        ? outbound.formattedText.trim()
        : ((res?.text && res.text.trim().length > 0) ? res.text.trim() : 'Sin respuesta.');
      const aiMsg = { from: 'ai', text: finalNarrative, timestamp: new Date().toISOString() };
      const finalMsgs = [...messages, aiMsg];
      await persistChatMessages(executionChatId, targetChatSnapshot, finalMsgs);

      // Lanzar el resumen de contexto automático y la generación de tarjetas en segundo plano
      runBackgroundSummarization(finalMsgs, targetChatSnapshot);
      runBackgroundCardGeneration(finalMsgs, targetChatSnapshot);

    } catch (err) {
      console.error("Error al continuar chat:", err);
      const errorMsg = { from: 'ai', text: `[Error de conexión con IA]: ${err.message || 'Servidor de IA no accesible.'}`, timestamp: new Date().toISOString() };
      await persistChatMessages(executionChatId, targetChatSnapshot, [...messages, errorMsg]);
    } finally {
      if (activeChatIdRef.current === executionChatId) {
        setIsSending(false);
        setGenerationProgress({ percent: 100, status: 'Completado' });
      }
    }
  };

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

  // Personaje del jugador
  const userChar = (appData?.cards || []).find(c => 
    (c.type === 'Personaje' || c.type === 'User') && (
      c.id === chat?.userCharacterId || 
      (c.title && c.title === chat?.userCharacterName) ||
      c.id === chat?.characterId ||
      (c.title && c.title === chat?.character) ||
      c.id === chat?.character ||
      (c.name && c.name === chat?.character)
    )
  ) || findMatchingEntity(chat?.character, appData?.cards);

  // Escenario activo
  const scenario = (appData?.scenarios || []).find(s => 
    s.id === chat?.scenarioId || s.title?.toLowerCase() === (chat?.scenario || '').toLowerCase()
  ) || (appData?.cards || []).find(c => 
    c.id === chat?.scenarioId || c.title?.toLowerCase() === (chat?.scenario || '').toLowerCase()
  ) || findMatchingEntity(chat?.scenario, appData);

  // Personajes y entidades del compendio asociados estrictamente a este escenario
  const scenarioCards = getScenarioCards(scenario, chat, appData, userChar);
  const scenarioCharacters = scenarioCards.filter(c => c.type === 'Personaje');

  // Detección del personaje activo dentro del escenario (sin cruzar personajes de otros chats)
  const defaultScenarioChar = scenarioCharacters[0] || userChar || null;
  const detectedChar = detectActiveCharacter(
    messages, 
    scenarioCharacters, 
    userChar, 
    defaultScenarioChar
  );
  const activeCharacter = manualCharacterOverride || detectedChar;

  // Último mensaje para matching de expresión
  const lastMessageText = messages.length > 0 ? (messages[messages.length - 1]?.text || '') : '';
  const matchedExpression = matchCharacterExpression(activeCharacter, lastMessageText);

  // Fondo de localización dinámico estrictamente vinculado al escenario
  const wallpaperUrl = resolveLocationWallpaper(messages, scenario, scenarioCards, chatSettings);
  const chatOpacity = chatSettings.chatBackgroundOpacity ?? 0.85;

  const isSidebarVisible = (chatSettings.showCharacterSidebar !== false) && !isCharacterSidebarClosed;

  const containerStyle = {
    '--chat-font-family': fontFamiliesMap[effectiveFontFamily] || fontFamiliesMap.default,
    '--chat-font-size': fontSizesMap[effectiveFontSize] || fontSizesMap.normal,
    '--chat-text-color': effectiveTextColor,
    '--chat-dialogue-color': effectiveDialogueColor,
    '--chat-action-color': effectiveActionColor,
    '--chat-thought-color': effectiveThoughtColor,
    '--chat-ai-bubble-bg': effectiveAiBubbleBg,
    '--chat-user-bubble-bg': effectiveUserBubbleBg,
    '--chat-bg-opacity': isPeekTransparent ? '0' : String(chatOpacity),
  };

  return (
    <div className="chat-dual-layout" style={containerStyle}>
      {/* Fondo de pantalla de localización con overlay */}
      {wallpaperUrl && (
        <div 
          className="chat-wallpaper-backdrop" 
          style={{ backgroundImage: `url(${wallpaperUrl})` }}
        >
          <div className="chat-wallpaper-overlay" />
        </div>
      )}

      {/* Zona A: Flujo Principal de Chat */}
      <div 
        className={`chat-zone-a ${isPeekTransparent ? 'transparent-peek' : ''}`}
        style={{
          background: wallpaperUrl 
            ? `rgba(13, 14, 22, ${isPeekTransparent ? 0 : chatOpacity})` 
            : 'transparent',
          backdropFilter: wallpaperUrl && !isPeekTransparent ? 'blur(8px)' : 'none'
        }}
      >
        {/* Historial de Mensajes Principal */}
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
                  <button 
                    title="Traducir al idioma predeterminado" 
                    onClick={() => handleTranslateMessage(m, idx)}
                    disabled={translatingMsgId === `${m.from}-${idx}`}
                    style={{ color: translatingMsgId === `${m.from}-${idx}` ? '#ffd36b' : 'inherit' }}
                  >
                    <FontAwesomeIcon 
                      icon={translatingMsgId === `${m.from}-${idx}` ? faSpinner : faLanguage} 
                      className={translatingMsgId === `${m.from}-${idx}` ? 'fa-pulse' : ''} 
                    />
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
                  {m.from !== 'user' && !m.text && isSending && idx === messages.length - 1 ? (
                    <div className="ai-thinking-box" style={{
                      background: 'rgba(255, 211, 107, 0.05)',
                      border: '1px solid rgba(255, 211, 107, 0.25)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      margin: '4px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: '#ffd36b', fontWeight: '600' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <FontAwesomeIcon icon={faBrain} className="fa-pulse" />
                          <span>{generationProgress.status || 'La IA está pensando...'}</span>
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,211,107,0.2)' }}>
                          {generationProgress.percent}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${generationProgress.percent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                          borderRadius: '3px',
                          transition: 'width 0.25s ease-out'
                        }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.from !== 'user' && isSending && idx === messages.length - 1 && (
                        <div style={{ 
                          marginBottom: '8px', 
                          padding: '4px 8px',
                          background: 'rgba(255,211,107,0.06)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,211,107,0.15)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          fontSize: '0.74rem', 
                          color: '#ffd36b'
                        }}>
                          <span><FontAwesomeIcon icon={faBrain} className="fa-pulse" /> {generationProgress.status}</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{generationProgress.percent}%</span>
                        </div>
                      )}
                      <FormattedMessageText text={m.text} onTagClick={handleTagClick} appData={appData} />
                      {m.from !== 'user' && isSending && idx === messages.length - 1 && (
                        <span className="streaming-cursor" style={{ display: 'inline-block', width: '7px', height: '14px', background: '#ffd36b', marginLeft: '4px', verticalAlign: '-1px', borderRadius: '1px', opacity: 0.8 }} />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Placeholder de pensamiento de la IA si la lista termina en mensaje de usuario mientras se genera */}
        {isSending && messages.length > 0 && messages[messages.length - 1].from === 'user' && (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginTop: '10px' }}>
            <div className="chat-message-bubble ai" style={{ flex: 1 }}>
              <div className="msg-header">
                <span className="msg-author">
                  {appData?.scenarios?.find(s => s.id === chat.scenarioId)?.narrator ? '🧙 Narrador (IA)' : 'Narrador (IA)'}
                </span>
              </div>
              <div className="msg-body">
                <div className="ai-thinking-box" style={{
                  background: 'rgba(255, 211, 107, 0.05)',
                  border: '1px solid rgba(255, 211, 107, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  margin: '4px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: '#ffd36b', fontWeight: '600' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={faBrain} className="fa-pulse" />
                      <span>{generationProgress.status || 'La IA está pensando...'}</span>
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,211,107,0.2)' }}>
                      {generationProgress.percent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${generationProgress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                      borderRadius: '3px',
                      transition: 'width 0.25s ease-out'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Marcador invisible para auto-scroll hacia la última interacción */}
        <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
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
                  handleToggleAutoGenCards(e.target.checked);
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

            {/* Conmutador Rápido Shift+Enter para enviar */}
            <button 
              type="button" 
              onClick={() => {
                const nextVal = chatSettings?.sendOnShiftEnter === false ? true : false;
                onUpdateChatSettings({ ...chatSettings, sendOnShiftEnter: nextVal });
              }}
              style={{ 
                marginLeft: '10px', 
                background: chatSettings?.sendOnShiftEnter !== false ? 'rgba(255, 211, 107, 0.12)' : 'rgba(255, 255, 255, 0.05)', 
                border: chatSettings?.sendOnShiftEnter !== false ? '1px solid rgba(255, 211, 107, 0.35)' : '1px solid rgba(255, 255, 255, 0.15)', 
                color: chatSettings?.sendOnShiftEnter !== false ? '#ffd36b' : 'rgba(255, 255, 255, 0.45)', 
                borderRadius: '4px', 
                padding: '3px 8px', 
                fontSize: '0.74rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title={chatSettings?.sendOnShiftEnter !== false ? "Shift+Enter para enviar: ACTIVADO (clic para desactivar)" : "Shift+Enter para enviar: DESACTIVADO (clic para activar)"}
            >
              <FontAwesomeIcon icon={faKeyboard} />
              <span>Shift+↵ {chatSettings?.sendOnShiftEnter !== false ? 'ON' : 'OFF'}</span>
            </button>

            {/* Botón de Transparencia Total / Ver Fondo */}
            {wallpaperUrl && (
              <button
                type="button"
                onClick={() => setIsPeekTransparent(prev => !prev)}
                style={{
                  marginLeft: '8px',
                  background: isPeekTransparent ? 'rgba(255, 211, 107, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: isPeekTransparent ? '1px solid #ffd36b' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: isPeekTransparent ? '#ffd36b' : 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={isPeekTransparent ? "Restaurar vista del chat" : "Ocultar chat para contemplar el fondo de pantalla"}
              >
                <FontAwesomeIcon icon={isPeekTransparent ? faEyeSlash : faEye} />
                <span>{isPeekTransparent ? 'Chat Oculto' : 'Ver Fondo'}</span>
              </button>
            )}

            {/* Botón para reabrir el panel de personaje si se cerró */}
            {chatSettings.showCharacterSidebar !== false && isCharacterSidebarClosed && activeCharacter && (
              <button
                type="button"
                onClick={() => setIsCharacterSidebarClosed(false)}
                style={{
                  marginLeft: '8px',
                  background: 'rgba(255, 211, 107, 0.12)',
                  border: '1px solid rgba(255, 211, 107, 0.35)',
                  color: '#ffd36b',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Mostrar panel de personaje (Zona B)"
              >
                <FontAwesomeIcon icon={faUserCircle} />
                <span>Retrato</span>
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
                const sendWithShift = chatSettings?.sendOnShiftEnter !== false;
                if (sendWithShift) {
                  if (e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                } else {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }
              }
            }}
            rows={2}
          />
          <button 
            className="chat-send-btn" 
            title={chatSettings?.sendOnShiftEnter !== false ? "Enviar (Shift + Enter)" : "Enviar (Enter)"} 
            onClick={() => handleSend()} 
            disabled={isSending}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </div>
      </div>

      {/* Zona B: Panel Lateral de Personajes (Retrato & Expresiones Contextuales) */}
      {isSidebarVisible && (
        <CharacterSidebar
          character={activeCharacter}
          matchedImage={matchedExpression}
          manualImageId={manualCharacterImageId}
          onSelectManualImage={setManualCharacterImageId}
          onInspectCharacter={(c) => setActiveEntityModal({ draftTitle: c.title || c.name, existing: c })}
          onGeneratePortrait={handleGenerateSidebarPortrait}
          isGeneratingPortrait={isGeneratingSidebarPortrait}
          availableCharacters={scenarioCharacters}
          onSelectCharacter={(c) => {
            setManualCharacterOverride(c);
            setManualCharacterImageId(null);
          }}
          onOpenCreateModal={onOpenCreateModal}
          onClose={() => setIsCharacterSidebarClosed(true)}
        />
      )}

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

      {/* MODAL DE ENTIDAD O TÉRMINO CLAVE CLICKEADO (COMPENDIO / LORE) - POPUP CENTRADO CON PORTAL */}
      {activeEntityModal && createPortal(
        <div 
          className="char-backdrop" 
          role="dialog" 
          aria-modal="true" 
          style={{ zIndex: 2900 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveEntityModal(null);
          }}
        >
          <div className="char-modal" style={{ maxWidth: '580px', width: '92%', maxHeight: '88vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease-out', padding: '24px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  background: activeEntityModal.existing ? 'rgba(110, 231, 183, 0.15)' : 'rgba(255, 211, 107, 0.15)', 
                  color: activeEntityModal.existing ? '#6ee7b7' : '#ffd36b',
                  border: `1px solid ${activeEntityModal.existing ? 'rgba(110, 231, 183, 0.3)' : 'rgba(255, 211, 107, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  {activeEntityModal.existing ? '📖 Ficha en Compendio' : '✨ Término de Historia'}
                </span>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{activeEntityModal.draftTitle}</h3>
              </div>
              <button 
                onClick={() => setActiveEntityModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Previsualización de Portada / Retrato si existe */}
              {(activeEntityModal.draftCover || activeEntityModal.existing?.cover) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <img 
                    src={activeEntityModal.draftCover || activeEntityModal.existing?.cover} 
                    alt={activeEntityModal.draftTitle} 
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255, 211, 107, 0.35)' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 'bold' }}>✓ Ilustración / Portada Asignada</span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}>Se guardará en la ficha del compendio.</span>
                  </div>
                </div>
              )}

              {activeEntityModal.existing ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#ffd36b', marginBottom: '6px', fontWeight: '600' }}>
                    Tipo: {activeEntityModal.existing.type || 'Escenario / Entidad'}
                  </div>
                  {activeEntityModal.existing.intro && (
                    <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', margin: '0 0 10px 0' }}>
                      "{activeEntityModal.existing.intro}"
                    </p>
                  )}
                  {activeEntityModal.existing.text && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.84rem', color: 'rgba(255,255,255,0.8)', maxHeight: '180px', overflowY: 'auto', lineHeight: '1.5' }}>
                      {activeEntityModal.existing.text}
                    </div>
                  )}
                  {activeEntityModal.existing.traits && activeEntityModal.existing.traits.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {activeEntityModal.existing.traits.map((t, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,211,107,0.1)', color: '#ffd36b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 10px 0' }}>
                    El narrador ha resaltado este elemento clave. Puedes registrarlo como tarjeta para que forme parte del compendio de tu mundo y la IA mantenga su coherencia.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Tipo de Tarjeta</label>
                      <select 
                        value={activeEntityModal.draftType}
                        onChange={(e) => setActiveEntityModal(prev => ({ ...prev, draftType: e.target.value }))}
                        style={{ width: '100%', padding: '6px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                      >
                        <option value="Personaje">👤 Personaje / PNJ</option>
                        <option value="Objeto">🎒 Objeto / Equipo</option>
                        <option value="Inventario">📦 Mochila / Inventario</option>
                        <option value="Lugar">🏰 Lugar / Escenario</option>
                        <option value="Memoria">📜 Tarjeta de Memoria / Lore</option>
                        <option value="Facción">🛡️ Facción / Gremio</option>
                        <option value="Criatura">🐉 Bestia / Criatura</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleGenerateTagLore}
                        disabled={isGeneratingLore}
                        style={{
                          background: 'rgba(192, 132, 252, 0.15)',
                          border: '1px solid rgba(192, 132, 252, 0.35)',
                          color: '#c084fc',
                          padding: '7px 11px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          cursor: isGeneratingLore ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: '600'
                        }}
                        title="Generar lore con IA para este término"
                      >
                        <FontAwesomeIcon icon={isGeneratingLore ? faSpinner : faMagic} spin={isGeneratingLore} />
                        <span>{isGeneratingLore ? 'Lore...' : 'Generar Lore'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateTagCover}
                        disabled={isGeneratingTagCover}
                        style={{
                          background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                          border: 'none',
                          color: '#0d0e16',
                          padding: '7px 11px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          cursor: isGeneratingTagCover ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: '700'
                        }}
                        title="Generar portada o retrato con IA"
                      >
                        <FontAwesomeIcon icon={isGeneratingTagCover ? faSpinner : faImage} spin={isGeneratingTagCover} />
                        <span>{isGeneratingTagCover ? 'Ilustrando...' : 'Generar Portada'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Descripción / Lore</label>
                    <textarea 
                      rows={4}
                      value={activeEntityModal.draftText}
                      onChange={(e) => setActiveEntityModal(prev => ({ ...prev, draftText: e.target.value, draftIntro: e.target.value.substring(0, 80) }))}
                      placeholder="Escribe detalles sobre este personaje, lugar u objeto..."
                      style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <div>
                  {onOpenCreateModal && (
                    <button
                      type="button"
                      onClick={() => {
                        const itemToEdit = activeEntityModal.existing || {
                          title: activeEntityModal.draftTitle,
                          type: activeEntityModal.draftType,
                          intro: activeEntityModal.draftIntro,
                          text: activeEntityModal.draftText,
                          cover: activeEntityModal.draftCover || ''
                        };
                        onOpenCreateModal(activeEntityModal.draftType, itemToEdit);
                        setActiveEntityModal(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.85)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} /> Taller Avanzado
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveEntityModal(null)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                  {!activeEntityModal.existing && (
                    <button
                      type="button"
                      onClick={handleSaveTagCard}
                      style={{
                        background: '#ffd36b',
                        border: 'none',
                        color: '#0d0e16',
                        fontWeight: '700',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FontAwesomeIcon icon={faSave} /> Guardar en Compendio
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
