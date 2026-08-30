import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function VideoStudioSection({
  onBack,
  videoTab,
  setVideoTab,
  videoPrompt,
  setVideoPrompt,
  isGeneratingVideo,
  generatedVideoUrl,
  onGenerateVideo
}) {
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
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setVideoTab('video')}
          style={{ background: 'transparent', border: 'none', color: videoTab === 'video' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', borderBottom: videoTab === 'video' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
        >
          Crear Video
        </button>
        <button
          type="button"
          onClick={() => setVideoTab('loop')}
          style={{ background: 'transparent', border: 'none', color: videoTab === 'loop' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', borderBottom: videoTab === 'loop' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
        >
          Crear Loop Cover
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.95rem' }}>Parámetros de Video</h4>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Prompt de Animación:</label>
            <textarea
              rows={4}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe el movimiento, cámara y atmósfera..."
              style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="button"
            onClick={onGenerateVideo}
            disabled={isGeneratingVideo}
            style={{ marginTop: 'auto', background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', cursor: isGeneratingVideo ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <FontAwesomeIcon icon={isGeneratingVideo ? faSpinner : faVideo} spin={isGeneratingVideo} />
            <span>{isGeneratingVideo ? 'Generando Video...' : 'Generar Video con IA'}</span>
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
          {generatedVideoUrl ? (
            <video src={generatedVideoUrl} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              <FontAwesomeIcon icon={faVideo} size="2x" style={{ marginBottom: '8px', display: 'block' }} />
              El video generado se previsualizará aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
