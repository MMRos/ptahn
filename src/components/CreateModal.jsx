import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import ConnectionSelector from './ConnectionSelector';
import ImageCropperModal from './ImageCropperModal';
import NarratorForm from './NarratorForm';
import '../pages/create.css';

const CARD_TYPES = ['Historia', 'Personaje', 'Raza', 'Facción', 'Regla', 'Criatura', 'Objeto', 'Lugar', 'Otros'];
const CATEGORIES = [
  'Acción',
  'Anime',
  'AU (Universo Alternativo)',
  'Aventura',
  'Ciencia Ficción',
  'Ciencia Ficción Dura',
  'Comedia',
  'Cyberpunk',
  'Drama',
  'Erótico',
  'Espacial',
  'Fantasía',
  'Fantasía Épica',
  'Furry',
  'Histórico',
  'Maduro (+18)',
  'Misterio',
  'OC (Personaje Original)',
  'Omegaverse',
  'Post-Apocalíptico',
  'Romance',
  'Romance Dramático',
  'Slice of Life',
  'Steampunk',
  'Suspenso / Thriller',
  'Terror',
  'Terror Psicológico'
].sort((a, b) => a.localeCompare(b));

const CHARACTER_TRAITS = [
  'Alegre',
  'Alfa',
  'Antagonista',
  'Astuto',
  'Beta',
  'Bufón',
  'Calmado',
  'Carismático',
  'Creador',
  'Dandere',
  'Delta',
  'Deredere',
  'Enigma',
  'Enigmático',
  'Extrovertido',
  'Gobernante',
  'Héroe',
  'Himere',
  'Impulsivo',
  'Inteligente',
  'Introvertido',
  'Kuudere',
  'Leal',
  'Ligón',
  'Maternal',
  'Mentor',
  'Miedoso',
  'Omega',
  'Protector',
  'Rebelde',
  'Romántico',
  'Sabio',
  'Solitario',
  'Tímido',
  'Triste',
  'Tsundere',
  'Valiente',
  'Yandere',
  'Zalamero'
].sort((a, b) => a.localeCompare(b));

const SUGGESTED_TAGS = [
  'AU (Universo Alternativo)',
  'Anime',
  'Angustia',
  'Cyberpunk',
  'Dead Dove: Do Not Eat',
  'Drogas',
  'Erótico',
  'Fantasía',
  'Fluff',
  'Furry',
  'Gore',
  'Hurt/Comfort',
  'Maduro (+18)',
  'Magia',
  'Misterio',
  'OC (Personaje Original)',
  'Omegaverse',
  'Reencarnación',
  'Romance',
  'Viaje en el Tiempo',
  'Violencia'
].sort((a, b) => a.localeCompare(b));

