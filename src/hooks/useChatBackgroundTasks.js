import { useCallback } from 'react';
import { 
  sendContextSummarizationTask, 
  sendExtractCardsTask, 
  generateImageLocal,
  generateLocationWallpaper,
  generateCharacterPortrait
} from '../utils/localAIStudio';
import { isEntityEligibleForAutoCard } from '../utils/cardGatekeeper';
import { autoCompleteEntityWithAI } from '../utils/aiEnhancer';
import { saveAppDataToFolder, saveChatToFolder } from '../utils/storage';
import { getScenarioCards, resolveUserCharacter } from '../utils/scenarioScoping';

/**
 * Hook desacoplado para la gestión de tareas de fondo en el chat:
 * 1. Resumen de contexto y memoria episódica cada 4 turnos.
 * 2. Extracción y auto-completado de tarjetas con imágenes con IA local.
 */
export function useChatBackgroundTasks({
  chat,
  activeChatIdRef,
  appData,
  onUpdateAppData,
  folderHandle,
  chatSettings,
  autoGenCards,
  setMessages,
  userChar,
  scenario
}) {
  const runBackgroundSummarization = useCallback((finalMsgs, targetChatSnapshot = chat) => {
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
  }, [chat, activeChatIdRef, appData, folderHandle, chatSettings, setMessages, userChar, scenario]);

  const runBackgroundCardGeneration = useCallback((finalMsgs, targetChatSnapshot = chat) => {
    if (!autoGenCards) return;
    setTimeout(async () => {
      try {
        const targetChat = targetChatSnapshot || chat;
        const activeScenario = (appData?.scenarios || []).find(s => s.id === targetChat?.scenarioId || s.title?.toLowerCase() === (targetChat?.scenario || '').toLowerCase()) ||
                         (appData?.cards || []).find(c => c.id === targetChat?.scenarioId || c.title?.toLowerCase() === (targetChat?.scenario || '').toLowerCase());
        const activeUserChar = resolveUserCharacter(targetChat, appData);

        // Aislamiento estricto: solo tarjetas del escenario activo, no las 33 globales
        const activeScenarioCards = getScenarioCards(activeScenario, targetChat, appData, activeUserChar);
        const allKnownCards = [...activeScenarioCards, ...(targetChat?.cards || []), ...(activeScenario ? [activeScenario] : [])];

        const extractedEntities = await sendExtractCardsTask({
          messages: finalMsgs.slice(-10),
          existingCards: activeScenarioCards,
          existingScenarios: activeScenario ? [activeScenario] : [],
          activeScenario: activeScenario,
          userChar: activeUserChar,
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
              userChar: activeUserChar
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
              linkedScenario: targetChat?.scenarioId || activeScenario?.id || activeScenario?.title || undefined,
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
  }, [chat, appData, onUpdateAppData, folderHandle, chatSettings, autoGenCards]);

  return {
    runBackgroundSummarization,
    runBackgroundCardGeneration
  };
}
