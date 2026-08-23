import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faMobileAlt, faCopy, faCheck, faQrcode, faWifi } from '@fortawesome/free-solid-svg-icons';
import { fetchNetworkInfo } from '../utils/serverApi';

export default function RemoteConnectModal({ isOpen, onClose }) {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchNetworkInfo()
        .then(info => {
          if (info.success) {
            setNetworkInfo(info);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (networkInfo?.url) {
      navigator.clipboard.writeText(networkInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="popup-overlay" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="scenario-popup-card" 
        style={{ 
          maxWidth: '460px', 
          width: '92%', 
          padding: '24px', 
          boxSizing: 'border-box',
          background: 'linear-gradient(145deg, #181926, #12131e)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 211, 107, 0.25)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd36b', fontWeight: 'bold', fontSize: '1.05rem' }}>
            <FontAwesomeIcon icon={faMobileAlt} /> Conectar Móvil o Tablet
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.86rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
          Escanea este código QR con la cámara de tu móvil para acceder a Ptahn conectado directamente a la GPU de este equipo:
        </p>

        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
          {loading ? (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
              <FontAwesomeIcon icon={faQrcode} spin size="2x" />
            </div>
          ) : networkInfo?.qrData ? (
            <img 
              src={networkInfo.qrData} 
              alt="Código QR de Acceso Móvil" 
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.85rem' }}>
              Inicia el servidor con <code>npm run server</code>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.35)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
          <FontAwesomeIcon icon={faWifi} style={{ color: '#6ee7b7' }} />
          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', color: '#ffd36b', textAlign: 'left', wordBreak: 'break-all' }}>
            {networkInfo?.url || 'http://localhost:3001'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copied ? '#6ee7b7' : 'rgba(255,211,107,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              color: copied ? '#000' : '#ffd36b',
              fontWeight: 'bold',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} /> {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>
          Asegúrate de que tu teléfono y tu ordenador estén conectados a la misma red Wi-Fi.
        </div>
      </div>
    </div>
  );
}
