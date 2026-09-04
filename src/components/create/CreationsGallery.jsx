import React, { useRef } from 'react';
import { useHorizontalWheelScroll } from '../../hooks/useHorizontalWheelScroll';
import { useDragDropReorder } from '../../hooks/useDragDropReorder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faFilter, 
  faSortAmountDown, 
  faPlay, 
  faEdit, 
  faClone, 
  faTrash, 
  faPlus,
  faChevronLeft,
  faChevronRight,
  faBookOpen,
  faUserTie,
  faUsers,
  faMapMarkedAlt,
  faGem,
  faDragon,
  faDna,
  faChessRook,
  faWrench,
  faBrain,
  faSuitcase,
  faBalanceScale,
  faFolder
} from '@fortawesome/free-solid-svg-icons';
import { getCardTypeStyle } from '../../utils/cardTypeStyles';
import { getCardProvenance } from '../../utils/creationsFilter';

const ROW_DEFINITIONS = [
  { id: 'escenarios', label: 'Escenarios e Historias', types: ['Escenario', 'Historia'], icon: faBookOpen, createType: 'Escenario', color: '#ffd36b' },
  { id: 'narradores', label: 'Narradores y Directores de Juego', types: ['Narrador'], icon: faUserTie, createType: 'Narrador', color: '#6ee7b7' },
  { id: 'personajes', label: 'Personajes y PNJs', types: ['Personaje'], icon: faUsers, createType: 'Personaje', color: '#93c5fd' },
  { id: 'lugares', label: 'Lugares y Entornos', types: ['Lugar'], icon: faMapMarkedAlt, createType: 'Lugar', color: '#fbbf24' },
  { id: 'objetos', label: 'Objetos e Ítems', types: ['Objeto'], icon: faGem, createType: 'Objeto', color: '#c084fc' },
  { id: 'criaturas', label: 'Criaturas y Bestias', types: ['Criatura'], icon: faDragon, createType: 'Criatura', color: '#f87171' },
  { id: 'razas', label: 'Razas y Especies', types: ['Raza'], icon: faDna, createType: 'Raza', color: '#34d399' },
  { id: 'facciones', label: 'Facciones y Organizaciones', types: ['Facción', 'Faccion'], icon: faChessRook, createType: 'Facción', color: '#60a5fa' },
  { id: 'herramientas', label: 'Herramientas de Narrador (Taller)', types: ['Herramienta'], icon: faWrench, createType: 'Herramienta', color: '#38bdf8' },
  { id: 'memorias', label: 'Memorias y Recuerdos', types: ['Memoria'], icon: faBrain, createType: 'Memoria', color: '#e879f9' },
  { id: 'inventarios', label: 'Inventarios', types: ['Inventario'], icon: faSuitcase, createType: 'Inventario', color: '#a3e635' },
  { id: 'reglas', label: 'Reglas del Sistema', types: ['Regla'], icon: faBalanceScale, createType: 'Regla', color: '#f43f5e' },
  { id: 'otros', label: 'Otras Creaciones', types: ['Otros', 'Voz'], icon: faFolder, createType: 'Otros', color: '#94a3b8' }
];

/**
 * Fila / Carrusel Horizontal individual para una categoría de creación.
 */
