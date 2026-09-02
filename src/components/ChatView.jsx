import React, { useState, useEffect, useRef } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUndo, 
  faCodeBranch, 
  faEdit, 
  faHistory, 
  faCheck, 
  faTimes, 
  faVolumeUp, 
  faBrain,
  faTrashAlt,
  faLanguage,
  faSpinner,
  } from '@fortawesome/free-solid-svg-icons';
import { sendChatMessage, generateImageLocal, generateCharacterPortrait, generateLocationWallpaper, generateAudioLocal, sendContextSummarizationTask, sendExtractCardsTask, translateChatMessage } from '../utils/localAIStudio';
import { resolveTargetLanguage } from '../utils/language';
import { autoCompleteEntityWithAI } from '../utils/aiEnhancer';
import { buildStorytellerSystemPrompt } from '../utils/promptBuilder';
import { isEntityEligibleForAutoCard } from '../utils/cardGatekeeper';
import { normalizeMessageTurns, resolveSceneState } from '../utils/sceneStateTracker';
import ActiveEntityModal from './chat/ActiveEntityModal';
import ChatInputDock from './chat/ChatInputDock';

import { saveChatToFolder, saveAppDataToFolder } from '../utils/storage';
import { speakBrowserUtterance, cancelBrowserSpeech } from '../utils/speechTTS';
import { FormattedMessageText, findMatchingEntity, normalizeEntityName } from '../utils/textFormatter';
import { detectActiveCharacter, matchCharacterExpression, resolveLocationWallpaper } from '../utils/characterMatcher';

import { executeInboundOrchestration, executeOutboundOrchestration } from '../utils/orchestratorPipeline';
import { addChat } from '../utils/db';
import { getActiveInitialMessageText } from '../utils/scenarioScoping';


import StagingModal from './StagingModal';
import CharacterPopup from './CharacterPopup';
import CharacterSidebar from './CharacterSidebar';
import ConfirmModal from './ConfirmModal';
import './chats.css';

export function resolveUserCharacter(chat, appData) {
  if (!chat || !appData?.cards) return null;
  const targetId = chat.userCharacterId || chat.characterId || chat.character;
  const targetName = (chat.userCharacterName || chat.character || chat.characterId || '').trim().toLowerCase();

  return (appData.cards || []).find(c => {
    if (c.type !== 'Personaje' && c.type !== 'User') return false;
    const cTitle = (c.title || c.name || '').trim().toLowerCase();
    return c.id === targetId ||
           (targetName && cTitle === targetName) ||
           (chat.userCharacterId && c.id === chat.userCharacterId) ||
           (chat.characterId && (c.id === chat.characterId || cTitle === chat.characterId.trim().toLowerCase())) ||
           (chat.character && (c.id === chat.character || cTitle === chat.character.trim().toLowerCase())) ||
           (chat.userCharacterName && cTitle === chat.userCharacterName.trim().toLowerCase());
  }) || findMatchingEntity(targetName, appData.cards) || null;
}

