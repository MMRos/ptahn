import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlay, faTags, faEdit, faClone } from '@fortawesome/free-solid-svg-icons';
import './scenario.css';

export default function CharacterPopup({ 
  scenario, 
  isOpen, 
  onClose, 
  onStartChat, 
  onModifyCharacter = () => {},
  onCloneCharacter = () => {}
}) {
  if (!isOpen || !scenario) return null;

  const bgStyle = {
    background: 'linear-gradient(to bottom, #1a1a24, #0d0e16)',
    width: '600px',
    maxWidth: '92vw',
  };

  const coverUrl = scenario.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80';

  return (
    <div className="scenario-backdrop" role="dialog" aria-modal="true" onClick={onClose} style={{ zIndex: 2900 }}>
      <div className="scenario-modal" onClick={e => e.stopPropagation()} style={bgStyle}>
        
        {/* Cabecera / Split Layout */}
        <div style={{ display: 'flex', gap: '20px', padding: '24px 24px 10px 24px', position: 'relative' }}>
          <button className="scenario-close" onClick={onClose} aria-label="Cerrar"><FontAwesomeIcon icon={faTimes}/></button>
          
          {/* Columna Izquierda: Foto vertical */}
          <div style={{
            flexShrink: 0,
            width: '180px',
            height: '240px',
            borderRadius: '12px',
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
          }} />

          {/* Columna Derecha: Nombre, Categoría e Introducción */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ color: '#ffd36b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Personaje
              </div>
              {(scenario.isPlayable || scenario.characterRole === 'playable') ? (
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(110, 231, 183, 0.2)', color: '#6ee7b7', border: '1px solid rgba(110, 231, 183, 0.4)' }}>
                  🎮 Jugable (PJ)
                </span>
              ) : (scenario.characterRole === 'npc') ? (
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(147, 197, 253, 0.2)', color: '#93c5fd', border: '1px solid rgba(147, 197, 253, 0.4)' }}>
                  👥 PNJ (No Jugador)
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 211, 107, 0.2)', color: '#ffd36b', border: '1px solid rgba(255, 211, 107, 0.4)' }}>
                  🎭 Persona Habitual
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {scenario.title || scenario.name}
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>
              {scenario.intro || 'Sin introducción.'}
            </p>

            {scenario.tags && scenario.tags.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <FontAwesomeIcon icon={faTags} style={{ color: 'rgba(255,255,255,0.4)', marginTop: '4px' }} />
                {scenario.tags.map(t => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#ccc' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo Inferior */}
        <div className="scenario-body" style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '10px' }}>
          
          <div className="scenario-context">
            <h4 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.1rem' }}>Descripción / Contexto</h4>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
              {scenario.baseContext || scenario.text || 'No hay contexto adicional.'}
            </div>
          </div>

          <div className="scenario-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button className="secondary-btn" onClick={() => { onModifyCharacter && onModifyCharacter(scenario); onClose(); }} style={{ padding: '9px 16px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faEdit} /> Modificar
            </button>
            <button className="secondary-btn" onClick={() => { onCloneCharacter && onCloneCharacter(scenario); onClose(); }} title="Duplicar como nuevo personaje independiente" style={{ padding: '9px 16px', fontSize: '0.95rem', background: 'rgba(255,211,107,0.12)', border: '1px solid rgba(255,211,107,0.3)', borderRadius: '8px', color: '#ffd36b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faClone} /> Duplicar
            </button>
            <button className="start-btn" onClick={() => { onStartChat && onStartChat(scenario); onClose(); }} style={{ padding: '9px 20px', fontSize: '1rem', background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(255, 211, 107, 0.3)' }}>
              <FontAwesomeIcon icon={faPlay} /> Hablar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
