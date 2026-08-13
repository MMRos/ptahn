import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faStar, faPlus, faTimes, faMask } from '@fortawesome/free-solid-svg-icons';
import './scenario.css';

export default function CharacterModal({ 
  isOpen = false, 
  onClose = () => {}, 
  onSelect = () => {},
  onOpenCreateCard = () => {},
  userCards = [],
  scenarioCharacters = []
}) {
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  // Filtrar tarjetas de personaje creadas por el usuario
  const userCharacters = userCards.filter(c => (c.type || '').toLowerCase() === 'personaje');
  const hasExistingCharacters = userCharacters.length > 0 || scenarioCharacters.length > 0;

  const handleSelectCustom = () => {
    if (customName.trim()) {
      onSelect(customName.trim());
      setCustomName('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="char-backdrop" role="dialog" aria-modal="true">
      <div className="char-modal">
        <button className="char-close" onClick={onClose} aria-label="Cerrar">
          <FontAwesomeIcon icon={faTimes} />
        </button>
        
        <h4><FontAwesomeIcon icon={faMask} style={{ color: '#ffd36b', marginRight: '8px' }} />Elige tu personaje para interpretar</h4>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: '-4px 0 16px 0' }}>
          Selecciona un personaje de la lista o crea una nueva tarjeta de personaje.
        </p>

        <div className="char-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
          
          {/* Si NO existen personajes previos, mostrar aviso sugerente */}
          {!hasExistingCharacters && (
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
              No hay personajes predefinidos en este escenario ni en tus tarjetas.
            </div>
          )}

          {/* Seccion 1: Personajes creados por el usuario (Prioridad) */}
          {userCharacters.length > 0 && (
            <div className="char-group">
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#ffd36b', marginBottom: '6px' }}>
                <FontAwesomeIcon icon={faStar} /> Mis Personajes Creados
              </div>
              {userCharacters.map(char => (
                <button 
                  key={char.id} 
                  className="char-select-btn user-char"
                  onClick={() => onSelect(char.title || char.name)}
                >
                  <FontAwesomeIcon icon={faUser} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>{char.title || char.name}</div>
                    {char.intro && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{char.intro}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Seccion 2: Personajes del Escenario */}
          {scenarioCharacters.length > 0 && (
            <div className="char-group">
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                Personajes del Escenario
              </div>
              {scenarioCharacters.map(char => (
                <button 
                  key={char.id || char.name} 
                  className="char-select-btn"
                  onClick={() => onSelect(char.name || char.title)}
                >
                  <FontAwesomeIcon icon={faUser} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>{char.name || char.title}</div>
                    {char.intro && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{char.intro}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Seccion 3: Opciones de Creación (Pop-up de creación de personaje o Nombre rápido) */}
          <div className="char-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button 
              className="char-select-btn custom"
              onClick={() => {
                onClose();
                onOpenCreateCard();
              }}
              style={{ background: 'rgba(138, 43, 226, 0.15)', borderColor: 'rgba(138, 43, 226, 0.4)', color: '#e0b0ff' }}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Crear nueva tarjeta de Personaje (Popup)</span>
            </button>

            {!showCustomInput ? (
              <button 
                className="char-select-btn custom"
                onClick={() => setShowCustomInput(true)}
              >
                <FontAwesomeIcon icon={faUser} />
                <span>Ingresar sólo Nombre rápido</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="text" 
                  placeholder="Nombre de tu personaje..." 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
                />
                <button 
                  onClick={handleSelectCustom}
                  style={{ background: '#ffd36b', border: 'none', borderRadius: '6px', padding: '0 14px', color: '#000', fontWeight: '700', cursor: 'pointer' }}
                >
                  Ok
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
