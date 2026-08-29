import React, { useState, useEffect, useRef } from 'react';
import './topbar.css';

/**
 * ModelManagerModal.jsx
 * Gestor Integral de Modelos:
 * - Visualización de modelos instalados (.gguf, .safetensors, LoRAs).
 * - Asesor inteligente de compatibilidad de hardware (VRAM / RAM).
 * - Buscador en Hugging Face y catálogo curado 1-Click.
 * - Descargador en streaming con seguimiento de velocidad y ETA.
 * - Importador desde disco duro local.
 */
export default function ModelManagerModal({ isOpen, onClose, onModelLoaded }) {
  const [activeTab, setActiveTab] = useState('installed'); // 'installed' | 'search' | 'import'
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [hardware, setHardware] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const [localPathInput, setLocalPathInput] = useState('');
  const [importMessage, setImportMessage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const pollIntervalRef = useRef(null);

  const fetchInstalledModels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
        setActiveModel(data.activeModel || null);
        if (data.hardware) setHardware(data.hardware);
      }
    } catch (e) {
      console.warn('[ModelManager]: Error fetching models:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch('/api/models/downloads');
      if (res.ok) {
        const data = await res.json();
        setDownloads(data.tasks || []);
      }
    } catch (e) {
      // Silent poll fail
    }
  };

  const handleSearch = async (query = searchQuery, cat = searchCategory) => {
    try {
      setIsSearching(true);
      const res = await fetch(`/api/models/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(cat)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        if (data.hardware) setHardware(data.hardware);
      }
    } catch (e) {
      console.warn('[ModelManager]: Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInstalledModels();
      handleSearch('', 'all');
      fetchDownloads();

      pollIntervalRef.current = setInterval(() => {
        fetchDownloads();
      }, 1500);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleStartDownload = async (model) => {
    try {
      const res = await fetch('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: model.downloadUrl,
          filename: model.id || `${model.name}.gguf`,
          category: model.category || 'llm'
        })
      });
      if (res.ok) {
        fetchDownloads();
        setActiveTab('installed');
      }
    } catch (e) {
      alert(`Error al iniciar la descarga: ${e.message}`);
    }
  };

  const handleCancelDownload = async (taskId) => {
    try {
      await fetch(`/api/models/download/${taskId}/cancel`, { method: 'POST' });
      fetchDownloads();
    } catch (e) { }
  };

  const handleImportLocal = async () => {
    if (!localPathInput.trim()) return;
    try {
      setImportMessage({ type: 'info', text: 'Importando modelo...' });
      const res = await fetch('/api/models/import-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: localPathInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportMessage({ type: 'success', text: data.message });
        setLocalPathInput('');
        fetchInstalledModels();
      } else {
        setImportMessage({ type: 'error', text: data.error || 'Error al importar modelo' });
      }
    } catch (e) {
      setImportMessage({ type: 'error', text: e.message });
    }
  };

  const handleDeleteModel = async (filename) => {
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchInstalledModels();
      }
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    }
  };

  const handleLoadModelIntoVram = async (filename) => {
    try {
      setLoading(true);
      const res = await fetch('/api/models/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName: filename })
      });
      if (res.ok) {
        setActiveModel(filename);
        if (onModelLoaded) onModelLoaded(filename);
      }
    } catch (e) {
      alert(`Error al cargar en VRAM: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeDownloadingTasks = downloads.filter(d => d.status === 'downloading');

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="modal-content model-manager-modal" 
        style={{ 
          maxWidth: '850px', 
          width: '92vw', 
          maxHeight: '82vh', 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: '#13151b', 
          border: '1px solid rgba(255,255,255,0.14)', 
          borderRadius: '16px', 
          color: '#f3f4f6', 
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          position: 'relative',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#f9fafb' }}>Gestor de Modelos e Inteligencia Artificial</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                Gestiona tus modelos locales (.gguf, .safetensors) y descubre nuevos modelos optimizados para tu hardware.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            title="Cerrar ventana (Esc)"
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.12)', 
              borderRadius: '8px', 
              color: '#d1d5db', 
              fontSize: '1.2rem', 
              cursor: 'pointer', 
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* Hardware Status Ribbon */}
        <div style={{ padding: '8px 20px', backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>💻 <strong>RAM del Sistema:</strong> {hardware?.ramGb || 16} GB ({hardware?.freeRamGb || 8} GB libres)</span>
            <span>🎮 <strong>VRAM GPU:</strong> ~{hardware?.vramGb || 12} GB</span>
          </div>
          <span style={{ color: '#6ee7b7', fontSize: '0.78rem' }}>🟢 Motor Nativo en GPU Activo</span>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#181b22', flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('installed')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'installed' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'installed' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'installed' ? '#f9fafb' : '#9ca3af',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📥 Modelos Instalados ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'search' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'search' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'search' ? '#f9fafb' : '#9ca3af',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🌐 Descubrir en Hugging Face
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'import' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'import' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'import' ? '#f9fafb' : '#9ca3af',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📁 Importar desde tu PC
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          
          {/* TAB 1: INSTALLED MODELS */}
          {activeTab === 'installed' && (
            <div>
              {loading && <p style={{ color: '#9ca3af', textAlign: 'center' }}>Cargando modelos instalados...</p>}
              
              {models.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <p style={{ fontSize: '1.2rem', margin: '0 0 8px' }}>No tienes modelos en la carpeta <code>./models/</code></p>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>Usa la pestaña <strong>"Descubrir en Hugging Face"</strong> para descargar tu primer modelo en 1-click o impórtalo desde tu PC.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {models.map(m => {
                  const isLoaded = activeModel === m.filename || activeModel === m.id;
                  const isGguf = m.type === 'llm';

                  return (
                    <div
                      key={m.id || m.filename}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: isLoaded ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                        border: isLoaded ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f3f4f6' }}>{m.filename}</span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: isGguf ? 'rgba(129, 140, 248, 0.2)' : 'rgba(244, 114, 182, 0.2)', color: isGguf ? '#818cf8' : '#f472b6' }}>
                            {isGguf ? 'GGUF (LLM)' : (m.subType === 'checkpoint' ? 'Difusión Base' : 'LoRA')}
                          </span>
                          {isLoaded && (
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
                              ⚡ Activo en VRAM
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>
                          Tamaño: <strong>{m.formattedSize}</strong> {m.hardwareFit?.badgeText && `• ${m.hardwareFit.badgeText}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isGguf && !isLoaded && (
                          <button
                            onClick={() => handleLoadModelIntoVram(m.filename)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#4f46e5',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            Cargar en VRAM
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(m.filename)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#f87171',
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SEARCH HUGGING FACE & CURATED */}
          {activeTab === 'search' && (
            <div>
              {/* Search & Filter Bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Buscar modelos en Hugging Face (ej. Magnum, Nemo, Llama, Pony)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery, searchCategory); }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
                <select
                  value={searchCategory}
                  onChange={(e) => {
                    setSearchCategory(e.target.value);
                    handleSearch(searchQuery, e.target.value);
                  }}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#1f242e',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="all">Todas las Categorías</option>
                  <option value="roleplay">Rol Narrativo / Sin Censura</option>
                  <option value="slm">Orquestador SLM / Herramientas</option>
                  <option value="diffusion">Difusión / Anime</option>
                </select>
                <button
                  onClick={() => handleSearch(searchQuery, searchCategory)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {/* Model Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map(m => {
                  const isAlreadyInstalled = models.some(inst => inst.filename === m.id || inst.id === m.id);

                  return (
                    <div
                      key={m.id || m.name}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#f9fafb' }}>{m.name}</h4>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                              {m.categoryLabel || m.category}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#9ca3af' }}>{m.description}</p>
                        </div>

                        {/* Download button or Already Installed tag */}
                        <div>
                          {isAlreadyInstalled ? (
                            <span style={{ fontSize: '0.82rem', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              ✓ Instalado
                            </span>
                          ) : (
                            <button
                              onClick={() => handleStartDownload(m)}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: '#10b981',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              ⬇️ Descargar ({m.formattedSize})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hardware compatibility & Tags ribbon */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {m.tags && m.tags.map(t => (
                            <span key={t} style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#d1d5db' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                        {m.hardwareFit && (
                          <span style={{ color: m.hardwareFit.color || '#6ee7b7', fontWeight: 500 }}>
                            {m.hardwareFit.badgeText} ({m.hardwareFit.recommendation})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT FROM LOCAL PC */}
          {activeTab === 'import' && (
            <div style={{ padding: '10px 0' }}>
              <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '12px' }}>
                Si ya tienes modelos <code>.gguf</code> o <code>.safetensors</code> descargados en tu disco duro (ej: en carpetas de LM Studio, Ollama, ComfyUI o Descargas), puedes importarlos directamente sin tener que descargarlos de nuevo:
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Pega la ruta absoluta (ej. D:\Modelos\mi-modelo-favorito.gguf)"
                  value={localPathInput}
                  onChange={(e) => setLocalPathInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  onClick={handleImportLocal}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Importar
                </button>
              </div>

              {importMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: importMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: importMessage.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  color: importMessage.type === 'success' ? '#6ee7b7' : '#f87171',
                  fontSize: '0.85rem'
                }}>
                  {importMessage.text}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Active Downloads Drawer at the bottom */}
        {activeDownloadingTasks.length > 0 && (
          <div style={{ padding: '12px 20px', backgroundColor: '#1e1b4b', borderTop: '1px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeDownloadingTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#e0e7ff' }}>⬇️ Descargando: {t.filename}</span>
                    <span style={{ color: '#a5b4fc' }}>{t.percent}% ({t.formattedDownloaded} / {t.formattedTotal}) • {t.speedMbS} MB/s {t.etaSeconds > 0 ? `• ETA: ${t.etaSeconds}s` : ''}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${t.percent}%`, height: '100%', backgroundColor: '#6366f1', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelDownload(t.id)}
                  style={{ padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
            <div style={{ backgroundColor: '#1e2029', padding: '20px', borderRadius: '12px', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <h4 style={{ margin: '0 0 8px', color: '#f87171' }}>¿Eliminar este modelo?</h4>
              <p style={{ fontSize: '0.85rem', color: '#d1d5db', margin: '0 0 16px' }}>
                Estás a punto de borrar <strong>{deleteConfirm}</strong> del disco local. Esta acción liberará espacio de almacenamiento.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteModel(deleteConfirm)}
                  style={{ padding: '8px 16px', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
