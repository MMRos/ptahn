import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faEye } from '@fortawesome/free-solid-svg-icons';
import '../pages/home.css';

export default function ScenarioCard({ s, onOpen }){
  const coverUrl = s.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';

  return (
    <article className="scenario-card-visual" onClick={() => onOpen && onOpen(s)} role="button" tabIndex={0}>
      <div 
        className="sc-card-cover" 
        style={{ backgroundImage: `linear-gradient(180deg, rgba(5,7,18,0.2) 0%, rgba(5,7,18,0.85) 100%), url(${coverUrl})` }}
      >
        <span className="sc-badge-nsfw">18+</span>
      </div>
      
      <div className="sc-card-body">
        <h3 className="sc-card-title">{s.title || 'Sin título'}</h3>
        <div className="sc-card-author">Por @{s.creatorName || 'Autor Ptah'}</div>
        <p className="sc-card-intro">{s.intro || 'Sin descripción previa.'}</p>
        
        <div className="sc-card-stats">
          <span><FontAwesomeIcon icon={faEye} /> {s.visits || 0}</span>
          <span><FontAwesomeIcon icon={faStar} style={{ color: '#ffd36b' }} /> {s.rating || '10.0'}</span>
        </div>
      </div>
    </article>
  );
}
