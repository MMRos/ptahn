import React from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagic, 
  faSpinner, 
  faEdit, 
  faPlus, 
  faImages, 
  } from '@fortawesome/free-solid-svg-icons';
import ModalCloseButton from '../common/ModalCloseButton';

/**
 * Modal interactivo para inspeccionar o crear tarjetas de compendio a partir de términos cliqueados (==término==).
 */
export default function ActiveEntityModal({
  activeEntityModal,
  onClose,
  isGeneratingLore,
  isGeneratingTagCover,
  onGenerateLore,
  onGenerateCover,
  onSaveEntity,
  onOpenCreateModal,
  onChangeField
}) {
  if (!activeEntityModal) return null;

  return createPortal(
    <div 
      className="char-backdrop" 
      role="dialog" 
      aria-modal="true" 
      style={{ zIndex: 2900 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="char-modal" 
        style={{ 
          position: 'relative', 
          maxWidth: '580px', 
          width: '92%', 
          maxHeight: '88vh', 
          overflowY: 'auto', 
          animation: 'fadeIn 0.2s ease-out', 
          padding: '24px 48px 24px 24px', 
          boxSizing: 'border-box' 
        }}
      >
        {/* Botón de cierre 'X' SIEMPRE anclado en la esquina superior derecha */}
        <ModalCloseButton onClick={onClose} />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              background: activeEntityModal.existing ? 'rgba(110, 231, 183, 0.15)' : 'rgba(255, 211, 107, 0.15)', 
              color: activeEntityModal.existing ? '#6ee7b7' : '#ffd36b',
              border: `1px solid ${activeEntityModal.existing ? 'rgba(110, 231, 183, 0.3)' : 'rgba(255, 211, 107, 0.3)'}`,
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}>
              {activeEntityModal.existing ? '📖 Ficha en Compendio' : '✨ Término de Historia'}
            </span>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{activeEntityModal.draftTitle}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Previsualización de Portada / Retrato si existe */}
          {(activeEntityModal.draftCover || activeEntityModal.existing?.cover) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <img 
                src={activeEntityModal.draftCover || activeEntityModal.existing?.cover} 
                alt={activeEntityModal.draftTitle} 
                style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255, 211, 107, 0.35)' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 'bold' }}>✓ Ilustración / Portada Asignada</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}>Se guardará en la ficha del compendio.</span>
              </div>
            </div>
          )}

          {activeEntityModal.existing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ color: '#ffd36b', fontWeight: 'bold', fontSize: '0.8rem' }}>
                Tipo: {activeEntityModal.existing.type || 'Escenario / Entidad'}
              </div>
              {activeEntityModal.existing.intro && (
                <div style={{ fontStyle: 'italic', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #ffd36b' }}>
                  "{activeEntityModal.existing.intro}"
                </div>
              )}
              {activeEntityModal.existing.text && (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {activeEntityModal.existing.text}
                </div>
              )}
              {activeEntityModal.existing.traits && activeEntityModal.existing.traits.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {activeEntityModal.existing.traits.map((t, idx) => (
                    <span key={idx} style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                Este término aún no tiene ficha en el compendio. Puedes clasificarlo y generar su lore e ilustración con IA.
              </p>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#ffd36b', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de Entidad:</label>
                <select 
                  value={activeEntityModal.draftType} 
                  onChange={(e) => onChangeField('draftType', e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                >
                  <option value="Personaje">👥 Personaje / PNJ</option>
                  <option value="Objeto">🎒 Objeto / Equipo</option>
                  <option value="Inventario">🎒 Mochila / Inventario</option>
                  <option value="Lugar">🏰 Lugar / Escenario</option>
                  <option value="Memoria">📜 Tarjeta de Memoria / Lore</option>
                  <option value="Facción">⚔️ Facción / Gremio</option>
                  <option value="Criatura">🐉 Bestia / Criatura</option>
                  <option value="Raza">🧬 Raza / Especie</option>
                  <option value="Otros">📦 Otro elemento</option>
                </select>
              </div>

              {/* Botones de Asistencia IA */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onGenerateLore}
                  disabled={isGeneratingLore}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(90deg, rgba(255, 211, 107, 0.15), rgba(255, 159, 107, 0.15))',
                    border: '1px solid rgba(255, 211, 107, 0.35)',
                    color: '#ffd36b',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: isGeneratingLore ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title="Pide a la IA que redacte la descripción y lore de esta entidad"
                >
                  <FontAwesomeIcon icon={isGeneratingLore ? faSpinner : faMagic} spin={isGeneratingLore} />
                  <span>{isGeneratingLore ? 'Generando Lore...' : '✨ Generar Lore con IA'}</span>
                </button>

                <button
                  type="button"
                  onClick={onGenerateCover}
                  disabled={isGeneratingTagCover}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: isGeneratingTagCover ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title="Genera una ilustración para este personaje o lugar con el motor de difusión local"
                >
                  <FontAwesomeIcon icon={isGeneratingTagCover ? faSpinner : faImages} spin={isGeneratingTagCover} />
                  <span>{isGeneratingTagCover ? 'Creando Imagen...' : '🎨 Generar Imagen IA'}</span>
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Descripción / Lore de Fondo:</label>
                <textarea
                  rows={4}
                  value={activeEntityModal.draftText}
                  onChange={(e) => onChangeField('draftText', e.target.value)}
                  placeholder="Escribe detalles sobre este personaje, lugar u objeto..."
                  style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Botones de Acción en el pie */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={() => {
                  const itemToEdit = activeEntityModal.existing || {
                    title: activeEntityModal.draftTitle,
                    type: activeEntityModal.draftType,
                    intro: activeEntityModal.draftIntro,
                    text: activeEntityModal.draftText,
                    cover: activeEntityModal.draftCover || ''
                  };
                  onClose();
                  onOpenCreateModal(activeEntityModal.draftType, itemToEdit);
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faEdit} />
                <span>Abrir Editor Completo</span>
              </button>
            )}

            {!activeEntityModal.existing && (
              <button
                type="button"
                onClick={onSaveEntity}
                style={{
                  background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '700',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Guardar en Compendio</span>
              </button>
            )}

            {activeEntityModal.existing && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '700',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Listo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
