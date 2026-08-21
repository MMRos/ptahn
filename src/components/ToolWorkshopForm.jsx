import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHeartbeat, 
  faListOl, 
  faDiceD20, 
  faBolt, 
  faCogs, 
  faPlus, 
  faTrashAlt, 
  faMagic, 
  faDice 
} from '@fortawesome/free-solid-svg-icons';

// Tipos de herramientas del Taller
export const TOOL_TYPES = [
  { id: 'attributes', name: 'Barras de Atributos', icon: faHeartbeat, desc: 'Salud, maná, cordura, estamina y medidores' },
  { id: 'progression', name: 'Tabla de Progresión', icon: faListOl, desc: 'Niveles, rangos, XP y desbloqueos' },
  { id: 'dice', name: 'Dados y Aleatorización', icon: faDiceD20, desc: 'Sistemas d20, d100, pool de dados y CDs' },
  { id: 'events', name: 'Tabla de Eventos', icon: faBolt, desc: 'Encuentros, clima, sucesos y giros de trama' },
  { id: 'custom', name: 'Regla Modular', icon: faCogs, desc: 'Mecánicas y subsistemas personalizados' }
];

// Presets predefinidos rápidos
export const PRESET_TEMPLATES = [
  {
    name: 'Atributos RPG Fantasía (HP/MP/Estamina)',
    type: 'attributes',
    description: 'Sistema estándar de vida, maná mágico y aguante físico para combate y exploración.',
    config: {
      attributes: [
        { id: 'hp', name: 'Salud / HP', current: 100, max: 100, min: 0, color: '#eb5757', rule: 'Baja al recibir daño físico o mágico. Muerte o inconsciencia al llegar a 0.' },
        { id: 'mp', name: 'Maná / MP', current: 50, max: 50, min: 0, color: '#2f80ed', rule: 'Se consume al lanzar hechizos o habilidades especiales. Se recupera con descanso.' },
        { id: 'sta', name: 'Estamina', current: 100, max: 100, min: 0, color: '#27ae60', rule: 'Gasto por esquivas, ataques pesados o carreras.' }
      ]
    }
  },
  {
    name: 'Terror & Cordura (Estilo Lovecraft)',
    type: 'attributes',
    description: 'Medidores de salud física y estabilidad mental ante horrores cósmicos.',
    config: {
      attributes: [
        { id: 'hp', name: 'Vitalidad', current: 20, max: 20, min: 0, color: '#e67e22', rule: 'Salud corporal.' },
        { id: 'san', name: 'Cordura / Sanity', current: 100, max: 100, min: 0, color: '#9b59b6', rule: 'Baja al presenciar abominaciones o leer tomos prohibidos. Causa alucinaciones si baja de 50.' }
      ]
    }
  },
  {
    name: 'Sistema D20 con Dificultades (CD)',
    type: 'dice',
    description: 'Mecánica de resolución mediante tirada de 1d20 superando una Clase de Dificultad.',
    config: {
      diceType: '1d20',
      criticalSuccess: 20,
      criticalFailure: 1,
      difficulties: [
        { label: 'Fácil', dc: 10, desc: 'Acciones cotidianas con ligera presión' },
        { label: 'Media', dc: 15, desc: 'Desafíos comunes para aventureros' },
        { label: 'Difícil', dc: 20, desc: 'Hazañas notables que requieren destreza' },
        { label: 'Heroica', dc: 25, desc: 'Casi imposible sin preparación o magia' }
      ],
      rules: 'El jugador o narrador lanza 1d20 + modificador. Si iguala o supera la CD, la acción tiene éxito.'
    }
  },
  {
    name: 'Progresión de Rangos Aventurero (F a S)',
    type: 'progression',
    description: 'Escala de rangos gremiales desde novato F hasta leyenda de rango S.',
    config: {
      levels: [
        { level: 'Rango F', xp: 0, bonus: '+0', unlocks: 'Misiones locales básicas de recolección' },
        { level: 'Rango E', xp: 300, bonus: '+1', unlocks: 'Exploración de catacumbas y patrullas' },
        { level: 'Rango D', xp: 900, bonus: '+2', unlocks: 'Caza de bestias menores y escoltas' },
        { level: 'Rango C', xp: 2000, bonus: '+3', unlocks: 'Mazmorras intermedias y acceso a armas raras' },
        { level: 'Rango B', xp: 5000, bonus: '+4', unlocks: 'Contratos de monstruos de élite' },
        { level: 'Rango A', xp: 12000, bonus: '+5', unlocks: 'Misiones de nivel nacional y artefactos mágicos' },
        { level: 'Rango S', xp: 30000, bonus: '+7', unlocks: 'Amenazas cataclísmicas y dragones ancianos' }
      ]
    }
  },
  {
    name: 'Tabla de Encuentros de Viaje (d10)',
    type: 'events',
    description: 'Tabla de eventos aleatorios al viajar por caminos o zonas salvajes.',
    config: {
      diceFormula: '1d10',
      events: [
        { range: '1-2', title: 'Emboscada Hostil', desc: 'Bandidos o criaturas salvajes atacan por sorpresa aprovechando el terreno.' },
        { range: '3-4', title: 'Clima Adverso', desc: 'Tormenta repentina o niebla espesa que ralentiza el avance.' },
        { range: '5-6', title: 'Caravana de Mercaderes', desc: 'Viajeros amigables dispuestos a comerciar o compartir rumores.' },
        { range: '7-8', title: 'Ruinas o Altar Antiguo', desc: 'Descubrimiento de un lugar sagrado olvidado con posibles secretos o bendiciones.' },
        { range: '9-10', title: 'Encuentro Extraordinario', desc: 'Aparición de un espíritu benévolo, criatura mítica o botín valioso.' }
      ]
    }
  }
];

