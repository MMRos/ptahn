import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCrop, 
  faCheck, 
  faTimes, 
  faSearchPlus, 
  faSearchMinus, 
  faCompress, 
  faExpand,
  faExclamationTriangle,
  faUpload,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { calculateViewportDimensions, computeBaseFit, exportCroppedCanvas } from '../utils/imageCropUtils';
import './scenario.css';

export default function ImageCropperModal({ 
  isOpen = false, 
  imageSrc = '', 
  aspectRatio = 16 / 9, // 16/9 para horizontales (escenarios), 3/4 para verticales (personajes)
  onClose = () => {}, 
  onCropComplete = () => {} 
}) {
  const [currentSrc, setCurrentSrc] = useState(imageSrc);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ width: 0, height: 0 });
  const [baseFit, setBaseFit] = useState({ scale: 1, width: 0, height: 0, initX: 0, initY: 0 });
  const [imgError, setImgError] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [manualUrlInput, setManualUrlInput] = useState('');
  
  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  // Determinar dimensiones del viewport de recorte según la relación de aspecto
  const { viewportWidth, viewportHeight } = calculateViewportDimensions(aspectRatio, 480, 360);

  // Inicializar y centrar la imagen completa dentro del viewport cuando se carga
  const resetToFit = useCallback((natW, natH) => {
    const w = natW || imgNatural.width;
    const h = natH || imgNatural.height;
    if (!w || !h) return;

    const fit = computeBaseFit(w, h, viewportWidth, viewportHeight);
    setBaseFit(fit);
    setZoom(1);
    setPosition({ x: fit.initX, y: fit.initY });
  }, [viewportWidth, viewportHeight, imgNatural.width, imgNatural.height]);

  const handleImageLoad = (e) => {
    setIsImgLoading(false);
    setImgError(false);
    const natW = e.target.naturalWidth || 800;
    const natH = e.target.naturalHeight || 600;
    setImgNatural({ width: natW, height: natH });
    resetToFit(natW, natH);
  };

  const handleImageError = () => {
    setIsImgLoading(false);
    setImgError(true);
  };

  useEffect(() => {
    if (isOpen && imageSrc) {
      setCurrentSrc(imageSrc);
      setImgError(false);
      setIsImgLoading(true);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc, aspectRatio]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    if (imgError) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || imgError) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (imgError) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1 || imgError) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  // Zoom con rueda de ratón centrado
  const handleWheel = (e) => {
    if (imgError) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(prev => {
      const nextZoom = Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.8), 5.0);
      return nextZoom;
    });
  };

  // Botón para llenar todo el marco (cover zoom)
  const handleFillFrame = () => {
    if (!baseFit.width || !baseFit.height || imgError) return;
    const fillZoom = Math.max(viewportWidth / baseFit.width, viewportHeight / baseFit.height);
    const newZoom = Number(fillZoom.toFixed(2));
    const currentW = baseFit.width * newZoom;
    const currentH = baseFit.height * newZoom;
    setZoom(newZoom);
    setPosition({
      x: (viewportWidth - currentW) / 2,
      y: (viewportHeight - currentH) / 2
    });
  };

  const handleCrop = () => {
    if (imgError) {
      onCropComplete(currentSrc || imageSrc);
      onClose();
      return;
    }

    const img = imgRef.current;
    const croppedUrl = exportCroppedCanvas({
      img,
      position,
      baseFit,
      zoom,
      viewportWidth,
      aspectRatio
    });

    if (croppedUrl) {
      onCropComplete(croppedUrl);
    } else {
      onCropComplete(currentSrc || imageSrc);
    }
    onClose();
  };

  const renderedWidth = baseFit.width ? baseFit.width * zoom : 'auto';
  const renderedHeight = baseFit.height ? baseFit.height * zoom : 'auto';

  return (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 20000 }}>
      <div className="char-modal" style={{ maxWidth: '580px', width: '92%', background: '#14141f', padding: '22px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>

        
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ color: '#ffd36b', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FontAwesomeIcon icon={faCrop} />
            Recortar y Encuadrar Imagen {aspectRatio < 1 ? '(Vertical 3:4)' : '(Panorámica 16:9)'}
          </h4>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0' }}>
          Arrastra para mover la imagen o amplíala para encuadrar la zona que desees. La imagen inicia completa.
        </p>

        {/* Viewport del Recorte */}
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
            borderRadius: '10px',
            cursor: imgError ? 'default' : (isDragging ? 'grabbing' : 'grab'),
            border: '2px dashed rgba(255, 211, 107, 0.45)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
        >
          {isImgLoading && !imgError && (
            <div style={{ color: '#ffd36b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 5 }}>
              <FontAwesomeIcon icon={faSpinner} spin /> Cargando imagen...
            </div>
          )}

          {imgError ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.85)', zIndex: 10, maxWidth: '400px', width: '90%' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#ff9f6b', fontSize: '1.8rem', marginBottom: '6px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffd36b', marginBottom: '4px' }}>
                No se pudo cargar la imagen
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                El servidor local aún está procesando o la URL no es accesible.
              </div>

              {/* Botón de subida local */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => document.getElementById('cropper-recovery-file-input')?.click()}
                  style={{
                    background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                    border: 'none',
                    color: '#000',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FontAwesomeIcon icon={faUpload} /> Cargar imagen del PC
                </button>
                <input
                  id="cropper-recovery-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setCurrentSrc(reader.result);
                        setImgError(false);
                        setIsImgLoading(true);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                {/* Input de URL manual alternativo */}
                <div style={{ display: 'flex', width: '100%', maxWidth: '320px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={manualUrlInput}
                    onChange={(e) => setManualUrlInput(e.target.value)}
                    placeholder="O pega una URL de imagen..."
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      background: '#1a1a28',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '5px 0 0 5px',
                      color: '#fff',
                      fontSize: '0.74rem'
                    }}
                  />
                  <button
                    type="button"
                    disabled={!manualUrlInput.trim()}
                    onClick={() => {
                      if (manualUrlInput.trim()) {
                        setCurrentSrc(manualUrlInput.trim());
                        setImgError(false);
                        setIsImgLoading(true);
                      }
                    }}
                    style={{
                      background: manualUrlInput.trim() ? 'rgba(255,211,107,0.2)' : 'rgba(255,255,255,0.05)',
                      color: manualUrlInput.trim() ? '#ffd36b' : 'rgba(255,255,255,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderLeft: 'none',
                      borderRadius: '0 5px 5px 0',
                      padding: '0 10px',
                      cursor: manualUrlInput.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.74rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Usar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <img 
              ref={imgRef}
              src={currentSrc} 
              alt="Preview recortes"
              onLoad={handleImageLoad}
              onError={handleImageError}
              crossOrigin="anonymous"
              draggable={false}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: typeof renderedWidth === 'number' ? `${renderedWidth}px` : renderedWidth,
                height: typeof renderedHeight === 'number' ? `${renderedHeight}px` : renderedHeight,
                maxWidth: 'none',
                maxHeight: 'none',
                pointerEvents: 'none',
                display: isImgLoading ? 'none' : 'block',
                transition: isDragging ? 'none' : 'width 0.05s ease, height 0.05s ease'
              }}
            />
          )}
        </div>

        {/* Controles de Zoom y Ajuste Rápido */}
        <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <button 
              type="button" 
              onClick={() => setZoom(prev => Math.max(Number((prev - 0.1).toFixed(2)), 0.8))} 
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
              title="Reducir zoom"
            >
              <FontAwesomeIcon icon={faSearchMinus} />
            </button>
            
            <input 
              type="range" 
              min="0.8" 
              max="4.0" 
              step="0.05" 
              value={zoom} 
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#ffd36b' }}
            />
            
            <button 
              type="button" 
              onClick={() => setZoom(prev => Math.min(Number((prev + 0.1).toFixed(2)), 4.0))} 
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
              title="Aumentar zoom"
            >
              <FontAwesomeIcon icon={faSearchPlus} />
            </button>
            
            <span style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: 'bold', minWidth: '45px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => resetToFit()}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#eaeaea',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FontAwesomeIcon icon={faCompress} /> Ver completa (100% Fit)
            </button>
            <button
              type="button"
              onClick={handleFillFrame}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#eaeaea',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '0.75rem',
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

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.2)', 
              color: '#fff', 
              padding: '8px 16px', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleCrop} 
            style={{ 
              background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', 
              border: 'none', 
              color: '#000', 
              fontWeight: '700', 
              padding: '8px 20px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <FontAwesomeIcon icon={faCheck} /> Aplicar Recorte
          </button>
        </div>
      </div>
    </div>
  );
}
