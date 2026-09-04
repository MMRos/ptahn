import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronDown, 
  faChevronRight, 
  faPlus, 
  faEdit 
} from '@fortawesome/free-solid-svg-icons';
import { useDragDropReorder } from '../../hooks/useDragDropReorder';

/**
 * Hilera desplegable para una categoría de cartas asociadas a un escenario.
 * Soporta colapsar/expandir, badges de conteo, y Drag and Drop dentro de la misma categoría.
 */
export default function ScenarioLoreCategoryRow({
  type,
  typeLabel,
  cards = [],
  onOpenNewCardModal,
  onOpenEditCardModal,
  onUnlinkCard,
  onReorderCategoryCards,
  defaultExpanded = null
}) {
  // Si no se especifica explícitamente, se muestra expandido si tiene tarjetas vinculadas
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded !== null ? defaultExpanded : cards.length > 0
  );
  const [hasUserToggled, setHasUserToggled] = useState(false);

  useEffect(() => {
    if (!hasUserToggled && defaultExpanded === null && cards.length > 0) {
      setIsExpanded(true);
    }
  }, [cards.length, hasUserToggled, defaultExpanded]);

  const { draggedIndex, dragOverIndex, getItemProps } = useDragDropReorder({
    items: cards,
    areaId: `scenario-lore-${type}`,
    onReorder: (newCards) => {
      if (typeof onReorderCategoryCards === 'function') {
        onReorderCategoryCards(type, newCards);
      }
    }
  });

  return (
    <div 
      style={{ 
        marginBottom: '16px',
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease'
      }}
    >
      {/* Cabecera Desplegable de la Categoría */}
      <div 
        onClick={() => {
          setHasUserToggled(true);
          setIsExpanded(!isExpanded);
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          transition: 'background 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronDown : faChevronRight} 
            style={{ 
              color: isExpanded ? '#ffd36b' : 'rgba(255, 255, 255, 0.4)', 
              fontSize: '0.8rem',
              transition: 'transform 0.2s ease'
            }} 
          />
          <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '700' }}>
            {typeLabel}
          </span>
          <span style={{ 
            background: cards.length > 0 ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.06)', 
            color: cards.length > 0 ? '#ffd36b' : 'rgba(255, 255, 255, 0.4)', 
            fontSize: '0.72rem', 
            fontWeight: '700', 
            padding: '2px 8px', 
            borderRadius: '10px',
            border: cards.length > 0 ? '1px solid rgba(255, 211, 107, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {cards.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenNewCardModal(type)}
            style={{ 
              background: 'rgba(255, 211, 107, 0.1)', 
              border: '1px solid rgba(255, 211, 107, 0.25)', 
              color: '#ffd36b', 
              fontSize: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '700',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '0.7rem' }} />
            <span>Crear {type}</span>
          </button>
        </div>
      </div>

      {/* Contenido Desplegable: Tarjetas y Ranura para Añadir */}
      {isExpanded && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {cards.map((card, index) => {
              const dragProps = getItemProps(index);
              const isBeingDragged = draggedIndex === index;
              const isDropTarget = dragOverIndex === index;

              return (
                <div
                  key={card.id}
                  {...dragProps}
                  onClick={() => onOpenEditCardModal(card)}
                  style={{
                    background: isDropTarget ? 'rgba(255, 211, 107, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isDropTarget ? '2px dashed #ffd36b' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '175px',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
                    cursor: 'grab',
                    opacity: isBeingDragged ? 0.45 : 1,
                    transform: isDropTarget ? 'scale(1.02)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isBeingDragged) {
                      e.currentTarget.style.borderColor = isDropTarget ? '#ffd36b' : 'rgba(255, 211, 107, 0.4)';
                      e.currentTarget.style.transform = isDropTarget ? 'scale(1.02)' : 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isBeingDragged) {
                      e.currentTarget.style.borderColor = isDropTarget ? '#ffd36b' : 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = isDropTarget ? 'scale(1.02)' : 'none';
                    }
                  }}
                  title={`Arrastra para reordenar o haz clic para editar "${card.title}"`}
                >
                  {/* Botones de Acción (Editar y Desenlazar) */}
                  <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 5 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCardModal(card);
                      }}
                      style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(255, 211, 107, 0.4)',
                        color: '#ffd36b',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem'
                      }}
                      title="Editar tarjeta completa"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlinkCard(card);
                      }}
                      style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(255, 107, 107, 0.4)',
                        color: '#ff6b6b',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}
                      title="Desenlazar del escenario"
                    >
                      ×
                    </button>
                  </div>

                  {/* Portada */}
                  <div style={{
                    height: '85px',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: `url(${card.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80'})`,
                    backgroundColor: '#1a1a24'
                  }} />

                  {/* Info */}
                  <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={card.title}>
                      {card.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {card.type}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#ffd36b', fontWeight: '600' }}>
                        ✏️ Editar
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ranura Dotted "Crear Nuevo" */}
            <div
              onClick={() => onOpenNewCardModal(type)}
              style={{
                border: '2px dashed rgba(255, 211, 107, 0.3)',
                borderRadius: '10px',
                height: '175px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffd36b',
                fontSize: '0.78rem',
                fontWeight: '600',
                gap: '6px',
                transition: 'all 0.2s',
                background: 'rgba(255,211,107,0.01)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '2px dashed rgba(255, 211, 107, 0.6)';
                e.currentTarget.style.background = 'rgba(255,211,107,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '2px dashed rgba(255, 211, 107, 0.3)';
                e.currentTarget.style.background = 'rgba(255,211,107,0.01)';
              }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: '1rem' }} />
              <span>+ Añadir {type}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
