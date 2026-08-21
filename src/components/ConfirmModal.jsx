import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, 
  faTrashAlt, 
  faExclamationTriangle, 
  faQuestionCircle, 
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

export default function ConfirmModal({
  isOpen,
  title = '¿Confirmar acción?',
  message = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'rewind'
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel && onCancel();
      } else if (e.key === 'Enter') {
        onConfirm && onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const iconMap = {
    danger: { icon: faTrashAlt, color: '#eb5757', bg: 'rgba(235, 87, 87, 0.12)' },
    rewind: { icon: faHistory, color: '#ffd36b', bg: 'rgba(255, 211, 107, 0.12)' },
    info: { icon: faQuestionCircle, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
    warning: { icon: faExclamationTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
  };

  const currentType = iconMap[type] || iconMap.warning;

  return (
    <div 
      className="confirm-modal-overlay" 
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeInOverlay 0.15s ease-out'
      }}
    >
      <div 
        className="confirm-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#14141f',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 0, 0, 0.5)',
          borderRadius: '14px',
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          position: 'relative',
          color: '#eaeaea',
          animation: 'scaleInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'color 0.2s'
          }}
          title="Cerrar (Esc)"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div 
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: currentType.bg,
              color: currentType.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0
            }}
          >
            <FontAwesomeIcon icon={currentType.icon} />
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>
              {title}
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.45' }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: type === 'danger' 
                ? 'linear-gradient(135deg, #eb5757, #c0392b)' 
                : 'linear-gradient(135deg, #ffd36b, #ff9f6b)',
              border: 'none',
              color: type === 'danger' ? '#fff' : '#14141f',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: type === 'danger' ? '0 4px 14px rgba(235, 87, 87, 0.35)' : '0 4px 14px rgba(255, 211, 107, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faCheck} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
