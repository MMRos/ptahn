import React from 'react';

/**
 * MemoryFormSection
 * Subcomponente para la edición especializada de tarjetas de tipo 'Memoria' (Recuerdos episódicos y antecedentes)
 */
export default function MemoryFormSection({
  memorySummary = '',
  setMemorySummary = () => {},
  memoryImpact = 'Medio',
  setMemoryImpact = () => {},
  memoryTimeline = '',
  setMemoryTimeline = () => {},
  memoryCharacters = [],
  setMemoryCharacters = () => {},
  appData = {},
  onFieldChange = () => {}
}) {
  const characters = (appData?.cards || []).filter(c => c && (c.type === 'Personaje' || c.type === 'PJ'));

  return (
    <div style={{
      background: 'rgba(192, 132, 252, 0.04)',
      border: '1px solid rgba(192, 132, 252, 0.25)',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            ⚡ Nivel de Impacto
          </label>
          <select
            value={memoryImpact}
            onChange={(e) => onFieldChange(setMemoryImpact, e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
          >
            <option value="Bajo">Bajo (Detalle menor o ambiental)</option>
            <option value="Medio">Medio (Descubrimiento o diálogo notable)</option>
            <option value="Alto">Alto (Giro narrativo o cambio de relación)</option>
            <option value="Crítico">Crítico (Muerte, pacto o revelación decisiva)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            ⏳ Línea Temporal / Turno
          </label>
          <input
            value={memoryTimeline}
            onChange={(e) => onFieldChange(setMemoryTimeline, e.target.value)}
            placeholder="Ej. Turno 4, Pasado lejano, Hace dos lunas..."
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
          📝 Resumen del Recuerdo / Hito
        </label>
        <textarea
          value={memorySummary}
          onChange={(e) => onFieldChange(setMemorySummary, e.target.value)}
          placeholder="Qué sucedió, quién estuvo involucrado y cuál fue la consecuencia..."
          rows={3}
          style={{ width: '100%', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      {characters.length > 0 && (
        <div>
          <label style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            👥 Personajes Involucrados
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {characters.map(char => {
              const isSelected = memoryCharacters.includes(char.id);
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? memoryCharacters.filter(id => id !== char.id)
                      : [...memoryCharacters, char.id];
                    onFieldChange(setMemoryCharacters, next);
                  }}
                  style={{
                    background: isSelected ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isSelected ? '#c084fc' : 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}{char.title || char.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
