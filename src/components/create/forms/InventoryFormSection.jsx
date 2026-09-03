import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSuitcase, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

/**
 * InventoryFormSection
 * Subcomponente desacoplado para la edición de tarjetas de tipo 'Inventario'
 */
export default function InventoryFormSection({
  inventoryOwnerCharId,
  setInventoryOwnerCharId,
  inventoryCapacity,
  setInventoryCapacity,
  inventoryItems = [],
  setInventoryItems,
  appData = {},
  onFieldChange = () => {}
}) {
  return (
    <div style={{
      background: 'rgba(255, 211, 107, 0.04)',
      border: '1px solid rgba(255, 211, 107, 0.25)',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            👤 Personaje Propietario
          </label>
          <select
            value={inventoryOwnerCharId}
            onChange={(e) => onFieldChange(setInventoryOwnerCharId, e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
          >
            <option value="">(Inventario General / Sin Asignar)</option>
            {(appData?.cards || []).filter(c => c && (c.type === 'Personaje' || c.type === 'PJ')).map(char => (
              <option key={char.id} value={char.id}>{char.title || char.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            ⚖️ Capacidad / Límite de Carga
          </label>
          <input
            value={inventoryCapacity}
            onChange={(e) => onFieldChange(setInventoryCapacity, e.target.value)}
            placeholder="Ej. 20 kg / 10 slots"
            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Gestor interactivo de ítems */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <FontAwesomeIcon icon={faSuitcase} /> Objetos en el Inventario ({inventoryItems.length})
          </label>
          <button
            type="button"
            onClick={() => {
              const newItem = {
                id: `item-${Date.now()}`,
                name: 'Nuevo Objeto',
                qty: 1,
                rarity: 'Común',
                equipped: false,
                weight: '1 kg',
                desc: 'Descripción del objeto...'
              };
              onFieldChange(setInventoryItems, [...inventoryItems, newItem]);
            }}
            style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', color: '#0d0e16', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FontAwesomeIcon icon={faPlus} /> Añadir Objeto
          </button>
        </div>

        {inventoryItems.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            No hay objetos en esta mochila. Pulsa "+ Añadir Objeto" para registrar equipamiento o pertenencias.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inventoryItems.map((item, idx) => (
              <div key={item.id || idx} style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', display: 'grid', gridTemplateColumns: 'minmax(140px, 2fr) 65px 110px 100px minmax(140px, 2fr) auto', gap: '8px', alignItems: 'center' }}>
                <input
                  value={item.name || ''}
                  onChange={(e) => {
                    const updated = [...inventoryItems];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    onFieldChange(setInventoryItems, updated);
                  }}
                  placeholder="Nombre..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '5px 8px', color: '#fff', fontSize: '0.78rem' }}
                />
                <input
                  type="number"
                  value={item.qty || 1}
                  min={1}
                  onChange={(e) => {
                    const updated = [...inventoryItems];
                    updated[idx] = { ...updated[idx], qty: parseInt(e.target.value, 10) || 1 };
                    onFieldChange(setInventoryItems, updated);
                  }}
                  title="Cantidad"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '5px 6px', color: '#fff', fontSize: '0.78rem', textAlign: 'center' }}
                />
                <select
                  value={item.rarity || 'Común'}
                  onChange={(e) => {
                    const updated = [...inventoryItems];
                    updated[idx] = { ...updated[idx], rarity: e.target.value };
                    onFieldChange(setInventoryItems, updated);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '5px 6px', color: '#ffd36b', fontSize: '0.75rem' }}
                >
                  <option value="Común">Común</option>
                  <option value="Poco común">Poco común</option>
                  <option value="Raro">Raro</option>
                  <option value="Épico">Épico</option>
                  <option value="Legendario">Legendario</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: item.equipped ? '#6ee7b7' : 'rgba(255,255,255,0.6)', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={!!item.equipped}
                    onChange={(e) => {
                      const updated = [...inventoryItems];
                      updated[idx] = { ...updated[idx], equipped: e.target.checked };
                      onFieldChange(setInventoryItems, updated);
                    }}
                  />
                  {item.equipped ? '⚔️ Equipado' : '🎒 En bolsa'}
                </label>
                <input
                  value={item.desc || ''}
                  onChange={(e) => {
                    const updated = [...inventoryItems];
                    updated[idx] = { ...updated[idx], desc: e.target.value };
                    onFieldChange(setInventoryItems, updated);
                  }}
                  placeholder="Descripción / efectos..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '5px 8px', color: '#fff', fontSize: '0.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = inventoryItems.filter((_, i) => i !== idx);
                    onFieldChange(setInventoryItems, updated);
                  }}
                  title="Eliminar objeto"
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
