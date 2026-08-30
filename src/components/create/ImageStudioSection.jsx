import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faSpinner, faMagic, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function ImageStudioSection({
  onBack,
  imagePrompt,
  setImagePrompt,
  imageStyle,
  setImageStyle,
  isGeneratingImage,
  generatedImageUrl,
  onGenerateImage,
  imageHistory = []
}) {
  const styles = [
    'Anime / Ilustración Estilizada 2.5D',
    'Fantasía Oscura / Entornos',
    'Cinemático Fotorrealista',
    'Concept Art Digital',
    'Pixel Art Retro',
    'Cómic / Novela Gráfica'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffd36b',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Volver al Compendio
          </button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.95rem' }}>Estudio de Creación de Imágenes</h4>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Estilo Artístico:</label>
            <select
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
            >
              {styles.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Prompt Visual:</label>
            <textarea
              rows={4}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe el personaje, entorno, iluminación o vestimenta..."
              style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="button"
            onClick={onGenerateImage}
            disabled={isGeneratingImage || !imagePrompt.trim()}
            style={{ marginTop: 'auto', background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', cursor: isGeneratingImage ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <FontAwesomeIcon icon={isGeneratingImage ? faSpinner : faMagic} spin={isGeneratingImage} />
            <span>{isGeneratingImage ? 'Generando Imagen...' : 'Generar Imagen con IA'}</span>
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
          {generatedImageUrl ? (
            <img src={generatedImageUrl} alt="Generada" style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px', objectFit: 'contain' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              <FontAwesomeIcon icon={faImage} size="2x" style={{ marginBottom: '8px', display: 'block' }} />
              La imagen generada aparecerá aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
