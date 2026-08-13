import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrop, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import './scenario.css';

export default function ImageCropperModal({ 
  isOpen = false, 
  imageSrc = '', 
  aspectRatio = 16 / 9, // 16/9 para horizontales (escenarios), 3/4 para verticales (personajes)
  onClose = () => {}, 
  onCropComplete = () => {} 
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    const targetW = aspectRatio === (16 / 9) ? 800 : 600;
    const targetH = Math.round(targetW / aspectRatio);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    if (img && ctx) {
      try {
        ctx.fillStyle = '#0d0e16';
        ctx.fillRect(0, 0, targetW, targetH);

        // Calcular relación de escala entre la vista previa (300px alto) y el canvas final
        const viewportH = 300;
        const viewportW = viewportH * aspectRatio;
        const scaleFactor = targetW / viewportW;

        // Calcular ancho/alto renderizado de la imagen en el viewport
        const displayedWidth = img.clientWidth || (img.naturalWidth * zoom);
        const displayedHeight = img.clientHeight || (img.naturalHeight * zoom);

        ctx.save();
        // Dibujar imagen escalada a la resolución HD final con la posición exacta elegida
        ctx.drawImage(
          img,
          position.x * scaleFactor,
          position.y * scaleFactor,
          displayedWidth * scaleFactor * zoom,
          displayedHeight * scaleFactor * zoom
        );
        ctx.restore();

        const croppedUrl = canvas.toDataURL('image/jpeg', 0.92);
        onCropComplete(croppedUrl);
      } catch (err) {
        console.warn('Canvas export failed due to cross-origin resource limitations. Falling back to raw image.', err);
        onCropComplete(imageSrc);
      }
    } else {
      onCropComplete(imageSrc);
    }
    onClose();
  };

  return (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1300 }}>
      <div className="char-modal" style={{ width: '580px', background: '#14141f', padding: '20px' }}>
        <button className="char-close" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>

        <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>
          <FontAwesomeIcon icon={faCrop} style={{ color: '#ffd36b', marginRight: '8px' }} />
          Recortar e Inspeccionar Portada
        </h4>

        <div 
          className="cropper-viewport"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: aspectRatio < 1 ? `${300 * aspectRatio}px` : '100%',
            height: '300px',
            margin: '0 auto',
            background: '#000',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '10px',
            cursor: isDragging ? 'grabbing' : 'grab',
            border: '2px dashed rgba(255,211,107,0.4)'
          }}
        >
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="Preview recortes"
            style={{
              position: 'absolute',
              transformOrigin: 'top left',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              maxWidth: 'none',
              transition: isDragging ? 'none' : 'transform 0.1s ease'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Zoom:</span>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleCrop} style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faCheck} /> Aplicar Recorte
          </button>
        </div>
      </div>
    </div>
  );
}
