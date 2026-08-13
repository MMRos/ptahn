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
import { getAllChats } from './utils/db';
import { loadAppData, saveAppData, requestDirectoryHandle, loadDirectoryHandle, loadAppDataFromFolder, saveAppDataToFolder, saveChatToFolder } from './utils/storage';

import Profile from './pages/Profile';
import MusicView from './pages/MusicView';

function App() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const [popupScenario, setPopupScenario] = useState(null);

  const [initialModalType, setInitialModalType] = useState('Historia');
  const [editItem, setEditItem] = useState(null);

  const openCreateModal = (type = 'Historia', item = null) => {
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
    // create a new chat record and persist to IndexedDB
    const chat = {
      id: `chat-${Date.now()}`,
      scenario: popupScenario ? popupScenario.title : 'Sin título',
      scenarioId: popupScenario ? popupScenario.id : 'demo-1',
      characterId: id,
      createdAt: new Date().toISOString(),
      messages: []
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
        // sort by createdAt desc
        const sorted = data.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        setRecentChats(sorted);
      }
    } catch (e) { console.warn('refreshChats failed', e); }
  };

  useEffect(()=>{ refreshChats(); }, []);

  const [view, setView] = useState(() => localStorage.getItem('ptah_last_view') || 'home');
  useEffect(() => localStorage.setItem('ptah_last_view', view), [view]);

  const [selectedChat, setSelectedChat] = useState(null);
  const [appData, setAppData] = useState(() => loadAppData());

  useEffect(() => {
    if (view === 'chat' && !selectedChat && recentChats.length > 0) {
      setSelectedChat(recentChats[0]);
    }
  }, [view, selectedChat, recentChats]);


  useEffect(() => {
    // Al montar, guardar appData si localStorage estaba vacío
    const stored = loadAppData();
    if (stored) setAppData(stored);
  }, []);
  const [folderHandle, setFolderHandle] = useState(null);
  const [storageStatus, setStorageStatus] = useState('');

  const updateAppData = async (nextData) => {
    setAppData(nextData);
    saveAppData(nextData);
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
      try { await saveChatToFolder(newChat, folderHandle); } catch (e) {}
    }
    refreshChats();
  };

  const handleDeleteChat = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este chat?')) {
      const { deleteChat } = await import('./utils/db');
      await deleteChat(id);
      if (selectedChat && selectedChat.id === id) {
        setSelectedChat(null);
        setView('home');
      }
      refreshChats();
    }
  };

  const handleModifyScenario = (scenario) => {
    setScenarioOpen(false);
    openCreateModal('Escenario', scenario);
  };

  const [chatSettings, setChatSettings] = useState({
    preferredModel: 'deepseek-r1-distill-qwen-7b',
    preferredLanguage: 'Español',
    responseLength: 1000
  });

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
          chatSettings={chatSettings}
          onUpdateChatSettings={setChatSettings}
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
            folderHandle={folderHandle}
            appData={appData}
            onUpdateAppData={updateAppData}
          />
        )}

        {view === 'create' && (
          <div className="page-container">
            <Create 
              appData={appData} 
              onUpdateAppData={updateAppData} 
              onOpenScenario={openScenario} 
              onOpenCreateModal={openCreateModal}
            />
          </div>
        )}

        {view === 'profile' && (
          <div className="page-container">
            <Profile 
              appData={appData} 
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
        scenarioCharacters={popupScenario?.characters || []}
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
        onSaveItem={({ type, data: newItem, createScenarioAlso }) => {
          let nextData = { ...appData };

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
          } else {
            // Tarjeta
            const exists = (appData.cards || []).some(c => c.id === newItem.id);
            nextData.cards = exists
              ? appData.cards.map(c => c.id === newItem.id ? newItem : c)
              : [newItem, ...(appData.cards || [])];

            if (createScenarioAlso) {
              nextData.scenarios = [createScenarioAlso, ...(appData.scenarios || [])];
            }
          }

          updateAppData(nextData);
        }}
      />
    </div>
  );
}

export default App;
