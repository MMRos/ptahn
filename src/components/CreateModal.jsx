import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCrop,
  faTimes, 
  faSave, 
  faImage, 
  faImages, 
  faMagic, 
  faEdit,
  faRedo,
  faFolderOpen,
  faPlus,
  faTag,
  faTags
} from '@fortawesome/free-solid-svg-icons';
import NarratorForm from './NarratorForm';
import ToolWorkshopForm from './ToolWorkshopForm';
import CharacterFormSection from './create/forms/CharacterFormSection';
import ScenarioEditorSection from './create/forms/ScenarioEditorSection';
import InventoryFormSection from './create/forms/InventoryFormSection';
import MemoryFormSection from './create/forms/MemoryFormSection';
import { generateImageLocal, editImageWithAI } from '../utils/localAIStudio';
import { enhanceFieldWithAI, autoCompleteEntityWithAI } from '../utils/aiEnhancer';
import { classifyImageWithAI } from '../utils/imageTagging';
import '../pages/create.css';
import ModalCloseButton from './common/ModalCloseButton';
import ImageCropperModal from './ImageCropperModal';
import ConnectionSelector from './ConnectionSelector';
import ScenarioMediaHeader from './create/ScenarioMediaHeader';
import { normalizeInitialMessages } from '../utils/scenarioScoping';

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
  editItem = null,
  currentUser = null,
  folderHandle = null,
  zIndex = 1200
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
  const [nestedCardModalState, setNestedCardModalState] = useState(null);

  // States para rasgos de personaje (Traits)
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [traitQuery, setTraitQuery] = useState('');
  
  // States para etiquetas (Tags) y Llamadas (Call Words)
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagQuery, setTagQuery] = useState('');
  const [callWords, setCallWords] = useState('');

  // States para clasificación on-demand y presets de imágenes
        
  // States específicos para Escenario
  const [initialMessages, setInitialMessages] = useState([{ id: 'init-1', title: 'Inicio 1', text: '' }]);
  const [activeInitialMessageId, setActiveInitialMessageId] = useState('init-1');
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
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isTaggingImages, setIsTaggingImages] = useState(false);
  const [taggingImageId, setTaggingImageId] = useState(null);
  const fileInputRef = useRef(null);
  const [cropModalImage, setCropModalImage] = useState(null);
    
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
          const normInits = normalizeInitialMessages(editItem);
          setInitialMessages(normInits);
          const activeInitId = editItem.activeInitialMessageId || normInits[0]?.id || 'init-1';
          setActiveInitialMessageId(activeInitId);
          const activeInitMsg = normInits.find(m => m.id === activeInitId) || normInits[0];
          setPresentation(activeInitMsg?.text || editItem.presentation || '');
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
            setCustomImageUrl('');
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
        setInitialMessages([{ id: 'init-1', title: 'Inicio 1', text: '' }]);
        setActiveInitialMessageId('init-1');
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
        setCustomImageUrl('');
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

  const handleGenerateAiCover = async (prompt = '', style = '') => {
    if (prompt) setCoverAiPrompt(prompt);
    if (style) setCoverAiStyle(style);
    const rawPrompt = prompt || coverAiPrompt;
    if (!rawPrompt.trim() && !title.trim()) {
      alert('Introduce una descripción o nombre para guiar la generación de la imagen.');
      return;
    }

    setIsGeneratingAiImage(true);
    try {
      const promptToUse = rawPrompt.trim() || `${title}. ${intro || ''}`;
      const styleToUse = style || coverAiStyle;
      const width = 768;
      const height = 512;

      setLastGenParams({
        prompt: promptToUse,
        style: styleToUse,
        target: 'cover',
        width,
        height,
        guides: []
      });

      const generatedUrl = await generateImageLocal(promptToUse, {
        style: styleToUse,
        width,
        height
      });

      if (generatedUrl) {
        setCover(generatedUrl);
        setIsDirty(true);
      }
    } catch (err) {
      alert(`Error al generar imagen con IA: ${err.message}`);
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const isWide = itemType === 'Escenario' || itemType === 'Herramienta' || itemType === 'Inventario' || (itemType === 'Narrador' && narratorTools.length > 0);

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
        setInitialMessages(prev => prev.map(m => m.id === activeInitialMessageId ? { ...m, text: result } : m));
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

  // Handlers para pestañas de múltiples mensajes iniciales en Escenarios
  const handleSelectInitialMessageTab = (tabId) => {
    setInitialMessages(prev => prev.map(m => m.id === activeInitialMessageId ? { ...m, text: presentation } : m));
    setActiveInitialMessageId(tabId);
    const target = initialMessages.find(m => m.id === tabId);
    setPresentation(target ? target.text : '');
  };

  const handleAddInitialMessageTab = () => {
    if (initialMessages.length >= 10) return;
    const newId = `init-${Date.now()}`;
    const newTitle = `Inicio ${initialMessages.length + 1}`;
    const updated = initialMessages.map(m => m.id === activeInitialMessageId ? { ...m, text: presentation } : m);
    setInitialMessages([...updated, { id: newId, title: newTitle, text: '' }]);
    setActiveInitialMessageId(newId);
    setPresentation('');
    setIsDirty(true);
  };

  const handleRemoveInitialMessageTab = (tabId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (initialMessages.length <= 1) return;
    const filtered = initialMessages.filter(m => m.id !== tabId);
    setInitialMessages(filtered);
    if (activeInitialMessageId === tabId) {
      const nextTab = filtered[0];
      setActiveInitialMessageId(nextTab.id);
      setPresentation(nextTab.text);
    }
    setIsDirty(true);
  };

  const handleRenameInitialMessageTab = (tabId, newTitle) => {
    setInitialMessages(prev => prev.map(m => m.id === tabId ? { ...m, title: newTitle } : m));
    setIsDirty(true);
  };

  const handleInitialMessageTextChange = (newText) => {
    setPresentation(newText);
    setInitialMessages(prev => prev.map(m => m.id === activeInitialMessageId ? { ...m, text: newText } : m));
    setIsDirty(true);
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
      const finalInitialMessages = initialMessages.map(m => 
        m.id === activeInitialMessageId ? { ...m, text: presentation.trim() } : { ...m, text: (m.text || '').trim() }
      );
      const activeObj = finalInitialMessages.find(m => m.id === activeInitialMessageId) || finalInitialMessages[0];
      const activeText = activeObj ? activeObj.text : presentation.trim();

      const scenarioData = {
        id: editItem ? editItem.id : `scenario-${Date.now()}`,
        title: trimmedTitle,
        category: category,
        intro: intro.trim(),
        cover: cover.trim(),
        presentation: activeText,
        initialMessages: finalInitialMessages,
        activeInitialMessageId: activeInitialMessageId,
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

  // Selección y carga unificada de una o múltiples imágenes locales desde el disco duro
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let loadedCount = 0;
    const newImgs = [];

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        if (dataUrl) {
          newImgs.push({
            id: `img-${Date.now()}-${index}`,
            url: dataUrl,
            label: file.name ? file.name.replace(/\.[^/.]+$/, '') : (characterImages.length === 0 && newImgs.length === 0 ? 'Normal / Principal' : `Expresión ${characterImages.length + newImgs.length + 1}`),
            isDefault: false
          });
        }
        loadedCount++;
        if (loadedCount === files.length) {
          if (newImgs.length > 0) {
            setCustomImageUrl(files.length === 1 ? files[0].name : `${files.length} imágenes cargadas`);
            setCharacterImages(prev => {
              if (prev.length === 0) {
                newImgs[0].isDefault = true;
                setSelectedGuideIds([newImgs[0].id]);
                setCover(newImgs[0].url);
              }
              return [...prev, ...newImgs];
            });
            setIsDirty(true);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleUpdateImageCropped = (id, croppedUrl) => {
    setCharacterImages(prev => prev.map(img => {
      if (img.id === id) {
        if (img.isDefault) {
          setCover(croppedUrl);
        }
        return { ...img, url: croppedUrl };
      }
      return img;
    }));
    setIsDirty(true);
  };

  // Añadir imagen directamente por URL introducida
  const handleAddCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    const url = customImageUrl.trim();
    const newImg = {
      id: `img-${Date.now()}`,
      url: url,
      label: characterImages.length === 0 ? 'Normal / Principal' : `Expresión ${characterImages.length + 1}`,
      isDefault: characterImages.length === 0
    };
    setCharacterImages(prev => [...prev, newImg]);
    if (characterImages.length === 0) {
      setSelectedGuideIds([newImg.id]);
      setCover(url);
    }
    setCustomImageUrl('');
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
    setCharacterImages(prev => prev.map(img => img.id === id ? { ...img, tags: newTags } : img));
    setIsDirty(true);
  };

  const handleAutoTagSingleImage = async (img) => {
    if (!img || !img.url) return;
    setTaggingImageId(img.id);
    try {
      const generatedTags = await classifyImageWithAI({
        imageUrl: img.url,
        entityType: itemType,
        entityTitle: title,
        entityDesc: intro ? `${intro}. ${text || ''}` : text,
        traits: selectedTraits,
        currentLabel: img.label || '',
        currentTags: img.tags || '',
        prompt: img.label || ''
      });
      if (generatedTags) {
        setCharacterImages(prev => prev.map(item => {
          if (item.id === img.id) {
            return {
              ...item,
              tags: generatedTags,
              label: item.label || generatedTags.split(',')[0].trim()
            };
          }
          return item;
        }));
        setIsDirty(true);
      }
    } catch (err) {
      console.warn('[CreateModal]: Error auto-tagging image:', err);
      alert(`Error al auto-etiquetar imagen: ${err.message}`);
    } finally {
      setTaggingImageId(null);
    }
  };

  const handleBatchAutoTagImages = async () => {
    if (characterImages.length === 0) return;
    setIsTaggingImages(true);
    try {
      for (const img of characterImages) {
        setTaggingImageId(img.id);
        const generatedTags = await classifyImageWithAI({
          imageUrl: img.url,
          entityType: itemType,
          entityTitle: title,
          entityDesc: intro ? `${intro}. ${text || ''}` : text,
          traits: selectedTraits,
          currentLabel: img.label || '',
          currentTags: img.tags || '',
          prompt: img.label || ''
        });
        if (generatedTags) {
          setCharacterImages(prev => prev.map(item => {
            if (item.id === img.id) {
              return {
                ...item,
                tags: generatedTags,
                label: item.label || generatedTags.split(',')[0].trim()
              };
            }
            return item;
          }));
          setIsDirty(true);
        }
      }
    } catch (err) {
      console.warn('[CreateModal]: Error in batch auto-tagging:', err);
      alert(`Error al auto-etiquetar lote: ${err.message}`);
    } finally {
      setIsTaggingImages(false);
      setTaggingImageId(null);
    }
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
    <div className="char-backdrop" role="dialog" aria-modal="true" style={{ zIndex }} onClick={handleBackdropClick}>
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

        {/* Botón X SIEMPRE anclado en la esquina superior derecha */}
        <ModalCloseButton 
          onClick={handleCloseAttempt} 
          title="Cerrar modal (Esc)"
          ariaLabel="Cerrar modal de creación"
          top="12px"
          right="14px"
          zIndex={200}
        />

        {/* 1. BARRA SUPERIOR CONSTANTE (STICKY HEADER) */}
        <div className="create-modal-sticky-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(18, 16, 26, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 211, 107, 0.18)',
          padding: '12px 56px 12px 18px',
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

              {/* SECCIÓN MULTIMEDIA: ESCENARIO (2 COLUMNAS) vs TARJETAS ESTÁNDAR (GALERÍA DE EXPRESIONES) */}
              {itemType === 'Escenario' ? (
                <ScenarioMediaHeader
                  cover={cover}
                  onCoverChange={(newCover) => handleFieldChange(setCover, newCover)}
                  category={category}
                  onCategoryChange={(newCat) => handleFieldChange(setCategory, newCat)}
                  categories={CATEGORIES}
                  tags={selectedTags}
                  onTagsChange={(newTags) => handleFieldChange(setSelectedTags, newTags)}
                  onOpenCropper={(imgUrl) => setCropModalImage({ url: imgUrl, id: 'cover' })}
                  onGenerateAiCover={handleGenerateAiCover}
                  isGeneratingAi={isGeneratingAiImage}
                />
              ) : (
                <>
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

                    {/* 1. Input Unificado de URL / Archivo de Disco */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomUrl();
                          }
                        }}
                        placeholder="URL de imagen o dirección de archivo cargado..."
                        style={{
                          flex: '1 1 220px',
                          minWidth: '180px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          color: '#fff',
                          fontSize: '0.82rem'
                        }}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffd36b',
                          fontWeight: '600',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        title="Buscar archivo de imagen en el disco duro"
                      >
                        <FontAwesomeIcon icon={faFolderOpen} /> Buscar en disco
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomUrl}
                        disabled={!customImageUrl.trim()}
                        style={{
                          background: customImageUrl.trim() ? 'rgba(255, 211, 107, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: customImageUrl.trim() ? '1px solid #ffd36b' : '1px solid rgba(255,255,255,0.1)',
                          color: customImageUrl.trim() ? '#ffd36b' : 'rgba(255,255,255,0.4)',
                          fontWeight: '700',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: customImageUrl.trim() ? 'pointer' : 'default',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        title="Añadir imagen por URL"
                      >
                        <FontAwesomeIcon icon={faPlus} /> Añadir
                      </button>
                    </div>

                    {/* 2. Generador de imágenes con IA destacado */}
                    <div style={{
                      background: 'rgba(255, 211, 107, 0.04)',
                      border: '1px solid rgba(255, 211, 107, 0.22)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FontAwesomeIcon icon={faMagic} /> Generador de Imágenes con IA
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={charAiPrompt}
                          onChange={(e) => setCharAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleGenerateAiImage('char');
                            }
                          }}
                          placeholder="Descripción visual / Expresión (ej. sonriendo, cabello rojo, armadura ligera)..."
                          style={{
                            flex: '1 1 200px',
                            minWidth: '180px',
                            background: 'rgba(0, 0, 0, 0.35)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '7px 10px',
                            color: '#fff',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                        <select
                          data-testid="char-ai-style-select"
                          value={coverAiStyle}
                          onChange={(e) => setCoverAiStyle(e.target.value)}
                          style={{
                            width: '145px',
                            flexShrink: 0,
                            background: '#1a1a24',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '6px',
                            padding: '7px 8px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none'
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
                            padding: '7px 14px',
                            borderRadius: '6px',
                            cursor: isGeneratingAiImage ? 'not-allowed' : 'pointer',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FontAwesomeIcon icon={faMagic} spin={isGeneratingAiImage} /> Generar
                        </button>
                      </div>
                    </div>

                    {/* Galería de Expresiones */}
                    {characterImages.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          <span style={{ fontSize: '0.78rem', color: '#aaa' }}>
                            🖼️ <strong>{characterImages.length}</strong> {characterImages.length === 1 ? 'imagen' : 'imágenes'} en la galería
                          </span>
                          <button
                            type="button"
                            onClick={handleBatchAutoTagImages}
                            disabled={isTaggingImages}
                            style={{
                              background: isTaggingImages ? 'rgba(99, 102, 241, 0.25)' : 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              color: '#c084fc',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              cursor: isTaggingImages ? 'not-allowed' : 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            title="Analizar y auto-etiquetar todas las fotos de la galería usando IA y el contexto del personaje"
                          >
                            <FontAwesomeIcon icon={faTags} spin={isTaggingImages} />
                            {isTaggingImages ? 'Etiquetando lote con IA...' : 'Auto-etiquetar Fotos con IA'}
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
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
                                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: '3px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAutoTagSingleImage(img)}
                                    disabled={taggingImageId === img.id}
                                    title="Auto-etiquetar esta foto con IA"
                                    style={{
                                      background: taggingImageId === img.id ? 'rgba(168, 85, 247, 0.95)' : 'rgba(168, 85, 247, 0.85)',
                                      border: 'none',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      width: '22px',
                                      height: '22px',
                                      cursor: taggingImageId === img.id ? 'wait' : 'pointer',
                                      fontSize: '0.7rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faTag} spin={taggingImageId === img.id} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCropModalImage(img)}
                                    title="Recortar y reencuadrar imagen"
                                    style={{ background: 'rgba(255, 211, 107, 0.9)', border: 'none', color: '#000', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.7rem' }}
                                  >
                                    <FontAwesomeIcon icon={faCrop} />
                                  </button>
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
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCharacterImages(prev => prev.map(item => item.id === img.id ? { ...item, label: val } : item));
                                    setIsDirty(true);
                                  }}
                                  placeholder="Nombre / Variante"
                                  title="Nombre de la imagen"
                                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.72rem', width: '100%', outline: 'none', fontWeight: '600' }}
                                />
                                <input
                                  type="text"
                                  value={img.tags || ''}
                                  onChange={(e) => handleUpdateCharacterImageTags(img.id, e.target.value)}
                                  placeholder="Tags IA (ej. school uniform, smiling)"
                                  title="Etiquetas visuales en inglés para activación de expresiones en el chat"
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                    borderRadius: '4px',
                                    color: '#d8b4fe',
                                    fontSize: '0.66rem',
                                    padding: '3px 6px',
                                    width: '100%',
                                    outline: 'none'
                                  }}
                                />
                                {!img.isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetDefaultCharacterImage(img.id)}
                                    style={{ background: 'rgba(255,211,107,0.1)', border: '1px solid rgba(255,211,107,0.2)', color: '#ffd36b', fontSize: '0.68rem', borderRadius: '4px', padding: '2px', cursor: 'pointer', marginTop: '2px' }}
                                  >
                                    Hacer Principal
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SELECTOR DE CATEGORÍA */}
                  <div className="field-group">
                    <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700', marginBottom: '4px', display: 'block' }}>
                      Categoría de la Tarjeta
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleFieldChange(setCategory, e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1a1a28',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} style={{ background: '#1a1a28', color: '#fff' }}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* INTRODUCCIÓN (Límite 250 caracteres e indexada para el contexto) */}
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#ffd36b', fontWeight: '700' }}>
                      Introducción
                    </label>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: (intro || '').length >= 240 ? '#f87171' : 'rgba(255,255,255,0.45)',
                      fontWeight: '600'
                    }}>
                      {(intro || '').length}/250
                    </span>
                  </div>
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
                  onChange={(e) => handleFieldChange(setIntro, e.target.value.slice(0, 250))}
                  maxLength={250}
                  placeholder="Breve introducción de la entidad para el índice de contexto (máximo 250 caracteres)..."
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

              {/* DESCRIPCIÓN DETALLADA / APARIENCIA / LORE (Solo para tarjetas, no para Escenarios) */}
              {itemType !== 'Escenario' && (
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
              )}

              {/* RASGOS DE PERSONALIDAD (TRAITS) Y MOCHILA PARA PERSONAJE */}
              {itemType === 'Personaje' && (
                <CharacterFormSection
                  selectedTraits={selectedTraits}
                  setSelectedTraits={setSelectedTraits}
                  traitQuery={traitQuery}
                  setTraitQuery={setTraitQuery}
                  isEnhancingField={isEnhancingField}
                  handleEnhanceField={handleEnhanceField}
                  appData={appData}
                  editItem={editItem}
                  title={title}
                  setTitle={setTitle}
                  setItemType={setItemType}
                  setInventoryOwnerCharId={setInventoryOwnerCharId}
                  setIsDirty={setIsDirty}
                />
              )}

              {/* CAMPOS ADICIONALES DE ESCENARIO */}
              {itemType === 'Escenario' && (
                <ScenarioEditorSection
                  initialMessages={initialMessages}
                  activeInitialMessageId={activeInitialMessageId}
                  handleSelectInitialMessageTab={handleSelectInitialMessageTab}
                  handleRemoveInitialMessageTab={handleRemoveInitialMessageTab}
                  handleAddInitialMessageTab={handleAddInitialMessageTab}
                  handleRenameInitialMessageTab={handleRenameInitialMessageTab}
                  presentation={presentation}
                  handleInitialMessageTextChange={handleInitialMessageTextChange}
                  baseContext={baseContext}
                  setBaseContext={setBaseContext}
                  aiInstructions={aiInstructions}
                  setAiInstructions={setAiInstructions}
                  scenarioNarrator={scenarioNarrator}
                  setScenarioNarrator={setScenarioNarrator}
                  appData={appData}
                  isEnhancingField={isEnhancingField}
                  handleEnhanceField={handleEnhanceField}
                  handleFieldChange={handleFieldChange}
                />
              )}

              {/* CAMPOS ESPECIALIZADOS DE MEMORIA */}
              {itemType === 'Memoria' && (
                <MemoryFormSection
                  memorySummary={memorySummary}
                  setMemorySummary={setMemorySummary}
                  memoryImpact={memoryImpact}
                  setMemoryImpact={setMemoryImpact}
                  memoryTimeline={memoryTimeline}
                  setMemoryTimeline={setMemoryTimeline}
                  memoryCharacters={memoryCharacters}
                  setMemoryCharacters={setMemoryCharacters}
                  appData={appData}
                  onFieldChange={handleFieldChange}
                />
              )}

              {/* CAMPOS ESPECIALIZADOS DE INVENTARIO */}
              {itemType === 'Inventario' && (
                <InventoryFormSection
                  inventoryOwnerCharId={inventoryOwnerCharId}
                  setInventoryOwnerCharId={setInventoryOwnerCharId}
                  inventoryCapacity={inventoryCapacity}
                  setInventoryCapacity={setInventoryCapacity}
                  inventoryItems={inventoryItems}
                  setInventoryItems={setInventoryItems}
                  appData={appData}
                  onFieldChange={handleFieldChange}
                />
              )}

              {/* ETIQUETAS (TAGS) (Solo para tarjetas estándar, en Escenario está en ScenarioMediaHeader) */}
              {itemType !== 'Escenario' && (
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
              )}

              {/* PALABRAS DE LLAMADA / ACTIVACIÓN (Para todas las tarjetas excepto Escenario/Narrador/Herramienta) */}
              {itemType !== 'Escenario' && itemType !== 'Narrador' && itemType !== 'Herramienta' && (
                <div className="field-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#ffd36b', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                    📢 Palabras de Llamada (Call Words / Keywords)
                  </label>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                    Palabras o frases separadas por comas que, al detectarse en el chat, aumentan el peso de esta tarjeta e introducen su contexto inmediatamente.
                  </div>
                  <input
                    type="text"
                    value={callWords}
                    onChange={(e) => handleFieldChange(setCallWords, e.target.value)}
                    placeholder="ej. espada dragón, filo ancestral, reliquia (separadas por comas)..."
                    style={{ width: '100%', padding: '8px 12px', background: '#1e1e2c', border: '1px solid rgba(255, 211, 107, 0.25)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* PANEL DE IMPORTANCIA Y PESOS (Para todas las tarjetas excepto Escenario/Narrador/Herramienta) */}
              {itemType !== 'Escenario' && itemType !== 'Narrador' && itemType !== 'Herramienta' && (
                <div style={{
                  background: 'rgba(255, 211, 107, 0.04)',
                  border: '1px solid rgba(255, 211, 107, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '12px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#ffd36b', fontWeight: '700', margin: 0 }}>
                      ⚖️ Presencia y Peso en Contexto de Chat
                    </label>
                    <span style={{ fontSize: '0.72rem', color: isPinned ? '#ffd36b' : 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                      {isPinned ? '📌 Anclado Permanente' : `Prioridad Base: ${importance}/10`}
                    </span>
                  </div>

                  {/* Slider de Importancia Base */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', minWidth: '75px' }}>Importancia:</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      disabled={isPinned}
                      value={importance}
                      onChange={(e) => handleFieldChange(setImportance, Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#ffd36b', cursor: isPinned ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontSize: '0.76rem', color: '#ffd36b', fontWeight: 'bold', minWidth: '25px', textAlign: 'right' }}>
                      {importance}
                    </span>
                  </div>

                  {/* Checkbox Anclado & Modo de Activación */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: isPinned ? '#ffd36b' : 'rgba(255,255,255,0.85)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => handleFieldChange(setIsPinned, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>📌 Anclado (Siempre en contexto)</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: activationMode === 'dynamic' ? '#6ee7b7' : 'rgba(255,255,255,0.6)', cursor: isPinned ? 'not-allowed' : 'pointer' }}>
                        <input
                          type="radio"
                          name="cardActivationMode"
                          disabled={isPinned}
                          checked={activationMode === 'dynamic'}
                          onChange={() => handleFieldChange(setActivationMode, 'dynamic')}
                        />
                        <span>⚡ Dinámico</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: activationMode === 'strict_mention' ? '#93c5fd' : 'rgba(255,255,255,0.6)', cursor: isPinned ? 'not-allowed' : 'pointer' }}>
                        <input
                          type="radio"
                          name="cardActivationMode"
                          disabled={isPinned}
                          checked={activationMode === 'strict_mention'}
                          onChange={() => handleFieldChange(setActivationMode, 'strict_mention')}
                        />
                        <span>🎯 Solo mención</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* CONEXIONES MODULARES (Para tarjetas normales) */}
              {itemType !== 'Escenario' && itemType !== 'Narrador' && itemType !== 'Herramienta' && (
                <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <ConnectionSelector
                    availableCards={(appData.cards || []).filter(c => c.id !== (editItem?.id || ''))}
                    selectedCardIds={selectedCards}
                    onSelectCard={(id) => handleFieldChange(setSelectedCards, [...selectedCards, id])}
                    onRemoveCard={(id) => handleFieldChange(setSelectedCards, selectedCards.filter(cId => cId !== id))}
                  />
                </div>
              )}

              {/* CONSTRUCCIÓN DEL ESCENARIO (LORE PIECES GRID - FICTIONLAB STYLE) */}
              {itemType === 'Escenario' && (
                <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#ffd36b', fontSize: '1.05rem', fontWeight: '700' }}>
                    Construcción del Escenario (Lore Pieces)
                  </h4>

                  {/* Buscador Rápido para Importar Tarjetas Existentes */}
                  <div style={{ marginBottom: '24px' }}>
                    <ConnectionSelector
                      availableCards={appData.cards || []}
                      selectedCardIds={selectedCards.map(c => (typeof c === 'object' ? c.id : c))}
                      onSelectCard={(id) => handleFieldChange(setSelectedCards, [...selectedCards, id])}
                      onRemoveCard={(id) => handleFieldChange(setSelectedCards, selectedCards.filter(sc => (typeof sc === 'object' ? sc.id : sc) !== id))}
                    />
                  </div>

                  {/* Cuadrículas agrupadas por tipo con diseño elegante y botón de añadir */}
                  {['Personaje', 'Lugar', 'Facción', 'Raza', 'Criatura', 'Objeto', 'Memoria', 'Inventario', 'Regla', 'Otros'].map(type => {
                    const allCardsPool = [...(appData.cards || [])];
                    selectedCards.forEach(sc => {
                      if (typeof sc === 'object' && sc !== null && sc.id && !allCardsPool.some(x => x.id === sc.id)) {
                        allCardsPool.push(sc);
                      }
                    });
                    const linkedCardsOfType = allCardsPool.filter(c => {
                      const isSelected = selectedCards.some(sc => (typeof sc === 'object' ? sc.id : sc) === c.id);
                      if (!isSelected) return false;
                      if (c.type === type) return true;
                      if (type === 'Otros' && !['Personaje', 'Lugar', 'Facción', 'Raza', 'Criatura', 'Objeto', 'Memoria', 'Inventario', 'Regla'].includes(c.type)) return true;
                      return false;
                    });
                    const typeLabel = type === 'Personaje' ? 'Personajes' : type === 'Lugar' ? 'Lugares' : type === 'Facción' ? 'Facciones' : type === 'Raza' ? 'Razas' : type === 'Criatura' ? 'Criaturas' : type === 'Objeto' ? 'Objetos' : type === 'Memoria' ? 'Memorias' : type === 'Inventario' ? 'Inventarios' : type === 'Regla' ? 'Reglas / Leyes' : 'Otros / Personalizados';

                    return (
                      <div key={type} style={{ marginBottom: '24px' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '0.88rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{typeLabel} ({linkedCardsOfType.length})</span>
                          <button
                            type="button"
                            onClick={() => setNestedCardModalState({ isOpen: true, type, editItem: null })}
                            style={{ background: 'transparent', border: 'none', color: '#ffd36b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            + Crear nuevo {type}
                          </button>
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
                                onClick={() => setNestedCardModalState({ isOpen: true, type: card.type || 'Personaje', editItem: card })}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  height: '175px',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = 'rgba(255, 211, 107, 0.4)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                  e.currentTarget.style.transform = 'none';
                                }}
                                title={`Clic para editar "${card.title}"`}
                              >
                                {/* Botones de Acción (Editar y Desenlazar) */}
                                <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 5 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNestedCardModalState({ isOpen: true, type: card.type || 'Personaje', editItem: card });
                                    }}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.7)',
                                      border: '1px solid rgba(255, 211, 107, 0.4)',
                                      color: '#ffd36b',
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.7rem'
                                    }}
                                    title="Editar tarjeta completa"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFieldChange(setSelectedCards, selectedCards.filter(sc => (typeof sc === 'object' ? sc.id : sc) !== card.id));
                                    }}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.7)',
                                      border: '1px solid rgba(255, 107, 107, 0.4)',
                                      color: '#ff6b6b',
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      fontWeight: 'bold'
                                    }}
                                    title="Desenlazar del escenario"
                                  >
                                    ×
                                  </button>
                                </div>

                                {/* Portada */}
                                <div style={{
                                  height: '85px',
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                      {card.type}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: '#ffd36b', fontWeight: '600' }}>
                                      ✏️ Editar
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Ranura Dotted "Crear Nuevo" */}
                          <div
                            onClick={() => setNestedCardModalState({ isOpen: true, type, editItem: null })}
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
                            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '1rem' }} />
                            <span>+ Añadir {type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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

      {/* Modal de Recorte de Imagen */}
      {cropModalImage && (
        <ImageCropperModal
          isOpen={!!cropModalImage}
          imageSrc={cropModalImage.url}
          aspectRatio={itemType === 'Escenario' ? 16 / 9 : 3 / 4}
          onClose={() => setCropModalImage(null)}
          onCropComplete={(croppedUrl) => {
            handleUpdateImageCropped(cropModalImage.id, croppedUrl);
            setCropModalImage(null);
          }}
        />
      )}

      {/* Modal idéntico y completo para crear/editar tarjetas anidadas del escenario */}
      {nestedCardModalState && (
        <CreateModal
          isOpen={true}
          initialType={nestedCardModalState.type || 'Personaje'}
          editItem={nestedCardModalState.editItem}
          onClose={() => setNestedCardModalState(null)}
          onSaveItem={(savePayload) => {
            const savedCard = savePayload.data;
            setSelectedCards(prev => {
              const existingIdx = prev.findIndex(entry => (typeof entry === 'object' ? entry.id : entry) === savedCard.id);
              if (existingIdx !== -1) {
                const copy = [...prev];
                copy[existingIdx] = savedCard;
                return copy;
              } else {
                return [...prev, savedCard];
              }
            });
            if (onSaveItem) {
              onSaveItem(savePayload);
            }
            setNestedCardModalState(null);
            setIsDirty(true);
          }}
          appData={appData}
          currentUser={currentUser}
          folderHandle={folderHandle}
          zIndex={zIndex + 100}
        />
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
