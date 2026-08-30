import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faStar, 
  faPlus, 
  faTimes, 
  faMask, 
  faGamepad, 
  faUsers, 
  faSearch, 
  faCheck 
} from '@fortawesome/free-solid-svg-icons';
import './scenario.css';

export default function CharacterModal({ 
  isOpen = false, 
  onClose = () => {}, 
  onSelect = () => {},
  onOpenCreateCard = () => {},
  userCards = [],
  scenarioCharacters = [],
  allCards = []
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'personas' | 'playable' | 'npcs'
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Normalizar y clasificar los personajes
  const { userPersonas, playableCharacters, npcCharacters, allCombinedCharacters } = useMemo(() => {
    // 1. Personas habituales del usuario (tarjetas de personaje creadas por Ã©l)
    const personas = (userCards || []).filter(c => {
      const isChar = (c.type || '').toLowerCase() === 'personaje';
      if (!isChar) return false;
      return c.characterRole === 'user_persona' || c.isUserPersona || (!c.isPlayable && c.characterRole !== 'npc');
    }).map(c => ({
      id: c.id,
      name: c.title || c.name || 'Sin nombre',
      intro: c.intro || c.text || '',
      cover: c.cover || (c.images && c.images[0]?.url) || '',
      traits: c.traits || [],
      category: 'persona',
      badge: '🎭 Persona Habitual',
      badgeColor: '#ffd36b',
      badgeBg: 'rgba(255, 211, 107, 0.15)'
    }));

    // 2. Personajes del escenario (pueden venir como objetos o IDs/nombres)
    const rawScenarioChars = Array.isArray(scenarioCharacters) ? scenarioCharacters : [];
    
    // Resolver tarjetas conectadas del escenario
    const resolvedScenarioChars = rawScenarioChars.map((scChar, idx) => {
      if (typeof scChar === 'string') {
        const matched = (allCards || userCards || []).find(c => c.id === scChar || c.title === scChar || c.name === scChar);
        if (matched) return matched;
        return { id: `sc-char-${idx}`, name: scChar, type: 'Personaje', isPlayable: true };
      }
      return scChar;
    });

    // Separar en Jugables vs PNJs
    const playables = [];
    const npcs = [];

    resolvedScenarioChars.forEach(char => {
      const isPlayable = char.isPlayable === true || char.characterRole === 'playable';
      const item = {
        id: char.id || `sc-char-${char.name || char.title}`,
        name: char.title || char.name || 'Personaje',
        intro: char.intro || char.text || char.description || '',
        cover: char.cover || (char.images && char.images[0]?.url) || (char.avatar) || '',
        traits: char.traits || [],
        category: isPlayable ? 'playable' : 'npc',
        badge: isPlayable ? '🎮 Jugable (PJ)' : '👥 PNJ',
        badgeColor: isPlayable ? '#6ee7b7' : '#93c5fd',
        badgeBg: isPlayable ? 'rgba(110, 231, 183, 0.15)' : 'rgba(147, 197, 253, 0.15)'
      };

      if (isPlayable) {
        playables.push(item);
      } else {
        npcs.push(item);
      }
    });

    // Combinar todo evitando duplicados por ID o nombre
    const map = new Map();
    [...playables, ...personas, ...npcs].forEach(c => {
      const key = `${c.name.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, c);
      }
    });

    const combined = Array.from(map.values());

    return {
      userPersonas: personas,
      playableCharacters: playables,
      npcCharacters: npcs,
      allCombinedCharacters: combined
    };
  }, [userCards, scenarioCharacters, allCards]);

  if (!isOpen) return null;

  // Filtrar segÃºn pestaÃ±a y bÃºsqueda
  const filteredList = (activeTab === 'personas' 
    ? userPersonas 
    : activeTab === 'playable' 
    ? playableCharacters 
    : activeTab === 'npcs' 
    ? npcCharacters 
    : allCombinedCharacters
  ).filter(char => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return char.name.toLowerCase().includes(q) || 
           char.intro.toLowerCase().includes(q) ||
           (char.traits && char.traits.some(t => t.toLowerCase().includes(q)));
  });

  const handleSelectCustom = () => {
    if (customName.trim()) {
      onSelect(customName.trim());
      setCustomName('');
      setShowCustomInput(false);
    }
  };

  const modalContent = (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 12000 }}>
      <div className="char-modal" style={{ maxWidth: '620px', width: '92vw', background: '#14141f', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>
        <button className="char-close" onClick={onClose} aria-label="Cerrar">
          <FontAwesomeIcon icon={faTimes} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <FontAwesomeIcon icon={faMask} style={{ color: '#ffd36b', fontSize: '1.3rem' }} />
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Elige tu personaje para interpretar</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0' }}>
          Puedes elegir uno de tus personajes habituales, encarnar un personaje jugable del escenario, o ingresar uno nuevo.
        </p>

        {/* PestaÃ±as de Filtrado */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'all' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
              color: activeTab === 'all' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: '700',
              fontSize: '0.76rem',
              cursor: 'pointer'
            }}
          >
            Todos ({allCombinedCharacters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personas')}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'personas' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
              color: activeTab === 'personas' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: '700',
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <FontAwesomeIcon icon={faStar} /> Mis Personas ({userPersonas.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('playable')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'playable' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
              color: activeTab === 'playable' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: '700',
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <FontAwesomeIcon icon={faGamepad} /> Jugables (PJ) ({playableCharacters.length})
          </button>
          {npcCharacters.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('npcs')}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'npcs' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
                color: activeTab === 'npcs' ? '#000' : 'rgba(255,255,255,0.7)',
                fontWeight: '700',
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <FontAwesomeIcon icon={faUsers} /> PNJs ({npcCharacters.length})
            </button>
          )}
        </div>

        {/* Buscador Rápido */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '12px', top: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, rasgos o biografía..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: '#1a1b2b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.82rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Lista de Personajes con DiseÃ±o Rico */}
        <div className="char-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredList.length === 0 ? (
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.12)', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
              No se encontraron personajes en esta categorÃ­a. Puedes crear uno nuevo o ingresar su nombre abajo.
            </div>
          ) : (
            filteredList.map(char => (
              <div 
                key={char.id}
                onClick={() => onSelect(char.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 211, 107, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 211, 107, 0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: `2px solid ${char.badgeColor}`,
                  background: '#1a1b2b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {char.cover ? (
                    <img src={char.cover} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FontAwesomeIcon icon={faUser} style={{ color: char.badgeColor, fontSize: '1.2rem' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {char.name}
                    </strong>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: char.badgeBg,
                      color: char.badgeColor,
                      border: `1px solid ${char.badgeColor}40`,
                      flexShrink: 0
                    }}>
                      {char.badge}
                    </span>
                  </div>

                  {char.intro && (
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {char.intro}
                    </p>
                  )}

                  {char.traits && char.traits.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {char.traits.slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px', color: 'rgba(255,255,255,0.7)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* BotÃ³n Seleccionar */}
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #ffd36b, #d97706)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} /> Elegir
                </button>
              </div>
            ))
          )}
        </div>

        {/* Opciónes Inferiores: Crear nueva tarjeta o Ingresar sÃ³lo nombre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              className="char-select-btn custom"
              onClick={() => {
                onClose();
                onOpenCreateCard();
              }}
              style={{
                flex: 1,
                background: 'rgba(138, 43, 226, 0.15)',
                borderColor: 'rgba(138, 43, 226, 0.4)',
                color: '#e0b0ff',
                padding: '8px 12px',
                fontSize: '0.8rem',
                borderRadius: '8px'
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Crear Nueva Tarjeta de Personaje</span>
            </button>

            {!showCustomInput && (
              <button 
                type="button"
                className="char-select-btn custom"
                onClick={() => setShowCustomInput(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '8px'
                }}
              >
                <FontAwesomeIcon icon={faUser} />
                <span>Nombre rápido</span>
              </button>
            )}
          </div>

          {showCustomInput && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input 
                type="text" 
                placeholder="Escribe el nombre de tu personaje..." 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: '#1a1b2b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSelectCustom()}
              />
              <button 
                type="button"
                onClick={handleSelectCustom}
                style={{ background: '#ffd36b', border: 'none', borderRadius: '8px', padding: '0 16px', color: '#000', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Comenzar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}


