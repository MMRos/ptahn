import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faVolumeMute, faVolumeUp, faChevronLeft, faChevronRight, faEye, faComment, faHeart, faBookmark, faStar } from '@fortawesome/free-solid-svg-icons';
import './headerSlider.css';

export default function HeaderSlider({ items = [], cards = [], nsfwAllowed = false, onOpen }){
  const slides = items.filter(s => nsfwAllowed || !s.nsfw).slice(0,50)
    .sort((a,b)=> (b.messagesCount - a.messagesCount) || (b.visits - a.visits));
  const [index, setIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const timer = useRef(null);

  useEffect(()=>{
    timer.current = setInterval(()=>{
      setIndex(i => (i+1) % (slides.length || 1));
    }, 12000);
    return ()=> clearInterval(timer.current);
  },[slides.length]);

  if (!slides.length) return null;

  const current = slides[index] || slides[0];

  const go = (dir, e) => {
    e.stopPropagation();
    setIndex(i => {
      if (dir==='next') return (i+1)%slides.length;
      return (i-1+slides.length)%slides.length;
    });
    clearInterval(timer.current);
  };

  const coverUrl = current.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80';

  // Obtener personajes de reparto enlazados al escenario
  const castCharacters = (current.cards || []).map(cardId => {
    return (cards || []).find(c => c.id === cardId && (c.type || '').toLowerCase() === 'personaje');
  }).filter(Boolean);

  // Reparto por defecto si el escenario no tiene personajes conectados para asegurar estética premium
  const fallbackCast = [
    { id: 'f-c1', title: 'Rin Hokta', cover: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80' },
    { id: 'f-c2', title: 'Aria von A.', cover: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=100&q=80' },
    { id: 'f-c3', title: 'Clara Lind', cover: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=100&q=80' }
  ];

  const actualCast = castCharacters.length > 0 ? castCharacters : fallbackCast;

  return (
    <div className="isekai-spotlight-slider" onClick={() => onOpen && onOpen(current)}>
      {/* Botones de navegación del Slider */}
      <button className="spotlight-arrow left" onClick={(e) => go('prev', e)} aria-label="Anterior">
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <button className="spotlight-arrow right" onClick={(e) => go('next', e)} aria-label="Siguiente">
        <FontAwesomeIcon icon={faChevronRight} />
      </button>

      <div className="spotlight-content-container">
        {/* LADO IZQUIERDO: Simulador de Tráiler / Portada interactiva */}
        <div className="spotlight-media-side">
          <div className="spotlight-video-sim" style={{ backgroundImage: `url(${coverUrl})` }}>
            <div className="spotlight-video-overlay">
              <div className="play-trailer-btn">
                <FontAwesomeIcon icon={faPlay} className="trailer-play-icon" />
              </div>
              <button 
                className="mute-trailer-btn" 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              >
                <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} /> 
                <span style={{ marginLeft: '6px' }}>{isMuted ? 'Toca para activar sonido' : 'Sonido Activo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Metadata y Ficha Técnica del Escenario */}
        <div className="spotlight-info-side">
          <div className="spotlight-author">@{current.creatorName || 'knightartorias'}</div>
          
          <h2 className="spotlight-title">{current.title}</h2>
          
          <p className="spotlight-desc">{current.intro || current.text || 'El destino te ha asignado un papel secundario en esta historia de fantasía heroica. ¿Aceptarás tu rol o forjarás tu propio camino?'}</p>
          
          {/* Fila de estadísticas */}
          <div className="spotlight-stats-bar">
            <span><FontAwesomeIcon icon={faEye} /> {current.visits ? `${(current.visits / 1000).toFixed(1)}K` : '518K'}</span>
            <span><FontAwesomeIcon icon={faComment} /> {current.messagesCount || '3.1K'}</span>
            <span><FontAwesomeIcon icon={faHeart} /> 792</span>
            <span><FontAwesomeIcon icon={faBookmark} /> 1.5K</span>
            <span><FontAwesomeIcon icon={faStar} /> 4</span>
          </div>

          <div style={{ margin: '14px 0' }}>
            <button className="novela-visual-badge">Novela Visual</button>
          </div>

          {/* Bloque Reparto */}
          <div className="spotlight-cast-section">
            <div className="cast-header">REPARTO</div>
            <div className="cast-list">
              {actualCast.map(char => (
                <div key={char.id} className="cast-member-bubble">
                  <img src={char.cover} alt={char.title} className="cast-avatar" />
                  <span className="cast-name">{char.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categorías / Etiquetas */}
          <div className="spotlight-tags-row">
            <span className="tag-pill category-pill">{current.category || 'Fantasía'}</span>
            {(current.tags || ['Comedia', 'Academia', 'Romance', 'SlowBurn']).slice(0, 5).map(tag => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
