import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faSave, 
  faStar, 
  faPlus, 
  faCrop, 
  faImage, 
  faImages, 
  faBrain, 
  faBoxes, 
  faTrashAlt, 
  faCheck,
  faMagic
} from '@fortawesome/free-solid-svg-icons';
import ConnectionSelector from './ConnectionSelector';
import ImageCropperModal from './ImageCropperModal';
import BatchCropperModal from './BatchCropperModal';
import NarratorForm from './NarratorForm';
import ToolWorkshopForm from './ToolWorkshopForm';
import { generateImageLocal } from '../utils/localAIStudio';
import '../pages/create.css';

const CARD_TYPES = ['Historia', 'Personaje', 'Inventario', 'Memoria', 'Raza', 'Facción', 'Regla', 'Criatura', 'Objeto', 'Lugar', 'Otros'];
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

  // States para Narrador y Taller de Funciones
  const [bio, setBio] = useState('');
  const [style, setStyle] = useState('');
  const [tone, setTone] = useState('');
  const [rules, setRules] = useState('');
  const [randomization, setRandomization] = useState('');
  const [narratorTools, setNarratorTools] = useState([]); // IDs de herramientas asignadas

  // States para Herramienta (Taller de Funciones)
  const [toolWorkshopType, setToolWorkshopType] = useState('attributes'); // 'attributes' | 'progression' | 'dice' | 'events' | 'custom'
  const [toolWorkshopDesc, setToolWorkshopDesc] = useState('');
  const [toolWorkshopConfig, setToolWorkshopConfig] = useState({});

  // States para Tarjeta de Memoria
  const [memorySummary, setMemorySummary] = useState('');
  const [memoryImpact, setMemoryImpact] = useState('Medio'); // 'Crítico', 'Alto', 'Medio', 'Leve'
  const [memoryCharacters, setMemoryCharacters] = useState([]); // IDs de personajes vinculados
  const [memoryScenario, setMemoryScenario] = useState('');
  const [memoryTimeline, setMemoryTimeline] = useState('');

  // States para Tarjeta de Inventario
  const [inventoryOwnerCharId, setInventoryOwnerCharId] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryCapacity, setInventoryCapacity] = useState('20 kg / 10 slots');

  // Estado para generación de imágenes con IA local (Uncensored Local Studio / Pinokio)
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [coverAiPrompt, setCoverAiPrompt] = useState('');
  const [coverAiStyle, setCoverAiStyle] = useState('Fantasía Oscura / Entornos');
  const [charAiPrompt, setCharAiPrompt] = useState('');

  // Crop state inside modal
  const [cropSrc, setCropSrc] = useState('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState('main'); // 'main' | 'character_new' | 'character_edit' | 'nested_single' | 'nested_character_new' | 'nested_character_edit'
  const [editingImageId, setEditingImageId] = useState(null);

  // Batch Crop state (subida múltiple)
  const [batchCropItems, setBatchCropItems] = useState([]);
  const [isBatchCropperOpen, setIsBatchCropperOpen] = useState(false);
  const [batchCropTarget, setBatchCropTarget] = useState('main'); // 'main' | 'nested'

  // Galería de imágenes y expresiones del personaje
  const [characterImages, setCharacterImages] = useState([]); // [{ id, url, label, isDefault }]
  const [newImageLabel, setNewImageLabel] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Highlight indices para navegación por teclado (ArrowUp/ArrowDown/Enter)
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(-1);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
  const [highlightedTraitIndex, setHighlightedTraitIndex] = useState(-1);
  const [highlightedNestedTraitIndex, setHighlightedNestedTraitIndex] = useState(-1);

  // States para creación de tarjeta anidada (in-situ)
  const [nestedCardType, setNestedCardType] = useState(null);
  const [nestedCardTitle, setNestedCardTitle] = useState('');
  const [nestedCardIntro, setNestedCardIntro] = useState('');
  const [nestedCardText, setNestedCardText] = useState('');
  const [nestedCardCover, setNestedCardCover] = useState('');
  const [nestedCardTraits, setNestedCardTraits] = useState([]);
  const [nestedTraitQuery, setNestedTraitQuery] = useState('');
  const [showNestedTraitDropdown, setShowNestedTraitDropdown] = useState(false);
  const [nestedCharacterImages, setNestedCharacterImages] = useState([]); // [{ id, url, label, isDefault }]
  const [newNestedImageLabel, setNewNestedImageLabel] = useState('');
  const [newNestedImageUrl, setNewNestedImageUrl] = useState('');
  const [nestedEditingImageId, setNestedEditingImageId] = useState(null);

  // Sincronizar estados cuando se abre el modal o cambia el item a editar
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Determinamos el modo a partir del tipo del item o la estructura
        if (initialType === 'Herramienta' || editItem.toolType !== undefined) {
          setItemType('Herramienta');
          setTitle(editItem.name || editItem.title || '');
          setToolWorkshopType(editItem.toolType || 'attributes');
          setToolWorkshopDesc(editItem.description || '');
          setToolWorkshopConfig(editItem.config || {});
        } else if (initialType === 'Narrador' || editItem.bio !== undefined) {
          setItemType('Narrador');
          setTitle(editItem.name || '');
          setBio(editItem.bio || '');
          setStyle(editItem.style || '');
          setTone(editItem.tone || '');
          setRules(editItem.rules || '');
          setRandomization(editItem.randomization || '');
          setNarratorTools(Array.isArray(editItem.tools) ? editItem.tools : []);
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

          // Campos especializados de Memoria
          if (editItem.type === 'Memoria') {
            setMemorySummary(editItem.summary || editItem.text || '');
            setMemoryImpact(editItem.impact || 'Medio');
            setMemoryCharacters(editItem.linkedCharacters || []);
            setMemoryScenario(editItem.linkedScenario || '');
            setMemoryTimeline(editItem.timeline || '');
          } else {
            setMemorySummary('');
            setMemoryImpact('Medio');
            setMemoryCharacters([]);
            setMemoryScenario('');
            setMemoryTimeline('');
          }

          // Campos especializados de Inventario
          if (editItem.type === 'Inventario') {
            setInventoryOwnerCharId(editItem.linkedCharacterId || '');
            setInventoryItems(Array.isArray(editItem.items) ? editItem.items : []);
            setInventoryCapacity(editItem.capacity || '20 kg / 10 slots');
          } else {
            setInventoryOwnerCharId('');
            setInventoryItems([]);
            setInventoryCapacity('20 kg / 10 slots');
          }

          // Cargar galería de imágenes / expresiones
          if (Array.isArray(editItem.images) && editItem.images.length > 0) {
            setCharacterImages(editItem.images);
          } else if (editItem.cover) {
            setCharacterImages([{ id: 'img-default', url: editItem.cover, label: 'Normal / Principal', isDefault: true }]);
          } else {
            setCharacterImages([]);
          }
          setNewImageLabel('');
          setNewImageUrl('');
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
        setNarratorTools([]);

        // Herramienta / Taller
        setToolWorkshopType('attributes');
        setToolWorkshopDesc('');
        setToolWorkshopConfig({});

        // Memoria vacía
        setMemorySummary('');
        setMemoryImpact('Medio');
        setMemoryCharacters([]);
        setMemoryScenario('');
        setMemoryTimeline('');

        // Inventario vacío
        setInventoryOwnerCharId('');
        setInventoryItems([
          { id: `item-${Date.now()}-1`, name: 'Espada corta de acero', qty: 1, rarity: 'Común', equipped: true, weight: '1.5 kg', desc: 'Arma básica de filo equilibrado.' },
          { id: `item-${Date.now()}-2`, name: 'Poción de curación menor', qty: 3, rarity: 'Común', equipped: false, weight: '0.5 kg', desc: 'Restaura una pequeña cantidad de salud.' }
        ]);
        setInventoryCapacity('20 kg / 10 slots');

        // Galería vacía
        setCharacterImages([]);
        setNewImageLabel('');
        setNewImageUrl('');
        setNestedCharacterImages([]);
        setNewNestedImageLabel('');
        setNewNestedImageUrl('');
      }
      setBatchCropItems([]);
      setIsBatchCropperOpen(false);
      setIsDirty(false);
      setShowUnsavedWarning(false);
    }
  }, [isOpen, editItem, initialType]);

  if (!isOpen) return null;

  const isWide = itemType === 'Escenario' || itemType === 'Narrador' || itemType === 'Herramienta' || itemType === 'Inventario';

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('El nombre o título es obligatorio.');
      return;
    }

    if (itemType === 'Herramienta') {
      const toolData = {
        id: editItem ? editItem.id : `tool-${Date.now()}`,
        name: trimmedTitle,
        toolType: toolWorkshopType,
        description: toolWorkshopDesc.trim(),
        config: toolWorkshopConfig,
        createdAt: editItem ? editItem.createdAt : new Date().toISOString()
      };
      onSaveItem({ type: 'tool', data: toolData, isEdit: !!editItem });
    } else if (itemType === 'Narrador') {
      const narratorData = {
        id: editItem ? editItem.id : `narrator-${Date.now()}`,
        name: trimmedTitle,
        bio: bio.trim(),
        style: style.trim(),
        tone: tone.trim(),
        rules: rules.trim(),
        randomization: randomization.trim(),
        tools: narratorTools,
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
      const primaryImg = characterImages.find(img => img.isDefault) || characterImages[0];
      const finalCover = (itemType === 'Personaje' && primaryImg ? primaryImg.url : cover).trim();

      const cardData = {
        id: editItem ? editItem.id : `card-${Date.now()}`,
        type: itemType,
        title: trimmedTitle,
        intro: intro.trim() || (itemType === 'Memoria' ? memorySummary.trim().substring(0, 120) : itemType === 'Inventario' ? `Inventario (${inventoryItems.length} objetos)` : ''),
        text: itemType === 'Memoria' 
          ? (memorySummary.trim() || text.trim()) 
          : itemType === 'Inventario' 
          ? (inventoryItems.map(i => `${i.name} (x${i.qty || 1}) - ${i.equipped ? '[Equipado]' : '[En mochila]'}: ${i.desc || ''}`).join('\n') || text.trim()) 
          : text.trim(),
        cover: finalCover,
        images: itemType === 'Personaje' ? characterImages : (finalCover ? [{ id: 'img-1', url: finalCover, label: 'Principal', isDefault: true }] : []),
        nsfw: nsfw,
        tags: selectedTags,
        connectedCards: selectedCards,
        traits: itemType === 'Personaje' ? selectedTraits : [],
        public: isPublic,
        // Propiedades de Memoria
        ...(itemType === 'Memoria' ? {
          summary: memorySummary.trim() || intro.trim(),
          impact: memoryImpact,
          linkedCharacters: memoryCharacters,
          linkedScenario: memoryScenario,
          timeline: memoryTimeline.trim()
        } : {}),
        // Propiedades de Inventario
        ...(itemType === 'Inventario' ? {
          linkedCharacterId: inventoryOwnerCharId,
          items: inventoryItems,
          capacity: inventoryCapacity.trim()
        } : {}),
        createdAt: editItem ? editItem.createdAt : new Date().toISOString()
      };

      let scenarioData = null;
      if (isScenario) {
        scenarioData = {
          id: `scenario-from-card-${Date.now()}`,
          title: trimmedTitle,
          category: 'Aventura',
          intro: intro.trim() || text.trim().substring(0, 80) + '...',
          cover: finalCover,
          presentation: '',
          baseContext: `[${itemType}]: ${cardData.text}`,
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

  // Handlers para gestionar imágenes / expresiones del Personaje principal
  const handleSetDefaultCharacterImage = (id) => {
    setCharacterImages(prev => prev.map(img => ({ ...img, isDefault: img.id === id })));
    const selected = characterImages.find(img => img.id === id);
    if (selected) setCover(selected.url);
    setIsDirty(true);
  };

  const handleRemoveCharacterImage = (id) => {
    setCharacterImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (next.length > 0 && !next.some(img => img.isDefault)) {
        next[0].isDefault = true;
        setCover(next[0].url);
      } else if (next.length === 0) {
        setCover('');
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleUpdateCharacterImageLabel = (id, newLabel) => {
    setCharacterImages(prev => prev.map(img => img.id === id ? { ...img, label: newLabel } : img));
    setIsDirty(true);
  };

  const handleReCropCharacterImage = (img) => {
    setCropSrc(img.url);
    setCropTarget('character_edit');
    setEditingImageId(img.id);
    setIsCropperOpen(true);
  };

  // Handlers para gestionar imágenes / expresiones del Personaje In-Situ (Nested)
  const handleSetDefaultNestedCharacterImage = (id) => {
    setNestedCharacterImages(prev => prev.map(img => ({ ...img, isDefault: img.id === id })));
    const selected = nestedCharacterImages.find(img => img.id === id);
    if (selected) setNestedCardCover(selected.url);
  };

  const handleRemoveNestedCharacterImage = (id) => {
    setNestedCharacterImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (next.length > 0 && !next.some(img => img.isDefault)) {
        next[0].isDefault = true;
        setNestedCardCover(next[0].url);
      } else if (next.length === 0) {
        setNestedCardCover('');
      }
      return next;
    });
  };

  const handleUpdateNestedCharacterImageLabel = (id, newLabel) => {
    setNestedCharacterImages(prev => prev.map(img => img.id === id ? { ...img, label: newLabel } : img));
  };

  const handleReCropNestedCharacterImage = (img) => {
    setCropSrc(img.url);
    setCropTarget('nested_character_edit');
    setNestedEditingImageId(img.id);
    setIsCropperOpen(true);
  };

  // Handlers para procesamiento por lotes (Batch Upload & Crop)
  const handleMultipleFilesSelected = async (fileList, target = 'main') => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const readPromises = files.map((file, idx) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const rawName = file.name.replace(/\.[^/.]+$/, '');
            resolve({
              id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              originalSrc: reader.result,
              label: rawName || (idx === 0 ? 'Normal / Principal' : `Expresión ${idx + 1}`),
              isDefault: idx === 0 && (target === 'main' ? characterImages.length === 0 : nestedCharacterImages.length === 0)
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    const results = (await Promise.all(readPromises)).filter(Boolean);
    if (results.length > 0) {
      setBatchCropItems(results);
      setBatchCropTarget(target);
      setIsBatchCropperOpen(true);
    }
  };

  const handleSaveBatchCropped = (newCroppedItems) => {
    if (batchCropTarget === 'main') {
      setCharacterImages(prev => {
        const hasNewDefault = newCroppedItems.some(it => it.isDefault);
        let next = [];
        if (hasNewDefault) {
          next = [...prev.map(it => ({ ...it, isDefault: false })), ...newCroppedItems];
        } else {
          next = [...prev, ...newCroppedItems];
        }
        const def = next.find(it => it.isDefault) || next[0];
        if (def) setCover(def.url);
        return next;
      });
      setIsDirty(true);
    } else if (batchCropTarget === 'nested') {
      setNestedCharacterImages(prev => {
        const hasNewDefault = newCroppedItems.some(it => it.isDefault);
        let next = [];
        if (hasNewDefault) {
          next = [...prev.map(it => ({ ...it, isDefault: false })), ...newCroppedItems];
        } else {
          next = [...prev, ...newCroppedItems];
        }
        const def = next.find(it => it.isDefault) || next[0];
        if (def) setNestedCardCover(def.url);
        return next;
      });
      setIsDirty(true);
    }
  };

  const handleSaveNestedCard = () => {
    const trimmedTitle = nestedCardTitle.trim();
    if (!trimmedTitle) {
      alert('El nombre o título es obligatorio.');
      return;
    }

    if (nestedCardType === 'Herramienta') {
      const newTool = {
        id: `tool-${Date.now()}`,
        name: trimmedTitle,
        toolType: 'attributes',
        description: nestedCardIntro.trim() || nestedCardText.trim(),
        config: {},
        createdAt: new Date().toISOString()
      };
      onSaveItem({ type: 'tool', data: newTool, isEdit: false });
      setNarratorTools(prev => [...prev, newTool.id]);
    } else {
      const primaryImg = nestedCharacterImages.find(img => img.isDefault) || nestedCharacterImages[0];
      const finalCover = (nestedCardType === 'Personaje' && primaryImg ? primaryImg.url : nestedCardCover).trim();

      const newCard = {
        id: `card-${Date.now()}`,
        type: nestedCardType,
        title: trimmedTitle,
        intro: nestedCardIntro.trim(),
        text: nestedCardText.trim(),
        cover: finalCover,
        images: nestedCardType === 'Personaje' ? nestedCharacterImages : (finalCover ? [{ id: 'img-1', url: finalCover, label: 'Principal', isDefault: true }] : []),
        nsfw: false,
        public: false,
        tags: [],
        connectedCards: [],
        traits: nestedCardType === 'Personaje' ? nestedCardTraits : [],
        // Campos de Memoria
        summary: nestedCardType === 'Memoria' ? (nestedCardIntro.trim() || nestedCardText.trim()) : undefined,
        impact: nestedCardType === 'Memoria' ? 'Medio' : undefined,
        linkedCharacters: nestedCardType === 'Memoria' && itemType === 'Personaje' ? [(editItem?.id || title)] : [],
        linkedScenario: nestedCardType === 'Memoria' && itemType === 'Escenario' ? (editItem?.id || title) : '',
        timeline: nestedCardType === 'Memoria' ? 'Hito inicial' : undefined,
        // Campos de Inventario
        linkedCharacterId: nestedCardType === 'Inventario' && itemType === 'Personaje' ? (editItem?.id || title) : '',
        items: nestedCardType === 'Inventario' ? [
          { id: `item-${Date.now()}-1`, name: 'Pertenencias iniciales', qty: 1, rarity: 'Común', equipped: true, desc: 'Equipo personal del personaje.' }
        ] : undefined,
        capacity: nestedCardType === 'Inventario' ? '20 kg / 10 slots' : undefined,
        createdAt: new Date().toISOString()
      };
      // Guardar globalmente
      onSaveItem({ type: 'card', data: newCard, isEdit: false });
      // Conectar al escenario actual si estamos en escenario
      if (itemType === 'Escenario') {
        setSelectedCards(prev => [...prev, newCard.id]);
      }
    }

    setIsDirty(true);
    // Limpiar estados y cerrar sub-modal
    setNestedCardType(null);
    setNestedCardTitle('');
    setNestedCardIntro('');
    setNestedCardText('');
    setNestedCardCover('');
    setNestedCardTraits([]);
    setNestedTraitQuery('');
    setShowNestedTraitDropdown(false);
    setHighlightedNestedTraitIndex(-1);
    setNestedCharacterImages([]);
    setNewNestedImageLabel('');
    setNewNestedImageUrl('');
    setNestedEditingImageId(null);
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
    const filteredTags = SUGGESTED_TAGS.filter(tg => 
      tg.toLowerCase().includes(tagQuery.toLowerCase()) && !selectedTags.includes(tg)
    );
    const customTag = (tagQuery.trim() && !selectedTags.includes(tagQuery.trim()) && !filteredTags.some(t => t.toLowerCase() === tagQuery.trim().toLowerCase()))
      ? tagQuery.trim()
      : null;
    const allTagOptions = customTag 
      ? [{ isCustom: true, label: customTag }, ...filteredTags.map(t => ({ isCustom: false, label: t }))] 
      : filteredTags.map(t => ({ isCustom: false, label: t }));

    const handleSelectTag = (tagText) => {
      if (tagText && !selectedTags.includes(tagText) && selectedTags.length < 5) {
        setSelectedTags(prev => [...prev, tagText]);
        setTagQuery('');
        setHighlightedTagIndex(-1);
        setShowTagDropdown(false);
        setIsDirty(true);
      }
    };

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
                setHighlightedTagIndex(-1);
              }}
              onFocus={() => {
                setShowTagDropdown(true);
                setHighlightedTagIndex(-1);
              }}
              onBlur={() => {
                setTimeout(() => setShowTagDropdown(false), 200);
              }}
              onKeyDown={(e) => {
                if (!showTagDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                  setShowTagDropdown(true);
                  setHighlightedTagIndex(0);
                  e.preventDefault();
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (allTagOptions.length > 0) {
                    setHighlightedTagIndex(prev => (prev + 1) % allTagOptions.length);
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (allTagOptions.length > 0) {
                    setHighlightedTagIndex(prev => (prev - 1 + allTagOptions.length) % allTagOptions.length);
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (showTagDropdown && highlightedTagIndex >= 0 && highlightedTagIndex < allTagOptions.length) {
                    handleSelectTag(allTagOptions[highlightedTagIndex].label);
                  } else if (tagQuery.trim()) {
                    handleSelectTag(tagQuery.trim());
                  }
                } else if (e.key === 'Escape') {
                  setShowTagDropdown(false);
                }
              }}
              placeholder="Escribe o selecciona una etiqueta..."
              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
            />
            {showTagDropdown && allTagOptions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#14141f',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                zIndex: 100,
                maxHeight: '160px',
                overflowY: 'auto',
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {allTagOptions.map((opt, idx) => (
                  <div
                    key={opt.label}
                    onMouseDown={() => handleSelectTag(opt.label)}
                    onMouseEnter={() => setHighlightedTagIndex(idx)}
                    style={{
                      padding: '8px 10px',
                      color: idx === highlightedTagIndex ? '#ffd36b' : '#fff',
                      background: idx === highlightedTagIndex ? 'rgba(255, 211, 107, 0.15)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{opt.label}</span>
                    {opt.isCustom && (
                      <span style={{ fontSize: '0.7rem', color: '#ffd36b', background: 'rgba(255,211,107,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        + Nueva
                      </span>
                    )}
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
          {editItem ? 'Editar' : 'Crear'} {itemType === 'Escenario' ? 'Escenario' : itemType === 'Narrador' ? 'Narrador' : itemType === 'Herramienta' ? 'Herramienta (Taller de Funciones)' : `Tarjeta (${itemType})`}
        </h3>

        {/* Formulario de Herramienta / Taller de Funciones */}
        {itemType === 'Herramienta' && (
          <ToolWorkshopForm
            name={title}
            setName={(v) => handleFieldChange(setTitle, v)}
            toolType={toolWorkshopType}
            setToolType={(v) => handleFieldChange(setToolWorkshopType, v)}
            description={toolWorkshopDesc}
            setDescription={(v) => handleFieldChange(setToolWorkshopDesc, v)}
            config={toolWorkshopConfig}
            setConfig={(v) => handleFieldChange(setToolWorkshopConfig, v)}
          />
        )}

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
            tools={narratorTools}
            setTools={(v) => handleFieldChange(setNarratorTools, v)}
            availableTools={appData.tools || []}
            onOpenToolCreator={() => {
              setNestedCardType('Herramienta');
            }}
          />
        )}

        {/* Formularios de Tarjeta y Escenario */}
        {itemType !== 'Narrador' && itemType !== 'Herramienta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* 1. Imagen de portada / Galería de Expresiones AL INICIO */}
            {itemType === 'Personaje' ? (
              <div className="field-group" style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faImage} /> Imágenes y Expresiones del Personaje ({characterImages.length})
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>
                      Añade múltiples retratos y nómbralos (ej: Normal, Alegre, Enfadado, Con armadura). La IA los identificará para ilustrar reacciones y generar nuevas imágenes.
                    </span>
                  </div>
                </div>

                {/* Lista de Imágenes Existentes */}
                {characterImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginTop: '12px', marginBottom: '14px' }}>
                    {characterImages.map((img, idx) => (
                      <div 
                        key={img.id || idx}
                        style={{
                          background: img.isDefault ? 'rgba(255, 211, 107, 0.08)' : 'rgba(255,255,255,0.03)',
                          border: img.isDefault ? '1.5px solid rgba(255, 211, 107, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        {/* Badge de Principal */}
                        {img.isDefault && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                            color: '#000',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            zIndex: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <FontAwesomeIcon icon={faStar} /> Portada
                          </div>
                        )}

                        {/* Botón Borrar */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCharacterImage(img.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.65)',
                            border: 'none',
                            color: '#ff6b6b',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            zIndex: 3
                          }}
                          title="Eliminar imagen"
                        >
                          ×
                        </button>

                        {/* Miniatura 3:4 */}
                        <div 
                          style={{
                            height: '130px',
                            backgroundImage: `url(${img.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundColor: '#0a0a12'
                          }}
                        />

                        {/* Contenido inferior: Input del Identificador / Emoción y Botones */}
                        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input
                            type="text"
                            value={img.label || ''}
                            onChange={(e) => handleUpdateCharacterImageLabel(img.id, e.target.value)}
                            placeholder="Ej: Alegre, Armadura..."
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              background: '#14141f',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '0.72rem',
                              boxSizing: 'border-box'
                            }}
                            title="Etiqueta / Estado de la imagen"
                          />

                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
                            {!img.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultCharacterImage(img.id)}
                                style={{
                                  flex: 1,
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#ffd36b',
                                  padding: '3px 4px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px'
                                }}
                                title="Establecer como imagen de portada principal"
                              >
                                <FontAwesomeIcon icon={faStar} /> Principal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReCropCharacterImage(img)}
                              style={{
                                flex: img.isDefault ? 1 : 'none',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#eaeaea',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px'
                              }}
                              title="Re-encuadrar y recortar imagen"
                            >
                              <FontAwesomeIcon icon={faCrop} /> {img.isDefault ? 'Recortar' : ''}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para Añadir Nueva Imagen */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px dashed rgba(255,211,107,0.25)', marginTop: characterImages.length > 0 ? '0' : '8px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#ffd36b', fontWeight: '600', marginBottom: '8px' }}>
                    <FontAwesomeIcon icon={faPlus} /> Añadir nueva imagen / expresión
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '3px' }}>Identificador / Emoción / Traje</label>
                      <input
                        type="text"
                        value={newImageLabel}
                        onChange={(e) => setNewImageLabel(e.target.value)}
                        placeholder="Ej: Alegre, Enfadado, Con armadura..."
                        style={{ width: '100%', padding: '6px 8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '5px', color: '#fff', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '3px' }}>URL de Imagen</label>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="text"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          placeholder="https://ejemplo.com/foto.jpg"
                          style={{ flex: 1, padding: '6px 8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '5px 0 0 5px', color: '#fff', fontSize: '0.78rem', boxSizing: 'border-box', borderRight: 'none' }}
                        />
                        <button
                          type="button"
                          disabled={!newImageUrl.trim()}
                          onClick={() => {
                            if (newImageUrl.trim()) {
                              setCropSrc(newImageUrl.trim());
                              setCropTarget('character_new');
                              setIsCropperOpen(true);
                            }
                          }}
                          style={{
                            background: newImageUrl.trim() ? '#ffd36b' : 'rgba(255,255,255,0.05)',
                            color: newImageUrl.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '0 5px 5px 0',
                            padding: '0 10px',
                            cursor: newImageUrl.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campo de prompt para detalles del retrato de personaje */}
                  <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Prompt opcional para Retrato IA (v6.safetensors)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const autoCharPrompt = `${title || 'Personaje'}, ${newImageLabel ? `expresión ${newImageLabel}` : 'retrato'}, ${selectedTraits.join(', ')}, ${intro || ''}`;
                          setCharAiPrompt(autoCharPrompt);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ffd36b', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        🪄 Rellenar con rasgos
                      </button>
                    </div>
                    <input
                      type="text"
                      value={charAiPrompt}
                      onChange={(e) => setCharAiPrompt(e.target.value)}
                      placeholder="Detalles visuales específicos (ej: ojos dorados, pelo plateado, armadura arcana, pose de combate...)"
                      style={{ width: '100%', padding: '6px 8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '5px', color: '#fff', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                      O genera con tu modelo local / sube archivo(s) 3:4:
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={isGeneratingAiImage}
                        onClick={async () => {
                          setIsGeneratingAiImage(true);
                          try {
                            const effectivePrompt = charAiPrompt.trim() || `${title || 'Personaje de rol'}, ${newImageLabel || 'retrato'}, ${selectedTraits.join(', ')}, ${intro || ''}`;
                            const generated = await generateImageLocal(effectivePrompt, 'Anime / Fantasía', '', 'v6.safetensors');
                            if (generated) {
                              setCropSrc(generated);
                              setCropTarget('character_new');
                              setIsCropperOpen(true);
                            }
                          } catch (err) {
                            console.warn('Error al generar con IA Local:', err);
                          } finally {
                            setIsGeneratingAiImage(false);
                          }
                        }}
                        style={{
                          background: isGeneratingAiImage ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #b464ff, #ff6bb5)',
                          border: 'none',
                          color: '#fff',
                          padding: '5px 12px',
                          borderRadius: '5px',
                          cursor: isGeneratingAiImage ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FontAwesomeIcon icon={faMagic} /> {isGeneratingAiImage ? 'Generando...' : 'Generar con IA (v6)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('char-new-image-file-input')?.click()}
                        style={{
                          background: 'rgba(255, 211, 107, 0.15)',
                          border: '1px solid rgba(255, 211, 107, 0.3)',
                          color: '#ffd36b',
                          padding: '5px 12px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FontAwesomeIcon icon={faImages} /> Subir archivo(s)
                      </button>
                    </div>
                    <input
                      id="char-new-image-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        handleMultipleFilesSelected(files, 'main');
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Portada estándar para Escenarios y otras Tarjetas */
              <div className="field-group" style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Imagen de portada</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Caja de previsualización */}
                  <div style={{
                    width: '150px',
                    height: '85px',
                    borderRadius: '6px',
                    background: cover ? `url(${cover}) center/cover no-repeat` : 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.72rem',
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {!cover && <span>Sin portada</span>}
                  </div>
                  
                  {/* Inputs de carga */}
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Fila 1: URL manual o selección de archivo */}
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
                              setCropTarget('main');
                              setIsCropperOpen(true);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>

                    {/* Fila 2: Generador de Portadas con Prompt Personalizado (DreamShaperXL) */}
                    <div style={{
                      background: 'rgba(180, 100, 255, 0.05)',
                      border: '1px solid rgba(180, 100, 255, 0.22)',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faMagic} /> Generar Portada con IA (DreamShaperXL)
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const autoPrompt = `${title || itemType}, ${intro || presentation || text || 'entorno de fantasía, arquitectura mística y paisaje épico'}, ${selectedTags.join(', ')}`;
                            setCoverAiPrompt(autoPrompt);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#ffd36b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                          title="Rellenar automáticamente el prompt con el título, descripción y etiquetas actuales"
                        >
                          🪄 Autocompletar con contexto
                        </button>
                      </div>

                      {/* Textarea para el prompt */}
                      <textarea
                        rows={2}
                        value={coverAiPrompt}
                        onChange={(e) => setCoverAiPrompt(e.target.value)}
                        placeholder={title ? `Prompt personalizado (ej: ${title}, ruinas antiguas bajo una tormenta, templo en un acantilado...)` : "Describe el paisaje, entorno, atmósfera o elementos que deseas en la portada..."}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          background: '#151522',
                          border: '1px solid rgba(255,255,255,0.14)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.78rem',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          marginBottom: '8px'
                        }}
                      />

                      {/* Selector de Estilo y Botón de Generar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Estilo:</span>
                          <select
                            value={coverAiStyle}
                            onChange={(e) => setCoverAiStyle(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              background: '#151522',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '5px',
                              color: '#eaeaea',
                              fontSize: '0.72rem'
                            }}
                          >
                            <option value="Fantasía Oscura / Entornos">Fantasía Oscura / Entornos</option>
                            <option value="Paisaje Épico / Naturaleza">Paisaje Épico / Naturaleza</option>
                            <option value="Cyberpunk / Sci-Fi Futurista">Cyberpunk / Sci-Fi Futurista</option>
                            <option value="Grimdark / Gótico y Niebla">Grimdark / Gótico y Niebla</option>
                            <option value="Anime / Ilustración Estilizada 2.5D">Anime / Ilustración Estilizada 2.5D</option>
                            <option value="Pintura al Óleo / Arte Conceptual">Pintura al Óleo / Arte Conceptual</option>
                            <option value="Terror Cósmico / Lovecraftiano">Terror Cósmico / Lovecraftiano</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingAiImage}
                          onClick={async () => {
                            setIsGeneratingAiImage(true);
                            try {
                              const effectivePrompt = coverAiPrompt.trim() || `${title || itemType}, ${intro || presentation || text || 'ilustración épica de fantasía y paisajes'}`;
                              const generated = await generateImageLocal(effectivePrompt, coverAiStyle, '', 'DreamShaperXL_Lightning.safetensors');
                              if (generated) {
                                setCropSrc(generated);
                                setCropTarget('main');
                                setIsCropperOpen(true);
                              }
                            } catch (err) {
                              console.warn('Error al generar con IA Local:', err);
                            } finally {
                              setIsGeneratingAiImage(false);
                            }
                          }}
                          style={{
                            background: isGeneratingAiImage ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #b464ff, #ff6bb5)',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            cursor: isGeneratingAiImage ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isGeneratingAiImage ? 'none' : '0 2px 10px rgba(180, 100, 255, 0.3)'
                          }}
                        >
                          <FontAwesomeIcon icon={faMagic} /> {isGeneratingAiImage ? 'Generando en RTX...' : 'Generar Portada (DreamShaperXL)'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                <label htmlFor="modalCardScenarioCheck" style={{ cursor: 'pointer', color: '#ffd36b', fontWeight: '600', fontSize: '0.85rem' }} title="Crea simultáneamente un escenario jugable a partir de esta tarjeta">
                  Escenificar
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
                    {(() => {
                      const filteredCategories = CATEGORIES.filter(cat => 
                        cat.toLowerCase().includes((categoryQuery || '').toLowerCase())
                      );
                      const customCategory = (categoryQuery.trim() && !filteredCategories.some(c => c.toLowerCase() === categoryQuery.trim().toLowerCase()))
                        ? categoryQuery.trim()
                        : null;
                      const allCategoryOptions = customCategory 
                        ? [{ isCustom: true, label: customCategory }, ...filteredCategories.map(c => ({ isCustom: false, label: c }))] 
                        : filteredCategories.map(c => ({ isCustom: false, label: c }));

                      const handleSelectCategory = (catText) => {
                        setCategory(catText);
                        setCategoryQuery(catText);
                        setHighlightedCategoryIndex(-1);
                        setShowCategoryDropdown(false);
                        setIsDirty(true);
                      };

                      return (
                        <>
                          <input
                            value={categoryQuery}
                            onChange={(e) => {
                              setCategoryQuery(e.target.value);
                              setCategory(e.target.value);
                              setShowCategoryDropdown(true);
                              setHighlightedCategoryIndex(-1);
                              setIsDirty(true);
                            }}
                            onFocus={() => {
                              setShowCategoryDropdown(true);
                              setHighlightedCategoryIndex(-1);
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowCategoryDropdown(false), 200);
                            }}
                            onKeyDown={(e) => {
                              if (!showCategoryDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                                setShowCategoryDropdown(true);
                                setHighlightedCategoryIndex(0);
                                e.preventDefault();
                                return;
                              }
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (allCategoryOptions.length > 0) {
                                  setHighlightedCategoryIndex(prev => (prev + 1) % allCategoryOptions.length);
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (allCategoryOptions.length > 0) {
                                  setHighlightedCategoryIndex(prev => (prev - 1 + allCategoryOptions.length) % allCategoryOptions.length);
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showCategoryDropdown && highlightedCategoryIndex >= 0 && highlightedCategoryIndex < allCategoryOptions.length) {
                                  handleSelectCategory(allCategoryOptions[highlightedCategoryIndex].label);
                                } else if (categoryQuery.trim()) {
                                  handleSelectCategory(categoryQuery.trim());
                                }
                              } else if (e.key === 'Escape') {
                                setShowCategoryDropdown(false);
                              }
                            }}
                            placeholder="Escribe o selecciona categoría..."
                            style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                          />
                          {showCategoryDropdown && allCategoryOptions.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: '#14141f',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '6px',
                              zIndex: 100,
                              maxHeight: '160px',
                              overflowY: 'auto',
                              marginTop: '4px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}>
                              {allCategoryOptions.map((opt, idx) => (
                                <div
                                  key={opt.label}
                                  onMouseDown={() => handleSelectCategory(opt.label)}
                                  onMouseEnter={() => setHighlightedCategoryIndex(idx)}
                                  style={{
                                    padding: '8px 10px',
                                    color: idx === highlightedCategoryIndex ? '#ffd36b' : '#fff',
                                    background: idx === highlightedCategoryIndex ? 'rgba(255, 211, 107, 0.15)' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span>{opt.label}</span>
                                  {opt.isCustom && (
                                    <span style={{ fontSize: '0.7rem', color: '#ffd36b', background: 'rgba(255,211,107,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                      + Personalizada
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
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

            {/* SECCIÓN ESPECIALIZADA: Tarjeta de Memoria */}
            {itemType === 'Memoria' && (
              <div style={{ background: 'rgba(255, 211, 107, 0.04)', border: '1px solid rgba(255, 211, 107, 0.25)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.84rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <FontAwesomeIcon icon={faBrain} /> Resumen del Contexto / Hito de Memoria <span style={{ color: '#ffd36b' }}>*</span>
                </label>
                <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 8px 0' }}>
                  Escribe el acontecimiento clave, descubrimiento o cambio de estado que el Narrador debe recordar siempre.
                </p>
                <textarea
                  value={memorySummary}
                  onChange={(e) => {
                    handleFieldChange(setMemorySummary, e.target.value);
                    handleFieldChange(setText, e.target.value);
                  }}
                  placeholder="Ej. Tras derrotar al capitán en el muelle, el grupo obtuvo el mapa cifrado del tesoro real. Ahora la guardia de la ciudad los busca..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', marginBottom: '12px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Nivel de Importancia / Impacto</label>
                    <select
                      value={memoryImpact}
                      onChange={(e) => handleFieldChange(setMemoryImpact, e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffd36b', fontWeight: '700' }}
                    >
                      <option value="Crítico">🔴 Crítico (Punto de inflexión / Giro)</option>
                      <option value="Alto">🟠 Alto (Hecho mayor / Revelación)</option>
                      <option value="Medio">🟡 Medio (Progreso / Acuerdo)</option>
                      <option value="Leve">🟢 Leve (Detalle curioso / Anécdota)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Escenario Asociado</label>
                    <select
                      value={memoryScenario}
                      onChange={(e) => handleFieldChange(setMemoryScenario, e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff' }}
                    >
                      <option value="">(Global / Todos los escenarios)</option>
                      {(appData.scenarios || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Momento en la Historia (Timeline)</label>
                    <input
                      value={memoryTimeline}
                      onChange={(e) => handleFieldChange(setMemoryTimeline, e.target.value)}
                      placeholder="Ej. Día 4 de viaje, Noche tras la batalla..."
                      style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Selector de Personajes Vinculados */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                    Personajes Involucrados ({memoryCharacters.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(appData.cards || []).filter(c => c.type === 'Personaje').length === 0 ? (
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No hay tarjetas de Personaje creadas aún.</span>
                    ) : (
                      (appData.cards || []).filter(c => c.type === 'Personaje').map(char => {
                        const isLinked = memoryCharacters.includes(char.id);
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => {
                              if (isLinked) {
                                handleFieldChange(setMemoryCharacters, memoryCharacters.filter(id => id !== char.id));
                              } else {
                                handleFieldChange(setMemoryCharacters, [...memoryCharacters, char.id]);
                              }
                            }}
                            style={{
                              background: isLinked ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isLinked ? '#ffd36b' : 'rgba(255,255,255,0.1)'}`,
                              color: isLinked ? '#ffd36b' : '#eaeaea',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{char.title || char.name}</span>
                            {isLinked && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.7rem' }} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN ESPECIALIZADA: Tarjeta de Inventario */}
            {itemType === 'Inventario' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      Personaje Propietario <span style={{ color: '#ffd36b' }}>*</span>
                    </label>
                    <select
                      value={inventoryOwnerCharId}
                      onChange={(e) => handleFieldChange(setInventoryOwnerCharId, e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff' }}
                    >
                      <option value="">(Inventario General / Sin Asignar)</option>
                      {(appData.cards || []).filter(c => c.type === 'Personaje').map(char => (
                        <option key={char.id} value={char.id}>{char.title || char.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      Capacidad / Límite de Carga
                    </label>
                    <input
                      value={inventoryCapacity}
                      onChange={(e) => handleFieldChange(setInventoryCapacity, e.target.value)}
                      placeholder="Ej. 25 kg / 12 slots"
                      style={{ width: '100%', padding: '8px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Gestor interactivo de ítems */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faBoxes} /> Objetos en el Inventario ({inventoryItems.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          name: 'Nuevo Objeto',
                          qty: 1,
                          rarity: 'Común',
                          equipped: false,
                          weight: '1 kg',
                          desc: 'Descripción del objeto...'
                        };
                        handleFieldChange(setInventoryItems, [...inventoryItems, newItem]);
                      }}
                      style={{ background: '#ffd36b', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FontAwesomeIcon icon={faPlus} /> Añadir Objeto
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {inventoryItems.map((item, idx) => (
                      <div key={item.id || idx} style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '8px 10px', display: 'grid', gridTemplateColumns: '2fr 70px 110px 100px 2fr auto', gap: '6px', alignItems: 'center' }}>
                        <input
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...inventoryItems];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            handleFieldChange(setInventoryItems, updated);
                          }}
                          placeholder="Nombre del objeto"
                          style={{ padding: '5px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.78rem' }}
                        />
                        <input
                          type="number"
                          value={item.qty || 1}
                          onChange={(e) => {
                            const updated = [...inventoryItems];
                            updated[idx] = { ...updated[idx], qty: Number(e.target.value) };
                            handleFieldChange(setInventoryItems, updated);
                          }}
                          placeholder="Cant."
                          style={{ padding: '5px 6px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.78rem' }}
                        />
                        <select
                          value={item.rarity || 'Común'}
                          onChange={(e) => {
                            const updated = [...inventoryItems];
                            updated[idx] = { ...updated[idx], rarity: e.target.value };
                            handleFieldChange(setInventoryItems, updated);
                          }}
                          style={{ padding: '5px', background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#ffd36b', fontSize: '0.74rem' }}
                        >
                          <option value="Común">Común</option>
                          <option value="Poco común">Poco común</option>
                          <option value="Raro">Raro</option>
                          <option value="Épico">Épico</option>
                          <option value="Legendario">Legendario</option>
                          <option value="Único">Único / Artefacto</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: item.equipped ? '#27ae60' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!item.equipped}
                            onChange={(e) => {
                              const updated = [...inventoryItems];
                              updated[idx] = { ...updated[idx], equipped: e.target.checked };
                              handleFieldChange(setInventoryItems, updated);
                            }}
                          />
                          {item.equipped ? 'Equipado' : 'En bolsa'}
                        </label>
                        <input
                          value={item.desc || ''}
                          onChange={(e) => {
                            const updated = [...inventoryItems];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            handleFieldChange(setInventoryItems, updated);
                          }}
                          placeholder="Efectos / notas..."
                          style={{ padding: '5px 8px', background: '#12121c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: 'rgba(255,255,255,0.8)', fontSize: '0.74rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = inventoryItems.filter((_, i) => i !== idx);
                            handleFieldChange(setInventoryItems, updated);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer', padding: '4px' }}
                          title="Eliminar objeto"
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Si es Personaje, hilera de Traits y Enlaces a Inventarios/Memorias */}
            {itemType === 'Personaje' && (
              <>
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
                  {selectedTraits.length < 10 && (() => {
                    const filteredTraits = CHARACTER_TRAITS.filter(tr => 
                      tr.toLowerCase().includes(traitQuery.toLowerCase()) && !selectedTraits.includes(tr)
                    );
                    const customTrait = (traitQuery.trim() && !selectedTraits.includes(traitQuery.trim()) && !filteredTraits.some(t => t.toLowerCase() === traitQuery.trim().toLowerCase()))
                      ? traitQuery.trim()
                      : null;
                    const allTraitOptions = customTrait 
                      ? [{ isCustom: true, label: customTrait }, ...filteredTraits.map(t => ({ isCustom: false, label: t }))] 
                      : filteredTraits.map(t => ({ isCustom: false, label: t }));

                    const handleSelectTrait = (traitText) => {
                      if (traitText && !selectedTraits.includes(traitText) && selectedTraits.length < 10) {
                        setSelectedTraits(prev => [...prev, traitText]);
                        setTraitQuery('');
                        setHighlightedTraitIndex(-1);
                        setShowTraitDropdown(false);
                        setIsDirty(true);
                      }
                    };

                    return (
                      <div style={{ position: 'relative' }}>
                        <input
                          value={traitQuery}
                          onChange={(e) => {
                            setTraitQuery(e.target.value);
                            setShowTraitDropdown(true);
                            setHighlightedTraitIndex(-1);
                          }}
                          onFocus={() => {
                            setShowTraitDropdown(true);
                            setHighlightedTraitIndex(-1);
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowTraitDropdown(false), 200);
                          }}
                          onKeyDown={(e) => {
                            if (!showTraitDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                              setShowTraitDropdown(true);
                              setHighlightedTraitIndex(0);
                              e.preventDefault();
                              return;
                            }
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              if (allTraitOptions.length > 0) {
                                setHighlightedTraitIndex(prev => (prev + 1) % allTraitOptions.length);
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              if (allTraitOptions.length > 0) {
                                setHighlightedTraitIndex(prev => (prev - 1 + allTraitOptions.length) % allTraitOptions.length);
                              }
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (showTraitDropdown && highlightedTraitIndex >= 0 && highlightedTraitIndex < allTraitOptions.length) {
                                handleSelectTrait(allTraitOptions[highlightedTraitIndex].label);
                              } else if (traitQuery.trim()) {
                                handleSelectTrait(traitQuery.trim());
                              }
                            } else if (e.key === 'Escape') {
                              setShowTraitDropdown(false);
                            }
                          }}
                          placeholder="Escribe o selecciona un rasgo..."
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                        />
                        {showTraitDropdown && allTraitOptions.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#14141f',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            zIndex: 100,
                            maxHeight: '160px',
                            overflowY: 'auto',
                            marginTop: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                          }}>
                            {allTraitOptions.map((opt, idx) => (
                              <div
                                key={opt.label}
                                onMouseDown={() => handleSelectTrait(opt.label)}
                                onMouseEnter={() => setHighlightedTraitIndex(idx)}
                                style={{
                                  padding: '8px 10px',
                                  color: idx === highlightedTraitIndex ? '#ffd36b' : '#fff',
                                  background: idx === highlightedTraitIndex ? 'rgba(255, 211, 107, 0.15)' : 'transparent',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  transition: 'background 0.15s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <span>{opt.label}</span>
                                {opt.isCustom && (
                                  <span style={{ fontSize: '0.7rem', color: '#ffd36b', background: 'rgba(255,211,107,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                    + Personalizado
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Inventarios y Memorias Vinculadas al Personaje */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '4px 0 10px 0' }}>
                  {/* Inventarios del personaje */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faBoxes} /> Inventarios
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNestedCardType('Inventario');
                          setNestedCardTitle(`Inventario de ${title || 'Personaje'}`);
                        }}
                        style={{ background: 'rgba(255,211,107,0.15)', border: '1px solid rgba(255,211,107,0.3)', color: '#ffd36b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        + Crear
                      </button>
                    </div>
                    {(() => {
                      const charInventories = (appData.cards || []).filter(c => c.type === 'Inventario' && (c.linkedCharacterId === editItem?.id || (title && c.linkedCharacterId === title)));
                      return charInventories.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {charInventories.map(inv => (
                            <span key={inv.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '3px 6px', fontSize: '0.72rem', color: '#fff' }}>
                              🎒 {inv.title} ({inv.items?.length || 0} items)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Sin inventarios enlazados aún.</span>
                      );
                    })()}
                  </div>

                  {/* Memorias del personaje */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faBrain} /> Memorias
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNestedCardType('Memoria');
                          setNestedCardTitle(`Memoria de ${title || 'Personaje'}`);
                        }}
                        style={{ background: 'rgba(255,211,107,0.15)', border: '1px solid rgba(255,211,107,0.3)', color: '#ffd36b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        + Registrar
                      </button>
                    </div>
                    {(() => {
                      const charMemories = (appData.cards || []).filter(c => c.type === 'Memoria' && (Array.isArray(c.linkedCharacters) && (c.linkedCharacters.includes(editItem?.id) || (title && c.linkedCharacters.includes(title)))));
                      return charMemories.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {charMemories.map(mem => (
                            <div key={mem.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '3px 6px', fontSize: '0.72rem', color: '#eaeaea' }}>
                              🧠 <strong>{mem.title}</strong>: {mem.summary || mem.text}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Sin memorias vinculadas aún.</span>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* Introducción (Solo para Tarjetas estándar que no sean Memoria ni Inventario) */}
            {itemType !== 'Memoria' && itemType !== 'Inventario' && (
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
            )}

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
              /* Campo de Detalles / Lore para tarjetas que no sean Memoria ni Inventario */
              (itemType !== 'Memoria' && itemType !== 'Inventario') && (
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
              )
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
          aspectRatio={(
            cropTarget.includes('character') || (cropTarget === 'nested' && nestedCardType === 'Personaje') || (cropTarget === 'main' && itemType === 'Personaje')
              ? 3 / 4 
              : 16 / 9
          )}
          onClose={() => {
            setIsCropperOpen(false);
            setEditingImageId(null);
            setNestedEditingImageId(null);
          }}
          onCropComplete={(croppedImage) => {
            if (cropTarget === 'character_new') {
              const newImg = {
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                url: croppedImage,
                label: newImageLabel.trim() || (characterImages.length === 0 ? 'Normal / Principal' : `Variante ${characterImages.length + 1}`),
                isDefault: characterImages.length === 0
              };
              setCharacterImages(prev => {
                const next = [...prev, newImg];
                if (next.length === 1) setCover(croppedImage);
                return next;
              });
              setNewImageLabel('');
              setNewImageUrl('');
              setIsDirty(true);
            } else if (cropTarget === 'character_edit') {
              setCharacterImages(prev => prev.map(img => img.id === editingImageId ? { ...img, url: croppedImage } : img));
              const edited = characterImages.find(img => img.id === editingImageId);
              if (edited?.isDefault) setCover(croppedImage);
              setEditingImageId(null);
              setIsDirty(true);
            } else if (cropTarget === 'nested_character_new') {
              const newImg = {
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                url: croppedImage,
                label: newNestedImageLabel.trim() || (nestedCharacterImages.length === 0 ? 'Normal / Principal' : `Variante ${nestedCharacterImages.length + 1}`),
                isDefault: nestedCharacterImages.length === 0
              };
              setNestedCharacterImages(prev => {
                const next = [...prev, newImg];
                if (next.length === 1) setNestedCardCover(croppedImage);
                return next;
              });
              setNewNestedImageLabel('');
              setNewNestedImageUrl('');
              setIsDirty(true);
            } else if (cropTarget === 'nested_character_edit') {
              setNestedCharacterImages(prev => prev.map(img => img.id === nestedEditingImageId ? { ...img, url: croppedImage } : img));
              const edited = nestedCharacterImages.find(img => img.id === nestedEditingImageId);
              if (edited?.isDefault) setNestedCardCover(croppedImage);
              setNestedEditingImageId(null);
              setIsDirty(true);
            } else if (cropTarget === 'nested' || cropTarget === 'nested_single') {
              setNestedCardCover(croppedImage);
              setIsDirty(true);
            } else {
              handleFieldChange(setCover, croppedImage);
            }
          }}
        />

        {/* Modal de Recorte y Etiquetado por Lotes (Batch Cropper) */}
        <BatchCropperModal
          isOpen={isBatchCropperOpen}
          items={batchCropItems}
          aspectRatio={3 / 4}
          onClose={() => setIsBatchCropperOpen(false)}
          onSaveBatch={handleSaveBatchCropped}
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
              maxWidth: '520px',
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

              {/* Portada / Galería de Expresiones In-Situ */}
              {nestedCardType === 'Personaje' ? (
                <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    <FontAwesomeIcon icon={faImage} /> Imágenes y Expresiones del Personaje ({nestedCharacterImages.length})
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '10px' }}>
                    Añade retratos con identificadores (ej: Normal, Alegre, Enfadado, Con armadura).
                  </span>

                  {/* Lista de Imágenes Existentes */}
                  {nestedCharacterImages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                      {nestedCharacterImages.map((img, idx) => (
                        <div 
                          key={img.id || idx}
                          style={{
                            background: img.isDefault ? 'rgba(255, 211, 107, 0.08)' : 'rgba(255,255,255,0.03)',
                            border: img.isDefault ? '1.5px solid rgba(255, 211, 107, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                          }}
                        >
                          {img.isDefault && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                              color: '#000',
                              fontSize: '0.62rem',
                              fontWeight: 'bold',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              zIndex: 3
                            }}>
                              Portada
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveNestedCharacterImage(img.id)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.65)',
                              border: 'none',
                              color: '#ff6b6b',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              zIndex: 3
                            }}
                          >
                            ×
                          </button>

                          <div 
                            style={{
                              height: '100px',
                              backgroundImage: `url(${img.url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundColor: '#0a0a12'
                            }}
                          />

                          <div style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                              type="text"
                              value={img.label || ''}
                              onChange={(e) => handleUpdateNestedCharacterImageLabel(img.id, e.target.value)}
                              placeholder="Ej: Alegre, Armadura..."
                              style={{
                                width: '100%',
                                padding: '3px 5px',
                                background: '#14141f',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '0.7rem',
                                boxSizing: 'border-box'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'space-between' }}>
                              {!img.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultNestedCharacterImage(img.id)}
                                  style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffd36b',
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Principal
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleReCropNestedCharacterImage(img)}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#eaeaea',
                                  padding: '2px 5px',
                                  borderRadius: '3px',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <FontAwesomeIcon icon={faCrop} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario Añadir Imagen In-Situ */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', border: '1px dashed rgba(255,211,107,0.25)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        value={newNestedImageLabel}
                        onChange={(e) => setNewNestedImageLabel(e.target.value)}
                        placeholder="Emoción (ej: Alegre, Armadura)..."
                        style={{ width: '100%', padding: '5px 7px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#fff', fontSize: '0.74rem', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex' }}>
                        <input
                          type="text"
                          value={newNestedImageUrl}
                          onChange={(e) => setNewNestedImageUrl(e.target.value)}
                          placeholder="https://... o sube"
                          style={{ flex: 1, padding: '5px 7px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px 0 0 4px', color: '#fff', fontSize: '0.74rem', boxSizing: 'border-box', borderRight: 'none' }}
                        />
                        <button
                          type="button"
                          disabled={!newNestedImageUrl.trim()}
                          onClick={() => {
                            if (newNestedImageUrl.trim()) {
                              setCropSrc(newNestedImageUrl.trim());
                              setCropTarget('nested_character_new');
                              setIsCropperOpen(true);
                            }
                          }}
                          style={{
                            background: newNestedImageUrl.trim() ? '#ffd36b' : 'rgba(255,255,255,0.05)',
                            color: newNestedImageUrl.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '0 4px 4px 0',
                            padding: '0 8px',
                            cursor: newNestedImageUrl.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '0.72rem',
                            fontWeight: 'bold'
                          }}
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => document.getElementById('nested-char-file-input')?.click()}
                        style={{
                          background: 'rgba(255, 211, 107, 0.15)',
                          border: '1px solid rgba(255, 211, 107, 0.3)',
                          color: '#ffd36b',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FontAwesomeIcon icon={faImages} /> Subir archivo(s) del PC
                      </button>
                      <input
                        id="nested-char-file-input"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          handleMultipleFilesSelected(files, 'nested');
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Portada estándar para otros tipos in-situ */
                <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Imagen de Portada
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '90px',
                      height: '55px',
                      borderRadius: '6px',
                      background: nestedCardCover ? `url(${nestedCardCover}) center/cover no-repeat` : 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.7rem',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {!nestedCardCover && <span>Sin foto</span>}
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="text"
                          value={nestedCardCover}
                          onChange={(e) => setNestedCardCover(e.target.value)}
                          placeholder="https://... o sube archivo"
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            background: '#1e1e2c',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px 0 0 6px',
                            borderRight: 'none',
                            color: '#fff',
                            boxSizing: 'border-box',
                            fontSize: '0.8rem'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('nested-cover-file-input')?.click()}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderLeft: 'none',
                            color: '#fff',
                            padding: '0 12px',
                            borderRadius: '0 6px 6px 0',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Seleccionar archivo
                        </button>
                        <input
                          id="nested-cover-file-input"
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
                                setCropTarget('nested_single');
                                setIsCropperOpen(true);
                              }
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Pega una URL o sube una imagen de tu ordenador con recorte.
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
              {nestedCardType === 'Personaje' && (() => {
                const filteredNestedTraits = CHARACTER_TRAITS.filter(tr => 
                  tr.toLowerCase().includes(nestedTraitQuery.toLowerCase()) && !nestedCardTraits.includes(tr)
                );
                const customNestedTrait = (nestedTraitQuery.trim() && !nestedCardTraits.includes(nestedTraitQuery.trim()) && !filteredNestedTraits.some(t => t.toLowerCase() === nestedTraitQuery.trim().toLowerCase()))
                  ? nestedTraitQuery.trim()
                  : null;
                const allNestedTraitOptions = customNestedTrait 
                  ? [{ isCustom: true, label: customNestedTrait }, ...filteredNestedTraits.map(t => ({ isCustom: false, label: t }))] 
                  : filteredNestedTraits.map(t => ({ isCustom: false, label: t }));

                const handleSelectNestedTrait = (traitText) => {
                  if (traitText && !nestedCardTraits.includes(traitText) && nestedCardTraits.length < 10) {
                    setNestedCardTraits(prev => [...prev, traitText]);
                    setNestedTraitQuery('');
                    setHighlightedNestedTraitIndex(-1);
                    setShowNestedTraitDropdown(false);
                  }
                };

                return (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Traits (Rasgos de Personalidad - Máx. 10)</label>
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
                          setHighlightedNestedTraitIndex(-1);
                        }}
                        onFocus={() => {
                          setShowNestedTraitDropdown(true);
                          setHighlightedNestedTraitIndex(-1);
                        }}
                        onBlur={() => setTimeout(() => setShowNestedTraitDropdown(false), 200)}
                        onKeyDown={(e) => {
                          if (!showNestedTraitDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                            setShowNestedTraitDropdown(true);
                            setHighlightedNestedTraitIndex(0);
                            e.preventDefault();
                            return;
                          }
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (allNestedTraitOptions.length > 0) {
                              setHighlightedNestedTraitIndex(prev => (prev + 1) % allNestedTraitOptions.length);
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (allNestedTraitOptions.length > 0) {
                              setHighlightedNestedTraitIndex(prev => (prev - 1 + allNestedTraitOptions.length) % allNestedTraitOptions.length);
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (showNestedTraitDropdown && highlightedNestedTraitIndex >= 0 && highlightedNestedTraitIndex < allNestedTraitOptions.length) {
                              handleSelectNestedTrait(allNestedTraitOptions[highlightedNestedTraitIndex].label);
                            } else if (nestedTraitQuery.trim()) {
                              handleSelectNestedTrait(nestedTraitQuery.trim());
                            }
                          } else if (e.key === 'Escape') {
                            setShowNestedTraitDropdown(false);
                          }
                        }}
                        placeholder="Buscar o añadir rasgo..."
                        style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', fontSize: '0.82rem' }}
                      />
                      {showNestedTraitDropdown && allNestedTraitOptions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#14141f',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px',
                          zIndex: 1500,
                          maxHeight: '130px',
                          overflowY: 'auto',
                          marginTop: '4px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                          {allNestedTraitOptions.map((opt, idx) => (
                            <div
                              key={opt.label}
                              onMouseDown={() => handleSelectNestedTrait(opt.label)}
                              onMouseEnter={() => setHighlightedNestedTraitIndex(idx)}
                              style={{
                                padding: '8px 10px',
                                color: idx === highlightedNestedTraitIndex ? '#ffd36b' : '#fff',
                                background: idx === highlightedNestedTraitIndex ? 'rgba(255, 211, 107, 0.15)' : 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                transition: 'background 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>{opt.label}</span>
                              {opt.isCustom && (
                                <span style={{ fontSize: '0.7rem', color: '#ffd36b', background: 'rgba(255,211,107,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                  + Personalizado
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