export function getScenarioCards(scenario, chat, appData, userChar) {
  const allCards = appData?.cards || [];
  const scenarioCardsArray = Array.isArray(scenario?.cards) ? scenario.cards : [];
  const chatCharactersArray = Array.isArray(chat?.characters) ? chat.characters : [];
  const activeScenarioId = scenario?.id || chat?.scenarioId;
  const activeScenarioTitle = scenario?.title || chat?.scenario;

  // Incluir objetos embebidos directos si existen en scenario.cards
  const embeddedScenarioCards = scenarioCardsArray.filter(item => item && typeof item === 'object');
  const combinedPool = [...allCards, ...embeddedScenarioCards];
  const seen = new Set();
  const uniquePool = [];
  for (const c of combinedPool) {
    const key = c.id || c.title || c.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      uniquePool.push(c);
    }
  }

  return uniquePool.filter(c => {
    if (!c) return false;
    if (userChar && (c.id === userChar.id || c.title === userChar.title)) return false;
    if (c.type === 'Inventario' || c.type === 'Memoria') return false;

    // 1. Vinculación directa en scenario.cards (por id o título)
    const isDirectlyInScenario = scenarioCardsArray.some(ref => {
      if (!ref) return false;
      const refId = typeof ref === 'string' ? ref : ref.id;
      const refTitle = typeof ref === 'string' ? ref : (ref.title || ref.name);
      return (
        (refId && (c.id === refId || normalizeEntityName(c.id) === normalizeEntityName(refId))) ||
        (refTitle && (c.title === refTitle || normalizeEntityName(c.title) === normalizeEntityName(refTitle)))
      );
    });
    if (isDirectlyInScenario) return true;

    // 2. Vinculación directa en chat.characters
    const isDirectlyInChat = chatCharactersArray.some(ref => {
      if (!ref) return false;
      const refId = typeof ref === 'string' ? ref : ref.id;
      const refTitle = typeof ref === 'string' ? ref : (ref.title || ref.name);
      return (
        (refId && (c.id === refId || normalizeEntityName(c.id) === normalizeEntityName(refId))) ||
        (refTitle && (c.title === refTitle || normalizeEntityName(c.title) === normalizeEntityName(refTitle)))
      );
    });
    if (isDirectlyInChat) return true;

    // 3. Tarjeta creada o vinculada explícitamente a este escenario
    if (c.linkedScenario) {
      if (activeScenarioId && (c.linkedScenario === activeScenarioId || normalizeEntityName(c.linkedScenario) === normalizeEntityName(activeScenarioId))) return true;
      if (activeScenarioTitle && (c.linkedScenario === activeScenarioTitle || normalizeEntityName(c.linkedScenario) === normalizeEntityName(activeScenarioTitle))) return true;
    }

    // 4. Tarjetas conectadas explícitamente a este escenario
    if (Array.isArray(c.connectedCards) && c.connectedCards.length > 0) {
      const isConnected = c.connectedCards.some(cc => {
        if (!cc || typeof cc !== 'string') return false;
        return (
          (activeScenarioId && (cc === activeScenarioId || normalizeEntityName(cc) === normalizeEntityName(activeScenarioId))) ||
          (activeScenarioTitle && (cc === activeScenarioTitle || normalizeEntityName(cc) === normalizeEntityName(activeScenarioTitle)))
        );
      });
      if (isConnected) return true;
    }

    // AISLAMIENTO TOTAL: No existen tarjetas globales. Toda entidad fuera del escenario queda excluida.
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

  // Estado ambiental y espacial persistente (F048)
  const [currentSceneState, setCurrentSceneState] = useState(() => chat?.currentSceneState || chat?.messages?.slice(-1)[0]?.sceneState || null);

  // Scroll instantáneo y sincronización de mensajes al montar o cambiar de chat
  useEffect(() => {
    activeChatIdRef.current = chat?.id;
    let currentMsgs = chat?.messages || [];
    let activeScene = chat?.currentSceneState || null;

    if (currentMsgs.length === 0 && chat?.scenarioId) {
      const scenario = (appData?.scenarios || []).find(s => s.id === chat.scenarioId) || 
                       (appData?.cards || []).find(c => c.id === chat.scenarioId);
      const firstText = getActiveInitialMessageText(scenario);
      if (firstText) {
        activeScene = resolveSceneState({
          currentText: firstText,
          scenario,
          currentTurn: 0
        });
        currentMsgs = [
          {
            from: 'narrator',
            text: firstText,
            turn: 0,
            createdAt: new Date().toISOString(),
            sceneState: activeScene
          }
        ];
        persistChatMessages(chat?.id, { ...chat, currentSceneState: activeScene }, currentMsgs, activeScene);
      }
    } else {
      currentMsgs = normalizeMessageTurns(currentMsgs);
      activeScene = activeScene || currentMsgs.slice(-1)[0]?.sceneState || null;
      if (!activeScene || !activeScene.location) {
        const scenario = (appData?.scenarios || []).find(s => s.id === chat?.scenarioId) || 
                         (appData?.cards || []).find(c => c.id === chat?.scenarioId);
        const firstText = currentMsgs[0]?.text || '';
        const initialScene = resolveSceneState({
          currentText: firstText,
          scenario,
          currentTurn: 0
        });
        if (initialScene) {
          activeScene = { ...(initialScene || {}), ...(activeScene || {}) };
          if (currentMsgs.length > 0 && !currentMsgs[0].sceneState) {
            currentMsgs[0] = { ...currentMsgs[0], sceneState: initialScene };
          }
        }
      }
    }

    setCurrentSceneState(activeScene);
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

  useEffect(() => {
    if (isSelectingForCard && selectedMessagesForCard.length > 0) {
      const refText = selectedMessagesForCard
        .map(idx => {
          const m = messages[idx];
          const author = m.from === 'user' ? 'Tú' : 'Narrador';
          return `${author}: ${m.text}`;
        })
        .join('\n\n');
      if (onOpenCreateModal) {
        onOpenCreateModal('Personaje', {
          title: 'Nuevo Elemento',
          text: refText,
          intro: refText.substring(0, 120) + '...'
        });
        setIsSelectingForCard(false);
        setSelectedMessagesForCard([]);
      }
    }
  }, [selectedMessagesForCard, isSelectingForCard, messages, onOpenCreateModal]);

  const persistChatMessages = async (targetChatId, targetChatMeta, nextMsgs, sceneState = currentSceneState) => {
    if (!targetChatId) return;
    const now = new Date().toISOString();
    const normalizedMsgs = normalizeMessageTurns(nextMsgs);
    const updatedChat = { 
      ...(targetChatMeta || {}),
      id: targetChatId,
      messages: normalizedMsgs,
      currentSceneState: sceneState,
      updatedAt: now
    };
    try { await addChat(updatedChat); } catch(err) { console.warn('IndexedDB save err:', err); }
    if (folderHandle) {
      try { await saveChatToFolder(updatedChat, folderHandle); } catch (err) {}
    }
    if (activeChatIdRef.current === targetChatId) {
      setMessages(normalizedMsgs);
      if (onUpdateChat) {
        onUpdateChat(updatedChat);
      }
    }
  };

  const persistMessages = async (nextMsgs, sceneState = currentSceneState) => {
    return persistChatMessages(chat?.id, chat, nextMsgs, sceneState);
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
  // Construcción unificada y estructurada del systemPrompt delegada al módulo promptBuilder.
  const buildSystemPrompt = (preFilteredEntities = null, sceneContext = null, targetChatOverride = null) => {
    const activeChat = targetChatOverride || chat;
    const scenario = (appData?.scenarios || []).find(s => s.id === activeChat?.scenarioId || s.title?.toLowerCase() === (activeChat?.scenario || "").toLowerCase()) ||
                     (appData?.cards || []).find(c => c.id === activeChat?.scenarioId || c.title?.toLowerCase() === (activeChat?.scenario || "").toLowerCase()) ||
                     findMatchingEntity(activeChat?.scenario, appData);
    const narrator = (appData?.narrators || []).find(n => n.id === scenario?.narrator);
    const userChar = resolveUserCharacter(activeChat, appData);
    const assignedTools = (appData?.narratorTools || []).filter(t => (narrator?.tools || []).includes(t.id));
    const userInventories = (appData?.cards || []).filter(c => 
      c && c.type === 'Inventario' && (
        (userChar?.id && c.linkedCharacterId === userChar.id) ||
        (userChar?.title && c.linkedCharacterId === userChar.title) ||
        (userChar?.id && c.ownerId === userChar.id)
      )
    );
    const relevantEntities = preFilteredEntities || scenarioCards;

    return buildStorytellerSystemPrompt({
      scenario,
      narrator,
      assignedTools,
      userChar,
      userInventories,
      relevantEntities,
      chat: activeChat,
      messages: messages.slice(-10),
      chatSettings,
      sceneContext
    });
  };
  const runBackgroundSummarization = (finalMsgs, targetChatSnapshot = chat) => {
    // Generar recuerdos fácticos cada 4 turnos narrativos
    if (!finalMsgs || finalMsgs.length < 4 || finalMsgs.length % 4 !== 0) return;

    setTimeout(async () => {
      try {
        const targetChat = targetChatSnapshot || chat;
        const targetChatId = targetChat?.id;
        if (!targetChatId) return;

        // Tomar exactamente el bloque de los últimos 4 mensajes
        const blockMessages = finalMsgs.slice(-4);

        const newSummary = await sendContextSummarizationTask({
          messages: blockMessages,
          currentMemory: (targetChat.memoryCards || []).map(m => typeof m === 'string' ? m : (m.summary || m.text || '')),
          modelId: chatSettings?.orchestratorModel || chatSettings?.preferredModel,
          preferredLanguage: chatSettings?.preferredLanguage || 'auto',
          baseUrl: chatSettings?.lmStudioUrl
        });

        if (newSummary && typeof newSummary === 'string' && newSummary.trim()) {
          console.log('[Context Summary Task]: Nueva memoria episódica generada:', newSummary);

          // Detectar qué tarjetas del escenario estaban activas/mencionadas en este bloque de 4 mensajes
          const blockText = blockMessages.map(m => m.text || '').join(' ').toLowerCase();
          const activeScenario = scenario || (appData?.scenarios || []).find(s => s.id === targetChat?.scenarioId);
          const activeScenarioCards = getScenarioCards(activeScenario, targetChat, appData, userChar);
          const connectedCards = activeScenarioCards.filter(c => {
            const name = (c.title || c.name || '').toLowerCase();
            return name && name.length > 2 && blockText.includes(name);
          }).map(c => c.id || c.title);

          const newMemoryEntry = {
            id: `mem-${Date.now()}`,
            type: 'Memoria',
            turnRange: `${Math.max(0, finalMsgs.length - 4)}-${finalMsgs.length - 1}`,
            summary: newSummary.trim(),
            connectedCards,
            createdAt: new Date().toISOString()
          };

          const nextMemory = [...(targetChat.memoryCards || []), newMemoryEntry];
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
        const userChar = resolveUserCharacter(targetChat, appData);
        
        // Aislamiento estricto: solo tarjetas del escenario activo, no las 33 globales
        const activeScenarioCards = getScenarioCards(scenario, targetChat, appData, userChar);
        const allKnownCards = [...activeScenarioCards, ...(targetChat?.cards || []), ...(scenario ? [scenario] : [])];

        const extractedEntities = await sendExtractCardsTask({
          messages: finalMsgs.slice(-10),
          existingCards: activeScenarioCards,
          existingScenarios: scenario ? [scenario] : [],
          activeScenario: scenario,
          userChar: userChar,
          modelId: chatSettings?.orchestratorModel || chatSettings?.preferredModel,
          preferredLanguage: chatSettings?.preferredLanguage || 'auto',
          baseUrl: chatSettings?.lmStudioUrl
        });

        if (Array.isArray(extractedEntities) && extractedEntities.length > 0) {
          // Filtro de cuatro capas: Recurrencia, Significancia, Deduplicación y Protección del Protagonista (F047)
          const eligibleEntities = extractedEntities.filter(entity => {
            const isEligible = isEntityEligibleForAutoCard(entity, finalMsgs, {
              minRecurrence: 3,
              existingCards: allKnownCards,
              userChar
            });
            if (!isEligible) {
              console.log(`[Auto-Card Gatekeeper]: Descartado por duplicado, persona del jugador, animal incidental o no alcanzar recurrencia >= 3 turnos: "${entity.title}"`);
            }
            return isEligible;
          });

          if (eligibleEntities.length === 0) {
            return;
          }

          console.log(`[Auto-Card Task]: ${eligibleEntities.length} entidades aprobadas por el gatekeeper:`, eligibleEntities);
          const newCardObjects = [];
          const recentStoryContext = finalMsgs.slice(-6).map(m => `${m.from === 'user' ? 'Jugador' : 'Narrador'}: ${m.text}`).join('\n\n');

          for (const entity of eligibleEntities) {
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
              linkedScenario: targetChat?.scenarioId || scenario?.id || scenario?.title || undefined,
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
      const activeScenario = scenario || (appData?.scenarios || []).find(s => 
        s.id === targetChatSnapshot?.scenarioId || s.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || (appData?.cards || []).find(c => 
        c.id === targetChatSnapshot?.scenarioId || c.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || findMatchingEntity(targetChatSnapshot?.scenario, appData);

      const activeUserChar = resolveUserCharacter(targetChatSnapshot, appData);

      // 1. Orquestación Inbound (Pre-Vuelo con estricto ámbito de escenario)
      const activeScenarioCards = getScenarioCards(activeScenario, targetChatSnapshot, appData, activeUserChar);
      const lastUserPrompt = promptMessages[promptMessages.length - 1]?.text || '';
      const redoTurn = historyBefore.length > 0
        ? (historyBefore[historyBefore.length - 1].turn !== undefined ? historyBefore[historyBefore.length - 1].turn + 1 : historyBefore.length)
        : 0;
      const previousState = historyBefore.length > 0 ? historyBefore[historyBefore.length - 1].sceneState : currentSceneState;

      const inbound = await executeInboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        userMessage: lastUserPrompt,
        cards: activeScenarioCards,
        recentMessages: historyBefore.slice(-10),
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl,
        previousSceneState: previousState,
        scenario: activeScenario,
        currentTurn: redoTurn
      });

      const systemPrompt = buildSystemPrompt(inbound.filteredCards, inbound.sceneContext, targetChatSnapshot);
      const res = await sendChatMessage({
        messages: promptMessages.slice(-10),
        systemInstruction: systemPrompt,
        contextDocuments: (inbound.filteredCards && inbound.filteredCards.length > 0) ? inbound.filteredCards : (targetChatSnapshot.contextDocuments || []),
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
      const finalSceneState = resolveSceneState({
        previousState: inbound.sceneState,
        currentText: finalNarrative,
        scenario: activeScenario,
        currentTurn: redoTurn
      });
      setCurrentSceneState(finalSceneState);
      const newAiMsg = {
        from: aiRole,
        text: finalNarrative,
        turn: redoTurn,
        timestamp: new Date().toISOString(),
        sceneState: finalSceneState
      };
      const finalMsgs = [...historyBefore, newAiMsg];
      await persistChatMessages(executionChatId, targetChatSnapshot, finalMsgs, finalSceneState);
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

    const lastTurn = messages.length > 0
      ? (messages[messages.length - 1].turn !== undefined ? messages[messages.length - 1].turn : messages.length - 1)
      : -1;
    const userTurn = lastTurn + 1;

    const newMsg = {
      from: 'user',
      text: textToSend.trim() || '...',
      turn: userTurn,
      timestamp: new Date().toISOString(),
      sceneState: currentSceneState
    };
    const nextMsgs = textToSend.trim() ? [...messages, newMsg] : messages;
    
    const streamingAiMsg = { from: 'ai', text: '', turn: userTurn + 1, timestamp: new Date().toISOString() };
    
    if (textToSend.trim()) {
      await persistChatMessages(executionChatId, targetChatSnapshot, nextMsgs, currentSceneState);
    }
    
    if (activeChatIdRef.current === executionChatId) {
      setMessages([...nextMsgs, streamingAiMsg]);
      if (overrideText === null) setInputMsg('');
      setIsSending(true);
      setGenerationProgress({ percent: 15, status: '🧠 Orquestador: Analizando intención y relevancia de lore...' });
    }

    try {
      const activeScenario = scenario || (appData?.scenarios || []).find(s => 
        s.id === targetChatSnapshot?.scenarioId || s.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || (appData?.cards || []).find(c => 
        c.id === targetChatSnapshot?.scenarioId || c.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || findMatchingEntity(targetChatSnapshot?.scenario, appData);

      const activeUserChar = resolveUserCharacter(targetChatSnapshot, appData);

      // 1. Orquestación Inbound (Pre-Vuelo con aislamiento estricto de tarjetas del escenario)
      const activeScenarioCards = getScenarioCards(activeScenario, targetChatSnapshot, appData, activeUserChar);
      const inbound = await executeInboundOrchestration({
        orchestratorModel: chatSettings?.orchestratorModel,
        userMessage: textToSend.trim(),
        cards: activeScenarioCards,
        recentMessages: messages.slice(-10),
        chatSettings,
        baseUrl: chatSettings?.lmStudioUrl,
        previousSceneState: currentSceneState,
        scenario: activeScenario,
        currentTurn: userTurn
      });

      if (inbound.sceneState) {
        newMsg.sceneState = inbound.sceneState;
        setCurrentSceneState(inbound.sceneState);
      }

      // 2. Generación Principal con Storyteller
      const systemPrompt = buildSystemPrompt(inbound.filteredCards, inbound.sceneContext, targetChatSnapshot);

      const res = await sendChatMessage({
        messages: nextMsgs.slice(-10),
        systemInstruction: systemPrompt,
        contextDocuments: (inbound.filteredCards && inbound.filteredCards.length > 0) ? inbound.filteredCards : (targetChatSnapshot.contextDocuments || []),
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
      const aiTurn = userTurn + 1;
      const finalSceneState = resolveSceneState({
        previousState: inbound.sceneState || currentSceneState,
        currentText: finalNarrative,
        scenario: activeScenario,
        currentTurn: aiTurn
      });
      setCurrentSceneState(finalSceneState);
      const aiMsg = {
        from: 'ai',
        text: finalNarrative,
        turn: aiTurn,
        timestamp: new Date().toISOString(),
        sceneState: finalSceneState
      };
      const finalMsgs = [...nextMsgs, aiMsg];
      await persistChatMessages(executionChatId, targetChatSnapshot, finalMsgs, finalSceneState);

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
      const activeScenario = scenario || (appData?.scenarios || []).find(s => 
        s.id === targetChatSnapshot?.scenarioId || s.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || (appData?.cards || []).find(c => 
        c.id === targetChatSnapshot?.scenarioId || c.title?.toLowerCase() === (targetChatSnapshot?.scenario || '').toLowerCase()
      ) || findMatchingEntity(targetChatSnapshot?.scenario, appData);

      const activeUserChar = resolveUserCharacter(targetChatSnapshot, appData);

      const activeScenarioCards = getScenarioCards(activeScenario, targetChatSnapshot, appData, activeUserChar);
      const basePrompt = buildSystemPrompt(null, null, targetChatSnapshot);
      const systemPrompt = `${basePrompt}\n\n[ÓRDENE EXTRA DE INMEDIATA]: Continúa la narración desde el punto exacto donde quedó.`;

      const res = await sendChatMessage({
        messages: messages.slice(-10),
        systemInstruction: systemPrompt,
        contextDocuments: (activeScenarioCards && activeScenarioCards.length > 0) ? activeScenarioCards : (targetChatSnapshot.contextDocuments || []),
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
  const userChar = resolveUserCharacter(chat, appData);

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
                <div className="msg-header-left">
                  <span className="msg-author">
                    {m.from === 'user' 
                      ? 'Tú' 
                      : (appData?.scenarios?.find(s => s.id === chat.scenarioId)?.narrator ? '🧙 Narrador (IA)' : 'Narrador (IA)')
                    }
                  </span>
                  <span className="msg-turn-badge" title={`Secuencia de mensaje #${m.turn !== undefined ? m.turn : idx}`}>
                    #{m.turn !== undefined ? m.turn : idx}
                  </span>
                  {m.sceneState && (m.sceneState.location || m.sceneState.timeOfDay || m.sceneState.weather) && (
                    <span 
                      className="msg-scene-pill" 
                      title={`Lugar: ${m.sceneState.location || 'N/A'} | Momento: ${m.sceneState.timeOfDay || 'N/A'} | Clima: ${m.sceneState.weather || 'N/A'}`}
                    >
                      {m.sceneState.location && <span>📍 {m.sceneState.location}</span>}
                      {m.sceneState.timeOfDay && <span>🕒 {m.sceneState.timeOfDay}</span>}
                      {m.sceneState.weather && <span>⛅ {m.sceneState.weather}</span>}
                    </span>
                  )}
                </div>
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
      <ChatInputDock
        input={inputMsg}
        setInput={setInputMsg}
        isSending={isSending}
        onSendMessage={(e) => {
          if (e && e.preventDefault) e.preventDefault();
          handleSend();
        }}
        onContinue={handleContinue}
        onRedo={() => handleRedo(null)}
        onOpenStaging={() => setIsStagingOpen(true)}
        onBranchChat={() => onBranchChat && onBranchChat(chat, messages)}
        onTogglePeek={() => setIsPeekTransparent(prev => !prev)}
        isPeekTransparent={isPeekTransparent}
        autoGenCards={autoGenCards}
        onToggleAutoGenCards={handleToggleAutoGenCards}
        isSelectingForCard={isSelectingForCard}
        onToggleSelectingForCard={() => {
          setIsSelectingForCard(!isSelectingForCard);
          setSelectedMessagesForCard([]);
        }}
        chatSettings={chatSettings}
        onUpdateChatSettings={onUpdateChatSettings}
        isRecordingAudio={false}
        onToggleAudioRecording={() => {}}
        textareaRef={inputRef}
        isSidebarVisible={isSidebarVisible}
        isCharacterSidebarClosed={isCharacterSidebarClosed}
        activeCharacter={activeCharacter}
        onOpenSidebar={() => setIsCharacterSidebarClosed(false)}
      />
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
        characters={scenarioCharacters.length > 0 ? scenarioCharacters : (Array.isArray(chat?.characters) ? chat.characters : [])}
        onGenerateImage={async (stagingData) => {
          try {
            const { width = 768, height = 512 } = stagingData;
            const localUrl = await generateImageLocal(
              stagingData.prompt, 
              stagingData.style,
              chatSettings?.imageServerUrl,
              chatSettings?.preferredImageModel,
              width,
              height
            );
            if (localUrl) {
              const imageMsg = {
                from: 'narrator',
                isImage: true,
                imageUrl: localUrl,
                text: `[Escena generada]: ${stagingData.summary || stagingData.prompt}`,
                createdAt: new Date().toISOString()
              };
              persistMessages([...messages, imageMsg]);
            }
          } catch (err) {
            console.warn('[Staging]: Error generating scene image:', err);
            alert(`[Escenificación]: No se pudo generar la imagen de escena. ${err.message || 'Verifica que el motor de difusión local esté activo.'}`);
          }
        }}
      />

      <CharacterPopup 
        scenario={popupCharacter}
        isOpen={!!popupCharacter}
        onClose={() => setPopupCharacter(null)}
      />

      {/* MODAL DE ENTIDAD O TÉRMINO CLAVE CLICKEADO (COMPENDIO / LORE) - POPUP CENTRADO CON PORTAL */}
      {activeEntityModal && (
        <ActiveEntityModal
          activeEntityModal={activeEntityModal}
          onClose={() => setActiveEntityModal(null)}
          isGeneratingLore={isGeneratingLore}
          isGeneratingTagCover={isGeneratingTagCover}
          onGenerateLore={handleGenerateTagLore}
          onGenerateCover={handleGenerateTagCover}
          onSaveEntity={handleSaveTagCard}
          onOpenCreateModal={onOpenCreateModal}
          onChangeField={(field, value) => setActiveEntityModal(prev => ({ ...prev, [field]: value }))}
        />
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
