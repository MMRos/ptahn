import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt, faBookmark, faHeart, faPlay, faEdit, faClone, faTrash } from '@fortawesome/free-solid-svg-icons';
import { getCardTypeStyle } from '../utils/cardTypeStyles';
import './scenario.css';

export default function ScenarioPopup({ 
  scenario = {}, 
  allCards = [],
  isOpen = false, 
  onClose = () => {}, 
  onStartChat = () => {}, 
  onModifyScenario = () => {},
  onCloneScenario = () => {},
  onDeleteScenario = () => {}
}) {
  if (!isOpen || !scenario) return null;

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="scenario-backdrop" role="dialog" aria-modal="true" onClick={onBackdropClick}>
      <div className="scenario-popup">
        <button className="scenario-close" onClick={onClose} aria-label="Cerrar">×</button>

        <div className="scenario-actions" role="toolbar" aria-label="Acciones del escenario">
          <button className="icon" title="Compartir" aria-label="Compartir">
            <FontAwesomeIcon icon={faShareAlt} />
          </button>
          <button className="icon" title="Guardar" aria-label="Guardar">
            <FontAwesomeIcon icon={faBookmark} />
          </button>
          <button className="icon" title="Favorito" aria-label="Favorito">
            <FontAwesomeIcon icon={faHeart} />
          </button>
        </div>

        <div 
          className="scenario-cover" 
          style={{ backgroundImage: `url(${scenario.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'})` }} 
        />
        <div className="scenario-body">
          <header className="scenario-header">
            <h3 className="scenario-title">{scenario.title || 'Escenario'}</h3>
            {scenario.category && (
              <span className="scenario-badge">{scenario.category}</span>
            )}
          </header>

          <p className="scenario-intro">{scenario.intro || 'Descripción e introducción de la premisa del escenario...'}</p>
          
          {scenario.presentation && (
            <p className="scenario-presentation" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
              {scenario.presentation}
            </p>
          )}

          {/* Tarjetas y Entidades Conectadas al Escenario */}
          {(() => {
            const rawCards = scenario.cards || [];
            if (!Array.isArray(rawCards) || rawCards.length === 0) return null;
            const resolvedCards = rawCards.map(cIdOrObj => {
              if (typeof cIdOrObj === 'object' && cIdOrObj !== null) return cIdOrObj;
              return (allCards || []).find(c => c.id === cIdOrObj || c.title === cIdOrObj) || { id: cIdOrObj, title: cIdOrObj, type: 'Otros' };
            });

            return (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Entidades y Elementos Conectados ({resolvedCards.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                  {resolvedCards.map((card, idx) => {
                    const typeStyle = getCardTypeStyle(card.type);
                    return (
                      <span
                        key={card.id || idx}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          background: typeStyle.chipBg,
                          border: `1px solid ${typeStyle.chipBorder}`,
                          color: typeStyle.chipColor,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Tarjeta tipo ${typeStyle.label}`}
                      >
                        <span>{typeStyle.icon}</span>
                        <span>{card.title || card.name || 'Tarjeta'}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="scenario-buttons" style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button className="primary" onClick={() => onStartChat(scenario)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faPlay} /> Empezar chat
            </button>
            <button className="secondary" onClick={() => onModifyScenario(scenario)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faEdit} /> Modificar
            </button>
            <button className="secondary" onClick={() => onCloneScenario(scenario)} title="Duplicar como nuevo escenario independiente" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faClone} /> Duplicar
            </button>
            <button 
              className="secondary" 
              onClick={() => onDeleteScenario(scenario)} 
              title="Eliminar este escenario" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.08)' }}
            >
              <FontAwesomeIcon icon={faTrash} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

