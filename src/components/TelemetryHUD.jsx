import React, { useState, useEffect, useRef } from 'react';
import { fetchSystemTelemetry } from '../utils/systemTelemetry';
import AILogConsoleModal from './AILogConsoleModal';
import './telemetry.css';

export default function TelemetryHUD({ currentUser = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const dropdownRef = useRef(null);

  // RBAC gate: only admin and it (or sovereign owner Azgael) can see and render this HUD
  const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'it' || currentUser.username === 'Azgael');

  useEffect(() => {
    if (!isAuthorized) return;

    let isMounted = true;

    const poll = async () => {
      try {
        const data = await fetchSystemTelemetry();
        if (isMounted && data) {
          setMetrics(data);
        }
      } catch (err) {}
    };

    poll();
    // Poll every 3 seconds when open, 8 seconds when collapsed
    const intervalTime = isOpen ? 3000 : 8000;
    const interval = setInterval(poll, intervalTime);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthorized, isOpen]);

  // Click outside handler for dropdown only (without closing other app elements)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  if (!isAuthorized) {
    return null;
  }

  const handleToggle = (e) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    setIsOpen(!isOpen);
  };

  const handleDropdownClick = (e) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const handleOpenLogModal = (e) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    setIsLogModalOpen(true);
  };

  // Derive model display string (filter out idle on-demand diffusion from collapsed badge)
  const isOnline = metrics?.success && !metrics?.offline;
  const activeModels = metrics?.models || [];
  const residentModels = activeModels.filter(m => m.engine !== 'DIFFUSION' || m.status === 'generating');
  const modelLabels = residentModels.map(m => m.name || m.id).join(' | ') || (isOnline ? 'Modelos en Espera' : 'Servidor Offline');
  const diffusionStatus = metrics?.engines?.diffusion || {};

  return (
    <div className="telemetry-hud-container" ref={dropdownRef} onClick={handleDropdownClick}>
      {/* Badge Flotante Colapsado */}
      <div
        className="telemetry-hud-badge"
        onClick={handleToggle}
        data-testid="telemetry-hud-badge"
        title="Panel de Telemetría IT & Administrador (Clic para expandir)"
      >
        <span className={`telemetry-led ${isOnline ? '' : 'offline'}`} />
        <span className="telemetry-model-names">{modelLabels}</span>
        <span className={`telemetry-badge-arrow ${isOpen ? 'open' : ''}`}>▾</span>
      </div>

      {/* Desplegable de Telemetría */}
      {isOpen && (
        <div className="telemetry-hud-dropdown" data-testid="telemetry-hud-dropdown" onClick={handleDropdownClick}>
          <div className="telemetry-dropdown-header">
            <div className="telemetry-dropdown-title">
              <span>📊 Telemetría en Vivo</span>
            </div>
            <span className="telemetry-badge-role">{currentUser.role}</span>
          </div>

          {/* Modelos Residentes en Memoria */}
          <div className="telemetry-section">
            <div className="telemetry-section-title">Modelos Residentes en Memoria (LLM / SLM)</div>
            {residentModels.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin modelos de lenguaje activos cargados</div>
            ) : (
              residentModels.map((m, idx) => {
                const engineClass = m.engine === 'STORYTELLER' ? 'storyteller' : (m.engine === 'ORCHESTRATOR' ? 'orchestrator' : (m.engine === 'DIFFUSION' ? 'diffusion' : ''));
                return (
                  <div key={idx} className="telemetry-model-item">
                    <div className="telemetry-model-header">
                      <span className="telemetry-model-title">
                        {m.name}
                        {m.role ? <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'normal' }}>({m.role})</span> : null}
                      </span>
                      <span className={`telemetry-model-type ${engineClass}`}>
                        {m.engine || 'LLM'}
                      </span>
                    </div>
                    <div className="telemetry-model-meta">
                      <span>Estado: 🟢 {m.status === 'loaded' ? 'Cargado en VRAM' : (m.status || 'Activo')}</span>
                      {m.tokensGenerated ? (
                        <span>{m.tokensGenerated.toLocaleString()} tokens ({m.tokPerSec || 0} tok/s)</span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Motor de Difusión (Bajo Demanda) */}
          <div className="telemetry-section">
            <div className="telemetry-section-title">Motor de Difusión (GPU Native)</div>
            <div className="telemetry-model-item">
              <div className="telemetry-model-header">
                <span className="telemetry-model-title">Diffusers / SDXL Worker</span>
                <span className="telemetry-model-type diffusion">DIFFUSION</span>
              </div>
              <div className="telemetry-model-meta">
                <span>
                  Estado: {diffusionStatus.isGenerating 
                    ? `🟢 Generando (${diffusionStatus.activeModel || 'SDXL'})` 
                    : '⚪ En espera (Bajo demanda al generar)'}
                </span>
                <span>{diffusionStatus.availableModelsCount || 0} checkpoints disponibles</span>
              </div>
            </div>
          </div>

          {/* Rejilla de Recursos de Hardware */}
          <div className="telemetry-section-title">Recursos de Hardware</div>
          <div className="telemetry-resource-grid">
            {/* CPU */}
            <div className="telemetry-resource-card">
              <div className="telemetry-resource-label">
                <span>CPU ({metrics?.cpu?.cores || 1} Núcleos)</span>
                <span className="telemetry-resource-val">{metrics?.cpu?.usagePercent || 0}%</span>
              </div>
              <div className="telemetry-progress-bg">
                <div
                  className={`telemetry-progress-fill ${(metrics?.cpu?.usagePercent || 0) > 80 ? 'high' : ''}`}
                  style={{ width: `${Math.min(100, metrics?.cpu?.usagePercent || 0)}%` }}
                />
              </div>
            </div>

            {/* GPU */}
            <div className="telemetry-resource-card">
              <div className="telemetry-resource-label">
                <span>GPU Compute</span>
                <span className="telemetry-resource-val">{metrics?.gpu?.usagePercent || 0}%</span>
              </div>
              <div className="telemetry-progress-bg">
                <div
                  className={`telemetry-progress-fill ${(metrics?.gpu?.usagePercent || 0) > 80 ? 'high' : ''}`}
                  style={{ width: `${Math.min(100, metrics?.gpu?.usagePercent || 0)}%` }}
                />
              </div>
            </div>

            {/* VRAM */}
            <div className="telemetry-resource-card">
              <div className="telemetry-resource-label">
                <span>VRAM ({metrics?.gpu?.vramUsedGB || 0} / {metrics?.gpu?.vramTotalGB || 0} GB)</span>
                <span className="telemetry-resource-val">{metrics?.gpu?.vramPercent || 0}%</span>
              </div>
              <div className="telemetry-progress-bg">
                <div
                  className={`telemetry-progress-fill ${(metrics?.gpu?.vramPercent || 0) > 85 ? 'high' : ''}`}
                  style={{ width: `${Math.min(100, metrics?.gpu?.vramPercent || 0)}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="telemetry-resource-card">
              <div className="telemetry-resource-label">
                <span>RAM ({metrics?.ram?.usedGB || 0} / {metrics?.ram?.totalGB || 0} GB)</span>
                <span className="telemetry-resource-val">{metrics?.ram?.usagePercent || 0}%</span>
              </div>
              <div className="telemetry-progress-bg">
                <div
                  className={`telemetry-progress-fill ${(metrics?.ram?.usagePercent || 0) > 85 ? 'high' : ''}`}
                  style={{ width: `${Math.min(100, metrics?.ram?.usagePercent || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tokens Totales */}
          {metrics?.tokens?.totalTokens > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px', textAlign: 'center' }}>
              ⚡ Total tokens generados en sesión: <strong style={{ color: '#38bdf8' }}>{metrics.tokens.totalTokens.toLocaleString()}</strong> ({metrics.tokens.avgTokPerSec || 0} tok/s)
            </div>
          )}

          {/* Botón de Consola de Logs */}
          <button className="telemetry-logs-btn" onClick={handleOpenLogModal}>
            📑 Abrir Consola de Logs & Comunicación Inter-IA
          </button>
        </div>
      )}

      {/* Modal de Logs Flotante */}
      <AILogConsoleModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
    </div>
  );
}
