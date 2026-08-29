import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ScenarioPopup from './components/ScenarioPopup';
import CharacterModal from './components/CharacterModal';
import ChatsList from './components/ChatsList';
import ChatView from './components/ChatView';
import Home from './pages/Home';
import Create from './pages/Create';
import CreateModal from './components/CreateModal';
import CharacterPopup from './components/CharacterPopup';
import ConfirmModal from './components/ConfirmModal';
import AuthModal from './components/AuthModal';

import { getAllChats, addChat, getChatActivityTimestamp, loadAppDataFromIndexedDB } from './utils/db';
import { loadAppData, saveAppData, requestDirectoryHandle, loadDirectoryHandle, loadAppDataFromFolder, saveAppDataToFolder, saveChatToFolder, loadChatSettings, saveChatSettings, DEFAULT_CHAT_SETTINGS } from './utils/storage';
import { loadDualModels } from './utils/localAIStudio';

import { fetchCurrentUser, logoutUser, updateUserProfile as apiUpdateUserProfile, getStoredAuth } from './utils/authApi';
import { fetchAppDataFromServer, saveAppDataToServer, getServerBaseUrl, fetchChatsFromServer, saveChatsToServer } from './utils/serverApi';

import Profile from './pages/Profile';
import MusicView from './pages/MusicView';

