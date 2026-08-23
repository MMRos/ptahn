import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserAstronaut, 
  faImages, 
  faTimes, 
  faChevronRight, 
  faChevronLeft,
  faSmile,
  faShieldAlt,
  faInfoCircle,
  faMagic,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

export default function CharacterSidebar({ 
  character, 
  matchedImage, 
  manualImageId, 
  onSelectManualImage, 
  onInspectCharacter,
  onGeneratePortrait,
  isGeneratingPortrait = false,
  onClose 
}) {
  const [showGallery, setShowGallery] = useState(false);

  if (!character) {
    return (
      <aside className="chat-zone-b empty">
        <div className="zone-b-placeholder">
          <FontAwesomeIcon icon={faUserAstronaut} className="placeholder-icon" />
          <p>Sin personaje enfocado</p>
        </div>
      </aside>
    );
  }

  const allImages = Array.isArray(character.images || character.characterImages)
    ? (character.images || character.characterImages).filter(img => img && img.url)
    : [];

  const effectiveImage = (manualImageId && allImages.find(img => img.id === manualImageId))
    || matchedImage 
    || (allImages.find(img => img.isDefault) || allImages[0])
    || { url: character.cover || '', label: 'Principal' };

  return (
    <aside className="chat-zone-b" aria-label={`Retrato de ${character.title || character.name}`}>
      {/* Botón de cierre / colapsar Zona B */}
      <button 
        type="button" 
        className="zone-b-close-btn" 
        title="Ocultar panel de personaje (Zona B)" 
        onClick={onClose}
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>

      {/* Contenedor Principal de la Imagen Vertical */}
      <div className="zone-b-portrait-card">
        <div className="zone-b-image-wrap">
          {effectiveImage.url ? (
            <img 
              src={effectiveImage.url} 
              alt={character.title || character.name} 
              className="zone-b-image" 
            />
          ) : (
            <div className="zone-b-no-image" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%', minHeight: '260px', padding: '16px', textAlign: 'center' }}>
              <FontAwesomeIcon icon={faUserAstronaut} size="3x" style={{ color: 'rgba(255, 211, 107, 0.4)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.82rem' }}>Sin retrato asignado</span>
              {onGeneratePortrait && (
                <button
                  type="button"
                  onClick={() => onGeneratePortrait(character)}
                  disabled={isGeneratingPortrait}
                  style={{
                    background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                    border: 'none',
                    color: '#0d0e16',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: isGeneratingPortrait ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(255, 211, 107, 0.25)',
                    marginTop: '4px'
                  }}
                  title="Generar retrato para este personaje usando IA"
                >
                  <FontAwesomeIcon icon={isGeneratingPortrait ? faSpinner : faMagic} spin={isGeneratingPortrait} />
                  <span>{isGeneratingPortrait ? 'Generando...' : 'Generar Retrato IA'}</span>
                </button>
              )}
            </div>
          )}

          {/* Gradiente inferior con información */}
          <div className="zone-b-overlay">
            <div className="zone-b-header">
              <span className="zone-b-type">
                <FontAwesomeIcon icon={faShieldAlt} /> {character.type || 'Personaje'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {onGeneratePortrait && (
                  <button 
                    type="button" 
                    className="zone-b-inspect-btn" 
                    title="Generar nueva variante de retrato con IA"
                    disabled={isGeneratingPortrait}
                    onClick={() => onGeneratePortrait(character)}
                    style={{ color: '#ffd36b' }}
                  >
                    <FontAwesomeIcon icon={isGeneratingPortrait ? faSpinner : faMagic} spin={isGeneratingPortrait} />
                  </button>
                )}
                {onInspectCharacter && (
                  <button 
                    type="button" 
                    className="zone-b-inspect-btn" 
                    title="Ver ficha completa de compendio"
                    onClick={() => onInspectCharacter(character)}
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                  </button>
                )}
              </div>
            </div>

            <h3 className="zone-b-name">{character.title || character.name}</h3>

            {/* Badge de Expresión Contextual Detectada */}
            <div className="zone-b-expression-badge" title={`Expresión actual: ${effectiveImage.label || 'Normal'}`}>
              <FontAwesomeIcon icon={faSmile} />
              <span>{effectiveImage.label || 'Normal / Principal'}</span>
            </div>
          </div>
        </div>

        {/* Galería / Selector de Variantes de Expresión */}
        {allImages.length > 1 && (
          <div className="zone-b-variants-section">
            <button 
              type="button" 
              className="zone-b-variants-toggle"
              onClick={() => setShowGallery(prev => !prev)}
            >
              <span><FontAwesomeIcon icon={faImages} /> Expresiones ({allImages.length})</span>
              <FontAwesomeIcon icon={showGallery ? faChevronLeft : faChevronRight} />
            </button>

            {showGallery && (
              <div className="zone-b-gallery-drawer">
                {allImages.map((img, idx) => {
                  const isSelected = (manualImageId ? img.id === manualImageId : effectiveImage.url === img.url);
                  return (
                    <button
                      key={img.id || idx}
                      type="button"
                      className={`zone-b-thumb-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => onSelectManualImage && onSelectManualImage(img.id)}
                      title={img.label || `Variante ${idx + 1}`}
                    >
                      <img src={img.url} alt={img.label || 'Variante'} className="zone-b-thumb" />
                      <span className="zone-b-thumb-label">{img.label || `Var. ${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
