import React, { useEffect, useState, useMemo } from 'react';
import { loadAppData } from '../utils/storage';
import { filterCreationsCards } from '../utils/creationsFilter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faVideo, 
  faMicrophone, 
  faImage,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { generateImageLocal, generateVideoLocal, generateAudioLocal } from '../utils/localAIStudio';
import { speakBrowserUtterance, cancelBrowserSpeech, getBrowserVoices } from '../utils/speechTTS';
import ConfirmModal from '../components/ConfirmModal';

// Submódulos especializados del Taller
import CreationsGallery from '../components/create/CreationsGallery';
import VoiceStudioSection from '../components/create/VoiceStudioSection';
import VideoStudioSection from '../components/create/VideoStudioSection';
import ImageStudioSection from '../components/create/ImageStudioSection';

const COMMUNITY_VOICES = [
  { id: 'v-1', name: 'ADA', gender: 'Femenino', bio: 'Que suene menos IA con sumisión', tags: 'Joven | Español', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80', phrase: 'Hola, soy ADA, tu narradora asignada. Bienvenidos a este nuevo escenario de rol.' },
  { id: 'v-2', name: 'Margaery von Stroheim', gender: 'Femenino', bio: 'Una princesa de otro mundo de voz dulce y delicada', tags: 'Joven | Español', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', phrase: 'Saludos, viajero. El destino nos ha reunido en este reino misterioso.' },
  { id: 'v-3', name: 'Julie joyful', gender: 'Femenino', bio: 'Habla de manera alegre y entusiasta', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=100&q=80', phrase: '¡Hola! ¡Qué emoción tenerte aquí hoy! ¿Listos para la aventura?' },
  { id: 'v-4', name: 'Ryūko Castellanos', gender: 'Femenino', bio: 'Determinada y capaz de entender la situación que la rodea', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=100&q=80', phrase: 'Escúchame bien. No bajes la guardia, este bosque está lleno de peligros.' },
  { id: 'v-5', name: 'Eddie Dear', gender: 'Masculino', bio: 'Habla de forma risueña y de pueblo', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', phrase: '¡Buenas, vecino! Qué gran día hace hoy para cosechar unas manzanas.' },
  { id: 'v-6', name: 'Voice: Silvrax Nocthar', gender: 'Masculino', bio: 'Voz grave, calmada y controlada, con un tono frío', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', phrase: 'Se hace tarde. Las sombras se alargan y el tiempo de decidir ha terminado.' }
];

export default function Create({ appData, onUpdateAppData, onOpenScenario, onOpenCreateModal, currentUser, onOpenAuthModal }) {
  const [data, setData] = useState(() => appData || loadAppData());
  const [confirmModal, setConfirmModal] = useState(null);

  // Pestaña activa del taller sincronizada con historial de navegación
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    return ['elements', 'voice', 'video', 'image'].includes(hash) ? hash : 'elements';
  });

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    const hash = nextTab === 'elements' ? '' : `#${nextTab}`;
    window.history.pushState({ tab: nextTab }, '', window.location.pathname + hash);
  };

  useEffect(() => {
    const handlePopState = (e) => {
      const stateTab = e.state?.tab || (window.location.hash ? window.location.hash.replace('#', '') : 'elements');
      if (['elements', 'voice', 'video', 'image'].includes(stateTab)) {
        setActiveTab(stateTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filtros y Búsqueda de Compendio
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [cardTypeFilter, setCardTypeFilter] = useState('all');
  const [scenarioCategoryFilter, setScenarioCategoryFilter] = useState('all');
  const [showChildVersions, setShowChildVersions] = useState(false);

  // Estados de Estudio de Voz
  const [voiceTopTab, setVoiceTopTab] = useState('create');
  const [voiceName, setVoiceName] = useState('');
  const [voiceGender, setVoiceGender] = useState('Femenino');
  const [voiceBio, setVoiceBio] = useState('');
  const [testPhrase, setTestPhrase] = useState('En las sombras del bosque antiguo, el viento susurra secretos olvidados.');
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [ttsEngine, setTtsEngine] = useState('browser');
  const [browserVoice, setBrowserVoice] = useState('');
  const [browserVoices, setBrowserVoices] = useState([]);

  // Estados de Estudio de Video
  const [videoTab, setVideoTab] = useState('video');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');

  // Estados de Estudio de Imagen
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Anime / Ilustración Estilizada 2.5D');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');

  useEffect(() => {
    if (appData) setData(appData);
  }, [appData]);

  useEffect(() => {
    const voices = getBrowserVoices();
    setBrowserVoices(voices);
    if (voices.length > 0) {
      const esVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
      setBrowserVoice(prev => prev || esVoice.name);
    }
  }, []);

  // Consolidar todas las creaciones del compendio (escenarios + tarjetas + narradores + herramientas)
  const allCreations = useMemo(() => {
    const scenarios = (data?.scenarios || []).map(s => ({
      ...s,
      type: s.type || 'Historia',
      isScenario: true
    }));
    const cards = data?.cards || [];
    const narrators = (data?.narrators || []).map(n => ({ ...n, type: 'Narrador' }));
    const tools = (data?.narratorTools || data?.tools || []).map(t => ({ ...t, type: 'Herramienta' }));

    return [...scenarios, ...cards, ...narrators, ...tools];
  }, [data]);

  const filteredCards = useMemo(() => {
    return filterCreationsCards(allCreations, {
      searchQuery,
      cardTypeFilter,
      scenarioCategoryFilter,
      sortBy,
      showChildVersions
    });
  }, [allCreations, searchQuery, cardTypeFilter, scenarioCategoryFilter, sortBy, showChildVersions]);

  const handleDeleteCard = (id) => {
    const nextCards = (data.cards || []).filter(c => c.id !== id);
    const nextScenarios = (data.scenarios || []).filter(s => s.id !== id);
    const nextNarrators = (data.narrators || []).filter(n => n.id !== id);
    const nextTools = (data.narratorTools || []).filter(t => t.id !== id);
    const nextData = { 
      ...data, 
      cards: nextCards,
      scenarios: nextScenarios,
      narrators: nextNarrators,
      narratorTools: nextTools
    };
    setData(nextData);
    if (onUpdateAppData) onUpdateAppData(nextData);
  };

  const handleCopyCard = async (card) => {
    if (!card) return;
    const { cloneCard } = await import('../utils/cloning');
    const cloned = cloneCard(card, {
      creatorId: currentUser?.id,
      creatorName: currentUser?.username
    });
    const nextCards = [cloned, ...(data.cards || [])];
    const nextData = { ...data, cards: nextCards };
    setData(nextData);
    if (onUpdateAppData) onUpdateAppData(nextData);
  };

  const handlePlayCommunityVoice = (voice) => {
    if (isPlayingVoice && playingVoiceId === voice.id) {
      cancelBrowserSpeech();
      setIsPlayingVoice(false);
      setPlayingVoiceId(null);
      return;
    }
    cancelBrowserSpeech();
    setIsPlayingVoice(true);
    setPlayingVoiceId(voice.id);
    speakBrowserUtterance(voice.phrase || testPhrase, {
      onEnd: () => {
        setIsPlayingVoice(false);
        setPlayingVoiceId(null);
      }
    });
  };

  const handleGenerateAudio = async () => {
    if (!testPhrase.trim()) return;
    if (ttsEngine === 'browser') {
      if (isPlayingVoice) {
        cancelBrowserSpeech();
        setIsPlayingVoice(false);
        return;
      }
      setIsPlayingVoice(true);
      speakBrowserUtterance(testPhrase, {
        voiceName: browserVoice,
        onEnd: () => setIsPlayingVoice(false)
      });
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const audioUrl = await generateAudioLocal(testPhrase, voiceName || 'Narrador');
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (err) {
      console.warn('Audio generation failed:', err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSaveVoice = () => {
    if (!voiceName.trim()) return;
    const newCard = {
      id: `voice-${Date.now()}`,
      type: 'Voz',
      title: voiceName,
      intro: voiceBio || `Voz ${voiceGender}`,
      text: testPhrase,
      tags: ['voz', voiceGender.toLowerCase()],
      ttsEngine,
      browserVoice,
      createdAt: new Date().toISOString()
    };
    const nextCards = [newCard, ...(data.cards || [])];
    const nextData = { ...data, cards: nextCards };
    setData(nextData);
    if (onUpdateAppData) onUpdateAppData(nextData);
    alert('¡Voz guardada en el compendio!');
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setIsGeneratingVideo(true);
    try {
      const url = await generateVideoLocal(videoPrompt, videoTab === 'loop');
      setGeneratedVideoUrl(url || '');
    } catch (err) {
      console.warn('Video generation error:', err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const url = await generateImageLocal(imagePrompt, imageStyle);
      setGeneratedImageUrl(url || '');
    } catch (err) {
      console.warn('Image generation error:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="create-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Encabezado del Taller */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '800' }}>Taller de Creación y Compendio</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            Explora tus elementos creados, historias, voces personalizadas e ilustraciones generadas por IA.
          </p>
        </div>

        <button
          onClick={() => onOpenCreateModal('Personaje')}
          style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '800', padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>+ Crear Nuevo Elemento</span>
        </button>
      </div>

      {/* Navegación por Pestañas del Taller */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', paddingBottom: '8px' }}>
        <button
          onClick={() => handleTabChange('elements')}
          style={{ background: 'none', border: 'none', color: activeTab === 'elements' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', borderBottom: activeTab === 'elements' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FontAwesomeIcon icon={faLayerGroup} />
          <span>Elementos Creados ({filteredCards.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('voice')}
          style={{ background: 'none', border: 'none', color: activeTab === 'voice' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', borderBottom: activeTab === 'voice' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FontAwesomeIcon icon={faMicrophone} />
          <span>Estudio de Voz</span>
        </button>

        <button
          onClick={() => handleTabChange('video')}
          style={{ background: 'none', border: 'none', color: activeTab === 'video' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', borderBottom: activeTab === 'video' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FontAwesomeIcon icon={faVideo} />
          <span>Estudio de Video</span>
        </button>

        <button
          onClick={() => handleTabChange('image')}
          style={{ background: 'none', border: 'none', color: activeTab === 'image' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', borderBottom: activeTab === 'image' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FontAwesomeIcon icon={faImage} />
          <span>Estudio de Imagen</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === 'elements' && (
        <CreationsGallery
          filteredCards={filteredCards}
          data={data}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          cardTypeFilter={cardTypeFilter}
          setCardTypeFilter={setCardTypeFilter}
          scenarioCategoryFilter={scenarioCategoryFilter}
          setScenarioCategoryFilter={setScenarioCategoryFilter}
          showChildVersions={showChildVersions}
          setShowChildVersions={setShowChildVersions}
          onOpenCard={(card) => {
            if (card.type === 'Historia' || card.type === 'Escenario' || card.isScenario) {
              if (onOpenScenario) onOpenScenario(card);
            } else {
              if (onOpenCreateModal) onOpenCreateModal(card.type, card);
            }
          }}
          onOpenCreateModal={onOpenCreateModal}
          onStartChatWithCard={(card) => {
            if (onOpenScenario) onOpenScenario(card);
          }}
          onCopyCard={handleCopyCard}
          onDeleteCardRequest={(card) => {
            setConfirmModal({
              title: 'Eliminar Ficha',
              message: `¿Estás seguro de que deseas eliminar permanentemente "${card.title || card.name}"?`,
              onConfirm: () => handleDeleteCard(card.id)
            });
          }}
        />
      )}

      {activeTab === 'voice' && (
        <VoiceStudioSection
          onBack={() => handleTabChange('elements')}
          voiceTopTab={voiceTopTab}
          setVoiceTopTab={setVoiceTopTab}
          voiceName={voiceName}
          setVoiceName={setVoiceName}
          voiceGender={voiceGender}
          setVoiceGender={setVoiceGender}
          voiceBio={voiceBio}
          setVoiceBio={setVoiceBio}
          testPhrase={testPhrase}
          setTestPhrase={setTestPhrase}
          isPlayingVoice={isPlayingVoice}
          playingVoiceId={playingVoiceId}
          isGeneratingAudio={isGeneratingAudio}
          ttsEngine={ttsEngine}
          setTtsEngine={setTtsEngine}
          browserVoice={browserVoice}
          setBrowserVoice={setBrowserVoice}
          browserVoices={browserVoices}
          communityVoices={COMMUNITY_VOICES}
          onPlayCommunityVoice={handlePlayCommunityVoice}
          onGenerateAudio={handleGenerateAudio}
          onSaveVoice={handleSaveVoice}
        />
      )}

      {activeTab === 'video' && (
        <VideoStudioSection
          onBack={() => handleTabChange('elements')}
          videoTab={videoTab}
          setVideoTab={setVideoTab}
          videoPrompt={videoPrompt}
          setVideoPrompt={setVideoPrompt}
          isGeneratingVideo={isGeneratingVideo}
          generatedVideoUrl={generatedVideoUrl}
          onGenerateVideo={handleGenerateVideo}
        />
      )}

      {activeTab === 'image' && (
        <ImageStudioSection
          onBack={() => handleTabChange('elements')}
          imagePrompt={imagePrompt}
          setImagePrompt={setImagePrompt}
          imageStyle={imageStyle}
          setImageStyle={setImageStyle}
          isGeneratingImage={isGeneratingImage}
          generatedImageUrl={generatedImageUrl}
          onGenerateImage={handleGenerateImage}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
