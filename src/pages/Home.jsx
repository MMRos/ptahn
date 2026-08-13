import React, { useEffect, useMemo, useRef, useState } from 'react';
import sample from '../data/scenarios';
import HeaderSlider from '../components/HeaderSlider';
import SearchBar from '../components/SearchBar';
import ScenarioCard from '../components/ScenarioCard';
import './home.css';

function CategoryCarousel({ title, items, onOpen }) {
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const row = rowRef.current;
    if (!row) return;
    setCanScrollLeft(row.scrollLeft > 8);
    setCanScrollRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 8);
  };

  const scrollByWidth = (direction) => {
    const row = rowRef.current;
    if (!row) return;
    const amount = row.clientWidth * 0.9;
    row.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    updateScrollButtons();
    const onResize = () => updateScrollButtons();
    row.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', onResize);
    return () => {
      row.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', onResize);
    };
  }, [items]);

  return (
    <div className="section">
      <div className="section-header">
        <h3>{title}</h3>
        <div className="section-controls">
          <button className="section-arrow" onClick={() => scrollByWidth('prev')} disabled={!canScrollLeft} aria-label={`Anterior en ${title}`}>
            ‹
          </button>
          <button className="section-arrow" onClick={() => scrollByWidth('next')} disabled={!canScrollRight} aria-label={`Siguiente en ${title}`}>
            ›
          </button>
        </div>
      </div>
      <div className="section-row" ref={rowRef}>
        {items.map(s => (
          <ScenarioCard key={s.id} s={s} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function Home({ onOpenScenario, scenarios = [], cards = [] }){
  const [searchResult, setSearchResult] = useState(null);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);

  // Combinar escenarios de muestra con escenarios y tarjetas del usuario
  const userHistoryCards = (cards || []).filter(c => (c.type || '').toLowerCase() === 'historia').map(c => ({
    id: c.id,
    title: c.title || c.name,
    intro: c.intro || c.text || 'Sin descripción',
    cover: c.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    category: 'Mis Creaciones',
    visits: 1,
    rating: '10.0',
    creatorName: 'Tú',
    public: c.public,
    nsfw: c.nsfw,
    createdAt: c.createdAt
  }));

  const userScenariosMapped = (scenarios || []).map(s => ({
    ...s,
    creatorName: 'Tú'
  }));

  // Lista de mis creaciones propias (públicas y privadas)
  const myCreations = [...userScenariosMapped, ...userHistoryCards];

  // Feeds públicos: excluimos los creados por el usuario que no estén marcados como público
  const publicUserScenarios = userScenariosMapped.filter(s => s.public === true);
  const publicUserCards = userHistoryCards.filter(c => c.public === true);

  const allPublic = useMemo(() => [...publicUserScenarios, ...publicUserCards, ...sample], [publicUserScenarios, publicUserCards]);
  
  const headerItems = myCreations
    .sort((a,b)=> new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 50);
  if (headerItems.length < 50) {
    headerItems.push(...sample.slice(0, 50 - headerItems.length));
  }

  const sections = useMemo(()=>{
    const recent = [...allPublic].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
    const popular = [...allPublic].sort((a,b)=> (b.messagesCount - a.messagesCount) || (b.visits - a.visits)).slice(0,8);
    const byCat = {};
    allPublic.forEach(s=>{ if (!byCat[s.category]) byCat[s.category]=[]; byCat[s.category].push(s); });
    Object.keys(byCat).forEach(cat=> byCat[cat].sort((a,b)=> (b.messagesCount - a.messagesCount) || (b.visits - a.visits)));
    return { recent, popular, byCat };
  }, [allPublic]);

  const doSearch = ({ q, category, sort, nsfw }) => {
    setNsfwAllowed(nsfw);
    let results = allPublic.filter(s => (nsfw || !s.nsfw));
    if (q) {
      const qq = q.toLowerCase();
      results = results.filter(s=> (s.title+ ' '+ s.intro + ' ' + s.content).toLowerCase().includes(qq));
    }
    if (category) results = results.filter(s=> s.category===category);
    if (sort==='recent') results = results.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    if (sort==='popular') results = results.sort((a,b)=> (b.messagesCount - a.messagesCount) || (b.visits - a.visits));
    if (sort==='relevance' && q) {
      const qq=q.toLowerCase();
      results = results.sort((a,b)=> ((b.title+ ' '+ b.intro+ ' '+ b.content).toLowerCase().split(qq).length) - ((a.title+ ' '+ a.intro+ ' '+ a.content).toLowerCase().split(qq).length));
    }
    setSearchResult(results);
  };

  // Filtrar personajes públicos para la fila superior estilo IsekaiZero
  const publicCharacters = useMemo(() => {
    const chars = (cards || []).filter(c => (c.type || '').toLowerCase() === 'personaje');
    if (chars.length === 0) {
      return [
        { id: 'mock-c1', title: 'ADA', intro: 'IA sumisa', cover: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', type: 'Personaje' },
        { id: 'mock-c2', title: 'Ryōko Castellanos', intro: 'Guerrera táctica', cover: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80', type: 'Personaje' },
        { id: 'mock-c3', title: 'Julie joyful', intro: 'Comediante alegre', cover: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=200&q=80', type: 'Personaje' },
        { id: 'mock-c4', title: 'Margaery von Stroheim', intro: 'Princesa mágica', cover: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', type: 'Personaje' },
        { id: 'mock-c5', title: 'Frank frankly', intro: 'Investigador', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', type: 'Personaje' }
      ];
    }
    return chars;
  }, [cards]);

  return (
    <div className="home-page">
      <header className="home-header">
        {/* Fila superior de Personajes Destacados al estilo IsekaiZero */}
        <div className="premium-featured-characters-row">
          <div className="pfc-title-area">
            <h3>Vive la Historia, Siente la Emoción</h3>
            <p>Viaja junto a tus historias y personajes favoritos en aventuras que conmueven tu alma.</p>
          </div>
          <div className="pfc-slider-row">
            {publicCharacters.map(char => (
              <div 
                key={char.id} 
                className="pfc-char-card" 
                onClick={() => onOpenScenario && onOpenScenario({ ...char, category: 'Personaje' })}
              >
                <div className="pfc-char-cover" style={{ backgroundImage: `url(${char.cover})` }} />
                <span className="pfc-char-name">{char.title}</span>
              </div>
            ))}
          </div>
        </div>

        <HeaderSlider items={headerItems} cards={cards} nsfwAllowed={nsfwAllowed} onOpen={onOpenScenario} />
        <SearchBar onSearch={doSearch} />
      </header>

      <section className="home-body">
        {searchResult ? (
          <div className="results-list">
            {searchResult.map(s=> <ScenarioCard key={s.id} s={s} onOpen={onOpenScenario} />)}
          </div>
        ) : (
          <>
            {myCreations.length > 0 && (
              <CategoryCarousel title="Mis Creaciones" items={myCreations} onOpen={onOpenScenario} />
            )}
            <CategoryCarousel title="Recientes" items={sections.recent} onOpen={onOpenScenario} />
            <CategoryCarousel title="Populares" items={sections.popular} onOpen={onOpenScenario} />
            {Object.keys(sections.byCat).map(cat=> (
              <CategoryCarousel key={cat} title={cat} items={sections.byCat[cat]} onOpen={onOpenScenario} />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
