import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * ScenarioEditorSection
 * Subcomponente para la edición de campos exclusivos de Escenarios:
 * Mensajes iniciales múltiples (pestañas), Contexto base e Instrucciones para el Brain/Narrador.
 */
export default function ScenarioEditorSection({
  initialMessages = [],
  activeInitialMessageId = '',
  handleSelectInitialMessageTab = () => {},
  handleRemoveInitialMessageTab = () => {},
  handleAddInitialMessageTab = () => {},
  handleRenameInitialMessageTab = () => {},
  presentation = '',
  handleInitialMessageTextChange = () => {},
  baseContext = '',
  setBaseContext = () => {},
  aiInstructions = '',
  setAiInstructions = () => {},
  scenarioNarrator = '',
  setScenarioNarrator = () => {},
  appData = {},
  isEnhancingField = null,
  handleEnhanceField = () => {},
  handleFieldChange = () => {}
}) {
  const activeTab = initialMessages.find(m => m.id === activeInitialMessageId) || initialMessages[0];

  return (
    <>
      <div className="field-group" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Mensaje Inicial</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: '400' }}>
              ({initialMessages.length} {initialMessages.length === 1 ? 'inicio' : 'inicios'})
            </span>
          </label>
          <button
            type="button"
            onClick={() => handleEnhanceField('scenario_presentation')}
            disabled={isEnhancingField === 'scenario_presentation'}
            style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
          >
            <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_presentation'} /> Generar con IA
          </button>
        </div>

        {/* Barra de pestañas de Inicios */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          {initialMessages.map((tab) => {
            const isActive = tab.id === activeInitialMessageId;
            return (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: isActive ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: isActive ? '1px solid #ffd36b' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  gap: '6px'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSelectInitialMessageTab(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? '#ffd36b' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {tab.title}
                </button>
                {initialMessages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveInitialMessageTab(tab.id, e)}
                    title="Eliminar este inicio"
                    aria-label={`Eliminar ${tab.title}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      padding: '0 2px',
                      lineHeight: 1
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            );
          })}
          {initialMessages.length < 10 && (
            <button
              type="button"
              onClick={handleAddInitialMessageTab}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px dashed rgba(255, 211, 107, 0.4)',
                color: '#ffd36b',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.76rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FontAwesomeIcon icon={faPlus} /> Agregar inicio
            </button>
          )}
        </div>

        {/* Renombrar pestaña activa */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Nombre del inicio:</span>
          <input
            type="text"
            value={activeTab?.title || ''}
            onChange={(e) => handleRenameInitialMessageTab(activeInitialMessageId, e.target.value)}
            placeholder="Nombre del inicio..."
            style={{
              flex: 1,
              maxWidth: '260px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: '#fff',
              fontSize: '0.78rem'
            }}
          />
        </div>

        <textarea
          value={presentation}
          onChange={(e) => handleInitialMessageTextChange(e.target.value)}
          placeholder="El texto de bienvenida que verá el jugador al comenzar la partida con este inicio..."
          rows={5}
          style={{ width: '100%', minHeight: '120px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      <div className="field-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
            Contexto en Detalle
          </label>
          <button
            type="button"
            onClick={() => handleEnhanceField('scenario_context')}
            disabled={isEnhancingField === 'scenario_context'}
            style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
          >
            <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_context'} /> Desarrollar con IA
          </button>
        </div>
        <textarea
          value={baseContext}
          onChange={(e) => handleFieldChange(setBaseContext, e.target.value)}
          placeholder="Geografía, política, historia, leyes mágicas y lore del escenario..."
          rows={8}
          style={{ width: '100%', minHeight: '180px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      <div className="field-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
            Instrucciones del Brain del GM / IA
          </label>
          <button
            type="button"
            onClick={() => handleEnhanceField('scenario_instructions')}
            disabled={isEnhancingField === 'scenario_instructions'}
            style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
          >
            <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_instructions'} /> Formular con IA
          </button>
        </div>
        <textarea
          value={aiInstructions}
          onChange={(e) => handleFieldChange(setAiInstructions, e.target.value)}
          placeholder="Directivas narrativas, tono, secretos y directrices para el Narrador..."
          rows={5}
          style={{ width: '100%', minHeight: '120px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      {Array.isArray(appData?.narrators) && appData.narrators.length > 0 && (
        <div className="field-group" style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            🎭 Narrador / Director de Juego Asignado
          </label>
          <select
            value={scenarioNarrator}
            onChange={(e) => handleFieldChange(setScenarioNarrator, e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
          >
            <option value="">(Narrador Predeterminado)</option>
            {appData.narrators.map(n => (
              <option key={n.id} value={n.id}>{n.name || n.title}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
