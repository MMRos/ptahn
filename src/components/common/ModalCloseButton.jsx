import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Botón de cierre 'X' unificado, flotante y anclado por defecto en la esquina superior derecha.
 * Garantiza cumplimiento de la directiva de diseño (esquina superior derecha en todos los modales).
 */
export default function ModalCloseButton({ 
  onClick, 
  title = 'Cerrar (Esc)',
  ariaLabel = 'Cerrar modal',
  top = '10px',
  right = '12px',
  size = '32px',
  fontSize = '16px',
  zIndex = 60,
  style = {} 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      style={{
        position: 'absolute',
        top: top,
        right: right,
        zIndex: zIndex,
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        color: '#ffffff',
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSize,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(6px)',
        padding: 0,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(235, 87, 87, 0.85)';
        e.currentTarget.style.borderColor = '#eb5757';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = style.background || 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.borderColor = style.border || 'rgba(255, 255, 255, 0.18)';
      }}
    >
      <FontAwesomeIcon icon={faTimes} />
    </button>
  );
}
