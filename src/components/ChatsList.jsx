import React, { useEffect, useState } from 'react';
import { getAllChats } from '../utils/db';
import ScenarioCard from './ScenarioCard';
import './chats.css';

export default function ChatsList({ onOpen, appData = {} }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    let mounted = true;
    getAllChats().then(data => { 
      if (mounted) setChats((data || []).slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))); 
    }).catch(err => console.error(err));
    return () => { mounted = false; };
  }, []);

  return (
    <div className="chats-container-page">
      <div className="page-header-title">
        <h2>Chats guardados</h2>
        <p>Tus partidas en curso y aventuras guardadas.</p>
      </div>

      {chats.length === 0 ? (
        <div className="empty-chats-text">No hay chats guardados aún.</div>
      ) : (
        <div className="chats-cards-grid">
          {chats.map(chat => {
            // Buscar escenario o tarjeta relacionada para recuperar la portada HD
            const matchingSc = (appData.scenarios || []).find(s => s.id === chat.scenarioId || s.title === chat.scenario) ||
                               (appData.cards || []).find(c => c.id === chat.scenarioId || c.title === chat.scenario);
            const coverUrl = chat.cover || matchingSc?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';

            const scenarioData = {
              id: chat.id,
              title: chat.scenario,
              intro: `Personaje: ${chat.characterId || 'Usuario'} • Mensajes: ${(chat.messages || []).length}`,
              cover: coverUrl,
              visits: (chat.messages || []).length,
              rating: '10.0',
              creatorName: chat.characterId || 'Usuario'
            };
            return (
              <ScenarioCard 
                key={chat.id} 
                s={scenarioData} 
                onOpen={() => onOpen ? onOpen(chat) : null} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
