import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrop,
  faTimes,
  faImage,
  faPlus,
  faFolderOpen,
  faMagic
} from '@fortawesome/free-solid-svg-icons';

/**
 * ScenarioMediaHeader
 * Subcomponente modular para la sección multimedia y metadatos de Escenario (Layout en 2 Columnas).
 */
export default function ScenarioMediaHeader({
  cover = '',
  onCoverChange = () => { },
  category = '',
  onCategoryChange = () => { },
  categories = [],
  tags = [],
  onTagsChange = () => { },
  onOpenCropper = () => { },
  onGenerateAiCover = () => { },
  isGeneratingAi = false
}) {
  const [urlInput, setUrlInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('Fantasía Oscura / Entornos');
  const fileInputRef = useRef(null);

  // Manejador de carga inteligente (URL o abrir selector de archivos si está vacío)
  const handleLoadImage = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onCoverChange(trimmed);
      setUrlInput('');
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Manejador de selección de archivo local
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          onCoverChange(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value to allow re-selecting same file if needed
    e.target.value = '';
  };

  // Manejador de generación de imagen con IA
  const handleGenerateAi = () => {
    onGenerateAiCover(aiPrompt, aiStyle);
  };

  // Añadir etiqueta validando duplicados y límite máximo de 5
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.length >= 5) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    onTagsChange([...tags, trimmed]);
    setTagInput('');
  };

  // Eliminar etiqueta individual
  const handleRemoveTag = (tagToRemove) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const isMaxTags = tags.length >= 5;

  return (
    <div
      className="scenario-media-header-container"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '16px'
      }}
    >
      {/* Input de archivo oculto para carga desde disco */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        data-testid="scenario-cover-file-input"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}
      >
        {/* COLUMNA IZQUIERDA: Portada / Placeholder 16:9 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: '8px',
            overflow: 'hidden',
            background: 'rgba(15, 15, 25, 0.8)',
            border: cover ? '1px solid rgba(255, 211, 107, 0.3)' : '1px dashed rgba(255, 211, 107, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: cover ? 'default' : 'pointer',
            transition: 'border-color 0.2s ease'
          }}
          onClick={() => {
            if (!cover && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        >
          {cover ? (
            <>
              <img
                src={cover}
                alt="Portada del Escenario"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {/* Controles sobre la imagen */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 2
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCropper(cover);
                  }}
                  title="Recortar imagen"
                  style={{
                    background: 'rgba(255, 211, 107, 0.9)',
                    border: 'none',
                    color: '#000',
                    borderRadius: '4px',
                    width: '26px',
                    height: '26px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={faCrop} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  title="Cambiar imagen desde disco"
                  style={{
                    background: 'rgba(99, 102, 241, 0.85)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    width: '26px',
                    height: '26px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={faFolderOpen} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCoverChange('');
                  }}
                  title="Eliminar imagen de portada"
                  style={{
                    background: 'rgba(239, 68, 68, 0.85)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    width: '26px',
                    height: '26px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#ffd36b',
                userSelect: 'none',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <FontAwesomeIcon icon={faImage} style={{ fontSize: '2rem', opacity: 0.85 }} />
              <span style={{ fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                CARGAR IMAGEN
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                (Clic para explorar en disco)
              </span>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Metadatos y Generación IA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Fila 1: URL + Botón CARGAR */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLoadImage();
                }
              }}
              placeholder="URL de imagen..."
              style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleLoadImage}
              style={{
                background: urlInput.trim() ? 'linear-gradient(90deg, #ffd36b, #ff9f6b)' : 'rgba(255, 211, 107, 0.15)',
                border: '1px solid rgba(255, 211, 107, 0.4)',
                color: urlInput.trim() ? '#000' : '#ffd36b',
                fontWeight: '700',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              CARGAR
            </button>
          </div>

          {/* Fila 2: Generador de Imágenes con IA */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateAi();
                }
              }}
              placeholder="Descripción visual del escenario..."
              style={{
                flex: '1 1 180px',
                minWidth: '150px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <select
              data-testid="scenario-ai-style-select"
              value={aiStyle}
              onChange={(e) => setAiStyle(e.target.value)}
              style={{
                width: '135px',
                background: '#1a1a24',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 8px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none',
                flexShrink: 0
              }}
            >
              <option value="Fantasía Oscura / Entornos">Fantasía Oscura</option>
              <option value="Anime / Ilustración Estilizada 2.5D">Anime / 2.5D</option>
              <option value="Cyberpunk / Neón">Cyberpunk</option>
              <option value="Fotorealista / Retrato">Fotorealista</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGeneratingAi}
              style={{
                background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                border: 'none',
                color: '#000',
                fontWeight: '700',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <FontAwesomeIcon icon={faMagic} spin={isGeneratingAi} /> Generar
            </button>
          </div>

          {/* Fila 3: Selector de CATEGORÍA */}
          <div style={{ position: 'relative' }}>
            <select
              data-testid="scenario-category-select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={{
                width: '100%',
                background: '#1a1a28',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fff',
                fontSize: '0.84rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} style={{ background: '#1a1a28', color: '#fff' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Fila 4: Chips de Etiquetas Seleccionadas */}
          <div
            style={{
              minHeight: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center'
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'rgba(255, 211, 107, 0.15)',
                  border: '1px solid rgba(255, 211, 107, 0.35)',
                  color: '#ffd36b',
                  borderRadius: '14px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {tag}
                <button
                  type="button"
                  data-testid={`remove-tag-${tag}`}
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffd36b',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.72rem',
                    lineHeight: 1
                  }}
                  title={`Eliminar etiqueta ${tag}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* Fila 5: Input para ETIQUETAS */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={tagInput}
              disabled={isMaxTags}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={isMaxTags ? 'Máximo 5 etiquetas alcanzado' : 'ETIQUETAS (escribe y pulsa Enter)...'}
              style={{
                flex: 1,
                minWidth: 0,
                background: isMaxTags ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: isMaxTags ? 'rgba(255, 255, 255, 0.3)' : '#fff',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: isMaxTags ? 'not-allowed' : 'text'
              }}
            />
            <button
              type="button"
              disabled={isMaxTags || !tagInput.trim()}
              onClick={handleAddTag}
              style={{
                background: (!isMaxTags && tagInput.trim()) ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: (!isMaxTags && tagInput.trim()) ? '1px solid #ffd36b' : '1px solid rgba(255, 255, 255, 0.1)',
                color: (!isMaxTags && tagInput.trim()) ? '#ffd36b' : 'rgba(255, 255, 255, 0.3)',
                fontWeight: '700',
                padding: '7px 12px',
                borderRadius: '6px',
                cursor: (!isMaxTags && tagInput.trim()) ? 'pointer' : 'default',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
              title="Añadir etiqueta"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
