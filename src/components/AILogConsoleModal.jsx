import React, { useState, useEffect, useRef } from 'react';
import { getAILogs, clearAILogs, subscribeToAILogs } from '../utils/aiLogEmitter';
import './telemetry.css';

export default function AILogConsoleModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initial load
    setLogs(getAILogs());

    // Subscribe to live log emissions
    const unsubscribe = subscribeToAILogs((newLog, allLogs) => {
      setLogs([...allLogs]);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleWindowClick = (e) => {
    e.stopPropagation();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'ALL' || log.type === filter || log.from === filter || log.to === filter;
    const matchesSearch = !searchTerm || 
      (log.summary && log.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.from && log.from.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.to && log.to.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.payload && JSON.stringify(log.payload).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleCopyLogs = (e) => {
    e.stopPropagation();
    const textTrace = filteredLogs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.from} -> ${l.to}] [${l.type}]: ${l.summary}${l.payload ? `\nPayload: ${JSON.stringify(l.payload, null, 2)}` : ''}`).join('\n\n');
    navigator.clipboard.writeText(textTrace);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleExportJSON = (e) => {
    e.stopPropagation();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ptahn-ai-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    clearAILogs();
    setLogs([]);
  };

  return (
    <div className="ai-logs-modal-backdrop" onClick={handleBackdropClick} data-testid="ai-logs-modal">
      <div className="ai-logs-modal-window" onClick={handleWindowClick}>
        {/* Header */}
        <div className="ai-logs-header">
          <div className="ai-logs-title">
            <span>🛠️ Consola de Logs & Comunicación entre IAs</span>
          </div>
          <div className="ai-logs-header-actions">
            <button
              className="ai-logs-action-btn"
              onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
              title={isPaused ? 'Reanudar auto-scroll' : 'Pausar auto-scroll'}
            >
              {isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
            </button>
            <button className="ai-logs-action-btn" onClick={handleClear} title="Limpiar historial de logs">
              🗑️ Limpiar
            </button>
            <button className="ai-logs-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Cerrar consola">
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar de Filtros y Búsqueda */}
        <div className="ai-logs-toolbar">
          <div className="ai-logs-filter-group">
            <span className="ai-logs-filter-label">Filtro de Motor:</span>
            <select
              className="ai-logs-select"
              value={filter}
              onChange={(e) => { e.stopPropagation(); setFilter(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="ALL">Todos los Agentes</option>
              <option value="STORYTELLER">Storyteller LLM</option>
              <option value="CARD_EXTRACTOR">Extractor de Tarjetas</option>
              <option value="PROMPT_TRANSLATION">Traductor Visual SDXL</option>
              <option value="DIFFUSION_TASK">Difusión GPU Nativa</option>
              <option value="TTS_AUDIO">Síntesis de Voz TTS</option>
              <option value="ERROR">Errores</option>
            </select>
          </div>

          <input
            type="text"
            className="ai-logs-search-input"
            placeholder="Buscar en logs o payloads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Cuerpo de Logs */}
        <div className="ai-logs-body" ref={logContainerRef}>
          {filteredLogs.length === 0 ? (
            <div className="ai-logs-empty">
              No hay trazas registradas todavía. Envía un mensaje en el chat o genera una imagen para ver el flujo inter-IA en tiempo real.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`ai-log-entry ${log.type}`}>
                <div className="ai-log-top">
                  <span className="ai-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="ai-log-tag">{log.type}</span>
                  <span className="ai-log-route">[{log.from} ➔ {log.to}]</span>
                </div>
                <div className="ai-log-summary">{log.summary}</div>
                {log.payload && (
                  <div className="ai-log-payload-preview">
                    {typeof log.payload === 'object' ? JSON.stringify(log.payload, null, 2) : String(log.payload)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="ai-logs-footer">
          <div>
            <span>{filteredLogs.length} eventos mostrados</span>
            {isPaused && <span style={{ color: '#f59e0b', marginLeft: '10px' }}>(Auto-scroll pausado)</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="ai-logs-action-btn" onClick={handleCopyLogs}>
              {copiedStatus ? '✓ Copiado' : '📋 Copiar Traza'}
            </button>
            <button className="ai-logs-action-btn" onClick={handleExportJSON}>
              💾 Exportar JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