function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth().user);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const [popupScenario, setPopupScenario] = useState(null);

  const [initialModalType, setInitialModalType] = useState('Historia');
  const [editItem, setEditItem] = useState(null);

  const openCreateModal = (type = 'Historia', item = null) => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      return;
    }
    setInitialModalType(type);
    setEditItem(item);
    setCreateModalOpen(true);
  };


  const openScenario = (scenario) => { setPopupScenario(scenario); setScenarioOpen(true); };
  const closeScenario = () => { setScenarioOpen(false); setPopupScenario(null); };

  const startChat = () => {
    setScenarioOpen(false);
    setCharOpen(true);
  };

  const closeChar = () => setCharOpen(false);
  const handleSelectChar = async (id) => {
    console.log('Selected character:', id);
    const initialMsgText = (popupScenario?.presentation || popupScenario?.intro || '').trim();
    const initialMessages = initialMsgText ? [
      {
        from: 'narrator',
        text: initialMsgText,
        createdAt: new Date().toISOString()
      }
    ] : [];

    // create a new chat record and persist to IndexedDB
    const chat = {
      id: `chat-${Date.now()}`,
      scenario: popupScenario ? popupScenario.title : 'Sin título',
      scenarioId: popupScenario ? popupScenario.id : 'demo-1',
      characterId: id,
      createdAt: new Date().toISOString(),
      messages: initialMessages
    };
    try {
      const { addChat } = await import('./utils/db');
      await addChat(chat);
      if (folderHandle) {
        try {
          await saveChatToFolder(chat, folderHandle);
          setStorageStatus('Chat guardado también en la carpeta seleccionada.');
        } catch (folderErr) {
          console.warn('Could not save chat to folder', folderErr);
        }
      }
      console.log('Chat saved:', chat.id);
      // refresh in-memory list and open the new chat
      refreshChats();
      setSelectedChat(chat);
      setPopupScenario(null);
      setView('chat');
    } catch (err) {
      console.error('Could not save chat', err);
    }
    setCharOpen(false);
  };

  const [recentChats, setRecentChats] = useState([]);
  const refreshChats = async () => {
    try {
      const data = await getAllChats();
      if (Array.isArray(data)) {
        const sorted = data.slice().sort((a, b) => getChatActivityTimestamp(b) - getChatActivityTimestamp(a));
        setRecentChats(sorted);
      }
    } catch (e) { console.warn('refreshChats failed', e); }
  };

  useEffect(() => { refreshChats(); }, []);

  const [view, setView] = useState(() => localStorage.getItem('ptah_last_view') || 'home');
  useEffect(() => localStorage.setItem('ptah_last_view', view), [view]);

  const [selectedChat, setSelectedChat] = useState(null);
  const [appData, setAppData] = useState(() => loadAppData());

  useEffect(() => {
    if (view === 'chat' && !selectedChat && recentChats.length > 0) {
      setSelectedChat(recentChats[0]);
    }
  }, [view, selectedChat, recentChats]);


  // Restore full rich appData from IndexedDB on startup
  useEffect(() => {
    loadAppDataFromIndexedDB().then(idbData => {
      if (idbData && (idbData.scenarios?.length || idbData.cards?.length)) {
        const cleanList = (list = []) => list.filter(item => item && item.id && item.id !== 's1');
        const cleanScenarios = cleanList(idbData.scenarios);
        const cleanCards = cleanList(idbData.cards);
        const cleanNarrators = cleanList(idbData.narrators);
        const cleanTools = cleanList(idbData.tools);
        setAppData(prev => {
          if (!prev) return { scenarios: cleanScenarios, cards: cleanCards, narrators: cleanNarrators, tools: cleanTools };
          return {
            scenarios: (cleanScenarios.length >= (prev?.scenarios?.length || 0)) ? cleanScenarios : prev.scenarios,
            cards: (cleanCards.length >= (prev?.cards?.length || 0)) ? cleanCards : prev.cards,
            narrators: (cleanNarrators.length >= (prev?.narrators?.length || 0)) ? cleanNarrators : prev.narrators,
            tools: (cleanTools.length >= (prev?.tools?.length || 0)) ? cleanTools : prev.tools
          };
        });
      }
    }).catch(() => { });
  }, []);

  // Restore user session on mount and auto-attribute legacy creations
  useEffect(() => {
    fetchCurrentUser().then(res => {
      if (res && res.user) {
        setCurrentUser(res.user);
        setAppData(prevData => {
          const { relinkAllCreationsToUser } = require('./utils/storage');
          const { data: relinked, modifiedCount } = relinkAllCreationsToUser(prevData, res.user);
          if (modifiedCount > 0) {
            saveAppData(relinked);
            saveAppDataToServer(relinked).catch(() => { });
          }
          return relinked;
        });
      }
    }).catch(() => { });
  }, []);

  // Restore linked folder handle from IndexedDB on startup
  useEffect(() => {
    loadDirectoryHandle().then(async (handle) => {
      if (handle) {
        setFolderHandle(handle);
        try {
          const folderData = await loadAppDataFromFolder(handle);
          if (folderData) {
            setAppData(prev => {
              const mergeLists = (a = [], b = []) => {
                const map = new Map();
                for (const item of [...a, ...b]) {
                  if (item && item.id) {
                    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
                  }
                }
                return Array.from(map.values());
              };
              const combined = {
                scenarios: mergeLists(prev.scenarios, folderData.scenarios),
                cards: mergeLists(prev.cards, folderData.cards),
                narrators: mergeLists(prev.narrators, folderData.narrators),
                tools: mergeLists(prev.tools, folderData.tools)
              };
              saveAppData(combined);
              saveAppDataToServer(combined).catch(() => { });
              return combined;
            });
            setStorageStatus('Carpeta local de datos conectada.');
          }
        } catch (e) {
          console.warn('Auto-read from folder handle failed', e);
        }
      }
    }).catch(() => { });
  }, []);

  // Synchronize appData and chats with server storage (ptah-data/) on boot
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const sRes = await fetchAppDataFromServer();
        const localData = loadAppData();
        const mergeLists = (a = [], b = []) => {
          const map = new Map();
          for (const item of [...a, ...b]) {
            if (item && item.id) {
              map.set(item.id, { ...(map.get(item.id) || {}), ...item });
            }
          }
          return Array.from(map.values());
        };

        const sData = (sRes && sRes.success && sRes.data) ? sRes.data : { scenarios: [], cards: [], narrators: [], tools: [] };
        const cleanList = (list = []) => list.filter(item => item && item.id && item.id !== 's1');
        const merged = {
          scenarios: cleanList(mergeLists(sData.scenarios, localData.scenarios)),
          cards: cleanList(mergeLists(sData.cards, localData.cards)),
          narrators: cleanList(mergeLists(sData.narrators, localData.narrators)),
          tools: cleanList(mergeLists(sData.tools, localData.tools))
        };

        setAppData(merged);
        saveAppData(merged);
        saveAppDataToServer(merged).catch(() => { });

        // Sync chats with server without overwriting newer local chats
        const baseUrl = getServerBaseUrl();
        const chatsRes = await fetchChatsFromServer(baseUrl);
        const serverChats = (chatsRes && chatsRes.success && Array.isArray(chatsRes.chats)) ? chatsRes.chats : [];
        const localChats = await getAllChats();

        const chatMap = new Map();
        for (const c of [...serverChats, ...localChats]) {
          if (c && c.id) {
            const existing = chatMap.get(c.id);
            if (!existing) {
              chatMap.set(c.id, c);
            } else {
              // Keep the one with newer activity
              if (getChatActivityTimestamp(c) >= getChatActivityTimestamp(existing)) {
                chatMap.set(c.id, c);
              }
            }
          }
        }

        const mergedChats = Array.from(chatMap.values());
        for (const c of mergedChats) {
          await addChat(c).catch(() => { });
        }
        await saveChatsToServer(mergedChats, baseUrl).catch(() => { });
        refreshChats();
      } catch (e) {
        console.warn('Sync with server disk storage failed', e);
      }
    };
    syncWithServer();
  }, []);


  const [folderHandle, setFolderHandle] = useState(null);
  const [storageStatus, setStorageStatus] = useState('');

  const updateAppData = async (nextData) => {
    setAppData(nextData);
    saveAppData(nextData);
    try {
      const res = await saveAppDataToServer(nextData);
      if (res && res.success && res.data) {
        setAppData(res.data);
      }
    } catch (e) {}
    if (folderHandle) {
      try {
        await saveAppDataToFolder(nextData, folderHandle);
        setStorageStatus('Guardado automático en carpeta seleccionada.');
      } catch (err) {
        console.warn('Auto-save folder failed', err);
        setStorageStatus('Error guardando en carpeta. Revisa permisos.');
      }
    }
  };

  const handleOpenAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const handleUpdateUser = async (updates) => {
    const res = await apiUpdateUserProfile(updates);
    if (res.user) {
      setCurrentUser(res.user);
    }
  };


  const navigate = (v) => {
    setSelectedChat(null);
    setView(v);
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
    setView('chat');
  };

  const chooseFolder = async () => {
    try {
      const handle = await requestDirectoryHandle();
      if (handle) {
        setFolderHandle(handle);
        setStorageStatus('Carpeta seleccionada para guardado automático.');
        if (appData) {
          await saveAppDataToFolder(appData, handle);
        }
      }
    } catch (error) {
      console.warn('Folder selection failed', error);
      setStorageStatus('No se pudo seleccionar la carpeta.');
    }
  };

  useEffect(() => {
    const restoreHandle = async () => {
      try {
        const handle = await loadDirectoryHandle();
        if (handle) {
          setFolderHandle(handle);
          setStorageStatus('Carpeta local conectada: /ptah-data/');
          const localData = await loadAppDataFromFolder(handle);
          if (localData) {
            setAppData(prev => {
              if (!prev) return localData;
              // Hacer merge simple para no perder nada si la carpeta tiene cosas y el local storage otras (o si localStorage está más fresco).
              // Normalmente localStorage es más fresco si la carpeta falló en guardar.
              // Priorizamos los arrays más largos.
              return {
                scenarios: (prev.scenarios?.length > localData.scenarios?.length) ? prev.scenarios : localData.scenarios,
                cards: (prev.cards?.length > localData.cards?.length) ? prev.cards : localData.cards,
                narrators: (prev.narrators?.length > localData.narrators?.length) ? prev.narrators : localData.narrators,
              };
            });
          }
        }
      } catch (error) {
        console.warn('Could not restore folder handle', error);
      }
    };
    restoreHandle();
  }, []);

  const handleInspectScenarioFromChat = (chat) => {
    const sc = (appData.scenarios || []).find(s => s.id === chat.scenarioId) || { title: chat.scenario, intro: 'Escenario activo de chat.' };
    openScenario(sc);
  };

  const handleCopyChat = async (chat) => {
    const newChat = {
      ...chat,
      id: `chat-${Date.now()}`,
      scenario: `${chat.scenario} (Copia)`,
      createdAt: new Date().toISOString()
    };
    const { addChat } = await import('./utils/db');
    await addChat(newChat);
    if (folderHandle) {
      try { await saveChatToFolder(newChat, folderHandle); } catch (e) { }
    }
    refreshChats();
  };

  const [confirmModal, setConfirmModal] = useState(null);

  const handleDeleteChat = (id) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar partida?',
      message: '¿Estás seguro de que deseas eliminar este chat y todo su historial de interacción? Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar partida',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmModal(null);
        const { deleteChat } = await import('./utils/db');
        await deleteChat(id);
        if (selectedChat && selectedChat.id === id) {
          setSelectedChat(null);
          setView('home');
        }
        refreshChats();
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const handleModifyScenario = (scenario) => {
    setScenarioOpen(false);
    openCreateModal('Escenario', scenario);
  };

  // Carga inicial segura de la configuración del usuario desde storage centralizado
  const [chatSettings, setChatSettings] = useState(() => loadChatSettings());

  // Sincronizar preferencias del perfil del usuario cuando inicia sesión o se carga
  useEffect(() => {
    if (currentUser && currentUser.preferences && currentUser.preferences.chatSettings) {
      const userSettings = {
        ...DEFAULT_CHAT_SETTINGS,
        ...currentUser.preferences.chatSettings
      };
      setChatSettings(userSettings);
      saveChatSettings(userSettings);
    }
  }, [currentUser]);

  // Ensure dual models (Storyteller + Orchestrator) are resident in LM Studio on startup
  useEffect(() => {
    if (chatSettings?.preferredModel || chatSettings?.orchestratorModel) {
      loadDualModels(chatSettings.preferredModel, chatSettings.orchestratorModel, chatSettings.lmStudioUrl);
    }
  }, [chatSettings?.preferredModel, chatSettings?.orchestratorModel, chatSettings?.lmStudioUrl]);

  // Función para guardar y actualizar la configuración de chat del usuario (global y en perfil)
  const handleUpdateChatSettings = (nextSettings) => {
    setChatSettings(nextSettings);
    saveChatSettings(nextSettings);
    loadDualModels(nextSettings.preferredModel, nextSettings.orchestratorModel, nextSettings.lmStudioUrl);
    if (currentUser) {
      const updatedPrefs = {
        ...(currentUser.preferences || {}),
        chatSettings: nextSettings
      };
      handleUpdateUser({ preferences: updatedPrefs });
    }
  };


  // Función para guardar y actualizar la configuración de estilo específica de este chat
  const handleUpdateChatCustomStyle = async (newStyle) => {
    if (!selectedChat) return;
    const updated = { ...selectedChat, customStyle: newStyle };
    setSelectedChat(updated);
    try {
      await addChat(updated);
      refreshChats();
    } catch (e) {
      console.warn('Error saving customStyle:', e);
    }
  };

  return (
    <div className="App">
      <section className="Side-bar-panel">
        <Sidebar
          appData={appData}
          onNavigate={navigate}
          onOpenChat={openChat}
          recentChats={recentChats}
          onInspectScenario={handleInspectScenarioFromChat}
          onCopyChat={handleCopyChat}
          onDeleteChat={handleDeleteChat}
        />
      </section>

      <main className="main">
        <TopBar
          currentView={view}
          onNavigate={navigate}
          onChooseFolder={chooseFolder}
          storageStatus={storageStatus}
          currentUser={currentUser}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          chatSettings={chatSettings}
          onUpdateChatSettings={handleUpdateChatSettings}
          onUpdateChatCustomStyle={handleUpdateChatCustomStyle}
          activeChat={selectedChat}
          dmName={
            selectedChat
              ? (() => {
                const sc = (appData.scenarios || []).find(s => s.id === selectedChat.scenarioId);
                if (sc && sc.narrator) {
                  const narr = (appData.narrators || []).find(n => n.id === sc.narrator);
                  return narr ? narr.name : null;
                }
                return null;
              })()
              : null
          }
          onOpenScenarioPopup={(chat) => {
            const sc = (appData.scenarios || []).find(s => s.id === chat.scenarioId) || { title: chat.scenario, intro: 'Escenario activo' };
            openScenario(sc);
          }}
          onExportChat={(format) => {
            if (!selectedChat) return;
            const msgs = selectedChat.messages || [];
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(msgs, null, 2));
            const anchor = document.createElement('a');
            anchor.setAttribute("href", dataStr);
            anchor.setAttribute("download", `chat-${selectedChat.scenario}-${Date.now()}.json`);
            anchor.click();
          }}
          onOpenCharModal={() => setCharOpen(true)}
          constantPrompt={selectedChat?.constantPrompt || ''}
          onChangeConstantPrompt={(val) => {
            if (!selectedChat) return;
            setSelectedChat(prev => ({ ...prev, constantPrompt: val }));
          }}
          memoryCards={selectedChat?.memoryCards || []}
          onAddMemory={(txt) => {
            if (!selectedChat) return;
            setSelectedChat(prev => ({ ...prev, memoryCards: [...(prev.memoryCards || []), txt] }));
          }}
        />
        {view === 'home' && (
          <div className="page-container">
            <Home onOpenScenario={openScenario} scenarios={appData.scenarios || []} cards={appData.cards || []} />
          </div>
        )}

        {view === 'music' && (
          <div className="page-container">
            <MusicView appData={appData} onUpdateAppData={updateAppData} />
          </div>
        )}

        {view === 'chats' && !selectedChat && (
          <div className="page-container">
            <ChatsList
              onOpen={(chat) => openChat(chat)}
              appData={appData}
              onOpenScenario={openScenario}
            />
          </div>
        )}

        {(view === 'chat' || (view === 'chats' && selectedChat)) && selectedChat && (
          <ChatView
            chat={selectedChat}
            onBack={() => {
              setSelectedChat(null);
              setView('chats');
            }}
            onUpdateChat={(updated) => {
              setSelectedChat(updated);
              refreshChats();
            }}
            folderHandle={folderHandle}
            appData={appData}
            onUpdateAppData={updateAppData}
            chatSettings={chatSettings}
            onUpdateChatSettings={handleUpdateChatSettings}
            onOpenCreateModal={openCreateModal}
          />
        )}

        {view === 'create' && (
          <div className="page-container">
            <Create
              appData={appData}
              onUpdateAppData={updateAppData}
              onOpenScenario={openScenario}
              onOpenCreateModal={openCreateModal}
              currentUser={currentUser}
              onOpenAuthModal={handleOpenAuthModal}
            />
          </div>
        )}

        {view === 'profile' && (
          <div className="page-container">
            <Profile
              appData={appData}
              currentUser={currentUser}
              onOpenAuthModal={handleOpenAuthModal}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
              onUpdateAppData={updateAppData}
              folderHandle={folderHandle}
              storageStatus={storageStatus}
              onNavigate={navigate}
              onOpenChat={openChat}
              onOpenScenario={openScenario}
            />

          </div>
        )}
      </main>


      {popupScenario && (popupScenario.type?.toLowerCase() === 'personaje' || popupScenario.category === 'Personaje') ? (
        <CharacterPopup
          scenario={popupScenario}
          isOpen={scenarioOpen}
          onClose={closeScenario}
          onStartChat={startChat}
        />
      ) : (
        <ScenarioPopup
          scenario={popupScenario}
          isOpen={scenarioOpen}
          onClose={closeScenario}
          onStartChat={startChat}
          onModifyScenario={handleModifyScenario}
        />
      )}
      <CharacterModal
        isOpen={charOpen}
        onClose={closeChar}
        onSelect={handleSelectChar}
        onOpenCreateCard={() => openCreateModal('Personaje')}
        userCards={appData.cards || []}
        scenarioCharacters={popupScenario?.characters || popupScenario?.cards || []}
        allCards={appData.cards || []}
      />

      <CreateModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditItem(null);
        }}
        initialType={initialModalType}
        editItem={editItem}
        appData={appData}
        onSaveItem={({ type, data: rawItem, createScenarioAlso }) => {
          let nextData = { ...appData };
          const newItem = currentUser ? {
            ...rawItem,
            creatorId: rawItem.creatorId || currentUser.id,
            creatorName: rawItem.creatorName || currentUser.username,
            creatorKey: rawItem.creatorKey || currentUser.userKey
          } : rawItem;

          if (type === 'scenario') {
            const exists = (appData.scenarios || []).some(s => s.id === newItem.id);
            nextData.scenarios = exists
              ? appData.scenarios.map(s => s.id === newItem.id ? newItem : s)
              : [newItem, ...(appData.scenarios || [])];
          } else if (type === 'narrator') {
            const exists = (appData.narrators || []).some(n => n.id === newItem.id);
            nextData.narrators = exists
              ? appData.narrators.map(n => n.id === newItem.id ? newItem : n)
              : [newItem, ...(appData.narrators || [])];
          } else if (type === 'tool' || type === 'Herramienta') {
            const exists = (appData.tools || []).some(t => t.id === newItem.id);
            nextData.tools = exists
              ? appData.tools.map(t => t.id === newItem.id ? newItem : t)
              : [newItem, ...(appData.tools || [])];
          } else {
            // Tarjeta
            const exists = (appData.cards || []).some(c => c.id === newItem.id);
            nextData.cards = exists
              ? appData.cards.map(c => c.id === newItem.id ? newItem : c)
              : [newItem, ...(appData.cards || [])];

            if (createScenarioAlso) {
              const enrichedScenario = currentUser ? {
                ...createScenarioAlso,
                creatorId: createScenarioAlso.creatorId || currentUser.id,
                creatorName: createScenarioAlso.creatorName || currentUser.username,
                creatorKey: createScenarioAlso.creatorKey || currentUser.userKey
              } : createScenarioAlso;
              nextData.scenarios = [enrichedScenario, ...(appData.scenarios || [])];
            }
          }

          updateAppData(nextData);
        }}
      />


      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}

export default App;