export default function ToolWorkshopForm({
  name = '',
  setName = () => {},
  toolType = 'attributes',
  setToolType = () => {},
  description = '',
  setDescription = () => {},
  config = {},
  setConfig = () => {}
}) {
  const [testDiceResult, setTestDiceResult] = useState(null);
  const [testEventResult, setTestEventResult] = useState(null);

  // Aplicar una plantilla predefinida
  const handleApplyPreset = (preset) => {
    setName(preset.name);
    setToolType(preset.type);
    setDescription(preset.description);
    setConfig(JSON.parse(JSON.stringify(preset.config)));
  };

  // --- Manejadores para Atributos ---
  const attributesList = config.attributes || [];
  const handleAddAttribute = () => {
    const newAttr = {
      id: `attr_${Date.now()}`,
      name: 'Nuevo Atributo',
      current: 100,
      max: 100,
      min: 0,
      color: '#ffd36b',
      rule: 'Efecto al variar...'
    };
    setConfig({ ...config, attributes: [...attributesList, newAttr] });
  };

  const handleUpdateAttribute = (index, field, value) => {
    const updated = [...attributesList];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, attributes: updated });
  };

  const handleRemoveAttribute = (index) => {
    const updated = attributesList.filter((_, i) => i !== index);
    setConfig({ ...config, attributes: updated });
  };

  // --- Manejadores para Progresión ---
  const levelsList = config.levels || [];
  const handleAddLevel = () => {
    const nextIdx = levelsList.length + 1;
    const newLvl = {
      level: `Nivel ${nextIdx}`,
      xp: nextIdx * 500,
      bonus: `+${nextIdx}`,
      unlocks: 'Nuevas habilidades...'
    };
    setConfig({ ...config, levels: [...levelsList, newLvl] });
  };

  const handleUpdateLevel = (index, field, value) => {
    const updated = [...levelsList];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, levels: updated });
  };

  const handleRemoveLevel = (index) => {
    const updated = levelsList.filter((_, i) => i !== index);
    setConfig({ ...config, levels: updated });
  };

  // --- Manejadores para Dados ---
  const diceConfig = config.diceType ? config : {
    diceType: '1d20',
    criticalSuccess: 20,
    criticalFailure: 1,
    difficulties: [
      { label: 'Fácil', dc: 10, desc: 'Acción sencilla' },
      { label: 'Media', dc: 15, desc: 'Desafío estándar' },
      { label: 'Difícil', dc: 20, desc: 'Hazaña compleja' }
    ],
    rules: 'Lanzamiento de dados para resolver acciones.'
  };

  const handleRollDiceTest = () => {
    let max = 20;
    if (diceConfig.diceType === '1d100') max = 100;
    else if (diceConfig.diceType === '1d10') max = 10;
    else if (diceConfig.diceType === '1d6') max = 6;
    else if (diceConfig.diceType === '1d12') max = 12;

    const roll = Math.floor(Math.random() * max) + 1;
    let outcome = 'Éxito Estándar';
    if (roll === diceConfig.criticalSuccess) outcome = '¡CRÍTICO!';
    else if (roll === diceConfig.criticalFailure) outcome = '¡PIFIA!';

    setTestDiceResult({ roll, outcome, max });
  };

  // --- Manejadores para Eventos ---
  const eventsList = config.events || [];
  const handleAddEvent = () => {
    const newEvent = {
      range: `${eventsList.length + 1}`,
      title: 'Nuevo Evento',
      desc: 'Descripción del evento o encuentro...'
    };
    setConfig({ ...config, events: [...eventsList, newEvent] });
  };

  const handleUpdateEvent = (index, field, value) => {
    const updated = [...eventsList];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, events: updated });
  };

  const handleRemoveEvent = (index) => {
    const updated = eventsList.filter((_, i) => i !== index);
    setConfig({ ...config, events: updated });
  };

  const handleRollEventTest = () => {
    if (eventsList.length === 0) return;
    const randomIdx = Math.floor(Math.random() * eventsList.length);
    setTestEventResult(eventsList[randomIdx]);
  };

  return (
    <div className="tool-workshop-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Botones de Plantillas Predefinidas */}
      <div style={{ background: 'rgba(255, 211, 107, 0.05)', border: '1px solid rgba(255, 211, 107, 0.15)', borderRadius: '10px', padding: '12px' }}>
        <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <FontAwesomeIcon icon={faMagic} /> Plantillas Rápidas del Taller de Funciones
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PRESET_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(tmpl)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#eaeaea',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FontAwesomeIcon icon={tmpl.type === 'attributes' ? faHeartbeat : tmpl.type === 'dice' ? faDiceD20 : tmpl.type === 'progression' ? faListOl : faBolt} />
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Tipo de Herramienta */}
      <div className="field-group">
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>
          Tipo de Herramienta / Preset Modular <span style={{ color: '#ffd36b' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {TOOL_TYPES.map(tt => {
            const isSelected = toolType === tt.id;
            return (
              <button
                key={tt.id}
                type="button"
                onClick={() => {
                  setToolType(tt.id);
                  if (tt.id === 'attributes' && !config.attributes) {
                    setConfig({ ...config, attributes: PRESET_TEMPLATES[0].config.attributes });
                  } else if (tt.id === 'dice' && !config.diceType) {
                    setConfig({ ...config, ...PRESET_TEMPLATES[2].config });
                  } else if (tt.id === 'progression' && !config.levels) {
                    setConfig({ ...config, levels: PRESET_TEMPLATES[3].config.levels });
                  } else if (tt.id === 'events' && !config.events) {
                    setConfig({ ...config, ...PRESET_TEMPLATES[4].config });
                  }
                }}
                style={{
                  background: isSelected ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isSelected ? '#ffd36b' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isSelected ? '#ffd36b' : '#eaeaea',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'center'
                }}
              >
                <FontAwesomeIcon icon={tt.icon} style={{ fontSize: '1.1rem' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? '700' : '500' }}>{tt.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nombre y Descripción General */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="field-group">
          <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
            Nombre de la herramienta <span style={{ color: '#ffd36b' }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Sistema de Vida y Maná, Dados d20 de Combate..."
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <div className="field-group">
          <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>
            Descripción / Instrucción para el Narrador
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cómo y cuándo debe el narrador aplicar esta herramienta..."
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EDITOR: BARRAS DE ATRIBUTOS                                            */}
      {/* ========================================================================= */}
      {toolType === 'attributes' && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faHeartbeat} /> Atributos y Medidores ({attributesList.length})
            </h4>
            <button
              type="button"
              onClick={handleAddAttribute}
              style={{ background: '#ffd36b', color: '#000', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FontAwesomeIcon icon={faPlus} /> Añadir Atributo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {attributesList.map((attr, idx) => (
              <div key={idx} style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px auto', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={attr.name}
                    onChange={(e) => handleUpdateAttribute(idx, 'name', e.target.value)}
                    placeholder="Nombre (ej. Salud / HP)"
                    style={{ padding: '6px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Actual</span>
                    <input
                      type="number"
                      value={attr.current}
                      onChange={(e) => handleUpdateAttribute(idx, 'current', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Máx</span>
                    <input
                      type="number"
                      value={attr.max}
                      onChange={(e) => handleUpdateAttribute(idx, 'max', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Mín</span>
                    <input
                      type="number"
                      value={attr.min || 0}
                      onChange={(e) => handleUpdateAttribute(idx, 'min', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Color</span>
                    <input
                      type="color"
                      value={attr.color || '#ffd36b'}
                      onChange={(e) => handleUpdateAttribute(idx, 'color', e.target.value)}
                      style={{ width: '36px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer', padding: '6px' }}
                    title="Eliminar atributo"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <input
                    value={attr.rule || ''}
                    onChange={(e) => handleUpdateAttribute(idx, 'rule', e.target.value)}
                    placeholder="Regla de uso (ej. Baja al recibir daño, sube con pociones de curación...)"
                    style={{ width: '100%', padding: '5px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: 'rgba(255,255,255,0.8)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Previsualización de la barra */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>
                    <span>{attr.name}</span>
                    <span>{attr.current} / {attr.max}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(0, Math.min(100, (attr.current / (attr.max || 1)) * 100))}%`,
                        background: attr.color || '#ffd36b',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDITOR: TABLA DE PROGRESIÓN DE NIVELES                                 */}
      {/* ========================================================================= */}
      {toolType === 'progression' && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faListOl} /> Escala de Progresión / Niveles ({levelsList.length})
            </h4>
            <button
              type="button"
              onClick={handleAddLevel}
              style={{ background: '#ffd36b', color: '#000', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FontAwesomeIcon icon={faPlus} /> Añadir Nivel / Rango
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {levelsList.map((lvl, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 100px 90px 1fr auto', gap: '8px', alignItems: 'center', background: '#181824', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  value={lvl.level}
                  onChange={(e) => handleUpdateLevel(idx, 'level', e.target.value)}
                  placeholder="Nivel / Rango"
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#ffd36b', fontWeight: '700', fontSize: '0.8rem' }}
                />
                <input
                  type="number"
                  value={lvl.xp}
                  onChange={(e) => handleUpdateLevel(idx, 'xp', Number(e.target.value))}
                  placeholder="XP Req."
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  value={lvl.bonus || ''}
                  onChange={(e) => handleUpdateLevel(idx, 'bonus', e.target.value)}
                  placeholder="Bono (ej. +2)"
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  value={lvl.unlocks || ''}
                  onChange={(e) => handleUpdateLevel(idx, 'unlocks', e.target.value)}
                  placeholder="Desbloqueos, títulos o privilegios del nivel..."
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLevel(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer', padding: '6px' }}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDITOR: DADOS Y ALEATORIZACIÓN                                         */}
      {/* ========================================================================= */}
      {toolType === 'dice' && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#ffd36b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faDiceD20} /> Configuración de Dados y Mecánicas de Azar
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Tipo de Dado Principal</label>
              <select
                value={diceConfig.diceType || '1d20'}
                onChange={(e) => setConfig({ ...diceConfig, diceType: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="1d20">1d20 (D&D / Fantasía Clásica)</option>
                <option value="1d100">1d100 / Porcentual (Cthulhu / Realista)</option>
                <option value="3d6">3d6 (GURPS / Curva de Bell)</option>
                <option value="1d6">1d6 / Pool d6 (Shadowrun / PbtA)</option>
                <option value="1d10">1d10 (Mundo de Tinieblas / Cyberpunk)</option>
                <option value="1d12">1d12 (Daggerheart / Narrativo)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Resultado de Éxito Crítico</label>
              <input
                type="number"
                value={diceConfig.criticalSuccess ?? 20}
                onChange={(e) => setConfig({ ...diceConfig, criticalSuccess: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Resultado de Pifia / Fallo Crítico</label>
              <input
                type="number"
                value={diceConfig.criticalFailure ?? 1}
                onChange={(e) => setConfig({ ...diceConfig, criticalFailure: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Reglas de Resolución para el Narrador</label>
            <textarea
              value={diceConfig.rules || ''}
              onChange={(e) => setConfig({ ...diceConfig, rules: e.target.value })}
              placeholder="Explica al narrador cómo evaluar las tiradas (ej. El narrador pide tirada ante peligro. Si el jugador saca >= 15 es un éxito limpio; si saca 10-14 es éxito con consecuencias)..."
              rows={3}
              style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
            />
          </div>

          {/* Simulador de tirada de prueba */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={handleRollDiceTest}
              style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', color: '#000', fontWeight: '700', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <FontAwesomeIcon icon={faDice} /> Probar Tirada ({diceConfig.diceType || '1d20'})
            </button>
            {testDiceResult && (
              <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                Resultado: <strong style={{ color: testDiceResult.roll === diceConfig.criticalSuccess ? '#27ae60' : testDiceResult.roll === diceConfig.criticalFailure ? '#eb5757' : '#ffd36b', fontSize: '1.1rem' }}>{testDiceResult.roll}</strong> ({testDiceResult.outcome})
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EDITOR: TABLAS DE EVENTOS Y ENCUENTROS                                 */}
      {/* ========================================================================= */}
      {toolType === 'events' && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faBolt} /> Tabla de Eventos y Encuentros ({eventsList.length})
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRollEventTest}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#ffd36b', border: '1px solid rgba(255,211,107,0.3)', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FontAwesomeIcon icon={faDice} /> Simular Evento
              </button>
              <button
                type="button"
                onClick={handleAddEvent}
                style={{ background: '#ffd36b', color: '#000', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FontAwesomeIcon icon={faPlus} /> Añadir Evento
              </button>
            </div>
          </div>

          {testEventResult && (
            <div style={{ background: 'rgba(255, 211, 107, 0.1)', border: '1px solid #ffd36b', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: '#ffd36b', fontWeight: '700', textTransform: 'uppercase' }}>🎲 Evento Disparado ({testEventResult.range}):</span>
              <h5 style={{ margin: '4px 0', color: '#fff', fontSize: '0.9rem' }}>{testEventResult.title}</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>{testEventResult.desc}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eventsList.map((evt, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 180px 1fr auto', gap: '8px', alignItems: 'center', background: '#181824', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  value={evt.range}
                  onChange={(e) => handleUpdateEvent(idx, 'range', e.target.value)}
                  placeholder="Rango (1-2)"
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#ffd36b', fontWeight: '700', fontSize: '0.8rem' }}
                />
                <input
                  value={evt.title}
                  onChange={(e) => handleUpdateEvent(idx, 'title', e.target.value)}
                  placeholder="Título del evento"
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  value={evt.desc}
                  onChange={(e) => handleUpdateEvent(idx, 'desc', e.target.value)}
                  placeholder="Descripción y efectos para la trama..."
                  style={{ padding: '6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer', padding: '6px' }}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EDITOR: REGLA / MECÁNICA CUSTOM                                        */}
      {/* ========================================================================= */}
      {toolType === 'custom' && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffd36b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faCogs} /> Regla Modular Personalizada
          </h4>
          <textarea
            value={config.customRuleText || ''}
            onChange={(e) => setConfig({ ...config, customRuleText: e.target.value })}
            placeholder="Escribe las mecánicas, subsistemas, fórmulas o instrucciones paso a paso para el narrador..."
            rows={5}
            style={{ width: '100%', padding: '10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      )}

    </div>
  );
}
