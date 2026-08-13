import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEdit, 
  faUserPlus, 
  faHeart, 
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import ASSET_LIBRARY from '../data/assets';
import './profile.css';

export default function Profile({ appData = {}, onNavigate, onOpenChat, onOpenScenario }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState('Creador Ptah');
  const [profileBio, setProfileBio] = useState('Escritor y creador de mundos interactivos de rol.');
  const [coverUrl, setCoverUrl] = useState(ASSET_LIBRARY.fantasia[0].url);
  const [avatarUrl] = useState('');

  // Estadísticas reales
  const followersCount = 0;
  const followingCount = 0;
  
  // Combinar escenarios del estado appData con las tarjetas creadas por el usuario de tipo Historia
  const userScenarios = [
    ...(appData.scenarios || []),
    ...(appData.cards || []).filter(c => (c.type || '').toLowerCase() === 'historia')
  ];
  const scenariosCount = userScenarios.length;

  const mockFavorites = (appData.scenarios || []).slice(0, 5);
  const mockAuthors = [];

  return (
    <div className="profile-page-redesigned">
      {/* 1. Portada como cabecera con avatar e info */}
      <div 
        className="profile-cover-banner"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(13, 14, 22, 0.4) 0%, rgba(13, 14, 22, 0.95) 100%), url(${coverUrl})` }}
      >
        <div className="banner-top-actions">
          <button className="edit-profile-btn" onClick={() => setIsEditing(!isEditing)}>
            <FontAwesomeIcon icon={faEdit} /> {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
          </button>
        </div>

        <div className="profile-banner-bottom">
          <div className="avatar-container">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder"><FontAwesomeIcon icon={faUser} /></div>
            )}
          </div>
          <div className="profile-names">
            <h2>{profileName}</h2>
            <p>{profileBio}</p>
          </div>
        </div>
      </div>

      {/* Editor de Perfil si está activado */}
      {isEditing && (
        <div className="profile-edit-box">
          <div className="edit-field">
            <label>Nombre de Creador</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </div>
          <div className="edit-field">
            <label>Biografía</label>
            <input value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
          </div>
          <div className="edit-field">
            <label>Imagen de Portada (Seleccionar de Librería o URL)</label>
            <select onChange={(e) => setCoverUrl(e.target.value)} value={coverUrl}>
              <optgroup label="Fantasía">
                {ASSET_LIBRARY.fantasia.map(img => <option key={img.id} value={img.url}>{img.title}</option>)}
              </optgroup>
              <optgroup label="Moderno">
                {ASSET_LIBRARY.moderno.map(img => <option key={img.id} value={img.url}>{img.title}</option>)}
              </optgroup>
              <optgroup label="Cyberpunk">
                {ASSET_LIBRARY.cyberpunk.map(img => <option key={img.id} value={img.url}>{img.title}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {/* 2. Metadatos (Seguidores, Seguidos, Escenarios) */}
      <div className="profile-meta-row">
        <div className="meta-item">
          <strong>{followersCount}</strong>
          <span>Seguidores</span>
        </div>
        <div className="meta-item">
          <strong>{followingCount}</strong>
          <span>Seguidos</span>
        </div>
        <div className="meta-item">
          <strong>{scenariosCount}</strong>
          <span>Escenarios creados</span>
        </div>
      </div>

      {/* 3. Lista horizontal de sus Creaciones */}
      <div className="profile-carousel-section">
        <div className="psection-header">
          <h3><FontAwesomeIcon icon={faLayerGroup} /> Mis Creaciones Modulares</h3>
        </div>
        <div className="pcarousel-row">
          {userScenarios.length === 0 ? (
            <div className="empty-pcarousel">No has creado ningún escenario aún.</div>
          ) : (
            userScenarios.map(sc => (
              <div key={sc.id} className="pcard-item" onClick={() => onOpenScenario && onOpenScenario(sc)}>
                <div className="pcard-cover" style={{ backgroundImage: `url(${sc.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'})` }} />
                <div className="pcard-info">
                  <h4>{sc.title || sc.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <small>{sc.category || sc.type || 'Escenario'}</small>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: sc.public ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: sc.public ? '#ffd36b' : 'rgba(255,255,255,0.4)',
                      border: sc.public ? '1px solid rgba(255, 211, 107, 0.25)' : '1px solid rgba(255,255,255,0.08)'
                    }}>
                      {sc.public ? 'Público' : 'Privado'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Lista horizontal de Favoritos */}
      <div className="profile-carousel-section">
        <div className="psection-header">
          <h3><FontAwesomeIcon icon={faHeart} /> Escenarios Favoritos</h3>
        </div>
        <div className="pcarousel-row">
          {mockFavorites.length === 0 ? (
            <div className="empty-pcarousel">No tienes escenarios marcados como favoritos.</div>
          ) : (
            mockFavorites.map(sc => (
              <div key={sc.id} className="pcard-item" onClick={() => onOpenScenario && onOpenScenario(sc)}>
                <div className="pcard-cover" style={{ backgroundImage: `url(${sc.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'})` }} />
                <div className="pcard-info">
                  <h4>{sc.title}</h4>
                  <small>{sc.category}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Lista horizontal de Autores Seguidos */}
      <div className="profile-carousel-section">
        <div className="psection-header">
          <h3><FontAwesomeIcon icon={faUserPlus} /> Autores Seguidos</h3>
        </div>
        <div className="pcarousel-row">
          {mockAuthors.map((auth, i) => (
            <div key={i} className="pauthor-item">
              <div className="pauthor-avatar"><FontAwesomeIcon icon={faUser} /></div>
              <div className="pauthor-info">
                <h4>{auth.name}</h4>
                <small>{auth.role}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