export default function CreateModal({
  isOpen = false,
  onClose = () => { },
  initialType = 'Historia', // Puede ser 'Escenario', 'Narrador' o un tipo de CARD_TYPES
  appData = {},
  onSaveItem = () => { },
  editItem = null // Si viene un objeto, estamos editando
}) {
  const [itemType, setItemType] = useState(initialType);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // States para Tarjeta y Escenario
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState(CATEGORIES[0]);
  const [intro, setIntro] = useState('');
  const [text, setText] = useState('');
  const [cover, setCover] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [isScenario, setIsScenario] = useState(false); // Para "convertir tarjeta en escenario" al crear

  // States para rasgos de personaje (Traits)
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [traitQuery, setTraitQuery] = useState('');
  const [showTraitDropdown, setShowTraitDropdown] = useState(false);

  // States para etiquetas (Tags)
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagQuery, setTagQuery] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // States específicos para Escenario
  const [presentation, setPresentation] = useState('');
  const [baseContext, setBaseContext] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [scenarioNarrator, setScenarioNarrator] = useState('');

  // States para Narrador
  const [bio, setBio] = useState('');
  const [style, setStyle] = useState('');
  const [tone, setTone] = useState('');
  const [rules, setRules] = useState('');
  const [randomization, setRandomization] = useState('');

  // Crop state inside modal
  const [cropSrc, setCropSrc] = useState('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // States para creación de tarjeta anidada (in-situ)
  const [nestedCardType, setNestedCardType] = useState(null);
  const [nestedCardTitle, setNestedCardTitle] = useState('');
  const [nestedCardIntro, setNestedCardIntro] = useState('');
  const [nestedCardText, setNestedCardText] = useState('');
  const [nestedCardCover, setNestedCardCover] = useState('');
  const [nestedCardTraits, setNestedCardTraits] = useState([]);
  const [nestedTraitQuery, setNestedTraitQuery] = useState('');
  const [showNestedTraitDropdown, setShowNestedTraitDropdown] = useState(false);

  // Sincronizar estados cuando se abre el modal o cambia el item a editar
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Determinamos el modo a partir del tipo del item o la estructura
        if (initialType === 'Narrador' || editItem.bio !== undefined) {
          setItemType('Narrador');
          setTitle(editItem.name || '');
          setBio(editItem.bio || '');
          setStyle(editItem.style || '');
          setTone(editItem.tone || '');
          setRules(editItem.rules || '');
          setRandomization(editItem.randomization || '');
        } else if (initialType === 'Escenario' || editItem.id?.startsWith('scenario-')) {
          setItemType('Escenario');
          setTitle(editItem.title || '');
          const catVal = editItem.category || '';
          setCategory(catVal);
          setCategoryQuery(catVal);
          setIntro(editItem.intro || '');
          setCover(editItem.cover || '');
          setPresentation(editItem.presentation || '');
          setBaseContext(editItem.baseContext || '');
          setAiInstructions(editItem.aiInstructions || '');
          setSelectedTags(editItem.tags || []);
          setSelectedCards(editItem.cards || []);
          setScenarioNarrator(editItem.narrator || '');
          setIsPublic(!!editItem.public);
          setIsScenario(false);
        } else {
          // Es una Tarjeta
          setItemType(editItem.type || CARD_TYPES[0]);
          setTitle(editItem.title || '');
          setIntro(editItem.intro || '');
          setText(editItem.text || '');
          setCover(editItem.cover || '');
          setNsfw(!!editItem.nsfw);
          setSelectedTags(editItem.tags || []);
          setSelectedCards(editItem.connectedCards || []);
          setSelectedTraits(editItem.traits || []);
          setIsPublic(!!editItem.public);
          setIsScenario(false);
        }
      } else {
        // Nuevo elemento
        setItemType(initialType);
        setTitle('');
        setCategory('');
        setCategoryQuery('');
        setIntro('');
        setCover('');
        setPresentation('');
        setBaseContext('');
        setAiInstructions('');
        setSelectedTags([]);
        setSelectedCards([]);
        setSelectedTraits([]);
        setScenarioNarrator('');
        setIsScenario(false);
        setNsfw(false);
        setIsPublic(false);

        // Narrador vacíos
        setBio('');
        setStyle('');
        setTone('');
        setRules('');
        setRandomization('');
      }
      setIsDirty(false);
      setShowUnsavedWarning(false);
    }
  }, [isOpen, editItem, initialType]);

  if (!isOpen) return null;

  const isWide = itemType === 'Escenario' || itemType === 'Narrador';

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('El nombre o título es obligatorio.');
      return;
    }

    if (itemType === 'Narrador') {
      const narratorData = {
        id: editItem ? editItem.id : `narrator-${Date.now()}`,
        name: trimmedTitle,
        bio: bio.trim(),
        style: style.trim(),
        tone: tone.trim(),
        rules: rules.trim(),
        randomization: randomization.trim(),
        createdAt: editItem ? editItem.createdAt : new Date().toISOString()
      };
      onSaveItem({ type: 'narrator', data: narratorData, isEdit: !!editItem });
    } else if (itemType === 'Escenario') {
      const scenarioData = {
        id: editItem ? editItem.id : `scenario-${Date.now()}`,
        title: trimmedTitle,
        category: category,
        intro: intro.trim(),
        cover: cover.trim(),
        presentation: presentation.trim(),
        baseContext: baseContext.trim(),
        aiInstructions: aiInstructions.trim(),
        tags: selectedTags,
        nsfw: nsfw,
        public: isPublic,
        cards: selectedCards,
        narrator: scenarioNarrator || null,
        createdAt: editItem ? editItem.createdAt : new Date().toISOString()
      };
      onSaveItem({ type: 'scenario', data: scenarioData, isEdit: !!editItem });
    } else {
      // Es tipo de tarjeta
      const cardData = {
        id: editItem ? editItem.id : `card-${Date.now()}`,
        type: itemType,
        title: trimmedTitle,
        intro: intro.trim(),
        text: text.trim(),
        cover: cover.trim(),
        nsfw: nsfw,
        tags: selectedTags,
        connectedCards: selectedCards,
        traits: itemType === 'Personaje' ? selectedTraits : [],
        public: isPublic,
        createdAt: editItem ? editItem.createdAt : new Date().toISOString()
      };

      let scenarioData = null;
      if (isScenario) {
        scenarioData = {
          id: `scenario-from-card-${Date.now()}`,
          title: trimmedTitle,
          category: 'Aventura',
          intro: intro.trim() || text.trim().substring(0, 80) + '...',
          cover: cover.trim(),
          presentation: '',
          baseContext: `[${itemType}]: ${text.trim()}`,
          aiInstructions: '',
          tags: selectedTags,
          nsfw: nsfw,
          public: isPublic,
          cards: [cardData.id],
          narrator: null,
          createdAt: new Date().toISOString()
        };
      }
      onSaveItem({ type: 'card', data: cardData, createScenarioAlso: scenarioData, isEdit: !!editItem });
    }

    setIsDirty(false);
    onClose();
  };

  const handleSaveNestedCard = () => {
    const trimmedTitle = nestedCardTitle.trim();
    if (!trimmedTitle) {
      alert('El nombre de la tarjeta es obligatorio.');
      return;
    }
    const newCard = {
      id: `card-${Date.now()}`,
      type: nestedCardType,
      title: trimmedTitle,
      intro: nestedCardIntro.trim(),
      text: nestedCardText.trim(),
      cover: nestedCardCover.trim(),
      nsfw: false,
      public: false,
      tags: [],
      connectedCards: [],
      traits: nestedCardType === 'Personaje' ? nestedCardTraits : [],
      createdAt: new Date().toISOString()
    };
    // Guardar globalmente
    onSaveItem({ type: 'card', data: newCard, isEdit: false });
    // Conectar al escenario actual
    setSelectedCards(prev => [...prev, newCard.id]);
    setIsDirty(true);
    // Limpiar estados y cerrar sub-modal
    setNestedCardType(null);
    setNestedCardTitle('');
    setNestedCardIntro('');
    setNestedCardText('');
    setNestedCardCover('');
    setNestedCardTraits([]);
  };

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseAttempt();
    }
  };

  const handleFieldChange = (setter, val) => {
    setter(val);
    setIsDirty(true);
  };

  const renderTagsInput = () => {
    return (
      <div className="field-group" style={{ position: 'relative' }}>
        <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Etiquetas (Tags - Máx. 5)</label>
        
        {/* Listado de tags agregados */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', marginTop: '4px' }}>
          {selectedTags.length === 0 ? (
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Sin etiquetas agregadas aún.</span>
          ) : (
            selectedTags.map(t => (
              <span
                key={t}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '0.78rem',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags(prev => prev.filter(x => x !== t));
                    setIsDirty(true);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: '0.8rem', fontWeight: 'bold' }}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* Input con dropdown autocomplete para Tags */}
        {selectedTags.length < 5 && (
          <div style={{ position: 'relative' }}>
            <input
              value={tagQuery}
              onChange={(e) => {
                setTagQuery(e.target.value);
                setShowTagDropdown(true);
              }}
              onFocus={() => setShowTagDropdown(true)}
              onBlur={() => {
                setTimeout(() => setShowTagDropdown(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagQuery.trim()) {
                  e.preventDefault();
                  const val = tagQuery.trim();
                  if (!selectedTags.includes(val) && selectedTags.length < 5) {
                    setSelectedTags(prev => [...prev, val]);
                    setTagQuery('');
                    setIsDirty(true);
                  }
                }
              }}
              placeholder="Escribe o selecciona una etiqueta..."
              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
            />
            {showTagDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#14141f',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                zIndex: 100,
                maxHeight: '150px',
                overflowY: 'auto',
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {SUGGESTED_TAGS.filter(tg => 
                  tg.toLowerCase().includes(tagQuery.toLowerCase()) && !selectedTags.includes(tg)
                ).map(tg => (
                  <div
                    key={tg}
                    onMouseDown={() => {
                      setSelectedTags(prev => [...prev, tg]);
                      setTagQuery('');
                      setShowTagDropdown(false);
                      setIsDirty(true);
                    }}
                    style={{
                      padding: '8px 10px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {tg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1200 }} onClick={handleBackdropClick}>
      <div className="char-modal" style={{
        width: isWide ? '80vw' : '100%',
        maxWidth: isWide ? '1200px' : '580px',
        maxHeight: '88vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          zIndex: 10
        }}>
          {/* Fila superior: Guardar y X */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleSave} 
              style={{
                background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                border: 'none',
                color: '#000',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FontAwesomeIcon icon={faSave} /> Guardar
            </button>
            <button 
              onClick={handleCloseAttempt} 
              aria-label="Cerrar modal"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px'
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          {/* Fila inferior: Público y NSFW debajo de la X */}
          {itemType !== 'Narrador' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {/* Checkbox Público */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <input
                  type="checkbox"
                  id="headerPublicCheck"
                  checked={isPublic}
                  onChange={(e) => handleFieldChange(setIsPublic, e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#ffd36b' }}
                />
                <label htmlFor="headerPublicCheck" style={{ cursor: 'pointer', color: '#ffd36b', fontWeight: '700', fontSize: '0.8rem', userSelect: 'none' }}>
                  Público
                </label>
              </div>

              {/* Checkbox NSFW */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <input
                  type="checkbox"
                  id="headerNsfwCheck"
                  checked={nsfw}
                  onChange={(e) => handleFieldChange(setNsfw, e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#ffd36b' }}
                />
                <label htmlFor="headerNsfwCheck" style={{ cursor: 'pointer', color: '#ffd36b', fontWeight: '700', fontSize: '0.8rem', userSelect: 'none' }}>
                  NSFW
                </label>
              </div>
            </div>
          )}
        </div>

        <h3 style={{ margin: '0 0 24px 0', color: '#ffffff', fontSize: '1.4rem' }}>
          {editItem ? 'Editar' : 'Crear'} {itemType === 'Escenario' ? 'Escenario' : itemType === 'Narrador' ? 'Narrador' : 'Tarjeta'}
        </h3>

        {/* Formulario de Narrador */}
        {itemType === 'Narrador' && (
          <NarratorForm
            name={title}
            setName={(v) => handleFieldChange(setTitle, v)}
            bio={bio}
            setBio={(v) => handleFieldChange(setBio, v)}
            style={style}
            setStyle={(v) => handleFieldChange(setStyle, v)}
            tone={tone}
            setTone={(v) => handleFieldChange(setTone, v)}
            rules={rules}
            setRules={(v) => handleFieldChange(setRules, v)}
            randomization={randomization}
            setRandomization={(v) => handleFieldChange(setRandomization, v)}
          />
        )}

        {/* Formularios de Tarjeta y Escenario */}
        {itemType !== 'Narrador' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* 1. Imagen de portada y Previsualización AL INICIO */}
            <div className="field-group" style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Imagen de portada</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Caja de previsualización */}
                <div style={{
                  width: itemType === 'Personaje' ? '90px' : '150px',
                  height: itemType === 'Personaje' ? '120px' : '85px',
                  borderRadius: '6px',
                  background: cover ? `url(${cover}) center/cover no-repeat` : 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.72rem',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {!cover && <span>Sin portada</span>}
                </div>
                
                {/* Inputs de carga */}
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', position: 'relative' }}>
                    <input
                      value={cover}
                      onChange={(e) => handleFieldChange(setCover, e.target.value)}
                      placeholder="https://... o ruta local de imagen"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        background: '#1e1e2c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px 0 0 6px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        borderRight: 'none',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('cover-file-input').click()}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderLeft: 'none',
                        color: '#fff',
                        padding: '0 16px',
                        borderRadius: '0 6px 6px 0',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        transition: 'background 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                      Seleccionar archivo
                    </button>
                    <input
                      id="cover-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setCropSrc(reader.result);
                            setIsCropperOpen(true);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                    Introduce la URL de una imagen o sube un archivo local.
                  </span>
                </div>
              </div>
            </div>

            {/* Si es una Tarjeta, mostramos selector de tipos de tarjeta */}
            {itemType !== 'Escenario' && (
              <div className="field-group">
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Tipo de tarjeta</label>
                <select
                  value={itemType}
                  onChange={(e) => handleFieldChange(setItemType, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff' }}
                >
                  {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Checkbox opcional para duplicar como Escenario al CREAR una tarjeta */}
            {!editItem && itemType !== 'Escenario' && (
              <div className="checkbox-item" style={{ marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  id="modalCardScenarioCheck"
                  checked={isScenario}
                  onChange={e => handleFieldChange(setIsScenario, e.target.checked)}
                />
                <label htmlFor="modalCardScenarioCheck" style={{ cursor: 'pointer', color: '#ffd36b', fontWeight: '600', fontSize: '0.85rem' }}>
                  Convertir y crear como Escenario jugable también
                </label>
              </div>
            )}

            {/* Campo común: Título/Nombre */}
            <div className="field-group">
              <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                {itemType === 'Escenario' ? 'Título del escenario' : 'Nombre de la tarjeta'}
              </label>
              <input
                value={title}
                onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                placeholder={itemType === 'Escenario' ? 'Ej. El Santuario Perdido...' : 'Ej. Espada Rúnica, Mago de la Torre...'}
                style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            {/* Categoría, Narrador y Etiquetas (Solo para Escenario) */}
            {itemType === 'Escenario' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Categoría</label>
                    <input
                      value={categoryQuery}
                      onChange={(e) => {
                        setCategoryQuery(e.target.value);
                        setCategory(e.target.value);
                        setShowCategoryDropdown(true);
                        setIsDirty(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCategoryDropdown(false), 200);
                      }}
                      placeholder="Escribe o selecciona categoría..."
                      style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                    />
                    {showCategoryDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#14141f',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        zIndex: 100,
                        maxHeight: '150px',
                        overflowY: 'auto',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}>
                        {CATEGORIES.filter(cat => cat.toLowerCase().includes((categoryQuery || '').toLowerCase())).map(cat => (
                          <div
                            key={cat}
                            onMouseDown={() => {
                              setCategory(cat);
                              setCategoryQuery(cat);
                              setShowCategoryDropdown(false);
                              setIsDirty(true);
                            }}
                            style={{
                              padding: '8px 10px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="field-group">
                    <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Narrador asignado</label>
                    <select
                      value={scenarioNarrator}
                      onChange={(e) => handleFieldChange(setScenarioNarrator, e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff' }}
                    >
                      <option value="">Ninguno</option>
                      {(appData.narrators || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Etiquetas de Escenario (Ubicadas debajo de Categoría) */}
                <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                  {renderTagsInput()}
                </div>
              </>
            )}

            {/* Si es Personaje, hilera de Traits */}
            {itemType === 'Personaje' && (
              <div className="field-group" style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>Rasgos de Personalidad (Traits - Máx. 10)</label>
                
                {/* Listado de traits agregados */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', marginTop: '4px' }}>
                  {selectedTraits.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Sin rasgos agregados aún.</span>
                  ) : (
                    selectedTraits.map(t => (
                      <span
                        key={t}
                        style={{
                          background: 'rgba(255, 211, 107, 0.12)',
                          border: '1px solid rgba(255, 211, 107, 0.3)',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '0.78rem',
                          color: '#ffd36b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTraits(prev => prev.filter(x => x !== t));
                            setIsDirty(true);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', padding: 0, fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input con dropdown autocomplete para Traits */}
                {selectedTraits.length < 10 && (
                  <div style={{ position: 'relative' }}>
                    <input
                      value={traitQuery}
                      onChange={(e) => {
                        setTraitQuery(e.target.value);
                        setShowTraitDropdown(true);
                      }}
                      onFocus={() => setShowTraitDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowTraitDropdown(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && traitQuery.trim()) {
                          e.preventDefault();
                          const val = traitQuery.trim();
                          if (!selectedTraits.includes(val) && selectedTraits.length < 10) {
                            setSelectedTraits(prev => [...prev, val]);
                            setTraitQuery('');
                            setIsDirty(true);
                          }
                        }
                      }}
                      placeholder="Escribe o selecciona un rasgo..."
                      style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                    />
                    {showTraitDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#14141f',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        zIndex: 100,
                        maxHeight: '150px',
                        overflowY: 'auto',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}>
                        {CHARACTER_TRAITS.filter(tr => 
                          tr.toLowerCase().includes(traitQuery.toLowerCase()) && !selectedTraits.includes(tr)
                        ).map(tr => (
                          <div
                            key={tr}
                            onMouseDown={() => {
                              setSelectedTraits(prev => [...prev, tr]);
                              setTraitQuery('');
                              setShowTraitDropdown(false);
                              setIsDirty(true);
                            }}
                            style={{
                              padding: '8px 10px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            {tr}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Introducción */}
            <div className="field-group">
              <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                Introducción (Resumen de máx. 200 caracteres)
              </label>
              <textarea
                value={intro}
                onChange={(e) => handleFieldChange(setIntro, e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Breve sumario descriptivo..."
                style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Campos exclusivos de Escenario (Presentación, Contexto Base, Instrucciones IA) */}
            {itemType === 'Escenario' ? (
              <>
                <div className="field-group">
                  <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Presentación del mundo (Mensaje inicial del chat)</label>
                  <textarea
                    value={presentation}
                    onChange={(e) => handleFieldChange(setPresentation, e.target.value)}
                    rows={3}
                    placeholder="El texto de bienvenida que verá el jugador..."
                    style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Contexto base (Lore y Reglas globales)</label>
                  <textarea
                    value={baseContext}
                    onChange={(e) => handleFieldChange(setBaseContext, e.target.value)}
                    rows={4}
                    placeholder="Geografía, política, historia y lore del escenario..."
                    style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Instrucciones del Brain del GM / IA</label>
                  <textarea
                    value={aiInstructions}
                    onChange={(e) => handleFieldChange(setAiInstructions, e.target.value)}
                    rows={3}
                    placeholder="Instrucciones del sistema de cómo la IA debe narrar e interpretar..."
                    style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              </>
            ) : (
              /* Campo exclusivo de Tarjeta (Descripción) */
              <div className="field-group">
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Detalles de la tarjeta / Lore</label>
                <textarea
                  value={text}
                  onChange={(e) => handleFieldChange(setText, e.target.value)}
                  rows={4}
                  placeholder="Detalla las características, reglas, aspecto o mecánicas de la tarjeta..."
                  style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            )}

            {/* Etiquetas para Tarjetas (Ubicadas al final) */}
            {itemType !== 'Escenario' && (
              <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                {renderTagsInput()}
              </div>
            )}

            {/* Selector de Conexiones / Lore Pieces Grid (FictionLab style) */}
            {itemType === 'Escenario' ? (
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#ffd36b', fontSize: '1.05rem', fontWeight: '700' }}>
                  Construcción del Escenario (Lore Pieces)
                </h4>

                {/* Buscador Rápido para Importar Tarjetas Existentes */}
                <div style={{ marginBottom: '24px' }}>
                  <ConnectionSelector
                    availableCards={appData.cards || []}
                    selectedCardIds={selectedCards}
                    onSelectCard={(id) => handleFieldChange(setSelectedCards, [...selectedCards, id])}
                    onRemoveCard={(id) => handleFieldChange(setSelectedCards, selectedCards.filter(cId => cId !== id))}
                  />
                </div>

                {/* Cuadrículas agrupadas por tipo */}
                {['Personaje', 'Lugar', 'Facción', 'Raza', 'Objeto', 'Otros'].map(type => {
                  const linkedCardsOfType = (appData.cards || []).filter(c => {
                    if (!selectedCards.includes(c.id)) return false;
                    if (c.type === type) return true;
                    if (type === 'Otros' && !['Personaje', 'Lugar', 'Facción', 'Raza', 'Objeto'].includes(c.type)) return true;
                    return false;
                  });
                  const typeLabel = type === 'Personaje' ? 'Personajes' : type === 'Lugar' ? 'Lugares' : type === 'Facción' ? 'Facciones' : type === 'Raza' ? 'Razas' : type === 'Objeto' ? 'Objetos' : 'Otros / Personalizados';

                  return (
                    <div key={type} style={{ marginBottom: '24px' }}>
                      <h5 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '0.88rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{typeLabel} ({linkedCardsOfType.length})</span>
                      </h5>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '12px'
                      }}>
                        {/* Tarjetas conectadas de este tipo */}
                        {linkedCardsOfType.map(card => {
                          return (
                            <div
                              key={card.id}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '170px',
                                transition: 'all 0.2s'
                              }}
                            >
                              {/* Botón de Desenlazar (x) */}
                              <button
                                type="button"
                                onClick={() => handleFieldChange(setSelectedCards, selectedCards.filter(id => id !== card.id))}
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: 'rgba(0, 0, 0, 0.6)',
                                  border: 'none',
                                  color: '#ff6b6b',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  zIndex: 5
                                }}
                                title="Desenlazar del escenario"
                              >
                                ×
                              </button>

                              {/* Portada */}
                              <div style={{
                                height: '80px',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundImage: `url(${card.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80'})`,
                                backgroundColor: '#1a1a24'
                              }} />

                              {/* Info */}
                              <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={card.title}>
                                  {card.title}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                  {card.type}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Ranura Dotted "Crear Nuevo" */}
                        <div
                          onClick={() => setNestedCardType(type)}
                          style={{
                            border: '2px dashed rgba(255, 211, 107, 0.3)',
                            borderRadius: '10px',
                            height: '170px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#ffd36b',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            gap: '6px',
                            transition: 'all 0.2s',
                            background: 'rgba(255,211,107,0.01)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.border = '2px dashed rgba(255, 211, 107, 0.6)';
                            e.currentTarget.style.background = 'rgba(255,211,107,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.border = '2px dashed rgba(255, 211, 107, 0.3)';
                            e.currentTarget.style.background = 'rgba(255,211,107,0.01)';
                          }}
                        >
                          <span style={{ fontSize: '1.3rem' }}>+</span>
                          <span>Crear {type}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Selector de Conexiones en Tarjetas */
              <div style={{ marginTop: '10px' }}>
                <ConnectionSelector
                  availableCards={appData.cards || []}
                  selectedCardIds={selectedCards}
                  onSelectCard={(id) => handleFieldChange(setSelectedCards, [...selectedCards, id])}
                  onRemoveCard={(id) => handleFieldChange(setSelectedCards, selectedCards.filter(cId => cId !== id))}
                />
              </div>
            )}

          </div>
        )}

        <ImageCropperModal
          isOpen={isCropperOpen}
          imageSrc={cropSrc}
          aspectRatio={itemType === 'Personaje' ? 3 / 4 : 16 / 9}
          onClose={() => setIsCropperOpen(false)}
          onCropComplete={(croppedImage) => handleFieldChange(setCover, croppedImage)}
        />

        {/* Sub-modal Flotante para Crear Tarjeta In-Situ (FictionLab Style) */}
        {nestedCardType && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 4, 10, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400
          }}>
            <div style={{
              background: '#14141f',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => setNestedCardType(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>

              <h4 style={{ margin: '0 0 16px 0', color: '#ffd36b', fontSize: '1.1rem', fontWeight: '700' }}>
                Crear Nuevo {nestedCardType} (In-Situ)
              </h4>

              {/* Portada URL */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Portada URL</label>
                <input
                  type="text"
                  value={nestedCardCover}
                  onChange={(e) => setNestedCardCover(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', fontSize: '0.82rem' }}
                />
              </div>

              {/* Nombre */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Nombre / Título</label>
                <input
                  type="text"
                  value={nestedCardTitle}
                  onChange={(e) => setNestedCardTitle(e.target.value)}
                  placeholder={`Nombre del ${nestedCardType}...`}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', fontSize: '0.82rem' }}
                />
              </div>

              {/* Resumen */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Resumen breve</label>
                <textarea
                  value={nestedCardIntro}
                  onChange={(e) => setNestedCardIntro(e.target.value)}
                  rows={2}
                  placeholder="Breve sumario descriptivo..."
                  style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.82rem' }}
                />
              </div>

              {/* Detalles / Lore */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Lore / Detalles</label>
                <textarea
                  value={nestedCardText}
                  onChange={(e) => setNestedCardText(e.target.value)}
                  rows={3}
                  placeholder="Descripción completa del lore..."
                  style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.82rem' }}
                />
              </div>

              {/* Rasgos de personaje (sólo si es Personaje) */}
              {nestedCardType === 'Personaje' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Traits (Rasgos de Personalidad)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                    {nestedCardTraits.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Sin rasgos aún.</span>
                    ) : (
                      nestedCardTraits.map(t => (
                        <span key={t} style={{ background: 'rgba(255,211,107,0.15)', border: '1px solid rgba(255,211,107,0.3)', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', color: '#ffd36b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {t}
                          <button type="button" onClick={() => setNestedCardTraits(prev => prev.filter(x => x !== t))} style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}>×</button>
                        </span>
                      ))
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={nestedTraitQuery}
                      onChange={(e) => {
                        setNestedTraitQuery(e.target.value);
                        setShowNestedTraitDropdown(true);
                      }}
                      onFocus={() => setShowNestedTraitDropdown(true)}
                      onBlur={() => setTimeout(() => setShowNestedTraitDropdown(false), 200)}
                      placeholder="Buscar o añadir rasgo..."
                      style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', fontSize: '0.82rem' }}
                    />
                    {showNestedTraitDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#14141f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', zIndex: 1500, maxHeight: '120px', overflowY: 'auto', marginTop: '4px' }}>
                        {CHARACTER_TRAITS.filter(tr => tr.toLowerCase().includes(nestedTraitQuery.toLowerCase()) && !nestedCardTraits.includes(tr)).map(tr => (
                          <div key={tr} onMouseDown={() => { setNestedCardTraits(prev => [...prev, tr]); setNestedTraitQuery(''); setShowNestedTraitDropdown(false); }} style={{ padding: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>
                            {tr}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setNestedCardType(null)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNestedCard}
                  style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Guardar Tarjeta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación para cambios sin guardar */}
      {showUnsavedWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 4, 10, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300
        }}>
          <div style={{
            background: '#14141f',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 16px 50px rgba(0,0,0,0.8)',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '1.2rem', fontWeight: '700' }}>Cambios sin guardar</h4>
            <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: '1.4' }}>
              Has modificado los datos de este formulario. ¿Quieres guardar los cambios antes de salir?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {
                  setShowUnsavedWarning(false);
                  handleSave();
                }}
                style={{
                  background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '700',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Guardar y salir
              </button>
              <button 
                onClick={() => {
                  setIsDirty(false);
                  setShowUnsavedWarning(false);
                  onClose();
                }}
                style={{
                  background: 'rgba(235, 87, 87, 0.1)',
                  border: '1px solid rgba(235, 87, 87, 0.2)',
                  color: '#eb5757',
                  fontWeight: '700',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Descartar cambios
              </button>
              <button 
                onClick={() => setShowUnsavedWarning(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#eaeaea',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Volver al formulario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
