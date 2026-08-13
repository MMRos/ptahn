import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faLink, faTimes } from '@fortawesome/free-solid-svg-icons';
import './connectionSelector.css';

export default function ConnectionSelector({ 
  availableCards = [], 
  selectedCardIds = [], 
  onSelectCard, 
  onRemoveCard 
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filteredCards = availableCards.filter(card => {
    const isAlreadySelected = selectedCardIds.includes(card.id);
    if (isAlreadySelected) return false;
    if (!query.trim()) return true;
    const term = query.toLowerCase();
    const titleMatch = (card.title || '').toLowerCase().includes(term);
    const typeMatch = (card.type || '').toLowerCase().includes(term);
    const tagMatch = (card.tags || []).some(t => t.toLowerCase().includes(term));
    return titleMatch || typeMatch || tagMatch;
  });

  const selectedCards = availableCards.filter(card => selectedCardIds.includes(card.id));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="connection-selector" ref={containerRef}>
      <label className="cs-label">Conexiones modulares (Tarjetas conectadas)</label>
      
      {/* Lista de tarjetas ya conectadas */}
      <div className="cs-selected-list">
        {selectedCards.length === 0 ? (
          <div className="cs-empty-text">No hay conexiones establecidas aún.</div>
        ) : (
          selectedCards.map(card => (
            <div key={card.id} className="cs-badge">
              <FontAwesomeIcon icon={faLink} className="cs-badge-icon" />
              <div className="cs-badge-info">
                <span className="cs-badge-title">{card.title}</span>
                <span className="cs-badge-connection">Conectado a: {card.type}</span>
              </div>
              <button 
                type="button" 
                className="cs-badge-remove"
                onClick={() => onRemoveCard(card.id)}
                title="Eliminar conexión"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Input de búsqueda con autocompletado */}
      <div className="cs-input-wrapper">
        <FontAwesomeIcon icon={faSearch} className="cs-search-icon" />
        <input 
          type="text" 
          className="cs-input" 
          placeholder="Escribe para buscar tarjetas a conectar..." 
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
        />
      </div>

      {/* Menú desplegable con sugerencias en tiempo real */}
      {isOpen && (
        <div className="cs-dropdown">
          {filteredCards.length === 0 ? (
            <div className="cs-no-results">
              {availableCards.length === 0 
                ? 'No existen tarjetas creadas aún. Crea una primero.' 
                : 'No se encontraron tarjetas coincidentes.'}
            </div>
          ) : (
            filteredCards.map(card => (
              <div 
                key={card.id} 
                className="cs-dropdown-item"
                onClick={() => {
                  onSelectCard(card.id);
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <div className="cs-item-title">{card.title}</div>
                <div className="cs-item-meta">
                  <span className="cs-item-type">{card.type}</span>
                  {card.tags && card.tags.length > 0 && (
                    <span className="cs-item-tags">• {card.tags.join(', ')}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
