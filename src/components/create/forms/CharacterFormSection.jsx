import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic, faPlus, faSuitcase } from '@fortawesome/free-solid-svg-icons';

/**
 * CharacterFormSection
 * Subcomponente para los campos exclusivos de personajes (Rasgos de personalidad y vinculación de mochila)
 */
export default function CharacterFormSection({
  selectedTraits = [],
  setSelectedTraits,
  traitQuery = '',
  setTraitQuery,
  isEnhancingField = null,
  handleEnhanceField = () => {},
  appData = {},
  editItem = null,
  title = '',
  setTitle = () => {},
  setItemType = () => {},
  setInventoryOwnerCharId = () => {},
  setIsDirty = () => {}
}) {
  return (
    <div className="field-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
          Rasgos de Personalidad ({selectedTraits.length})
        </label>
        <button
          type="button"
          onClick={() => handleEnhanceField('traits')}
          disabled={isEnhancingField === 'traits'}
          style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
        >
          <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'traits'} /> Sugerir Rasgos
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
        {selectedTraits.map(t => (
          <span
            key={t}
            style={{
              background: 'rgba(255, 211, 107, 0.1)',
              border: '1px solid rgba(255, 211, 107, 0.25)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              color: '#ffd36b',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {t}
            <button
              type="button"
              onClick={() => {
                setSelectedTraits(prev => prev.filter(x => x !== t));
                setIsDirty(true);
              }}
              style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={traitQuery}
        onChange={(e) => setTraitQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && traitQuery.trim()) {
            e.preventDefault();
            if (!selectedTraits.includes(traitQuery.trim())) {
              setSelectedTraits(prev => [...prev, traitQuery.trim()]);
              setTraitQuery('');
              setIsDirty(true);
            }
          }
        }}
        placeholder="Escribe un rasgo y presiona Enter..."
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '6px',
          padding: '6px 10px',
          color: '#fff',
          fontSize: '0.8rem'
        }}
      />

      {/* Mochila / Inventario Vinculado */}
      <div style={{ marginTop: '12px', background: 'rgba(255, 211, 107, 0.04)', border: '1px solid rgba(255, 211, 107, 0.2)', borderRadius: '8px', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faSuitcase} /> Mochila / Inventario del Personaje
          </span>
          {(() => {
            const existingInv = (appData?.cards || []).find(c => c && c.type === 'Inventario' && (c.linkedCharacterId === editItem?.id || (editItem?.title && c.linkedCharacterId === editItem.title)));
            if (existingInv) {
              return (
                <span style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: '600' }}>
                  ✓ Vinculado ({Array.isArray(existingInv.items) ? existingInv.items.length : 0} objetos)
                </span>
              );
            }
            return (
              <button
                type="button"
                onClick={() => {
                  setItemType('Inventario');
                  setTitle(`Inventario de ${title || editItem?.title || 'Personaje'}`);
                  setInventoryOwnerCharId(editItem?.id || '');
                  setIsDirty(true);
                }}
                style={{ background: 'rgba(255, 211, 107, 0.15)', border: '1px solid rgba(255, 211, 107, 0.35)', color: '#ffd36b', padding: '4px 10px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
              >
                <FontAwesomeIcon icon={faPlus} /> Crear Mochila
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
