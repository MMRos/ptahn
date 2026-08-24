import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUpload, 
  faLink, 
  faMagic, 
  faTimes, 
  faCheck, 
  faSpinner, 
  faImage, 
  faCamera,
  faSlidersH,
  faCrop
} from '@fortawesome/free-solid-svg-icons';
import ASSET_LIBRARY from '../data/assets';
import { generateImageLocal } from '../utils/localAIStudio';
import ImageCropperModal from './ImageCropperModal';

export default function MediaPickerModal({
  isOpen,
  onClose,
  title = 'Personalizar Imagen',
  type = 'avatar', // 'avatar' | 'cover'
  currentValue = '',
  onSave
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'library' | 'ai'
  const [previewUrl, setPreviewUrl] = useState(currentValue || '');
  const [customUrl, setCustomUrl] = useState(currentValue || '');
  const [galleryCategory, setGalleryCategory] = useState(type === 'avatar' ? 'avatars' : 'fantasia');

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState(
    type === 'avatar' 
      ? 'Retrato de un hechicero cósmico supremo con ojos brillantes y túnica mística, arte digital detallado'
      : 'Fortaleza medieval flotante en un cielo estelar púrpura con cascadas de luz, arte conceptual épico'
  );
  const [aiStyle, setAiStyle] = useState('Fantasía Oscura');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentValue || '');
      setCustomUrl(currentValue || '');
      setShowCropper(false);
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const isAvatar = type === 'avatar';
  const targetAspectRatio = isAvatar ? 1 : 16 / 9;

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      setCropImageSrc(dataUrl);
      setPreviewUrl(dataUrl);
      setCustomUrl(dataUrl);
      // Abrir automáticamente el recortador para asegurar coherencia visual exacta
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (url) => {
    setPreviewUrl(url);
    setCustomUrl(url);
  };

  const handleOpenCropper = () => {
    const srcToCrop = previewUrl || customUrl;
    if (!srcToCrop) {
      alert('Por favor selecciona o sube una imagen primero para poder recortarla.');
      return;
    }
    setCropImageSrc(srcToCrop);
    setShowCropper(true);
  };

  const handleCropComplete = (croppedDataUrl) => {
    setPreviewUrl(croppedDataUrl);
    setCustomUrl(croppedDataUrl);
    setShowCropper(false);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Por favor ingresa una descripción para generar la imagen.');
      return;
    }
    setIsGenerating(true);
    setAiError('');
    try {
      const generated = await generateImageLocal(aiPrompt.trim(), aiStyle);
      if (generated) {
        setPreviewUrl(generated);
        setCustomUrl(generated);
      } else {
        setAiError('El motor de difusión no devolvió una imagen. Verifica que el servidor nativo esté activo.');
      }
    } catch (err) {
      setAiError(err.message || 'Error al generar la imagen con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!previewUrl) {
      alert('Por favor selecciona, sube o genera una imagen primero.');
      return;
    }
    if (onSave) {
      onSave(previewUrl);
    }
    onClose();
  };

  return (
    <>
      <div className="auth-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
        <div 
          className="auth-modal-content" 
          onClick={e => e.stopPropagation()} 
          style={{ maxWidth: '640px', width: '92vw' }}
        >
          <div className="auth-modal-header">
            <div className="auth-modal-title">
              <FontAwesomeIcon icon={isAvatar ? faCamera : faImage} style={{ color: '#ffd36b' }} />
              <h3>{title}</h3>
            </div>
            <button type="button" className="auth-modal-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Pestañas de método */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', margin: '14px 0 16px 0' }}>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'upload' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
                color: activeTab === 'upload' ? '#000' : 'rgba(255,255,255,0.7)',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faUpload} /> Subir Archivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'library' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
                color: activeTab === 'library' ? '#000' : 'rgba(255,255,255,0.7)',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faLink} /> Enlace / Galería
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'ai' ? 'linear-gradient(135deg, #ffd36b, #d97706)' : 'transparent',
                color: activeTab === 'ai' ? '#000' : 'rgba(255,255,255,0.7)',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faMagic} /> Generar con IA
            </button>
          </div>

          {/* Preview en vivo superior con botón de recorte */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vista Previa en Vivo ({isAvatar ? 'Avatar Circular' : 'Cabecera Panorámica'})
            </small>

            {isAvatar ? (
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #ffd36b',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                background: '#1a1b2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                ) : (
                  <FontAwesomeIcon icon={faCamera} style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.3)' }} />
                )}
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '110px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 211, 107, 0.4)',
                background: '#1a1b2b',
                backgroundImage: previewUrl ? `url(${previewUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {!previewUrl && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Sin imagen de fondo seleccionada</span>
                )}
              </div>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={handleOpenCropper}
                style={{
                  background: 'rgba(255, 211, 107, 0.18)',
                  border: '1px solid rgba(255, 211, 107, 0.4)',
                  color: '#ffd36b',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faCrop} /> ✂️ Ajustar / Recortar Encuadre Exacto
              </button>
            )}
          </div>

          {/* TAB 1: SUBIR ARCHIVO */}
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                style={{
                  border: '2px dashed rgba(255, 211, 107, 0.4)',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 211, 107, 0.04)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FontAwesomeIcon icon={faUpload} style={{ fontSize: '1.8rem', color: '#ffd36b' }} />
                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Haz clic para elegir un archivo de tu ordenador</strong>
                <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>PNG, JPG, WEBP o GIF (hasta 15 MB)</small>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          )}

          {/* TAB 2: ENLACE / GALERÍA */}
          {activeTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="auth-input-group" style={{ margin: 0 }}>
                <label>URL Directa de la Imagen</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="url" 
                    placeholder="https://ejemplo.com/mi-imagen.jpg" 
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setPreviewUrl(e.target.value);
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl(customUrl)}
                    style={{
                      background: 'rgba(255, 211, 107, 0.2)',
                      border: '1px solid rgba(255, 211, 107, 0.4)',
                      color: '#ffd36b',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cargar
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                    O elige de la Galería Curada de Ptahn:
                  </label>
                  <select 
                    value={galleryCategory} 
                    onChange={(e) => setGalleryCategory(e.target.value)}
                    style={{
                      background: '#1a1b2b',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.75rem'
                    }}
                  >
                    <option value="avatars">👤 Avatares Curados</option>
                    <option value="fantasia">🏰 Fantasía & Reinos</option>
                    <option value="cyberpunk">🌆 Cyberpunk & Sci-Fi</option>
                    <option value="moderno">🏙️ Moderno & Urbano</option>
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {(ASSET_LIBRARY[galleryCategory] || []).map(img => (
                    <div 
                      key={img.id}
                      onClick={() => handleApplyUrl(img.url)}
                      style={{
                        aspectRatio: isAvatar ? '1' : '16/9',
                        borderRadius: isAvatar ? '50%' : '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: previewUrl === img.url ? '2px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: previewUrl === img.url ? '0 0 10px rgba(255,211,107,0.5)' : 'none',
                        transition: 'transform 0.15s'
                      }}
                      title={img.title}
                    >
                      <img src={img.url} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAR CON IA */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-input-group" style={{ margin: 0 }}>
                <label>Prompt de Generación Visual</label>
                <textarea 
                  rows="2"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe la escena, personaje o paisaje que deseas generar..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1a1b2b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>
                    <FontAwesomeIcon icon={faSlidersH} /> Estilo Artístico
                  </label>
                  <select 
                    value={aiStyle} 
                    onChange={(e) => setAiStyle(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1a1b2b',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="Fantasía Oscura">Fantasía Oscura / Medieval</option>
                    <option value="Cyberpunk">Cyberpunk / Neón Futurista</option>
                    <option value="Anime Elegante">Retrato Anime Estilizado</option>
                    <option value="Hiperrealista">Hiperrealista / Cinematic 8K</option>
                    <option value="Pintura Óleo">Pintura al Óleo Clásica</option>
                    <option value="Concept Art">Arte Conceptual Épico</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  style={{
                    marginTop: '18px',
                    background: 'linear-gradient(135deg, #ffd36b, #d97706)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isGenerating ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faMagic} />}
                  <span>{isGenerating ? 'Generando...' : 'Sintetizar'}</span>
                </button>
              </div>

              {aiError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '6px 10px', color: '#fca5a5', fontSize: '0.76rem' }}>
                  ⚠️ {aiError}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg, #ffd36b, #d97706)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faCheck} /> Guardar como {isAvatar ? 'Avatar' : 'Fondo de Portada'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Integrado de Recorte Exacto */}
      {showCropper && (
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={cropImageSrc}
          aspectRatio={targetAspectRatio}
          onClose={() => setShowCropper(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
