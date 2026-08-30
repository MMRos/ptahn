import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft,
  faPlay, 
  faPause, 
  faSpinner, 
  faSave
} from '@fortawesome/free-solid-svg-icons';

export default function VoiceStudioSection({
  onBack,
  voiceTopTab,
  setVoiceTopTab,
  voiceName,
  setVoiceName,
  voiceGender,
  setVoiceGender,
  voiceBio,
  setVoiceBio,
  testPhrase,
  setTestPhrase,
  isPlayingVoice,
  playingVoiceId,
  isGeneratingAudio,
  ttsEngine,
  setTtsEngine,
  browserVoice,
  setBrowserVoice,
  browserVoices = [],
  communityVoices = [],
  onPlayCommunityVoice,
  onGenerateAudio,
  onSaveVoice
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
          onClick={() => setVoiceTopTab('create')}
          style={{ background: 'transparent', border: 'none', color: voiceTopTab === 'create' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', borderBottom: voiceTopTab === 'create' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
        >
          Crear y Configurar Voz
        </button>
        <button
          type="button"
          onClick={() => setVoiceTopTab('generate')}
          style={{ background: 'transparent', border: 'none', color: voiceTopTab === 'generate' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', borderBottom: voiceTopTab === 'generate' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
        >
          Voces de la Comunidad
        </button>
      </div>

      {voiceTopTab === 'create' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.95rem' }}>Parámetros de la Voz</h4>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Motor de Voz (TTS):</label>
              <select
                value={ttsEngine}
                onChange={(e) => setTtsEngine(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
              >
                <option value="browser">Navegador Web (Web Speech API - Rápido)</option>
                <option value="local">Motor Local de Ptahn / Bark (Alta Fidelidad)</option>
              </select>
            </div>

            {ttsEngine === 'browser' && browserVoices.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Voz del Sistema:</label>
                <select
                  value={browserVoice}
                  onChange={(e) => setBrowserVoice(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                >
                  {browserVoices.map((v, i) => (
                    <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Nombre de la Voz:</label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Ej. Kaelen el Sabio"
                style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Género / Timbre:</label>
              <select
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Neutral">Neutral / Monstruo</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Descripción de la Voz:</label>
              <textarea
                rows={3}
                value={voiceBio}
                onChange={(e) => setVoiceBio(e.target.value)}
                placeholder="Ej. Voz grave, calmada y solemne con tono misterioso..."
                style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.95rem' }}>Prueba de Síntesis en Vivo</h4>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Frase de Prueba:</label>
              <textarea
                rows={4}
                value={testPhrase}
                onChange={(e) => setTestPhrase(e.target.value)}
                placeholder="Escribe una frase para escuchar cómo suena esta voz..."
                style={{ width: '100%', padding: '8px 10px', background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={onGenerateAudio}
                disabled={isGeneratingAudio}
                style={{ flex: 1, background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', cursor: isGeneratingAudio ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={isGeneratingAudio ? faSpinner : (isPlayingVoice ? faPause : faPlay)} spin={isGeneratingAudio} />
                <span>{isGeneratingAudio ? 'Sintetizando...' : (isPlayingVoice ? 'Detener Audio' : 'Reproducir Voz')}</span>
              </button>

              <button
                type="button"
                onClick={onSaveVoice}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FontAwesomeIcon icon={faSave} /> Guardar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {communityVoices.map((voice) => {
            const isPlayingThis = isPlayingVoice && playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: isPlayingThis ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: isPlayingThis ? '0 0 16px rgba(255, 211, 107, 0.2)' : 'none'
                }}
              >
                <img
                  src={voice.avatar}
                  alt={voice.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,211,107,0.3)' }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h5 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>{voice.name}</h5>
                  <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {voice.bio}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: '#ffd36b' }}>{voice.tags}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onPlayCommunityVoice(voice)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: isPlayingThis ? '#eb5757' : 'rgba(255,211,107,0.15)', border: '1px solid rgba(255,211,107,0.3)', color: '#ffd36b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FontAwesomeIcon icon={isPlayingThis ? faPause : faPlay} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
