import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTools, faPlus, faTimes, faDiceD20, faHeartbeat, faListOl, faBolt } from '@fortawesome/free-solid-svg-icons';

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
  setRandomization = () => {},
  tools = [], // IDs o nombres de herramientas asignadas
  setTools = () => {},
  availableTools = [], // Lista de herramientas creadas en el Taller de Funciones
  onOpenToolCreator = () => {}
}) {
  const handleToggleTool = (toolId) => {
    if (tools.includes(toolId)) {
      setTools(tools.filter(id => id !== toolId));
    } else {
      setTools([...tools, toolId]);
    }
  };

  const getToolIcon = (type) => {
    switch (type) {
      case 'attributes': return faHeartbeat;
      case 'progression': return faListOl;
      case 'dice': return faDiceD20;
      case 'events': return faBolt;
      default: return faTools;
    }
  };

  return (
    <div className="narrator-form-fields" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Nombre del narrador <span style={{ color: '#ffd36b' }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. El Bardo Oscuro, La IA de Combate, DM de Fantasía..."
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
        />
      </div>

      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
          Instrucciones narrativas <span style={{ color: '#ffd36b' }}>*</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Define las instrucciones narrativas, personalidad, trasfondo y motivación del narrador..."
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
            placeholder="Ej. Adulto, humorístico, descriptivo, poético..."
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
            placeholder="Ej. Oscuro, épico, sensual, misterioso..."
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
          Randomización / Azar
        </label>
        <textarea
          value={randomization}
          onChange={(e) => setRandomization(e.target.value)}
          placeholder="Comportamientos aleatorios, giros de trama o eventos inesperados..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      {/* Sección Taller de Funciones / Herramientas Modulares Asignadas al Narrador */}
      <div className="field-group" style={{ background: 'rgba(255, 211, 107, 0.04)', border: '1px solid rgba(255, 211, 107, 0.15)', borderRadius: '8px', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '0.84rem', color: '#ffd36b', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faTools} /> Herramientas del Taller asignadas ({tools.length})
          </label>
          <button
            type="button"
            onClick={onOpenToolCreator}
            style={{
              background: 'rgba(255, 211, 107, 0.15)',
              border: '1px solid rgba(255, 211, 107, 0.3)',
              color: '#ffd36b',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600'
            }}
          >
            <FontAwesomeIcon icon={faPlus} /> Crear herramienta
          </button>
        </div>

        <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px 0', lineHeight: '1.3' }}>
          Asigna herramientas modulares (barras de atributos, progresión, dados y tablas de eventos) que el Narrador gestionará durante la partida.
        </p>

        {availableTools && availableTools.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {availableTools.map(t => {
              const isSelected = tools.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTool(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    background: isSelected ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isSelected ? '#ffd36b' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#ffd36b' : '#eaeaea',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FontAwesomeIcon icon={getToolIcon(t.toolType || t.type)} />
                  <span style={{ fontWeight: isSelected ? '700' : '400' }}>{t.name || t.title}</span>
                  {isSelected && <FontAwesomeIcon icon={faTimes} style={{ fontSize: '0.7rem', marginLeft: '4px', opacity: 0.8 }} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '6px 0' }}>
            No hay herramientas en el Taller todavía. Haz clic en "Crear herramienta" para agregar barras de atributos, dados, tablas o progresión.
          </div>
        )}
      </div>
    </div>
  );
}
