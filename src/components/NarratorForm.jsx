import React from 'react';

export default function NarratorForm({
  name = '',
  setName = () => {},
  bio = '',
  setBio = () => {},
  style = '',
  setStyle = () => {},
  tone = '',
  setTone = () => {},
  rules = '',
  setRules = () => {},
  randomization = '',
  setRandomization = () => {}
}) {
  return (
    <div className="narrator-form-fields" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Nombre del narrador
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. El Bardo Oscuro, La IA de Combate..."
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
        />
      </div>

      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Biografía / preset narrativo
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Define la personalidad, trasfondo y motivación del narrador..."
          rows={3}
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="field-group">
          <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
            Estilo narrativo
          </label>
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Ej. Adulto, humorístico, descriptivo..."
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <div className="field-group">
          <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
            Tono
          </label>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Ej. Oscuro, épico, sensual..."
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Reglas / Gameplay
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Reglas mecánicas o de comportamiento que el narrador debe seguir..."
          rows={3}
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Randomización
        </label>
        <textarea
          value={randomization}
          onChange={(e) => setRandomization(e.target.value)}
          placeholder="Comportamientos aleatorios, giros de trama o eventos inesperados..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
