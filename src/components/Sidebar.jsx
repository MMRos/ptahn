import React, { useEffect, useState } from 'react';
import { faBars, faAngleDoubleLeft, faUser, faHome, faPlusSquare, faList, faEye, faCopy, faTrash, faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './sidebar.css';
import { getAllChats } from '../utils/db';

function Sidebar({ appData = {}, onNavigate = () => {}, onOpenChat = () => {}, onInspectScenario, onCopyChat, onDeleteChat, recentChats }) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem('ptah_sidebar_open');
    return stored !== null ? stored === 'true' : true;
  });

  const toggle = () => setOpen(v => {
    const next = !v;
    localStorage.setItem('ptah_sidebar_open', String(next));
    return next;
  });

  useEffect(() => {
    // On desktop, toggle a class on root so layout can adapt when implemented
    const mq = window.matchMedia('(min-width: 900px)');
    const root = document.documentElement;
    if (!mq.matches) {
      root.classList.remove('sidebar-collapsed');
      return;
    }
    if (!open) root.classList.add('sidebar-collapsed'); else root.classList.remove('sidebar-collapsed');
  }, [open]);

  // load recent chats to show under Chats nav (or use provided prop)
  const [chats, setChats] = useState([]);
  useEffect(()=>{
    if (Array.isArray(recentChats)) {
      const sorted = recentChats.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
      setChats(sorted);
    }
  }, [recentChats]);

  useEffect(() => {
    if (Array.isArray(recentChats)) return; // parent manages chats
    let mounted = true;
    getAllChats().then(data => {
      if (!mounted) return;
      if (Array.isArray(data)) {
        const sorted = data.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        setChats(sorted);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [recentChats]);

  return (
    <aside className={`sidebar ${open ? '' : 'collapsed'}`}>
      <button className="sidebar-toggle" onClick={toggle} aria-label={open ? 'Colapsar barra' : 'Abrir barra'}>
        <FontAwesomeIcon icon={open ? faAngleDoubleLeft : faBars} />
      </button>

      <div className="sidebar-content">
        <div className="sidebar-brand">
          <div className="logo">Ptah</div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Navegación principal">
          <button className="nav-item" title="Inicio" aria-label="Inicio" onClick={() => onNavigate('home')}><FontAwesomeIcon icon={faHome} /> <span>Inicio</span></button>
          <button className="nav-item" title="Perfil" aria-label="Perfil" onClick={() => onNavigate('profile')}><FontAwesomeIcon icon={faUser} /> <span>Perfil</span></button>
          <button className="nav-item" title="Creación" aria-label="Creación" onClick={() => onNavigate('create')}><FontAwesomeIcon icon={faPlusSquare} /> <span>Creación</span></button>
          <button className="nav-item" title="Música" aria-label="Música" onClick={() => onNavigate('music')}><FontAwesomeIcon icon={faMusic} /> <span>Música</span></button>
          <button className="nav-item" title="Chats" aria-label="Chats" onClick={() => onNavigate('chats')}><FontAwesomeIcon icon={faList} /> <span>Chats</span></button>
        </nav>

        {/* recent chats preview con menú de acciones */}
        {chats && chats.length > 0 && (
          <div className="sidebar-chats-list" aria-hidden={open ? 'false' : 'true'}>
            {chats.map(c => {
              const sc = (appData.scenarios || []).find(s => s.id === c.scenarioId);
              const coverUrl = sc?.cover || c.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80';
              return (
                <div key={c.id} className="chat-item-wrapper">
                  <button className="chat-item" title={c.scenario} onClick={() => onOpenChat ? onOpenChat(c) : onNavigate('chats')}>
                    <div className="chat-icon-cover" style={{ backgroundImage: `url(${coverUrl})` }} />
                    <span className="chat-label">{c.scenario}</span>
                  </button>
                  {open && (
                    <div className="chat-actions-menu">
                    <button title="Ver escenario" onClick={(e) => { e.stopPropagation(); onInspectScenario && onInspectScenario(c); }}>
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button title="Copiar chat" onClick={(e) => { e.stopPropagation(); onCopyChat && onCopyChat(c); }}>
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                    <button title="Eliminar chat" onClick={(e) => { e.stopPropagation(); onDeleteChat && onDeleteChat(c.id); }}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <small>v0.1 • local</small>
      </div>
    </aside>
  );
}

export default Sidebar;