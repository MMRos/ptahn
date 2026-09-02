import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt, faBookmark, faHeart, faPlay, faEdit, faClone, faTrash, faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import { getCardTypeStyle } from '../utils/cardTypeStyles';
import { resolveEntityInheritance } from '../utils/inheritance';
import { normalizeInitialMessages } from '../utils/scenarioScoping';
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
  const initialMessagesList = normalizeInitialMessages(scenario);
  const [selectedTabId, setSelectedTabId] = useState(scenario?.activeInitialMessageId || initialMessagesList[0]?.id);

  useEffect(() => {
    const list = normalizeInitialMessages(scenario);
    setSelectedTabId(scenario?.activeInitialMessageId || list[0]?.id);
  }, [scenario]);

  if (!isOpen || !scenario) return null;

  const activeMsg = initialMessagesList.find(m => m.id === selectedTabId) || initialMessagesList[0];
  const visiblePresentation = (activeMsg?.text || scenario.presentation || '').trim();

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="scenario-backdrop" role="dialog" aria-modal="true" onClick={onBackdropClick}>
      <div className="scenario-popup">
        <button className="scenario-close" onClick={onClose} aria-label="Cerrar">✕</button>

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
          
          {initialMessagesList.length > 1 && (
            <div style={{ marginTop: '12px', marginBottom: '6px' }}>
              <div style={{ fontSize: '0.72rem', color: '#ffd36b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Selecciona tu punto de partida:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {initialMessagesList.map(tab => {
                  const isSelected = tab.id === activeMsg?.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTabId(tab.id)}
                      style={{
                        background: isSelected ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected ? '1px solid #ffd36b' : '1px solid rgba(255, 255, 255, 0.12)',
                        color: isSelected ? '#ffd36b' : 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {visiblePresentation && (
            <p className="scenario-presentation" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
              {visiblePresentation}
            </p>
          )}

          {/* Tarjetas y Entidades Conectadas al Escenario */}
          {(() => {
            const rawCards = scenario.cards || [];
            if (!Array.isArray(rawCards) || rawCards.length === 0) return null;
            const resolvedCards = rawCards.map(cIdOrObj => {
              if (typeof cIdOrObj === 'object' && cIdOrObj !== null) {
                return resolveEntityInheritance(cIdOrObj, allCards);
              }
              const found = (allCards || []).find(c => c.id === cIdOrObj || c.title === cIdOrObj);
              return found || { id: cIdOrObj, title: cIdOrObj, type: 'Otros' };
            }).filter(Boolean);

            return (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FontAwesomeIcon icon={faProjectDiagram} style={{ color: '#ffd36b' }} />
                  Entidades Conectadas ({resolvedCards.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {resolvedCards.map((card, idx) => {
                    const typeStyle = getCardTypeStyle(card.type || 'Otros');
                    const conns = card.connectedCards || [];
                    return (
                      <span 
                        key={card.id || idx}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${typeStyle.accent}33`,
                          color: typeStyle.accent,
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={conns.length > 0 ? `Conectada con ${conns.length} entidad(es) en el escenario` : `Tarjeta tipo ${typeStyle.label}`}
                      >
                        <span>{typeStyle.icon}</span>
                        <span>{card.overrides?.title || card.title || card.name || 'Tarjeta'}</span>
                        {conns.length > 0 && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(56,189,248,0.25)', color: '#38bdf8', borderRadius: '3px', padding: '0 4px', marginLeft: '2px' }}>
                            +{conns.length}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="scenario-buttons" style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              className="primary" 
              onClick={() => {
                const scenarioToLaunch = {
                  ...scenario,
                  presentation: visiblePresentation,
                  activeInitialMessageId: activeMsg?.id || scenario.activeInitialMessageId
                };
                onStartChat(scenarioToLaunch);
              }} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
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
