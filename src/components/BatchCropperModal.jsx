import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheck, 
  faTimes, 
  faSearchPlus, 
  faSearchMinus, 
  faCompress, 
  faExpand, 
  faImages, 
  faStar, 
  faArrowLeft, 
  faArrowRight, 
  faSmile
} from '@fortawesome/free-solid-svg-icons';
import { calculateViewportDimensions, computeBaseFit, exportCroppedCanvas } from '../utils/imageCropUtils';
import './scenario.css';

const QUICK_LABELS = ['Normal', 'Alegre', 'Enfadado', 'Triste', 'Sorprendido', 'Armadura', 'Combate', 'Gala', 'Casual'];

export default function BatchCropperModal({
  isOpen = false,
  items = [], // Array de { id, originalSrc, label, isDefault }
  aspectRatio = 3 / 4, // 3/4 para personajes
  onClose = () => {},
  onSaveBatch = () => {}
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchItems, setBatchItems] = useState([]);
  const [cropStates, setCropStates] = useState({}); // { [id]: { zoom, position, baseFit, imgNatural, label, isDefault } }
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  // Dimensiones del viewport de recorte
  const { viewportWidth, viewportHeight } = calculateViewportDimensions(aspectRatio, 480, 360);

  // Inicializar estado cuando se abre el modal con nuevos items
  useEffect(() => {
    if (isOpen && items && items.length > 0) {
      setBatchItems(items);
      setCurrentIndex(0);
      
      const initialCropStates = {};
      items.forEach((it, idx) => {
        initialCropStates[it.id] = {
          zoom: 1,
          position: { x: 0, y: 0 },
          baseFit: { scale: 1, width: 0, height: 0, initX: 0, initY: 0 },
          imgNatural: { width: 0, height: 0 },
          label: it.label || (idx === 0 ? 'Normal / Principal' : `Expresión ${idx + 1}`),
          isDefault: it.isDefault !== undefined ? it.isDefault : (idx === 0),
          isConfigured: false
        };
      });
      setCropStates(initialCropStates);
    }
  }, [isOpen, items]);

  const activeItem = batchItems[currentIndex] || null;
  const activeCropState = (activeItem && cropStates[activeItem.id]) ? cropStates[activeItem.id] : null;

  // Calcular ajuste 100% de la imagen dentro del marco
  const computeFit = useCallback((natW, natH) => {
    return computeBaseFit(natW, natH, viewportWidth, viewportHeight);
  }, [viewportWidth, viewportHeight]);

  const handleImageLoad = (e) => {
    if (!activeItem) return;
    const natW = e.target.naturalWidth || 800;
    const natH = e.target.naturalHeight || 600;
    const baseFit = computeFit(natW, natH);

    setCropStates(prev => {
      const current = prev[activeItem.id] || {};
      // Si ya tenía baseFit configurado, conservamos la posición y zoom
      if (current.isConfigured && current.baseFit?.width) {
        return prev;
      }
      return {
        ...prev,
        [activeItem.id]: {
          ...current,
          imgNatural: { width: natW, height: natH },
          baseFit: baseFit || current.baseFit,
          zoom: 1,
          position: baseFit ? { x: baseFit.initX, y: baseFit.initY } : { x: 0, y: 0 },
          isConfigured: true
        }
      };
    });
  };

  if (!isOpen || !batchItems || batchItems.length === 0) return null;

  // Manejo de Arrastre (Pan)
  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!activeCropState) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - activeCropState.position.x, y: e.clientY - activeCropState.position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !activeCropState || !activeItem) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        position: { x: newX, y: newY }
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1 && activeCropState) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - activeCropState.position.x, y: touch.clientY - activeCropState.position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1 || !activeCropState || !activeItem) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        position: { x: newX, y: newY }
      }
    }));
  };

  // Zoom con rueda del ratón
  const handleWheel = (e) => {
    e.preventDefault();
    if (!activeCropState || !activeItem) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.min(Math.max(Number((activeCropState.zoom + delta).toFixed(2)), 0.8), 5.0);
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        zoom: nextZoom
      }
    }));
  };

  // Ajustes rápidos de Zoom
  const resetToFit = () => {
    if (!activeCropState?.baseFit?.width || !activeItem) return;
    const { baseFit } = activeCropState;
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        zoom: 1,
        position: { x: baseFit.initX, y: baseFit.initY }
      }
    }));
  };

  const handleFillFrame = () => {
    if (!activeCropState?.baseFit?.width || !activeItem) return;
    const { baseFit } = activeCropState;
    const fillZoom = Math.max(viewportWidth / baseFit.width, viewportHeight / baseFit.height);
    const newZoom = Number(fillZoom.toFixed(2));
    const currentW = baseFit.width * newZoom;
    const currentH = baseFit.height * newZoom;
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        zoom: newZoom,
        position: {
          x: (viewportWidth - currentW) / 2,
          y: (viewportHeight - currentH) / 2
        }
      }
    }));
  };

  // Actualizar etiqueta
  const updateActiveLabel = (newLabel) => {
    if (!activeItem) return;
    setCropStates(prev => ({
      ...prev,
      [activeItem.id]: {
        ...prev[activeItem.id],
        label: newLabel
      }
    }));
  };

  // Establecer como default
  const setActiveAsDefault = () => {
    if (!activeItem) return;
    setCropStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], isDefault: k === activeItem.id };
      });
      return next;
    });
  };

  // Eliminar una imagen del lote
  const handleRemoveItem = (itemId, e) => {
    if (e) e.stopPropagation();
    if (batchItems.length <= 1) {
      alert('El lote debe tener al menos una imagen. Para cancelar, usa el botón Cancelar.');
      return;
    }
    const filtered = batchItems.filter(it => it.id !== itemId);
    setBatchItems(filtered);
    if (currentIndex >= filtered.length) {
      setCurrentIndex(Math.max(0, filtered.length - 1));
    }
  };

  // Generar recorte de una imagen individual a través de Canvas HD
  const generateSingleCrop = (item, state) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const baseFit = state.baseFit?.width ? state.baseFit : computeFit(img.naturalWidth, img.naturalHeight);
        const croppedUrl = exportCroppedCanvas({
          img,
          position: state.position || { x: baseFit?.initX || 0, y: baseFit?.initY || 0 },
          baseFit: baseFit || { width: viewportWidth, height: viewportHeight },
          zoom: state.zoom || 1,
          viewportWidth,
          aspectRatio
        });
        resolve(croppedUrl || item.originalSrc);
      };
      img.onerror = () => resolve(item.originalSrc);
      img.src = item.originalSrc;
    });
  };

  // Guardar todo el lote completo
  const handleSaveAll = async () => {
    setIsProcessing(true);
    try {
      const results = [];
      for (let i = 0; i < batchItems.length; i++) {
        const it = batchItems[i];
        const state = cropStates[it.id] || {};
        const croppedUrl = await generateSingleCrop(it, state);
        results.push({
          id: it.id || `img-${Date.now()}-${i}`,
          url: croppedUrl,
          label: state.label?.trim() || it.label?.trim() || (i === 0 ? 'Normal / Principal' : `Expresión ${i + 1}`),
          isDefault: !!state.isDefault
        });
      }

      // Asegurar que al menos una es default
      if (results.length > 0 && !results.some(r => r.isDefault)) {
        results[0].isDefault = true;
      }

      onSaveBatch(results);
      onClose();
    } catch (err) {
      console.error('Error saving batch images:', err);
      alert('Hubo un problema al procesar las imágenes del lote.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderedWidth = activeCropState?.baseFit?.width ? activeCropState.baseFit.width * (activeCropState.zoom || 1) : 'auto';
  const renderedHeight = activeCropState?.baseFit?.height ? activeCropState.baseFit.height * (activeCropState.zoom || 1) : 'auto';

  return (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1600 }}>
      <div 
        className="char-modal" 
        style={{ 
          maxWidth: '720px', 
          width: '95%', 
          background: '#14141f', 
          padding: '20px', 
          borderRadius: '16px', 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 25px 70px rgba(0,0,0,0.95)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h4 style={{ color: '#ffd36b', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faImages} />
              Recorte y Preparación en Lote ({currentIndex + 1} de {batchItems.length})
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
              Encuadra cada imagen, asigna su emoción/identificador y guárdalas todas a la vez.
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Tira / Cola de Miniaturas Superior */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '8px 6px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '12px',
          scrollbarWidth: 'thin'
        }}>
          {batchItems.map((item, idx) => {
            const state = cropStates[item.id] || {};
            const isSelected = idx === currentIndex;
            return (
              <div
                key={item.id || idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  minWidth: '70px',
                  width: '70px',
                  height: '92px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '2px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
              >
                {/* Badge de Portada */}
                {state.isDefault && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    background: '#ffd36b',
                    color: '#000',
                    fontSize: '0.55rem',
                    fontWeight: 'bold',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    zIndex: 3
                  }}>
                    ★
                  </div>
                )}

                {/* Botón Borrar imagen de la cola */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(item.id, e)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#ff6b6b',
                    border: 'none',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3
                  }}
                  title="Quitar esta imagen del lote"
                >
                  ×
                </button>

                {/* Imagen */}
                <div 
                  style={{
                    flex: 1,
                    backgroundImage: `url(${item.originalSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#0a0a12'
                  }}
                />

                {/* Etiqueta / Nombre */}
                <div style={{
                  fontSize: '0.62rem',
                  color: isSelected ? '#ffd36b' : '#fff',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  padding: '2px 4px',
                  background: '#14141f',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {state.label || `Img ${idx + 1}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Área Principal de Recorte y Configuración */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Viewport del Recorte 3:4 */}
          <div 
            ref={viewportRef}
            className="cropper-viewport"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
            style={{
              width: `${viewportWidth}px`,
              height: `${viewportHeight}px`,
              maxWidth: '100%',
              margin: '0 auto',
              background: '#0a0a12',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              cursor: isDragging ? 'grabbing' : 'grab',
              border: '2px dashed rgba(255, 211, 107, 0.45)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
              display: 'flex',
              userSelect: 'none'
            }}
          >
            {activeItem && (
              <img 
                ref={imgRef}
                key={activeItem.id}
                src={activeItem.originalSrc} 
                alt="Recorte en lote"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${activeCropState?.position?.x || 0}px`,
                  top: `${activeCropState?.position?.y || 0}px`,
                  width: typeof renderedWidth === 'number' ? `${renderedWidth}px` : renderedWidth,
                  height: typeof renderedHeight === 'number' ? `${renderedHeight}px` : renderedHeight,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  pointerEvents: 'none',
                  transition: isDragging ? 'none' : 'width 0.05s ease, height 0.05s ease'
                }}
              />
            )}
          </div>

          {/* Controles de Zoom y Ajuste */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button 
                type="button" 
                onClick={() => {
                  if (!activeCropState || !activeItem) return;
                  const nextZ = Math.max(Number(((activeCropState.zoom || 1) - 0.1).toFixed(2)), 0.8);
                  setCropStates(prev => ({ ...prev, [activeItem.id]: { ...prev[activeItem.id], zoom: nextZ } }));
                }} 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Reducir zoom"
              >
                <FontAwesomeIcon icon={faSearchMinus} />
              </button>
              
              <input 
                type="range" 
                min="0.8" 
                max="4.0" 
                step="0.05" 
                value={activeCropState?.zoom || 1} 
                onChange={(e) => {
                  if (!activeItem) return;
                  const val = Number(e.target.value);
                  setCropStates(prev => ({ ...prev, [activeItem.id]: { ...prev[activeItem.id], zoom: val } }));
                }}
                style={{ flex: 1, accentColor: '#ffd36b' }}
              />
              
              <button 
                type="button" 
                onClick={() => {
                  if (!activeCropState || !activeItem) return;
                  const nextZ = Math.min(Number(((activeCropState.zoom || 1) + 0.1).toFixed(2)), 4.0);
                  setCropStates(prev => ({ ...prev, [activeItem.id]: { ...prev[activeItem.id], zoom: nextZ } }));
                }} 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Aumentar zoom"
              >
                <FontAwesomeIcon icon={faSearchPlus} />
              </button>
              
              <span style={{ fontSize: '0.75rem', color: '#ffd36b', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                {Math.round((activeCropState?.zoom || 1) * 100)}%
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={resetToFit}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#eaeaea',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faCompress} /> 100% Fit
              </button>
              <button
                type="button"
                onClick={handleFillFrame}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#eaeaea',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faExpand} /> Llenar marco
              </button>
            </div>
          </div>

          {/* Formulario de Etiquetado y Portada para la imagen activa */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#ffd36b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faSmile} /> Identificador / Emoción / Traje de esta imagen:
              </label>
              
              {/* Botón de Portada */}
              <button
                type="button"
                onClick={setActiveAsDefault}
                style={{
                  background: activeCropState?.isDefault ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: activeCropState?.isDefault ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                  color: activeCropState?.isDefault ? '#ffd36b' : 'rgba(255,255,255,0.6)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faStar} /> {activeCropState?.isDefault ? '⭐ Portada Principal' : 'Hacer Portada'}
              </button>
            </div>

            <input
              type="text"
              value={activeCropState?.label || ''}
              onChange={(e) => updateActiveLabel(e.target.value)}
              placeholder="Ej: Alegre, Enfadado, Con armadura, Batalla..."
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#1e1e2c',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '0.8rem',
                boxSizing: 'border-box',
                marginBottom: '8px'
              }}
            />

            {/* Chips de sugerencias rápidas */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginRight: '2px' }}>Sugerencias:</span>
              {QUICK_LABELS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => updateActiveLabel(tag)}
                  style={{
                    background: activeCropState?.label === tag ? 'rgba(255, 211, 107, 0.25)' : 'rgba(255,255,255,0.04)',
                    border: activeCropState?.label === tag ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.08)',
                    color: activeCropState?.label === tag ? '#ffd36b' : 'rgba(255,255,255,0.7)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    cursor: 'pointer'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Barra de Acciones Inferior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Navegación Anterior / Siguiente */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Anterior
            </button>
            <button
              type="button"
              disabled={currentIndex === batchItems.length - 1}
              onClick={() => setCurrentIndex(prev => Math.min(batchItems.length - 1, prev + 1))}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: currentIndex === batchItems.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: currentIndex === batchItems.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Siguiente <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>

          {/* Cancelar y Guardar todo el lote */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              onClick={onClose} 
              style={{ 
                background: 'transparent', 
                border: '1px solid rgba(255,255,255,0.2)', 
                color: '#fff', 
                padding: '7px 14px', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Cancelar
            </button>
            <button 
              type="button"
              disabled={isProcessing}
              onClick={handleSaveAll} 
              style={{ 
                background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', 
                border: 'none', 
                color: '#000', 
                fontWeight: '700', 
                padding: '7px 18px', 
                borderRadius: '6px', 
                cursor: isProcessing ? 'wait' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                fontSize: '0.82rem',
                boxShadow: '0 4px 15px rgba(255, 211, 107, 0.25)'
              }}
            >
              <FontAwesomeIcon icon={faCheck} /> {isProcessing ? 'Procesando...' : `Guardar ${batchItems.length} Imágenes`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
