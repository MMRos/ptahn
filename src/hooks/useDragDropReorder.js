import { useState, useCallback } from 'react';

// Seguimiento en memoria global del arrastre activo para garantizar funcionamiento 100% confiable
// independiente de cómo restrinja el navegador los MIME types personalizados en dragover.
let currentDrag = null;

/**
 * Hook modular para reordenamiento de tarjetas mediante Drag and Drop nativo de HTML5,
 * con aislamiento estricto de área (sourceAreaId === targetAreaId) para prevenir transferencias
 * accidentales entre diferentes filas o listas.
 *
 * Incluye diferimiento de la opacidad fantasma para que la imagen arrastrada se vea nítida
 * y opaca en lugar de desvanecida/transparente.
 *
 * @param {Object} options
 * @param {Array} options.items - Lista de elementos del contenedor.
 * @param {Function} options.onReorder - Callback (newItems, movedItem, fromIndex, toIndex) => void.
 * @param {string} options.areaId - Identificador único del área/fila.
 * @returns {Object} { draggedIndex, dragOverIndex, getItemProps }
 */
export function useDragDropReorder({ items = [], onReorder, areaId = 'default-area' }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = useCallback((index, e) => {
    currentDrag = {
      areaId,
      fromIndex: index,
      item: items[index]
    };

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.setData('application/ptahn-area-id', areaId);
    }

    // Diferir el estado local al siguiente tick de eventos para permitir que el navegador capture
    // la tarjeta completamente opaca y nítida como imagen fantasma de arrastre (drag ghost)
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  }, [areaId, items]);

  const handleDragOver = useCallback((index, e) => {
    e.preventDefault();

    // Comprobar si el arrastre activo pertenece a esta misma área
    const isSameArea = currentDrag ? currentDrag.areaId === areaId : true;

    if (e.dataTransfer) {
      if (isSameArea) {
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    } else if (isSameArea) {
      setDragOverIndex(index);
    }
  }, [areaId]);

  const handleDragLeave = useCallback((index, e) => {
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((toIndex, e) => {
    e.preventDefault();
    setDragOverIndex(null);
    setDraggedIndex(null);

    // Aislamiento estricto de área
    const dtArea = e.dataTransfer?.getData ? e.dataTransfer.getData('application/ptahn-area-id') : null;
    const sourceArea = dtArea || currentDrag?.areaId;

    if (sourceArea && sourceArea !== areaId) {
      currentDrag = null;
      return;
    }

    const dtFromStr = e.dataTransfer?.getData ? e.dataTransfer.getData('text/plain') : null;
    let fromIndex = dtFromStr ? parseInt(dtFromStr, 10) : NaN;
    if (isNaN(fromIndex) && currentDrag) {
      fromIndex = currentDrag.fromIndex;
    }

    currentDrag = null;

    if (isNaN(fromIndex) || fromIndex < 0 || fromIndex >= items.length) return;
    if (fromIndex === toIndex) return;

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);

    if (typeof onReorder === 'function') {
      onReorder(nextItems, movedItem, fromIndex, toIndex);
    }
  }, [items, onReorder, areaId]);

  const handleDragEnd = useCallback(() => {
    currentDrag = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const getItemProps = useCallback((index) => ({
    draggable: true,
    onDragStart: (e) => handleDragStart(index, e),
    onDragOver: (e) => handleDragOver(index, e),
    onDragLeave: (e) => handleDragLeave(index, e),
    onDrop: (e) => handleDrop(index, e),
    onDragEnd: handleDragEnd,
    'data-drag-index': index,
    'data-drag-area': areaId
  }), [handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd, areaId]);

  return {
    draggedIndex,
    dragOverIndex,
    getItemProps
  };
}

export default useDragDropReorder;
