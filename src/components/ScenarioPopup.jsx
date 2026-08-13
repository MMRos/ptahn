import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt, faBookmark, faHeart, faPlay, faEdit } from '@fortawesome/free-solid-svg-icons';
import './scenario.css';

export default function ScenarioPopup({ 
  scenario = {}, 
  isOpen = false, 
  onClose = () => {}, 
  onStartChat = () => {}, 
  onModifyScenario = () => {} 
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

          <div className="scenario-buttons" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="primary" onClick={() => onStartChat(scenario)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faPlay} /> Empezar chat
            </button>
            <button className="secondary" onClick={() => onModifyScenario(scenario)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faEdit} /> Modificar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