function CreationRowSection({
  def,
  items = [],
  onOpenCard,
  onOpenCreateModal,
  onStartChatWithCard,
  onCopyCard,
  onReorderCards,
  onDeleteCardRequest
}) {
  const scrollRef = useRef(null);
  useHorizontalWheelScroll(scrollRef);

  const { draggedIndex, dragOverIndex, getItemProps } = useDragDropReorder({
    items,
    areaId: `creations-row-${def.id}`,
    onReorder: (newItems) => {
      if (typeof onReorderCards === 'function') {
        onReorderCards(newItems);
      }
    }
  });

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 520;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Cabecera de la Fila */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={def.icon} style={{ color: def.color, fontSize: '1.05rem' }} />
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: '800', letterSpacing: '0.3px' }}>
            {def.label}
          </h3>
          <span style={{ 
            background: 'rgba(255,255,255,0.08)', 
            color: def.color, 
            fontSize: '0.75rem', 
            fontWeight: '700', 
            padding: '2px 8px', 
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {items.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {items.length > 3 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => scroll('left')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}
                title="Desplazar a la izquierda"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}
                title="Desplazar a la derecha"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenCreateModal(def.createType)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${def.color}40`,
              color: def.color,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Crear {def.createType}</span>
          </button>
        </div>
      </div>

      {/* Carrusel Horizontal de Tarjetas */}
      {items.length > 0 ? (
        <div
          ref={scrollRef.callbackRef || scrollRef}
          style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            padding: '4px 2px 14px 2px',
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {items.map((card, index) => {
            const typeStyle = getCardTypeStyle(card.type);
            const provenance = getCardProvenance(card);
            const isScenario = card.type === 'Historia' || card.type === 'Escenario' || card.isScenario;
            const dragProps = getItemProps(index);
            const isBeingDragged = draggedIndex === index;
            const isDropTarget = dragOverIndex === index;

            return (
              <div
                key={card.id}
                {...dragProps}
                onClick={() => onOpenCard(card)}
                style={{
                  minWidth: '230px',
                  maxWidth: '230px',
                  height: '320px',
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'grab',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  border: isDropTarget
                    ? `2px dashed ${def.color || '#ffd36b'}`
                    : `1px solid ${typeStyle.borderColor || 'rgba(255,255,255,0.15)'}`,
                  background: isDropTarget ? 'rgba(255, 211, 107, 0.08)' : '#12131e',
                  opacity: isBeingDragged ? 0.45 : 1,
                  transform: isDropTarget ? 'scale(1.02)' : 'none',
                  flexShrink: 0,
                  boxShadow: isDropTarget ? `0 0 15px ${def.color || '#ffd36b'}60` : '0 4px 16px rgba(0,0,0,0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!isBeingDragged) {
                    e.currentTarget.style.transform = isDropTarget ? 'scale(1.02)' : 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.7)';
                    e.currentTarget.style.borderColor = def.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isBeingDragged) {
                    e.currentTarget.style.transform = isDropTarget ? 'scale(1.02)' : 'translateY(0)';
                    e.currentTarget.style.boxShadow = isDropTarget ? `0 0 15px ${def.color || '#ffd36b'}60` : '0 4px 16px rgba(0,0,0,0.4)';
                    e.currentTarget.style.borderColor = isDropTarget ? `2px dashed ${def.color}` : (typeStyle.borderColor || 'rgba(255,255,255,0.15)');
                  }
                }}
              >
                {/* Imagen de fondo completa con enfoque superior (sin decapitar cabezas/rostros) */}
                {card.cover || card.avatarUrl || card.avatar ? (
                  <img 
                    src={card.cover || card.avatarUrl || card.avatar} 
                    alt={card.title || card.name} 
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      zIndex: 1
                    }} 
                  />
                ) : (
                  <div style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: 'linear-gradient(135deg, #181926 0%, #10111a 100%)',
                    zIndex: 1
                  }}>
                    <FontAwesomeIcon icon={def.icon} style={{ color: def.color, opacity: 0.35, fontSize: '3.2rem' }} />
                  </div>
                )}

                {/* Badges superiores flotantes */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  right: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 3,
                  pointerEvents: 'none'
                }}>
                  <span style={{ 
                    background: typeStyle.bg || 'rgba(0,0,0,0.8)', 
                    color: typeStyle.color || '#fff', 
                    border: `1px solid ${typeStyle.borderColor || 'rgba(255,255,255,0.25)'}`, 
                    padding: '2px 8px', 
                    borderRadius: '5px', 
                    fontSize: '0.7rem', 
                    fontWeight: '700', 
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                  }}>
                    {card.type || def.createType}
                  </span>

                  {card.characterRole && (
                    <span style={{ 
                      background: card.characterRole === 'user_persona' ? 'rgba(110, 231, 183, 0.95)' : card.characterRole === 'playable' ? 'rgba(147, 197, 253, 0.95)' : 'rgba(255, 211, 107, 0.95)', 
                      color: '#000', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '0.66rem', 
                      fontWeight: '800',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}>
                      {card.characterRole === 'user_persona' ? '👤 Persona' : card.characterRole === 'playable' ? '🎮 Jugable' : '👥 PNJ'}
                    </span>
                  )}

                  {provenance?.isChild && (
                    <span style={{
                      position: 'absolute',
                      top: '26px',
                      left: '0px',
                      background: 'rgba(129, 140, 248, 0.9)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      backdropFilter: 'blur(6px)'
                    }}>
                      {provenance.formattedLabel}
                    </span>
                  )}
                </div>

                {/* Panel inferior translúcido con gradiente y texto 100% legible */}
                <div style={{ 
                  position: 'relative',
                  zIndex: 2,
                  padding: '12px 10px 10px 10px', 
                  paddingTop: '28px',
                  background: 'linear-gradient(to top, rgba(10, 11, 18, 0.96) 0%, rgba(10, 11, 18, 0.88) 60%, rgba(10, 11, 18, 0.45) 88%, rgba(10, 11, 18, 0) 100%)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px' 
                }}>
                  <h4 style={{ 
                    margin: 0, 
                    color: '#fff', 
                    fontSize: '0.92rem', 
                    fontWeight: '800', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    textShadow: '0 2px 4px rgba(0,0,0,0.85)'
                  }}>
                    {card.title || card.name}
                  </h4>
                  {card.intro ? (
                    <p style={{ 
                      margin: 0, 
                      color: 'rgba(255,255,255,0.85)', 
                      fontSize: '0.74rem', 
                      lineHeight: '1.35', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                    }}>
                      {card.intro}
                    </p>
                  ) : card.description || card.text ? (
                    <p style={{ 
                      margin: 0, 
                      color: 'rgba(255,255,255,0.7)', 
                      fontSize: '0.74rem', 
                      lineHeight: '1.35', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                    }}>
                      {card.description || card.text}
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontStyle: 'italic' }}>
                      Sin introducción
                    </p>
                  )}

                  {/* Acciones Rápidas */}
                  <div style={{ marginTop: '4px', paddingTop: '6px', display: 'flex', gap: '5px', borderTop: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
                    {isScenario && (
                      <button
                        type="button"
                        onClick={() => onStartChatWithCard(card)}
                        style={{ flex: 1, background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '4px 6px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <FontAwesomeIcon icon={faPlay} /> Jugar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenCreateModal(card.type || def.createType, card)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '4px 7px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                      title="Editar ficha"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyCard(card)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '4px 7px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                      title="Duplicar ficha"
                    >
                      <FontAwesomeIcon icon={faClone} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCardRequest(card)}
                      style={{ background: 'rgba(235, 87, 87, 0.15)', border: '1px solid rgba(235, 87, 87, 0.35)', color: '#f87171', padding: '4px 7px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '10px', 
          border: '1px dashed rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
            No hay {def.label.toLowerCase()} creados todavía.
          </span>
          <button
            type="button"
            onClick={() => onOpenCreateModal(def.createType)}
            style={{
              background: 'transparent',
              border: `1px solid ${def.color}50`,
              color: def.color,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            + Crear primer {def.createType}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Galería y Compendio Organizado en Carruseles Horizontales por Tipo.
 */
export default function CreationsGallery({
  filteredCards = [],
  data = {},
  searchQuery = '',
  setSearchQuery,
  sortBy = 'recent',
  setSortBy,
  cardTypeFilter = 'all',
  setCardTypeFilter,
  scenarioCategoryFilter = 'all',
  setScenarioCategoryFilter,
  showChildVersions = false,
  setShowChildVersions,
  onOpenCard,
  onOpenCreateModal,
  onStartChatWithCard,
  onCopyCard,
  onReorderCards,
  onDeleteCardRequest
}) {
  // Determinar si se muestra la vista multilínea categorizada o una sola categoría seleccionada
  const activeRows = cardTypeFilter === 'all'
    ? ROW_DEFINITIONS
    : ROW_DEFINITIONS.filter(r => r.types.some(t => t.toLowerCase() === cardTypeFilter.toLowerCase()));

  return (
    <div>
      {/* Barra Superior de Búsqueda y Filtros */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Buscador de Texto */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, intro o etiquetas..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtro por Tipo de Tarjeta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FontAwesomeIcon icon={faFilter} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }} />
          <select
            value={cardTypeFilter}
            onChange={(e) => setCardTypeFilter(e.target.value)}
            style={{ padding: '7px 10px', background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffd36b', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
          >
            <option value="all">Todos los tipos (Líneas Horizontales)</option>
            <option value="Escenario">Escenarios e Historias</option>
            <option value="Narrador">Narradores</option>
            <option value="Personaje">Personajes</option>
            <option value="Lugar">Lugares</option>
            <option value="Objeto">Objetos</option>
            <option value="Criatura">Criaturas</option>
            <option value="Raza">Razas</option>
            <option value="Facción">Facciones</option>
            <option value="Herramienta">Herramientas de Narrador</option>
            <option value="Memoria">Memorias</option>
            <option value="Inventario">Inventarios</option>
            <option value="Regla">Reglas</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        {/* Filtro por Categoría de Escenario */}
        {cardTypeFilter === 'Escenario' && (
          <select
            value={scenarioCategoryFilter}
            onChange={(e) => setScenarioCategoryFilter(e.target.value)}
            style={{ padding: '7px 10px', background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <option value="all">Todas las categorías</option>
            <option value="Fantasía">Fantasía</option>
            <option value="Ciencia Ficción">Ciencia Ficción</option>
            <option value="Cyberpunk">Cyberpunk</option>
            <option value="Anime">Anime</option>
            <option value="Aventura">Aventura</option>
          </select>
        )}

        {/* Selector de Orden */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FontAwesomeIcon icon={faSortAmountDown} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '7px 10px', background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <option value="custom">Orden Personalizado (Manual)</option>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="type">Por Tipo</option>
          </select>
        </div>

        {/* Toggle Ocultar/Mostrar Versiones Hijo */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={showChildVersions}
            onChange={(e) => setShowChildVersions(e.target.checked)}
            style={{ accentColor: '#ffd36b', cursor: 'pointer' }}
          />
          <span>Mostrar versiones derivadas</span>
        </label>
      </div>

      {/* Renderizado de Carruseles Horizontales Categorizados */}
      {filteredCards.length > 0 || cardTypeFilter === 'all' ? (
        activeRows.map(def => {
          const rowItems = filteredCards.filter(c => {
            const t = (c.type || (c.isScenario ? 'Escenario' : 'Otros')).toLowerCase();
            return def.types.some(dt => dt.toLowerCase() === t);
          });

          // Si hay una búsqueda activa y la fila está vacía, no mostrarla para no saturar
          if (searchQuery.trim() && rowItems.length === 0) {
            return null;
          }

          return (
            <CreationRowSection
              key={def.id}
              def={def}
              items={rowItems}
              onOpenCard={onOpenCard}
              onOpenCreateModal={onOpenCreateModal}
              onStartChatWithCard={onStartChatWithCard}
              onCopyCard={onCopyCard}
              onReorderCards={onReorderCards}
              onDeleteCardRequest={onDeleteCardRequest}
            />
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 12px' }}>
            No se encontraron elementos con los filtros actuales.
          </p>
          <button
            onClick={() => onOpenCreateModal('Personaje')}
            style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '8px 18px', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer' }}
          >
            + Crear Nuevo Elemento
          </button>
        </div>
      )}
    </div>
  );
}
