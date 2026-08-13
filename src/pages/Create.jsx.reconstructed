import React, { useEffect, useState } from 'react';
import { loadAppData } from '../utils/storage';

export default function Create({ appData, onUpdateAppData, onOpenScenario, onOpenCreateModal }) {
  const [data, setData] = useState(() => appData || loadAppData());
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (appData) {
      setData(appData);
    }
  }, [appData]);

  const handleCopyCard = (card) => {
    const newCard = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Copia)`,
      createdAt: new Date().toISOString()
    };
    const nextData = {
      ...data,
      cards: [newCard, ...(data.cards || [])]
    };
    setData(nextData);
    if (typeof onUpdateAppData === 'function') onUpdateAppData(nextData);
    setSelectedCard(null);
  };

  const handleConvertToScenario = (card) => {
    const prefilledScenario = {
      title: card.title,
      category: 'Aventura',
      intro: card.intro || (card.text ? card.text.substring(0, 80) + '...' : ''),
      cover: card.cover || '',
      presentation: '',
      baseContext: `[${card.type}]: ${card.text || ''}`,
      aiInstructions: '',
      tags: card.tags || [],
      cards: [card.id],
      narrator: null
    };

    if (onOpenCreateModal) {
      onOpenCreateModal('Escenario', prefilledScenario);
    }
    setSelectedCard(null);
  };

  const handleDeleteCard = (cardId) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).filter(c => c.id !== cardId)
    };
    setData(nextData);
    if (typeof onUpdateAppData === 'function') onUpdateAppData(nextData);
    setSelectedCard(null);
  };

  return (
    <div className="create-page">
      <div className="page-header-title" style={{ padding: '0 8px' }}>
        <h2>Creación</h2>
        <p>Arma mundos, tarjetas modulares y narradores interactivos.</p>
      </div>

      <section className="create-actions">
        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Escenario')}>
          <div className="icon icon-scenario" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="24" r="6" fill="currentColor" />
              <circle cx="42" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M14 32C14 20 24 12 32 12C40 12 50 20 50 32C50 44 40 52 32 52C24 52 14 44 14 32Z" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M32 8V4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="card-title">Crear escenario</div>
          <div className="card-copy">Arma viajes completos y mundos jugables.</div>
        </button>

        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Historia')}>
          <div className="icon icon-card" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="14" y="16" width="36" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="5" />
              <path d="M28 24C28 21 30 18 34 18C38 18 40 20 40 23C40 26 36 26 36 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="34" cy="38" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="card-title">Crear tarjeta</div>
          <div className="card-copy">Define ideas, personajes y reglas clave.</div>
        </button>

        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Narrador')}>
          <div className="icon icon-narrator" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M14 18C18 10 46 10 50 18" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M32 18V28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M24 28V38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M40 28V38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="32" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M26 54C26 50 38 50 38 54" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="card-title">Crear narrador</div>
          <div className="card-copy">Crea el hilo que guía tu historia.</div>
        </button>
      </section>

      <div className="create-body">
        <section className="created-section">
          <div className="created-header">
            <div>
              <h2>Elementos creados</h2>
              <p>Explora tus elementos por categoría en listas desplegables.</p>
            </div>
          </div>

          <div className="created-accordion-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {/* Categoría 1: Escenarios (Colapsable) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Escenarios creados ({data.scenarios.length})
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 0 6px 0' }}>
                {data.scenarios.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay escenarios aún.</span>
                ) : (
                  data.scenarios.map(s => (
                    <div 
                      key={s.id} 
                      className="scenario-card-visual" 
                      style={{ flex: '1 1 220px', maxWidth: '320px', minWidth: '200px', cursor: 'pointer' }}
                      onClick={() => onOpenScenario && onOpenScenario(s)}
                    >
                      <div className="sc-card-cover" style={{ backgroundImage: `url(${s.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'})`, height: '120px' }} />
                      <div className="sc-card-body" style={{ padding: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>{s.title}</h4>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>{s.category}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>

            {/* Categoría 2: Tarjetas (Colapsable y tarjetas de acción rápidas) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Tarjetas creadas ({data.cards.length})
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 0 6px 0' }}>
                {data.cards.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay tarjetas aún.</span>
                ) : (
                  data.cards.map(c => {
                    const isChar = (c.type || '').toLowerCase() === 'personaje';
                    return (
                      <div 
                        key={c.id} 
                        style={{ flex: isChar ? '0 1 150px' : '1 1 180px', maxWidth: isChar ? '180px' : '280px', minWidth: '140px', background: 'rgba(20,18,30,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setSelectedCard(c)}
                      >
                        <div style={{ backgroundImage: `url(${c.cover || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80'})`, height: isChar ? '160px' : '100px', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div style={{ padding: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</h4>
                          <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{c.type}</small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </details>

            {/* Categoría 3: Narradores (Colapsable) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Narradores creados ({data.narrators.length})
              </summary>
              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', padding: '12px 0 6px 0' }}>
                {data.narrators.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay narradores aún.</span>
                ) : (
                  data.narrators.map(n => (
                    <div 
                      key={n.id} 
                      style={{ minWidth: '180px', width: '180px', background: 'rgba(20,18,30,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
                      onClick={() => onOpenCreateModal && onOpenCreateModal('Narrador', n)}
                    >
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#fff' }}>{n.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.bio}</p>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* Popup de Detalle de Tarjeta y Acciones */}
      {selectedCard && (
        <div className="char-backdrop" style={{ zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedCard(null); }}>
          <div className="char-modal" style={{ maxWidth: '420px', width: '90%', zIndex: 1201 }}>
            <button className="char-close" onClick={() => setSelectedCard(null)}>×</button>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>{selectedCard.title}</h4>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
              Tarjeta de {selectedCard.type}
            </p>
            <div style={{ 
              backgroundImage: `url(${selectedCard.cover || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80'})`, 
              height: '200px', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              borderRadius: '8px', 
              marginBottom: '14px' 
            }} />
            <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                {selectedCard.intro}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                {selectedCard.text}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="primary" 
                onClick={() => {
                  if (onOpenCreateModal) onOpenCreateModal(selectedCard.type, selectedCard);
                  setSelectedCard(null);
                }}
                style={{ fontWeight: '700', padding: '10px' }}
              >
                Editar Tarjeta
              </button>
              <button 
                className="secondary" 
                onClick={() => {
                  handleCopyCard(selectedCard);
                }}
                style={{ fontWeight: '600', padding: '10px', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                Copiar Tarjeta
              </button>
              <button 
                className="secondary" 
                onClick={() => {
                  handleConvertToScenario(selectedCard);
                }}
                style={{ fontWeight: '600', padding: '10px', background: 'rgba(255, 211, 107, 0.1)', borderColor: 'rgba(255, 211, 107, 0.2)', color: '#ffd36b' }}
              >
                Convertir en Escenario
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('¿Seguro que deseas eliminar esta tarjeta?')) {
                    handleDeleteCard(selectedCard.id);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#eb5757',
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  marginTop: '4px',
                  fontWeight: '600'
                }}
              >
                Eliminar Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
