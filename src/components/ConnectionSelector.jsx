import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getCardTypeStyle } from '../utils/cardTypeStyles';
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
          selectedCards.map(card => {
            const typeStyle = getCardTypeStyle(card.type);
            return (
              <div 
                key={card.id} 
                className="cs-badge" 
                style={{ 
                  background: typeStyle.chipBg, 
                  borderColor: typeStyle.chipBorder 
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{typeStyle.icon}</span>
                <div className="cs-badge-info">
                  <span className="cs-badge-title" style={{ color: '#fff' }}>{card.title}</span>
                  <span className="cs-badge-connection" style={{ color: typeStyle.color }}>{typeStyle.label}</span>
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
            );
          })
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
            filteredCards.map(card => {
              const itemTypeStyle = getCardTypeStyle(card.type);
              return (
                <div 
                  key={card.id} 
                  className="cs-dropdown-item"
                  onClick={() => {
                    onSelectCard(card.id);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px'
                  }}
                >
                  <div>
                    <div className="cs-item-title" style={{ fontWeight: '600', color: '#fff' }}>
                      {itemTypeStyle.icon} {card.title}
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="cs-item-tags" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                        {card.tags.join(', ')}
                      </div>
                    )}
                  </div>
                  <span 
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: itemTypeStyle.chipBg,
                      border: `1px solid ${itemTypeStyle.chipBorder}`,
                      color: itemTypeStyle.chipColor
                    }}
                  >
                    {itemTypeStyle.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
