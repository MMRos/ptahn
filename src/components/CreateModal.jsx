import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faSave, 
  faImage, 
  faImages, 
  faMagic, 
  faEdit, 
  faRedo 
} from '@fortawesome/free-solid-svg-icons';
import NarratorForm from './NarratorForm';
import ToolWorkshopForm from './ToolWorkshopForm';
import { generateImageLocal, editImageWithAI } from '../utils/localAIStudio';
import { enhanceFieldWithAI, autoCompleteEntityWithAI } from '../utils/aiEnhancer';
import '../pages/create.css';

const CARD_TYPES = ['Personaje', 'Historia', 'Inventario', 'Memoria', 'Raza', 'Facción', 'Regla', 'Criatura', 'Objeto', 'Lugar', 'Otros'];
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

export default function CreateModal({
  isOpen = false,
  onClose = () => { },
  initialType = 'Personaje', // Default a Personaje
  appData = {},
  onSaveItem = () => { },
  editItem = null
}) {
  const [itemType, setItemType] = useState(initialType || 'Personaje');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // States para Tarjeta y Escenario
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
      const [intro, setIntro] = useState('');
  const [text, setText] = useState('');
  const [cover, setCover] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [isScenario, setIsScenario] = useState(false);

  // States para rasgos de personaje (Traits)
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [traitQuery, setTraitQuery] = useState('');
  
  // States para etiquetas (Tags) y Llamadas (Call Words)
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagQuery, setTagQuery] = useState('');
  const [callWords, setCallWords] = useState('');

  // States para clasificación on-demand y presets de imágenes
        
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
  const [narratorTools, setNarratorTools] = useState([]);

  // States para Herramienta (Taller de Funciones)
  const [toolWorkshopType, setToolWorkshopType] = useState('attributes');
  const [toolWorkshopDesc, setToolWorkshopDesc] = useState('');
  const [toolWorkshopConfig, setToolWorkshopConfig] = useState({});

  // States para Tarjeta de Memoria
  const [memorySummary, setMemorySummary] = useState('');
  const [memoryImpact, setMemoryImpact] = useState('Medio');
  const [memoryCharacters, setMemoryCharacters] = useState([]);
  const [memoryScenario, setMemoryScenario] = useState('');
  const [memoryTimeline, setMemoryTimeline] = useState('');

  // States para Tarjeta de Inventario
  const [inventoryOwnerCharId, setInventoryOwnerCharId] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryCapacity, setInventoryCapacity] = useState('20 kg / 10 slots');

  // Estado para generación de imágenes con IA local
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [coverAiPrompt, setCoverAiPrompt] = useState('');
  const [coverAiStyle, setCoverAiStyle] = useState('Fantasía Oscura / Entornos');
  const [charAiPrompt, setCharAiPrompt] = useState('');

  // Multi-guidance / Guías visuales de referencia
  const [selectedGuideIds, setSelectedGuideIds] = useState([]);
  const [lastGenParams, setLastGenParams] = useState(null);

  // Modal para edición específica de imagen con IA (In-place img2img)
  const [editingImageModalTarget, setEditingImageModalTarget] = useState(null); // img object
  const [editImagePromptText, setEditImagePromptText] = useState('');
  const [isApplyingImageEdit, setIsApplyingImageEdit] = useState(false);

  // Estados de Asistencia IA por campo
  const [isEnhancingField, setIsEnhancingField] = useState(null); // 'title' | 'intro' | 'text' | 'traits' | 'tags' | 'scenario_presentation' | 'scenario_context' | 'scenario_instructions'
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  // Crop state inside modal
        
  // Batch Crop state (subida múltiple)
      
  // Galería de imágenes y expresiones del personaje
  const [characterImages, setCharacterImages] = useState([]);
    
  // Highlight indices para navegación por teclado
        
  // States para creación / edición de tarjeta anidada (in-situ)
                            
  // Role / Playability states for Character: DEFAULT A 'npc' (No Jugable)
  const [characterRole, setCharacterRole] = useState('npc');
  
  // Context & Weight controls
  const [importance, setImportance] = useState(5);
  const [isPinned, setIsPinned] = useState(false);
  const [activationMode, setActivationMode] = useState('dynamic');

  // Nested card context controls
      
  // Sincronizar estados cuando se abre el modal o cambia el item a editar
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
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
                    setIntro(editItem.intro || '');
          setText(editItem.text || '');
          setCover(editItem.cover || '');
          setPresentation(editItem.presentation || '');
          setBaseContext(editItem.baseContext || '');
          setAiInstructions(editItem.aiInstructions || '');
          setSelectedTags(editItem.tags || []);
          setSelectedCards(editItem.cards || []);
          setScenarioNarrator(editItem.narrator || '');
          setIsPublic(!!editItem.public);
          setNsfw(!!editItem.nsfw);
          setIsScenario(false);
        } else {
          // Es una Tarjeta
          setItemType(editItem.type || 'Personaje');
          setTitle(editItem.title || editItem.name || '');
          setIntro(editItem.intro || '');
          setText(editItem.text || '');
          setCover(editItem.cover || '');
          setNsfw(!!editItem.nsfw);
          setSelectedTags(editItem.tags || []);
          setCallWords(Array.isArray(editItem.callWords) ? editItem.callWords.join(', ') : (editItem.callWords || ''));
          setSelectedCards(editItem.connectedCards || []);
          setSelectedTraits(editItem.traits || []);
          setIsPublic(!!editItem.public);
          setIsScenario(false);

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

          if (editItem.type === 'Inventario') {
            setInventoryOwnerCharId(editItem.linkedCharacterId || '');
            setInventoryItems(Array.isArray(editItem.items) ? editItem.items : []);
            setInventoryCapacity(editItem.capacity || '20 kg / 10 slots');
          } else {
            setInventoryOwnerCharId('');
            setInventoryItems([]);
            setInventoryCapacity('20 kg / 10 slots');
          }

          if (editItem.type === 'Personaje') {
            const role = editItem.characterRole || (editItem.isPlayable ? 'playable' : (editItem.isUserPersona ? 'user_persona' : 'npc'));
            setCharacterRole(role);
          } else {
            setCharacterRole('npc');
          }

          setImportance(typeof editItem.importance === 'number' ? editItem.importance : 5);
          setIsPinned(Boolean(editItem.isPinned));
          setActivationMode(editItem.activationMode || 'dynamic');

          if (Array.isArray(editItem.images) && editItem.images.length > 0) {
            setCharacterImages(editItem.images);
            const def = editItem.images.find(img => img.isDefault) || editItem.images[0];
            setSelectedGuideIds(def ? [def.id] : []);
          } else if (editItem.cover) {
            const initialImg = { id: 'img-default', url: editItem.cover, label: 'Normal / Principal', isDefault: true };
            setCharacterImages([initialImg]);
            setSelectedGuideIds(['img-default']);
          } else {
            setCharacterImages([]);
            setSelectedGuideIds([]);
          }
                            }
      } else {
        // Nuevo elemento: REINICIO LIMPIO TOTAL
        setItemType(initialType || 'Personaje');
        setTitle('');
        setCharacterRole('npc'); // Default a No Jugable (PNJ)
                setImportance(5);
        setIsPinned(false);
        setActivationMode('dynamic');
                        
        setCategory(CATEGORIES[0]);
                setIntro('');
        setText(''); // Limpieza obligatoria del texto
        setCover('');
        setPresentation('');
        setBaseContext('');
        setAiInstructions('');
        setSelectedTags([]);
        setCallWords('');
        setSelectedCards([]);
        setSelectedTraits([]);
        setScenarioNarrator('');
        setIsScenario(false);
        setNsfw(false);
        setIsPublic(false);

        // Limpieza de imágenes
        setCharacterImages([]);
        setSelectedGuideIds([]);
        setLastGenParams(null);
        setCoverAiPrompt('');
        setCharAiPrompt('');

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
      }

      setIsDirty(false);
      setShowUnsavedWarning(false);
    }
  }, [isOpen, editItem, initialType]);

  // Si no está abierto el modal, no renderizar nada
  if (!isOpen) return null;

  const isWide = itemType === 'Escenario' || (itemType === 'Narrador' && narratorTools.length > 0);

  // AI Field Enhancement Handler
  const handleEnhanceField = async (field) => {
    setIsEnhancingField(field);
    try {
      const entityContext = {
        title,
        type: itemType,
        characterRole,
        intro,
        text,
        category,
        traits: selectedTraits,
        tags: selectedTags
      };

      const result = await enhanceFieldWithAI({
        fieldType: field,
        entityType: itemType,
        currentValue: field === 'title' ? title : field === 'intro' ? intro : field === 'text' || field === 'lore' ? text : field === 'scenario_presentation' ? presentation : field === 'scenario_context' ? baseContext : field === 'scenario_instructions' ? aiInstructions : '',
        entityContext
      });

      if (field === 'title' && typeof result === 'string') {
        setTitle(result);
      } else if (field === 'intro' && typeof result === 'string') {
        setIntro(result);
      } else if ((field === 'text' || field === 'lore') && typeof result === 'string') {
        setText(result);
      } else if (field === 'traits' && Array.isArray(result)) {
        const merged = Array.from(new Set([...selectedTraits, ...result])).slice(0, 10);
        setSelectedTraits(merged);
      } else if (field === 'tags' && Array.isArray(result)) {
        const merged = Array.from(new Set([...selectedTags, ...result])).slice(0, 5);
        setSelectedTags(merged);
      } else if (field === 'scenario_presentation' && typeof result === 'string') {
        setPresentation(result);
      } else if (field === 'scenario_context' && typeof result === 'string') {
        setBaseContext(result);
      } else if (field === 'scenario_instructions' && typeof result === 'string') {
        setAiInstructions(result);
      }

      setIsDirty(true);
    } catch (err) {
      alert(`No se pudo conectar con el modelo IA para mejorar este campo. Revisa que el motor de IA esté activo.`);
    } finally {
      setIsEnhancingField(null);
    }
  };

  // AI Auto-Complete All Handler
  const handleAutoCompleteAll = async () => {
    setIsAutoCompleting(true);
    try {
      const data = await autoCompleteEntityWithAI({
        entityType: itemType,
        title,
        category,
        characterRole
      });

      if (data.title) setTitle(data.title);
      if (data.intro) setIntro(data.intro);
      if (data.text) setText(data.text);
      if (Array.isArray(data.traits)) setSelectedTraits(data.traits.slice(0, 8));
      if (Array.isArray(data.tags)) setSelectedTags(data.tags.slice(0, 5));
      if (Array.isArray(data.callWords)) setCallWords(data.callWords.join(', '));

      if (itemType === 'Escenario') {
        if (data.presentation) setPresentation(data.presentation);
        if (data.baseContext) setBaseContext(data.baseContext);
        if (data.aiInstructions) setAiInstructions(data.aiInstructions);
      }

      setIsDirty(true);
    } catch (err) {
      alert(`No se pudo autocompletar la entidad con IA. Revisa la consola o asegúrate de que el modelo local esté cargado.`);
    } finally {
      setIsAutoCompleting(false);
    }
  };

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
        updatedAt: new Date().toISOString()
      };
      if (!editItem) toolData.createdAt = new Date().toISOString();
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
        updatedAt: new Date().toISOString()
      };
      if (!editItem) narratorData.createdAt = new Date().toISOString();
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
        callWords: typeof callWords === 'string' ? callWords.split(',').map(s => s.trim()).filter(Boolean) : (callWords || []),
        connectedCards: selectedCards,
        traits: itemType === 'Personaje' ? selectedTraits : [],
        characterRole: itemType === 'Personaje' ? characterRole : undefined,
        isPlayable: itemType === 'Personaje' ? (characterRole === 'playable') : undefined,
        isUserPersona: itemType === 'Personaje' ? (characterRole === 'user_persona') : undefined,
        importance: typeof importance === 'number' ? importance : 5,
        isPinned: Boolean(isPinned),
        activationMode: activationMode || 'dynamic',
        public: isPublic,
        ...(itemType === 'Memoria' ? {
          summary: memorySummary.trim() || intro.trim(),
          impact: memoryImpact,
          linkedCharacters: memoryCharacters,
          linkedScenario: memoryScenario,
          timeline: memoryTimeline.trim()
        } : {}),
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
    setSelectedGuideIds(prev => prev.filter(gId => gId !== id));
    setIsDirty(true);
  };

  const handleToggleGuideSelection = (id) => {
    setSelectedGuideIds(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleGenerateAiImage = async (target = 'char') => {
    const rawPrompt = target === 'char' ? charAiPrompt : coverAiPrompt;
    if (!rawPrompt.trim() && !title.trim()) {
      alert('Introduce una descripción o nombre para guiar la generación de la imagen.');
      return;
    }

    setIsGeneratingAiImage(true);
    try {
      // Gather reference images selected by user
      const guideImages = characterImages.filter(img => selectedGuideIds.includes(img.id)).map(img => img.url);

      const promptToUse = rawPrompt.trim() || `${title}. ${intro || ''}`;
      const isPortrait = itemType === 'Personaje' || target === 'char';
      const width = isPortrait ? 512 : 768;
      const height = isPortrait ? 768 : 512;

      setLastGenParams({
        prompt: promptToUse,
        style: coverAiStyle,
        target,
        width,
        height,
        guides: guideImages
      });

      const generatedUrl = await generateImageLocal(promptToUse, {
        style: coverAiStyle,
        width,
        height,
        referenceImages: guideImages
      });

      if (generatedUrl) {
        if (target === 'char' || itemType === 'Personaje') {
          const newImg = {
            id: `expr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: generatedUrl,
            label: rawPrompt.trim() || (characterImages.length === 0 ? 'Normal / Principal' : `Expresión ${characterImages.length + 1}`),
            isDefault: characterImages.length === 0
          };
          setCharacterImages(prev => [...prev, newImg]);
          if (characterImages.length === 0) {
            setCover(generatedUrl);
            setSelectedGuideIds([newImg.id]);
          }
        } else {
          setCover(generatedUrl);
        }
        setIsDirty(true);
      }
    } catch (err) {
      alert(`Error al generar imagen con IA: ${err.message}`);
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleRetryLastImageGen = async () => {
    if (!lastGenParams) return;
    setIsGeneratingAiImage(true);
    try {
      const generatedUrl = await generateImageLocal(lastGenParams.prompt, {
        style: lastGenParams.style,
        width: lastGenParams.width,
        height: lastGenParams.height,
        referenceImages: lastGenParams.guides,
        seed: Math.floor(Math.random() * 99999999)
      });

      if (generatedUrl) {
        if (lastGenParams.target === 'char' || itemType === 'Personaje') {
          const newImg = {
            id: `expr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: generatedUrl,
            label: `Variación ${lastGenParams.prompt}`,
            isDefault: false
          };
          setCharacterImages(prev => [...prev, newImg]);
        } else {
          setCover(generatedUrl);
        }
        setIsDirty(true);
      }
    } catch (err) {
      alert(`Error al reintentar generación: ${err.message}`);
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Specific Image In-place Modification (img2img)
  const handleOpenEditImageModal = (img) => {
    setEditingImageModalTarget(img);
    setEditImagePromptText('');
  };

  const handleApplyImageEdit = async () => {
    if (!editingImageModalTarget || !editImagePromptText.trim()) return;
    setIsApplyingImageEdit(true);
    try {
      const editedUrl = await editImageWithAI({
        imageSrc: editingImageModalTarget.url,
        instructions: editImagePromptText.trim(),
        entityContext: { title, type: itemType, intro },
        options: {
          style: coverAiStyle,
          width: itemType === 'Personaje' ? 512 : 768,
          height: itemType === 'Personaje' ? 768 : 512
        }
      });

      if (editedUrl) {
        const newImg = {
          id: `expr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          url: editedUrl,
          label: `${editingImageModalTarget.label || 'Imagen'} [Mod: ${editImagePromptText.trim()}]`,
          isDefault: false
        };
        setCharacterImages(prev => [...prev, newImg]);
        setIsDirty(true);
        setEditingImageModalTarget(null);
      }
    } catch (err) {
      alert(`Error al modificar imagen con IA: ${err.message}`);
    } finally {
      setIsApplyingImageEdit(false);
    }
  };

  const handleUpdateCharacterImageTags = (id, newTags) => {
    setCharacterImages(prev => prev.map(img => img.id === id ? { ...img, tags: newTags, label: img.label || newTags } : img));
    setIsDirty(true);
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

  const modalContent = (
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1200 }} onClick={handleBackdropClick}>
      <div className="char-modal" style={{
        width: isWide ? '82vw' : '100%',
        maxWidth: isWide ? '1200px' : '620px',
        maxHeight: '90vh',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        borderRadius: '16px',
        border: '1px solid rgba(255, 211, 107, 0.25)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.85)'
      }}>

        {/* 1. BARRA SUPERIOR CONSTANTE (STICKY HEADER) */}
        <div className="create-modal-sticky-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(18, 16, 26, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 211, 107, 0.18)',
          padding: '12px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0
        }}>
          {/* Fila principal: Tipo, Nombre/Título con IA, Público, NSFW, Guardar y Cerrar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Lado izquierdo: Selector de Tipo + Input de Nombre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', minWidth: '220px' }}>
              <select
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value);
                  setIsDirty(true);
                }}
                style={{
                  background: 'rgba(255, 211, 107, 0.12)',
                  border: '1px solid rgba(255, 211, 107, 0.4)',
                  color: '#ffd36b',
                  borderRadius: '7px',
                  padding: '7px 10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {CARD_TYPES.map(t => <option key={t} value={t} style={{ background: '#1a1a28', color: '#fff' }}>{t}</option>)}
                <option value="Escenario" style={{ background: '#1a1a28', color: '#ffd36b' }}>Escenario</option>
                <option value="Narrador" style={{ background: '#1a1a28', color: '#6ee7b7' }}>Narrador</option>
                <option value="Herramienta" style={{ background: '#1a1a28', color: '#93c5fd' }}>Herramienta</option>
              </select>

              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                  placeholder={`Nombre o título ${itemType === 'Escenario' ? 'del escenario' : 'de la tarjeta'}...`}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '7px',
                    padding: '7px 32px 7px 10px',
                    color: '#fff',
                    fontSize: '0.92rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleEnhanceField('title')}
                  disabled={isEnhancingField === 'title'}
                  title="Sugerir o mejorar nombre con IA"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffd36b',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '0.85rem'
                  }}
                >
                  <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'title'} />
                </button>
              </div>
            </div>

            {/* Lado derecho: Toggles, Auto-rellenar, Guardar y Cerrar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {itemType !== 'Narrador' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isPublic ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isPublic ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '4px 7px',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    color: isPublic ? '#ffd36b' : 'rgba(255,255,255,0.7)',
                    fontWeight: '600',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => handleFieldChange(setIsPublic, e.target.checked)}
                      style={{ cursor: 'pointer', margin: 0, accentColor: '#ffd36b' }}
                    />
                    <span>🌐 Público</span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: nsfw ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: nsfw ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '4px 7px',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    color: nsfw ? '#fca5a5' : 'rgba(255,255,255,0.7)',
                    fontWeight: '600',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={nsfw}
                      onChange={(e) => handleFieldChange(setNsfw, e.target.checked)}
                      style={{ cursor: 'pointer', margin: 0, accentColor: '#ef4444' }}
                    />
                    <span>🔞 NSFW</span>
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={handleAutoCompleteAll}
                disabled={isAutoCompleting}
                title="Auto-completar todos los campos con IA"
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(129, 140, 248, 0.5)',
                  color: '#c7d2fe',
                  fontWeight: '700',
                  padding: '6px 9px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FontAwesomeIcon icon={faMagic} spin={isAutoCompleting} /> Auto-IA
              </button>

              <button
                onClick={handleSave}
                style={{
                  background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '700',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FontAwesomeIcon icon={faSave} /> Guardar
              </button>


            </div>
          </div>
        </div>

        {/* 2. CUERPO DEL FORMULARIO CON SCROLL */}
        <div style={{
          padding: '18px 22px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>

          {/* Formulario de Herramienta */}
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
              onOpenToolCreator={() => setItemType('Herramienta')}
            />
          )}

          {/* Formularios de Tarjeta y Escenario */}
          {itemType !== 'Narrador' && itemType !== 'Herramienta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Rol y Jugabilidad del Personaje */}
              {itemType === 'Personaje' && (
                <div style={{
                  background: 'rgba(255, 211, 107, 0.04)',
                  border: '1px solid rgba(255, 211, 107, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}>
                  <label style={{ fontSize: '0.8rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    🎭 Rol del Personaje
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <label
                      title="No Jugable: Personaje no jugador (PNJ / NPC) interpretado por la IA o Narrador"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: characterRole === 'npc' ? 'rgba(147, 197, 253, 0.18)' : 'rgba(255,255,255,0.03)',
                        border: characterRole === 'npc' ? '1px solid #93c5fd' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: characterRole === 'npc' ? '#93c5fd' : 'rgba(255,255,255,0.85)',
                        fontWeight: characterRole === 'npc' ? '700' : '500',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <input
                        type="radio"
                        name="charRoleMainGroup"
                        checked={characterRole === 'npc'}
                        onChange={() => {
                          setCharacterRole('npc');
                          setIsDirty(true);
                        }}
                        style={{ cursor: 'pointer', margin: 0 }}
                      />
                      <span>👥 No Jugable (PNJ)</span>
                    </label>

                    <label
                      title="Jugable: Personaje predefinido disponible para que cualquier usuario lo elija al jugar este escenario"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: characterRole === 'playable' ? 'rgba(110, 231, 183, 0.18)' : 'rgba(255,255,255,0.03)',
                        border: characterRole === 'playable' ? '1px solid #6ee7b7' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: characterRole === 'playable' ? '#6ee7b7' : 'rgba(255,255,255,0.85)',
                        fontWeight: characterRole === 'playable' ? '700' : '500',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <input
                        type="radio"
                        name="charRoleMainGroup"
                        checked={characterRole === 'playable'}
                        onChange={() => {
                          setCharacterRole('playable');
                          setIsDirty(true);
                        }}
                        style={{ cursor: 'pointer', margin: 0 }}
                      />
                      <span>🎮 Jugable</span>
                    </label>

                    <label
                      title="Persona: Tu alter-ego preferido para interpretar en historias y chats"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: characterRole === 'user_persona' ? 'rgba(255, 211, 107, 0.18)' : 'rgba(255,255,255,0.03)',
                        border: characterRole === 'user_persona' ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: characterRole === 'user_persona' ? '#ffd36b' : 'rgba(255,255,255,0.85)',
                        fontWeight: characterRole === 'user_persona' ? '700' : '500',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <input
                        type="radio"
                        name="charRoleMainGroup"
                        checked={characterRole === 'user_persona'}
                        onChange={() => {
                          setCharacterRole('user_persona');
                          setIsDirty(true);
                        }}
                        style={{ cursor: 'pointer', margin: 0 }}
                      />
                      <span>👤 Persona</span>
                    </label>
                  </div>
                </div>
              )}

              {/* SECCIÓN DE IMÁGENES, EXPRESIONES, GUÍAS MÚLTIPLES Y RETRY */}
              <div className="field-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FontAwesomeIcon icon={faImage} /> Imágenes y Expresiones ({characterImages.length})
                  </label>
                  {lastGenParams && (
                    <button
                      type="button"
                      onClick={handleRetryLastImageGen}
                      disabled={isGeneratingAiImage}
                      title="Reintentar última generación con nueva semilla"
                      style={{
                        background: 'rgba(255, 211, 107, 0.1)',
                        border: '1px solid rgba(255, 211, 107, 0.3)',
                        color: '#ffd36b',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FontAwesomeIcon icon={faRedo} spin={isGeneratingAiImage} /> Reintentar Imagen
                    </button>
                  )}
                </div>

                {/* Guías Visuales de Referencia si hay imágenes existentes */}
                {characterImages.length > 0 && (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faImages} /> Guías visuales de referencia ({selectedGuideIds.length} seleccionadas)
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {characterImages.map(img => {
                        const isSelectedGuide = selectedGuideIds.includes(img.id);
                        return (
                          <div
                            key={img.id}
                            onClick={() => handleToggleGuideSelection(img.id)}
                            style={{
                              position: 'relative',
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: isSelectedGuide ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              opacity: isSelectedGuide ? 1 : 0.45,
                              flexShrink: 0
                            }}
                            title={`${img.label || 'Imagen'} (Clic para usar como guía visual)`}
                          >
                            <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {isSelectedGuide && (
                              <div style={{ position: 'absolute', top: 2, right: 2, background: '#818cf8', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000' }}>
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Generador de imágenes */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={charAiPrompt}
                    onChange={(e) => setCharAiPrompt(e.target.value)}
                    placeholder="Descripción visual / Expresión (ej. sonriendo, cabello rojo, armadura ligera)..."
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  />
                  <select
                    value={coverAiStyle}
                    onChange={(e) => setCoverAiStyle(e.target.value)}
                    style={{
                      background: '#1a1a24',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '7px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="Anime / Ilustración Estilizada 2.5D">Anime / 2.5D</option>
                    <option value="Fantasía Oscura / Entornos">Fantasía Oscura</option>
                    <option value="Cyberpunk / Neón">Cyberpunk</option>
                    <option value="Fotorealista / Retrato">Fotorealista</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleGenerateAiImage('char')}
                    disabled={isGeneratingAiImage}
                    style={{
                      background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                      border: 'none',
                      color: '#000',
                      fontWeight: '700',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FontAwesomeIcon icon={faMagic} spin={isGeneratingAiImage} /> Generar
                  </button>
                </div>

                {/* Galería de Expresiones */}
                {characterImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    {characterImages.map(img => (
                      <div
                        key={img.id}
                        style={{
                          background: 'rgba(20,18,30,0.85)',
                          border: img.isDefault ? '2px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ position: 'relative', height: '110px' }}>
                          <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {img.isDefault && (
                            <span style={{ position: 'absolute', top: 4, left: 4, background: '#ffd36b', color: '#000', fontSize: '0.65rem', fontWeight: '800', padding: '1px 5px', borderRadius: '4px' }}>
                              Principal
                            </span>
                          )}
                          <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditImageModal(img)}
                              title="Modificar esta imagen con IA (img2img)"
                              style={{ background: 'rgba(99, 102, 241, 0.85)', border: 'none', color: '#fff', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharacterImage(img.id)}
                              title="Eliminar expresión"
                              style={{ background: 'rgba(239, 68, 68, 0.85)', border: 'none', color: '#fff', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        </div>
                        <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input
                            type="text"
                            value={img.label || ''}
                            onChange={(e) => handleUpdateCharacterImageTags(img.id, e.target.value)}
                            placeholder="Etiqueta / Expresión"
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.72rem', width: '100%', outline: 'none' }}
                          />
                          {!img.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultCharacterImage(img.id)}
                              style={{ background: 'rgba(255,211,107,0.1)', border: '1px solid rgba(255,211,107,0.2)', color: '#ffd36b', fontSize: '0.68rem', borderRadius: '4px', padding: '2px', cursor: 'pointer' }}
                            >
                              Hacer Principal
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INTRODUCCIÓN / SALUDO INICIAL */}
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                    {itemType === 'Escenario' ? 'Introducción / Sinopsis' : 'Introducción / Saludo Inicial'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceField('intro')}
                    disabled={isEnhancingField === 'intro'}
                    style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                  >
                    <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'intro'} /> Mejorar con IA
                  </button>
                </div>
                <textarea
                  value={intro}
                  onChange={(e) => handleFieldChange(setIntro, e.target.value)}
                  placeholder="Escribe el primer contacto o introducción..."
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* DESCRIPCIÓN DETALLADA / APARIENCIA / LORE */}
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                    Descripción Detallada / Apariencia y Lore
                  </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceField('lore')}
                    disabled={isEnhancingField === 'lore'}
                    style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                  >
                    <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'lore'} /> Expandir con IA
                  </button>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => handleFieldChange(setText, e.target.value)}
                  placeholder="Detalles visuales, vestimenta, peinado, personalidad, historia..."
                  rows={5}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* RASGOS DE PERSONALIDAD (TRAITS) PARA PERSONAJE */}
              {itemType === 'Personaje' && (
                <div className="field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                      Rasgos de Personalidad ({selectedTraits.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => handleEnhanceField('traits')}
                      disabled={isEnhancingField === 'traits'}
                      style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                    >
                      <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'traits'} /> Sugerir Rasgos
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                    {selectedTraits.map(t => (
                      <span
                        key={t}
                        style={{
                          background: 'rgba(255, 211, 107, 0.1)',
                          border: '1px solid rgba(255, 211, 107, 0.25)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          color: '#ffd36b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTraits(prev => prev.filter(x => x !== t));
                            setIsDirty(true);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={traitQuery}
                    onChange={(e) => setTraitQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && traitQuery.trim()) {
                        e.preventDefault();
                        if (!selectedTraits.includes(traitQuery.trim())) {
                          setSelectedTraits(prev => [...prev, traitQuery.trim()]);
                          setTraitQuery('');
                          setIsDirty(true);
                        }
                      }
                    }}
                    placeholder="Escribe un rasgo y presiona Enter..."
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              )}

              {/* CAMPOS ADICIONALES DE ESCENARIO */}
              {itemType === 'Escenario' && (
                <>
                  <div className="field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                        Presentación / Mensaje de Apertura
                      </label>
                      <button
                        type="button"
                        onClick={() => handleEnhanceField('scenario_presentation')}
                        disabled={isEnhancingField === 'scenario_presentation'}
                        style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                      >
                        <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_presentation'} /> Generar con IA
                      </button>
                    </div>
                    <textarea
                      value={presentation}
                      onChange={(e) => handleFieldChange(setPresentation, e.target.value)}
                      placeholder="Mensaje inmersivo con el que comenzará la partida para el jugador..."
                      rows={3}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                        Contexto Base / Worldbuilding
                      </label>
                      <button
                        type="button"
                        onClick={() => handleEnhanceField('scenario_context')}
                        disabled={isEnhancingField === 'scenario_context'}
                        style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                      >
                        <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_context'} /> Desarrollar con IA
                      </button>
                    </div>
                    <textarea
                      value={baseContext}
                      onChange={(e) => handleFieldChange(setBaseContext, e.target.value)}
                      placeholder="Reglas del mundo, facciones, ambientación y lore general..."
                      rows={4}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                        Instrucciones del Sistema para la IA
                      </label>
                      <button
                        type="button"
                        onClick={() => handleEnhanceField('scenario_instructions')}
                        disabled={isEnhancingField === 'scenario_instructions'}
                        style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                      >
                        <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'scenario_instructions'} /> Formular con IA
                      </button>
                    </div>
                    <textarea
                      value={aiInstructions}
                      onChange={(e) => handleFieldChange(setAiInstructions, e.target.value)}
                      placeholder="Directivas narrativas, tono, secretos y estilo para el Narrador..."
                      rows={3}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </>
              )}

              {/* ETIQUETAS (TAGS) */}
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                    Etiquetas ({selectedTags.length}/5)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceField('tags')}
                    disabled={isEnhancingField === 'tags'}
                    style={{ background: 'transparent', border: 'none', color: '#ffd36b', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                  >
                    <FontAwesomeIcon icon={faMagic} spin={isEnhancingField === 'tags'} /> Sugerir Tags
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {selectedTags.map(t => (
                    <span
                      key={t}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev => prev.filter(x => x !== t));
                          setIsDirty(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagQuery.trim()) {
                      e.preventDefault();
                      if (!selectedTags.includes(tagQuery.trim()) && selectedTags.length < 5) {
                        setSelectedTags(prev => [...prev, tagQuery.trim()]);
                        setTagQuery('');
                        setIsDirty(true);
                      }
                    }
                  }}
                  placeholder="Añadir etiqueta (ej. Aventura, Cyberpunk)..."
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL PARA EDICIÓN ESPECÍFICA DE IMAGEN CON IA (img2img) */}
      {editingImageModalTarget && (
        <div className="char-backdrop" style={{ zIndex: 1300 }} onClick={() => setEditingImageModalTarget(null)}>
          <div
            className="char-modal"
            style={{ maxWidth: '420px', padding: '18px', background: '#12101a', border: '1px solid rgba(255,211,107,0.3)', borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#ffd36b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faEdit} /> Modificar imagen con IA
            </h4>
            <div style={{ height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
              <img src={editingImageModalTarget.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>
              Instrucciones de cambio específicas:
            </label>
            <input
              type="text"
              value={editImagePromptText}
              onChange={(e) => setEditImagePromptText(e.target.value)}
              placeholder="ej. Cambiar ropa a vestido blanco, guiño pícaro..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingImageModalTarget(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyImageEdit}
                disabled={isApplyingImageEdit || !editImagePromptText.trim()}
                style={{
                  background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '700',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faMagic} spin={isApplyingImageEdit} /> Aplicar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia de Cambios no Guardados */}
      {showUnsavedWarning && (
        <div className="char-backdrop" style={{ zIndex: 1300 }}>
          <div className="char-modal" style={{ maxWidth: '380px', padding: '20px', textAlign: 'center', background: '#181622', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px' }}>
            <h4 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>¿Descartar cambios?</h4>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 16px 0' }}>
              Tienes cambios sin guardar. Si cierras ahora, se perderán las modificaciones.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Seguir Editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setIsDirty(false);
                  onClose();
                }}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}
              >
                Descartar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
