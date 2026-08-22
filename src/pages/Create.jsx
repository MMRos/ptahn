import React, { useEffect, useState } from 'react';
import { loadAppData } from '../utils/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlay, faPause, faVideo, faMicrophone, faImage } from '@fortawesome/free-solid-svg-icons';
import { generateImageLocal, generateVideoLocal, generateAudioLocal, getAvailableModels } from '../utils/localAIStudio';
import { speakBrowserUtterance, cancelBrowserSpeech, getBrowserVoices } from '../utils/speechTTS';
import ConfirmModal from '../components/ConfirmModal';

// Mock list of community voices
const COMMUNITY_VOICES = [
  { id: 'v-1', name: 'ADA', gender: 'Femenino', bio: 'Que suene menos IA con sumisión', tags: 'Joven | Español', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80', phrase: 'Hola, soy ADA, tu narradora asignada. Bienvenidos a este nuevo escenario de rol.' },
  { id: 'v-2', name: 'Margaery von Stroheim', gender: 'Femenino', bio: 'Una princesa de otro mundo de voz dulce y delicada', tags: 'Joven | Español', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', phrase: 'Saludos, viajero. El destino nos ha reunido en este reino misterioso.' },
  { id: 'v-3', name: 'Julie joyful', gender: 'Femenino', bio: 'Habla de manera alegre y entusiasta', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=100&q=80', phrase: '¡Hola! ¡Qué emoción tenerte aquí hoy! ¿Listos para la aventura?' },
  { id: 'v-4', name: 'Ryōko Castellanos', gender: 'Femenino', bio: 'Determinada y capaz de entender la situación que la rodea', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=100&q=80', phrase: 'Escúchame bien. No bajes la guardia, este bosque está lleno de peligros.' },
  { id: 'v-5', name: 'Eddie Dear', gender: 'Masculino', bio: 'Habla de forma risueña y de pueblo', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', phrase: '¡Buenas, vecino! Qué gran día hace hoy para cosechar unas manzanas.' },
  { id: 'v-6', name: 'Voice: Silvrax Nocthar', gender: 'Masculino', bio: 'Voz grave, calmada y controlada, con un tono frío', tags: 'Adulto Joven | Español', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', phrase: 'Se hace tarde. Las sombras se alargan y el tiempo de decidir ha terminado.' }
];

// Initial mock images list
const INITIAL_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80'
];

export default function Create({ appData, onUpdateAppData, onOpenScenario, onOpenCreateModal }) {
  const [data, setData] = useState(() => appData || loadAppData());
  const [selectedCard, setSelectedCard] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // AI Tools states
  const [activeAiTool, setActiveAiTool] = useState(null); // 'video' | 'voice' | 'image'
  const [videoTab, setVideoTab] = useState('video'); // 'video' | 'loop'
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspect, setVideoAspect] = useState('16:9');
  const [videoRes, setVideoRes] = useState('720P');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);

  // Voice AI States
  const [voiceTopTab, setVoiceTopTab] = useState('create'); // 'create' | 'generate'
  const [voiceTab, setVoiceTab] = useState('community'); // 'community' | 'mine'
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [audioPrompt, setAudioPrompt] = useState('');

  const [voiceCreationType, setVoiceCreationType] = useState('design'); // 'design' | 'clone'
  const [voiceSubTab, setVoiceSubTab] = useState('generate'); // 'generate' | 'save'
  const [voiceDesc, setVoiceDesc] = useState('');
  const [voiceScript, setVoiceScript] = useState('');
  const [voicePreviewsCount, setVoicePreviewsCount] = useState(3);
  const [isGeneratingCustomVoice, setIsGeneratingCustomVoice] = useState(false);
  const [generatedVoicePreviews, setGeneratedVoicePreviews] = useState(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(null);
  const [playingPreviewId, setPlayingPreviewId] = useState(null);

  const [systemVoices, setSystemVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceRate, setVoiceRate] = useState(1.0);

  const [voiceEngine, setVoiceEngine] = useState('browser'); // 'browser' | 'lmstudio'
  const [selectedAudioModel, setSelectedAudioModel] = useState('audio.cpp');
  const [selectedVoicePreset, setSelectedVoicePreset] = useState('alloy');
  const [availableAudioModels, setAvailableAudioModels] = useState([]);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceGender, setNewVoiceGender] = useState('Femenino');
  const [ttsServerUrl, setTtsServerUrl] = useState('http://localhost:8880');

  useEffect(() => {
    const loadVoices = () => {
      const voices = getBrowserVoices();
      setSystemVoices(voices);
      const defaultEs = voices.find(v => v.lang.startsWith('es'));
      if (defaultEs) {
        setSelectedVoiceURI(defaultEs.voiceURI);
      } else if (voices.length > 0) {
        setSelectedVoiceURI(voices[0].voiceURI);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    async function fetchAudioModels() {
      try {
        const models = await getAvailableModels();
        const audioMods = models.filter(m => 
          m.id.toLowerCase().includes('audio') || 
          m.id.toLowerCase().includes('speech') ||
          m.id.toLowerCase().includes('voice') ||
          m.id.toLowerCase().includes('cpp')
        );
        if (audioMods.length > 0) {
          setAvailableAudioModels(audioMods);
          setSelectedAudioModel(audioMods[0].id);
        } else {
          setAvailableAudioModels([{ id: 'audio-cpp/audio.cpp' }]);
        }
      } catch (err) {
        setAvailableAudioModels([{ id: 'audio-cpp/audio.cpp' }]);
      }
    }
    fetchAudioModels();
  }, []);

  // Image AI States
  const [imagePrompt, setImagePrompt] = useState('');
  const [aiImages, setAiImages] = useState(INITIAL_IMAGES);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (appData) {
      setData(appData);
    }
  }, [appData]);

  const handleCopyCard = (card) => {
    const newCard = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Copia)`,
      createdAt: new Date().toISOString()
    };
    const nextData = {
      ...data,
      cards: [newCard, ...(data.cards || [])]
    };
    setData(nextData);
    if (typeof onUpdateAppData === 'function') onUpdateAppData(nextData);
    setSelectedCard(null);
  };

  const handleConvertToScenario = (card) => {
    const prefilledScenario = {
      title: card.title,
      category: 'Aventura',
      intro: card.intro || (card.text ? card.text.substring(0, 80) + '...' : ''),
      cover: card.cover || '',
      presentation: '',
      baseContext: `[${card.type}]: ${card.text || ''}`,
      aiInstructions: '',
      tags: card.tags || [],
      cards: [card.id],
      narrator: null
    };

    if (onOpenCreateModal) {
      onOpenCreateModal('Escenario', prefilledScenario);
    }
    setSelectedCard(null);
  };

  const handleDeleteCard = (cardId) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).filter(c => c.id !== cardId)
    };
    setData(nextData);
    if (typeof onUpdateAppData === 'function') onUpdateAppData(nextData);
    setSelectedCard(null);
  };

  // Video AI generator
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      alert('Digita un prompt para generar el video.');
      return;
    }
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    try {
      const localUrl = await generateVideoLocal(videoPrompt, videoAspect);
      if (localUrl) {
        setGeneratedVideoUrl(localUrl);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Helper for voice synthesis fallback
  const playVoiceSpeechSynthesis = (voice) => {
    const voices = getBrowserVoices();
    let selectedVoice = null;
    const isMale = voice.gender === 'Masculino';
    
    if (isMale) {
      selectedVoice = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return nameLower.includes('david') || nameLower.includes('julio') || nameLower.includes('male') || nameLower.includes('pablo') || nameLower.includes('yago');
      });
    } else {
      selectedVoice = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return nameLower.includes('sabina') || nameLower.includes('helena') || nameLower.includes('female') || nameLower.includes('zira') || nameLower.includes('google') || nameLower.includes('elena');
      });
    }
    
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices.find(v => v.lang.startsWith('es'));
    }

    speakBrowserUtterance({
      text: voice.phrase,
      voiceURI: selectedVoice?.voiceURI,
      onStart: () => setPlayingVoiceId(voice.id),
      onEnd: () => setPlayingVoiceId(null),
      onError: () => setPlayingVoiceId(null)
    });
  };

  // Voice Speech Synth with local audio.cpp support
  const handlePlayVoice = async (voice) => {
    if (playingVoiceId === voice.id) {
      if (window.activeAudioElement) {
        window.activeAudioElement.pause();
        window.activeAudioElement = null;
      } else {
        cancelBrowserSpeech();
      }
      setPlayingVoiceId(null);
      return;
    }
    
    setPlayingVoiceId(voice.id);
    
    // Si la voz tiene parámetros personalizados de motor o es de LM Studio
    if (voice.engine === 'lmstudio' || voice.voicePreset) {
      try {
        const audioUrl = await generateAudioLocal(
          voice.phrase, 
          voice.preset || voice.voicePreset || 'default', 
          voice.bio || '', 
          voice.pitch || 1.0, 
          voice.rate || 1.0,
          voice.ttsServerUrl || ttsServerUrl
        );
        if (audioUrl) {
          if (window.activeAudioElement) {
            window.activeAudioElement.pause();
          }
          const audio = new Audio(audioUrl);
          window.activeAudioElement = audio;
          audio.onended = () => {
            setPlayingVoiceId(null);
            window.activeAudioElement = null;
          };
          audio.onerror = () => {
            setPlayingVoiceId(null);
            playVoiceSpeechSynthesis(voice);
          };
          audio.play().catch(() => {
            playVoiceSpeechSynthesis(voice);
          });
        } else {
          playVoiceSpeechSynthesis(voice);
        }
      } catch (err) {
        playVoiceSpeechSynthesis(voice);
      }
    } else {
      playVoiceSpeechSynthesis(voice);
    }
  };

  // Voice Custom Design generators and speech controllers
  const handleDesignVoice = () => {
    if (!voiceDesc.trim()) {
      alert('Digita una descripción de la voz en Voice Description.');
      return;
    }
    setIsGeneratingCustomVoice(true);
    setGeneratedVoicePreviews(null);
    setSelectedPreviewIndex(null);
    cancelBrowserSpeech();
    setPlayingPreviewId(null);
    
    setTimeout(() => {
      setIsGeneratingCustomVoice(false);
      const previews = Array.from({ length: voicePreviewsCount }, (_, i) => {
        let pitchFactor = 1.0;
        let rateFactor = 1.0;
        if (i === 0 && voicePreviewsCount > 1) {
          pitchFactor = 0.8;
          rateFactor = 0.9;
        } else if (i === 2 && voicePreviewsCount > 2) {
          pitchFactor = 1.25;
          rateFactor = 1.1;
        } else if (i > 2) {
          pitchFactor = 0.9 + (i * 0.1);
          rateFactor = 0.9 + (i * 0.05);
        }
        return {
          id: `preview-${i + 1}`,
          index: i + 1,
          pitchFactor,
          rateFactor,
          pitch: voicePitch * pitchFactor,
          rate: voiceRate * rateFactor
        };
      });
      setGeneratedVoicePreviews(previews);
      setSelectedPreviewIndex(0); 
    }, 2000);
  };

  const handleGenerateScript = () => {
    const scripts = [
      '¡Hola! Estoy muy emocionado de ayudarte en esta nueva historia. ¿Cuál es tu próximo movimiento?',
      'Saludos, viajero. Las estrellas han revelado un sendero peligroso. ¿Estás listo?',
      'Bienvenido de vuelta. Tu equipo está esperando tus órdenes. ¿Qué haremos primero?',
      'La magia está en el aire... Siento una extraña distorsión en la realidad. Ten cuidado.'
    ];
    const rand = scripts[Math.floor(Math.random() * scripts.length)];
    setVoiceScript(rand);
  };

  const playPreviewSpeechSynthesis = (preview, textToSpeak) => {
    speakBrowserUtterance({
      text: textToSpeak,
      voiceURI: selectedVoiceURI,
      pitch: voicePitch * preview.pitchFactor,
      rate: voiceRate * preview.rateFactor,
      onStart: () => setPlayingPreviewId(preview.id),
      onEnd: () => setPlayingPreviewId(null),
      onError: () => setPlayingPreviewId(null)
    });
  };

  const handlePlayVoicePreview = async (preview) => {
    if (playingPreviewId === preview.id) {
      if (window.activeAudioElement) {
        window.activeAudioElement.pause();
        window.activeAudioElement = null;
      } else {
        cancelBrowserSpeech();
      }
      setPlayingPreviewId(null);
      return;
    }

    const textToSpeak = voiceScript.trim() || '¡Hola, estoy emocionado de ayudarte hoy!';

    if (voiceEngine === 'lmstudio') {
      setPlayingPreviewId(preview.id);
      try {
        // Enviar la descripción, pitch y speed en la síntesis local
        const audioUrl = await generateAudioLocal(
          textToSpeak, 
          selectedVoicePreset, 
          voiceDesc, 
          voicePitch * preview.pitchFactor, 
          voiceRate * preview.rateFactor,
          ttsServerUrl
        );
        if (audioUrl) {
          if (window.activeAudioElement) {
            window.activeAudioElement.pause();
          }
          const audio = new Audio(audioUrl);
          window.activeAudioElement = audio;
          audio.onended = () => {
            setPlayingPreviewId(null);
            window.activeAudioElement = null;
          };
          audio.onerror = () => {
            console.warn("Fallo de audio binario local. Usando voz del sistema como alternativa.");
            playPreviewSpeechSynthesis(preview, textToSpeak);
          };
          audio.play().catch(() => {
            playPreviewSpeechSynthesis(preview, textToSpeak);
          });
        } else {
          playPreviewSpeechSynthesis(preview, textToSpeak);
        }
      } catch (err) {
        console.warn("LM Studio TTS no devolvió audio binario (endpoint /v1/audio/speech no habilitado en LM Studio). Usando sintetizador del sistema:", err.message);
        playPreviewSpeechSynthesis(preview, textToSpeak);
      }
    } else {
      playPreviewSpeechSynthesis(preview, textToSpeak);
    }
  };

  const handleSaveVoice = () => {
    if (!newVoiceName.trim()) {
      alert('Por favor introduce un nombre para la voz del Narrador.');
      return;
    }

    const nextNarrator = {
      id: `narrator-user-${Date.now()}`,
      name: newVoiceName.trim(),
      bio: voiceDesc.trim() || 'Voz creada localmente con IA',
      style: `${voiceEngine === 'lmstudio' ? 'LM Studio' : 'Navegador'}`,
      tone: `Tono: ${voicePitch.toFixed(1)}x`,
      rules: `Voz preset: ${selectedVoicePreset}. Pitch: ${voicePitch}, Rate: ${voiceRate}`,
      voiceEngine,
      voicePreset: selectedVoicePreset,
      voiceURI: selectedVoiceURI,
      pitch: voicePitch,
      rate: voiceRate,
      ttsServerUrl,
      phrase: voiceScript.trim() || '¡Hola! Bienvenido a mi escenario.',
      avatar: newVoiceGender === 'Masculino' 
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      gender: newVoiceGender,
      tags: `${voiceEngine === 'lmstudio' ? 'LM Studio' : 'Browser'} | Pitch: ${voicePitch.toFixed(1)}x`
    };

    const updatedNarrators = [...(data.narrators || []), nextNarrator];
    const nextData = {
      ...data,
      narrators: updatedNarrators
    };

    setData(nextData);
    if (typeof onUpdateAppData === 'function') {
      onUpdateAppData(nextData);
    }

    alert(`Voz/Narrador "${nextNarrator.name}" guardado con éxito. Ahora puedes seleccionarlo al crear un escenario.`);
    
    // Cambiar a la lista de voces
    setVoiceTopTab('generate');
    setVoiceTab('mine');
    
    // Resetear campos del formulario
    setNewVoiceName('');
    setVoiceSubTab('generate');
  };

  // Sound effect local generation with fallback
  const handleGenerateAudioTrack = async () => {
    if (!audioPrompt.trim()) {
      alert('Digita un prompt para generar el sonido.');
      return;
    }
    
    try {
      const fallbackSoundSpeak = () => {
        speakBrowserUtterance({
          text: `Sintetizando efecto de sonido para: ${audioPrompt.trim()}`
        });
      };

      const audioUrl = await generateAudioLocal(`Efecto de sonido de: ${audioPrompt.trim()}`);
      if (audioUrl) {
        if (window.activeAudioElement) {
          window.activeAudioElement.pause();
        }
        const audio = new Audio(audioUrl);
        window.activeAudioElement = audio;
        audio.play().catch(() => {
          fallbackSoundSpeak();
        });
        alert(`Efecto de sonido "${audioPrompt.trim()}" generado y reproducido localmente.`);
      } else {
        fallbackSoundSpeak();
        alert(`Efecto de sonido "${audioPrompt.trim()}" generado mediante síntesis del navegador.`);
      }
    } catch (e) {
      speakBrowserUtterance({
        text: `Sintetizando efecto de sonido para: ${audioPrompt.trim()}`
      });
      alert(`Efecto de sonido "${audioPrompt.trim()}" generado mediante síntesis del navegador.`);
    }
  };

  // Image AI generator local integration
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Digita un prompt para generar el arte.');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const localUrl = await generateImageLocal(imagePrompt, 'Fantasía Oscura');
      if (localUrl) {
        setAiImages(prev => [localUrl, ...prev]);
        setImagePrompt('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Render AI Tool Sub-page
  if (activeAiTool) {
    return (
      <div className="create-page" style={{ padding: '16px' }}>
        <button 
          onClick={() => {
            cancelBrowserSpeech();
            setPlayingVoiceId(null);
            setActiveAiTool(null);
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffd36b',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Volver a Creación
        </button>

        {/* TOOL 1: GENERADOR VÍDEO IA */}
        {activeAiTool === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <button 
                onClick={() => setVideoTab('video')} 
                style={{ background: 'transparent', border: 'none', color: videoTab === 'video' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', borderBottom: videoTab === 'video' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
              >
                Crear Video
              </button>
              <button 
                onClick={() => setVideoTab('loop')} 
                style={{ background: 'transparent', border: 'none', color: videoTab === 'loop' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', borderBottom: videoTab === 'loop' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
              >
                Crear Loop Cover
              </button>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Parámetros */}
              <div style={{ flex: '1 1 320px', maxWidth: '420px', background: 'rgba(20,20,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', padding: '18px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Modelo de Video</label>
                  <select style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}>
                    <option>Seedance 2.0 (137.57 Mana/Arcane)</option>
                    <option>Seedance 1.5 Lite</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Modo de Entrada</label>
                  <select style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}>
                    <option>Imagen a Video</option>
                    <option>Texto a Video</option>
                  </select>
                </div>

                {/* Fotograma Uploader */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Imagen de Fotograma (Referencia)</label>
                  <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faImage} style={{ fontSize: '1.4rem', color: '#ffd36b', marginBottom: '6px' }} /><br />
                    Haz clic para subir o arrastrar fotograma
                  </div>
                </div>

                {/* Audio */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Audio (Opcional - Máx 2 pistas)</label>
                  <button style={{ width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', background: 'transparent', color: '#eaeaea', fontSize: '0.82rem', cursor: 'pointer' }}>
                    + Añadir pista de sonido (0/2)
                  </button>
                </div>

                {/* Prompt */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Prompt del Tráiler/Loop</label>
                  <textarea 
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    rows={3} 
                    placeholder="Describe los movimientos, efectos de cámara o transiciones que deseas generar..." 
                    style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Relación de aspecto</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['16:9', '9:16', '1:1'].map(r => (
                      <button key={r} onClick={() => setVideoAspect(r)} style={{ flex: 1, padding: '6px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: videoAspect === r ? 'rgba(255,211,107,0.15)' : 'transparent', color: videoAspect === r ? '#ffd36b' : '#fff', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolucion */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Resolución</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['480P', '720P', '1080P'].map(res => (
                      <button key={res} onClick={() => setVideoRes(res)} style={{ flex: 1, padding: '6px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: videoRes === res ? 'rgba(255,211,107,0.15)' : 'transparent', color: videoRes === res ? '#ffd36b' : '#fff', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer' }}>
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  style={{
                    background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)',
                    border: 'none',
                    color: '#000',
                    fontWeight: '700',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    marginTop: '10px'
                  }}
                >
                  {isGeneratingVideo ? 'Generando Vídeo IA...' : 'Generar Video (137.57 mana)'}
                </button>
              </div>

              {/* Pantalla de Previsualización */}
              <div style={{ flex: '1 1 400px', background: '#0b0c11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '380px', position: 'relative', overflow: 'hidden' }}>
                {isGeneratingVideo ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '4px solid rgba(255,211,107,0.15)', borderTop: '4px solid #ffd36b', borderRadius: '50%', width: '38px', height: '38px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)' }}>El procesador está sintetizando los fotogramas...</span>
                  </div>
                ) : generatedVideoUrl ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={generatedVideoUrl} alt="Generated Loop" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                    <span style={{ position: 'absolute', bottom: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.72rem', color: '#ffd36b' }}>
                      Loop Generado con Éxito
                    </span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.45)' }}>
                    <FontAwesomeIcon icon={faVideo} style={{ fontSize: '2.5rem', marginBottom: '14px', opacity: 0.5 }} />
                    <h4>Nada aquí todavía</h4>
                    <p style={{ fontSize: '0.78rem', maxWidth: '300px', margin: '6px auto 0 auto', lineHeight: '1.4' }}>Elige un fotograma a la izquierda, selecciona un modelo y pulsa Generar Video.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOOL 2: GENERADOR VOCES IA */}
        {activeAiTool === 'voice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cabecera Principal de Pestañas */}
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <button 
                onClick={() => setVoiceTopTab('create')} 
                style={{ background: 'transparent', border: 'none', color: voiceTopTab === 'create' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', borderBottom: voiceTopTab === 'create' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
              >
                Crear Voz
              </button>
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setPlayingVoiceId(null);
                  setVoiceTopTab('generate');
                }} 
                style={{ background: 'transparent', border: 'none', color: voiceTopTab === 'generate' ? '#ffd36b' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', borderBottom: voiceTopTab === 'generate' ? '2px solid #ffd36b' : 'none', paddingBottom: '6px' }}
              >
                Generar Audio
              </button>
            </div>

            {/* VISTA 1: CREAR VOZ (Split Creator Panel) */}
            {voiceTopTab === 'create' && (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* Columna Izquierda: Parámetros del Formulario */}
                <div style={{ flex: '1 1 320px', maxWidth: '440px', background: 'rgba(20,20,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', padding: '18px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Creation Type */}
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: '6px' }}>Creation Type</label>
                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <button 
                        onClick={() => setVoiceCreationType('design')}
                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: voiceCreationType === 'design' ? '#2563eb' : 'transparent', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Design Voice
                      </button>
                      <button 
                        onClick={() => setVoiceCreationType('clone')}
                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: voiceCreationType === 'clone' ? '#2563eb' : 'transparent', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Clone
                      </button>
                    </div>
                  </div>

                  {/* Sub navegación interna */}
                  <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                    <span 
                      onClick={() => setVoiceSubTab('generate')}
                      style={{ fontSize: '0.85rem', fontWeight: 'bold', color: voiceSubTab === 'generate' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', borderBottom: voiceSubTab === 'generate' ? '2px solid #fff' : 'none', paddingBottom: '4px' }}
                    >
                      Generar
                    </span>
                    <span 
                      onClick={() => setVoiceSubTab('save')}
                      style={{ fontSize: '0.85rem', fontWeight: 'bold', color: voiceSubTab === 'save' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', borderBottom: voiceSubTab === 'save' ? '2px solid #fff' : 'none', paddingBottom: '4px' }}
                    >
                      Guardar detalles
                    </span>
                  </div>

                  {voiceSubTab === 'generate' ? (
                    <>
                      {/* Motor de Audio */}
                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Motor de Audio</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <button 
                            type="button"
                            onClick={() => setVoiceEngine('browser')}
                            style={{ flex: 1, padding: '8px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: voiceEngine === 'browser' ? 'rgba(255,211,107,0.15)' : 'transparent', color: voiceEngine === 'browser' ? '#ffd36b' : '#fff', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer' }}
                          >
                            Sintetizador Sistema (Browser)
                          </button>
                          <button 
                            type="button"
                            onClick={() => setVoiceEngine('lmstudio')}
                            style={{ flex: 1, padding: '8px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: voiceEngine === 'lmstudio' ? 'rgba(255,211,107,0.15)' : 'transparent', color: voiceEngine === 'lmstudio' ? '#ffd36b' : '#fff', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer' }}
                          >
                            LM Studio (audio.cpp)
                          </button>
                        </div>
                      </div>

                      {voiceEngine === 'browser' ? (
                        <>
                          {/* Idioma */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>Idioma <span style={{ color: '#eb5757' }}>*</span></span>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Español ▶</span>
                          </div>

                          {/* Voz del Sistema Selector */}
                          <div>
                            <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Voz del Sistema (Elegir voz masculina/femenina)</label>
                            <select 
                              value={selectedVoiceURI} 
                              onChange={(e) => setSelectedVoiceURI(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                            >
                              {systemVoices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                  {v.name} ({v.lang})
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'rgba(255, 211, 107, 0.08)', border: '1px solid rgba(255, 211, 107, 0.2)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.72rem', color: '#ffd36b', marginBottom: '8px' }}>
                            ℹ️ <strong>Información TTS:</strong> LM Studio sirve inferencia de texto. Si usas un servidor TTS local independiente (Kokoro-FastAPI, AllTalk, etc.), especifica su URL abajo. Si no responde con audio en <code>/v1/audio/speech</code>, se usará la voz del navegador.
                          </div>

                          {/* URL del Servidor TTS Local */}
                          <div>
                            <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>URL del Servidor TTS Local (API)</label>
                            <input 
                              type="text" 
                              value={ttsServerUrl}
                              onChange={(e) => setTtsServerUrl(e.target.value)}
                              placeholder="http://localhost:8880 o http://localhost:1234"
                              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', boxSizing: 'border-box' }}
                            />
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginTop: '3px', marginBottom: '8px' }}>
                              Ej. http://localhost:8880 (Kokoro-FastAPI) o puerto de tu API TTS local.
                            </span>
                          </div>

                          {/* Modelo de Voz Local */}
                          <div>
                            <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Modelo de Voz Local (LM Studio)</label>
                            <select 
                              value={selectedAudioModel} 
                              onChange={(e) => setSelectedAudioModel(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                            >
                              {availableAudioModels.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.id}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Voz / Estilo Preset */}
                          <div>
                            <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Voz / Estilo Preset</label>
                            <select 
                              value={selectedVoicePreset} 
                              onChange={(e) => setSelectedVoicePreset(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                            >
                              <optgroup label="Voces Estándar OpenAI">
                                <option value="alloy">Alloy (Neutro)</option>
                                <option value="echo">Echo (Cálido)</option>
                                <option value="fable">Fable (Narrativo)</option>
                                <option value="onyx">Onyx (Grave)</option>
                                <option value="nova">Nova (Femenina brillante)</option>
                                <option value="shimmer">Shimmer (Profesional)</option>
                              </optgroup>
                              <optgroup label="Voces Kokoro / Audio.cpp">
                                <option value="af_bella">Bella (Femenina americana)</option>
                                <option value="af_sarah">Sarah (Femenina alegre)</option>
                                <option value="am_adam">Adam (Masculino americano)</option>
                                <option value="bm_george">George (Masculino británico)</option>
                                <option value="bf_emma">Emma (Femenina británica)</option>
                              </optgroup>
                            </select>
                          </div>
                        </>
                      )}

                      {/* Sliders manuales de Tono y Velocidad */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: '4px' }}>
                            <span>Tono (Pitch): {voicePitch.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={voicePitch} 
                            onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#ffd36b', cursor: 'pointer' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: '4px' }}>
                            <span>Velocidad (Speed): {voiceRate.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={voiceRate} 
                            onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#ffd36b', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      {/* Voice Description */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Voice Description <span style={{ color: '#eb5757' }}>*</span></label>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                          Describe the voice in English: age, gender, accent, pitch, pace, tone. 30-250 characters.
                        </span>
                        <textarea 
                          value={voiceDesc}
                          onChange={(e) => setVoiceDesc(e.target.value)}
                          rows={3} 
                          placeholder="A warm, friendly voice with a subtle smile; natural pacing; clear articulation." 
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', resize: 'none', boxSizing: 'border-box' }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{voiceDesc.length}/250</div>
                      </div>

                      {/* Guion de Muestra */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Guion de Muestra de Voz <span style={{ color: '#eb5757' }}>*</span></label>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                          Script for the voice to speak in the preview. Should produce 1-15 seconds of audio (~50-200 characters).
                        </span>
                        <textarea 
                          value={voiceScript}
                          onChange={(e) => setVoiceScript(e.target.value)}
                          rows={3} 
                          placeholder="¡Hola, estoy emocionado de ayudarte hoy!" 
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', resize: 'none', boxSizing: 'border-box' }}
                        />
                        <button 
                          onClick={handleGenerateScript}
                          style={{ marginTop: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          ✨ Generar guion
                        </button>
                      </div>

                      {/* Number of Previews */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', display: 'block' }}>Number of Previews</span>
                          <small style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>How many voice samples to generate.</small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <button 
                            type="button"
                            onClick={() => setVoicePreviewsCount(v => Math.max(1, v - 1))}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', minWidth: '12px', textAlign: 'center' }}>{voicePreviewsCount}</span>
                          <button 
                            type="button"
                            onClick={() => setVoicePreviewsCount(v => Math.min(10, v + 1))}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={handleDesignVoice}
                        disabled={isGeneratingCustomVoice}
                        style={{
                          background: 'linear-gradient(90deg, #1d4ed8, #2563eb)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: '700',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {isGeneratingCustomVoice ? 'Diseñando voz...' : '💠 Design Voice'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Formulario de Guardado */}
                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nombre del Narrador / Voz <span style={{ color: '#eb5757' }}>*</span></label>
                        <input 
                          type="text" 
                          value={newVoiceName} 
                          onChange={(e) => setNewVoiceName(e.target.value)}
                          placeholder="Ej. El Bardo Susurrante, Sarah Alegre..." 
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Género</label>
                        <select 
                          value={newVoiceGender} 
                          onChange={(e) => setNewVoiceGender(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        >
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Neutro">Neutro</option>
                          <option value="Fantasía">Fantasía / Otro</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Descripción de la Voz (Bio)</label>
                        <textarea 
                          value={voiceDesc}
                          onChange={(e) => setVoiceDesc(e.target.value)}
                          rows={2}
                          placeholder="Describe la voz..."
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', resize: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Frase / Guion de Muestra</label>
                        <textarea 
                          value={voiceScript}
                          onChange={(e) => setVoiceScript(e.target.value)}
                          rows={2}
                          placeholder="Frase inicial..."
                          style={{ width: '100%', padding: '8px 10px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', resize: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Resumen de configuración */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        <div style={{ fontWeight: 'bold', color: '#ffd36b', marginBottom: '4px' }}>Parámetros de Voz configurados:</div>
                        <div>Motor: {voiceEngine === 'lmstudio' ? `LM Studio (${selectedAudioModel})` : 'Navegador/Sistema'}</div>
                        <div>Preset/Voz: {voiceEngine === 'lmstudio' ? selectedVoicePreset : selectedVoiceURI}</div>
                        <div>Tono: {voicePitch.toFixed(1)}x | Velocidad: {voiceRate.toFixed(1)}x</div>
                      </div>

                      <button 
                        onClick={handleSaveVoice}
                        style={{
                          background: 'linear-gradient(90deg, #10b981, #059669)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: '700',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        💾 Guardar Voz / Narrador
                      </button>
                    </>
                  )}
                </div>

                {/* Columna Derecha: Vista previa de Voz */}
                <div style={{ flex: '1 1 400px', background: '#0b0c11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>Vista previa</h3>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Vistas previas generadas</span>
                  </div>

                  {/* Cajas de previsualizaciones */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {Array.from({ length: voicePreviewsCount }).map((_, i) => {
                      const idx = i;
                      const hasData = generatedVoicePreviews && generatedVoicePreviews[idx];
                      const isSelected = selectedPreviewIndex === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (hasData) {
                              setSelectedPreviewIndex(idx);
                              handlePlayVoicePreview(generatedVoicePreviews[idx]);
                            }
                          }}
                          style={{
                            flex: 1,
                            height: '60px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #ffd36b' : '1.5px dashed rgba(255,255,255,0.15)',
                            background: isSelected ? 'rgba(255,211,107,0.08)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: hasData ? 'pointer' : 'default',
                            color: isSelected ? '#ffd36b' : 'rgba(255,255,255,0.3)',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reproductor Central */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                    {isGeneratingCustomVoice ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ border: '3px solid rgba(255,211,107,0.15)', borderTop: '3px solid #ffd36b', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Sintetizando frecuencia de la voz...</span>
                      </div>
                    ) : generatedVoicePreviews && selectedPreviewIndex !== null ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,211,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ffd36b' }}>
                          <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: '1.6rem' }} />
                        </div>
                        <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>Muestra de Voz #{selectedPreviewIndex + 1}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px 0' }}>
                          Tono: {(generatedVoicePreviews[selectedPreviewIndex].pitch).toFixed(2)}x | Velocidad: {(generatedVoicePreviews[selectedPreviewIndex].rate).toFixed(2)}x
                        </p>
                        <button 
                          onClick={() => handlePlayVoicePreview(generatedVoicePreviews[selectedPreviewIndex])}
                          style={{
                            background: playingPreviewId === generatedVoicePreviews[selectedPreviewIndex].id ? '#ffd36b' : '#fff',
                            border: 'none',
                            color: '#000',
                            padding: '10px 24px',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <FontAwesomeIcon icon={playingPreviewId === generatedVoicePreviews[selectedPreviewIndex].id ? faPause : faPlay} />
                          <span>{playingPreviewId === generatedVoicePreviews[selectedPreviewIndex].id ? 'Pausar' : 'Escuchar Muestra'}</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                        <div style={{ border: '1.5px dashed rgba(255,255,255,0.12)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', fontSize: '1.4rem' }}>
                          🎤
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.7)' }}>Aún no hay vistas previas</h4>
                        <p style={{ fontSize: '0.78rem', maxWidth: '240px', margin: '0 auto', lineHeight: '1.4' }}>Describe la voz y toca "Diseñar voz"</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VISTA 2: GENERAR AUDIO (Community Voices Grid) */}
            {voiceTopTab === 'generate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Selector Comunidad / Mis Generaciones */}
                <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '4px' }}>
                  <span 
                    onClick={() => setVoiceTab('community')} 
                    style={{ fontSize: '0.9rem', fontWeight: '700', color: voiceTab === 'community' ? '#ffd36b' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    Comunidad (Voces)
                  </span>
                  <span 
                    onClick={() => setVoiceTab('mine')} 
                    style={{ fontSize: '0.9rem', fontWeight: '700', color: voiceTab === 'mine' ? '#ffd36b' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    Mis Generaciones
                  </span>
                </div>

                {/* Buscador de Voces Activo */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={audioPrompt}
                    onChange={(e) => setAudioPrompt(e.target.value)}
                    placeholder="Mujer en sus 20s, voz fluida, suave y melodiosa, alegre." 
                    style={{ flex: 1, padding: '10px 14px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <button 
                    onClick={handleGenerateAudioTrack}
                    style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Generar Audio
                  </button>
                </div>

                {/* Lista de voces */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {voiceTab === 'community' ? (
                    COMMUNITY_VOICES.map(voice => (
                      <div 
                        key={voice.id} 
                        style={{
                          background: 'rgba(20,20,30,0.6)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px'
                        }}
                      >
                        <img src={voice.avatar} alt={voice.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.15)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#fff' }}>{voice.name}</span>
                            <span style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', padding: '1px 5px', borderRadius: '4px' }}>
                              {voice.gender}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {voice.bio}
                          </p>
                          <small style={{ color: '#ffd36b', fontSize: '0.7rem', fontWeight: 'bold' }}>{voice.tags}</small>
                        </div>

                        <button 
                          onClick={() => handlePlayVoice(voice)}
                          style={{
                            background: playingVoiceId === voice.id ? '#ffd36b' : 'rgba(255,255,255,0.08)',
                            border: 'none',
                            color: playingVoiceId === voice.id ? '#000' : '#ffd36b',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <FontAwesomeIcon icon={playingVoiceId === voice.id ? faPause : faPlay} />
                        </button>
                      </div>
                    ))
                  ) : (data.narrators && data.narrators.length > 0) ? (
                    data.narrators.map(voice => (
                      <div 
                        key={voice.id} 
                        style={{
                          background: 'rgba(20,20,30,0.6)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px'
                        }}
                      >
                        <img src={voice.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'} alt={voice.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.15)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#fff' }}>{voice.name}</span>
                            <span style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', padding: '1px 5px', borderRadius: '4px' }}>
                              {voice.gender || 'Femenino'}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {voice.bio}
                          </p>
                          <small style={{ color: '#ffd36b', fontSize: '0.7rem', fontWeight: 'bold' }}>{voice.tags || voice.style}</small>
                        </div>

                        <button 
                          onClick={() => handlePlayVoice(voice)}
                          style={{
                            background: playingVoiceId === voice.id ? '#ffd36b' : 'rgba(255,255,255,0.08)',
                            border: 'none',
                            color: playingVoiceId === voice.id ? '#000' : '#ffd36b',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <FontAwesomeIcon icon={playingVoiceId === voice.id ? faPause : faPlay} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>No tienes voces guardadas todavía.</p>
                      <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>Ve a la sección "Crear Voz" y pulsa la pestaña "Guardar detalles" para registrar tu voz diseñada.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOOL 3: GENERADOR IMÁGENES IA */}
        {activeAiTool === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#ffd36b', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', borderBottom: '2px solid #ffd36b', paddingBottom: '6px' }}>
                Crear Imagen de IA
              </button>
              <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', paddingBottom: '6px' }}>
                Eliminar Fondo
              </button>
            </div>

            {/* Prompt bar */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Escribe el prompt para generar una imagen (ej: Cyberpunk elf mage vertical art)..." 
                style={{ flex: 1, padding: '10px 14px', background: '#1e1e2c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
              />
              <button 
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                style={{ background: 'linear-gradient(90deg, #ffd36b, #ff9f6b)', border: 'none', color: '#000', fontWeight: '700', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {isGeneratingImage ? 'Generando...' : 'Generar Imagen'}
              </button>
            </div>

            {/* Galería de resultados */}
            <div>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', color: '#ffffff' }}>Galería de creaciones</h3>
              
              {isGeneratingImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', background: 'rgba(255,211,107,0.05)', borderRadius: '10px', marginBottom: '14px', color: '#ffd36b' }}>
                  <div style={{ border: '3px solid rgba(255,211,107,0.15)', borderTop: '3px solid #ffd36b', borderRadius: '50%', width: '18px', height: '18px', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontSize: '0.85rem' }}>Synthesizing prompt into art styles...</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                {aiImages.map((img, i) => (
                  <div 
                    key={i} 
                    style={{
                      background: 'rgba(20,20,30,0.6)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      aspectRatio: '1',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ backgroundImage: `url(${img})`, width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="create-page">
      <div className="page-header-title" style={{ padding: '0 8px' }}>
        <h2>Creación</h2>
        <p>Arma mundos, tarjetas modulares y narradores interactivos.</p>
      </div>

      {/* SECCIÓN NUEVA: HERRAMIENTAS DE IA (IsekaiZero-inspired) */}
      <div style={{ padding: '0 8px', marginTop: '10px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', color: '#ffd36b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Herramientas de IA</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          
          <div 
            onClick={() => setActiveAiTool('video')}
            style={{
              flex: '1 1 200px',
              background: 'linear-gradient(135deg, rgba(235, 87, 87, 0.12), rgba(0, 0, 0, 0.3))',
              border: '1px solid rgba(235, 87, 87, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'transform 0.18s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ background: '#eb5757', color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <FontAwesomeIcon icon={faVideo} style={{ margin: 'auto' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', color: '#fff' }}>Vídeo IA</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Loops de portada y tráilers.</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveAiTool('voice')}
            style={{
              flex: '1 1 200px',
              background: 'linear-gradient(135deg, rgba(43, 226, 138, 0.12), rgba(0, 0, 0, 0.3))',
              border: '1px solid rgba(43, 226, 138, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'transform 0.18s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ background: '#2be28a', color: '#000', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <FontAwesomeIcon icon={faMicrophone} style={{ margin: 'auto' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', color: '#fff' }}>Voz y Sonidos IA</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Generación de voces de personajes.</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveAiTool('image')}
            style={{
              flex: '1 1 200px',
              background: 'linear-gradient(135deg, rgba(255, 211, 107, 0.12), rgba(0, 0, 0, 0.3))',
              border: '1px solid rgba(255, 211, 107, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'transform 0.18s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ background: '#ffd36b', color: '#000', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <FontAwesomeIcon icon={faImage} style={{ margin: 'auto' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', color: '#fff' }}>Imágenes IA</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Generador de arte conceptual.</p>
            </div>
          </div>

        </div>
      </div>

      <section className="create-actions">
        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Escenario')}>
          <div className="icon icon-scenario" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="24" r="6" fill="currentColor" />
              <circle cx="42" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M14 32C14 20 24 12 32 12C40 12 50 20 50 32C50 44 40 52 32 52C24 52 14 44 14 32Z" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M32 8V4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="card-title">Crear escenario</div>
          <div className="card-copy">Arma viajes completos y mundos jugables.</div>
        </button>

        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Historia')}>
          <div className="icon icon-card" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="14" y="16" width="36" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="5" />
              <path d="M28 24C28 21 30 18 34 18C38 18 40 20 40 23C40 26 36 26 36 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="34" cy="38" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="card-title">Crear tarjeta</div>
          <div className="card-copy">Define ideas, personajes, memorias y reglas.</div>
        </button>

        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Narrador')}>
          <div className="icon icon-narrator" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M14 18C18 10 46 10 50 18" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M32 18V28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M24 28V38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M40 28V38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="32" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M26 54C26 50 38 50 38 54" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="card-title">Crear narrador</div>
          <div className="card-copy">Crea el hilo que guía tu historia.</div>
        </button>

        <button className="action-card" onClick={() => onOpenCreateModal && onOpenCreateModal('Herramienta')}>
          <div className="icon icon-workshop" aria-hidden="true" style={{ color: '#ffd36b' }}>
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M40 10l14 14-8 8-14-14 8-8z" />
              <path d="M32 18L12 38v14h14l20-20" />
              <circle cx="20" cy="44" r="3" fill="currentColor" />
            </svg>
          </div>
          <div className="card-title">Taller de funciones</div>
          <div className="card-copy">Crea atributos, dados, progresión y tablas de eventos.</div>
        </button>
      </section>

      <div className="create-body">
        <section className="created-section">
          <div className="created-header">
            <div>
              <h2>Elementos creados</h2>
              <p>Explora tus elementos por categoría en listas desplegables.</p>
            </div>
          </div>

          <div className="created-accordion-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {/* Categoría 1: Escenarios (Colapsable) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Escenarios creados ({data.scenarios.length})
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 0 6px 0' }}>
                {data.scenarios.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay escenarios aún.</span>
                ) : (
                  data.scenarios.map(s => (
                    <div 
                      key={s.id} 
                      className="scenario-card-visual" 
                      style={{ flex: '1 1 220px', maxWidth: '320px', minWidth: '200px', cursor: 'pointer' }}
                      onClick={() => onOpenScenario && onOpenScenario(s)}
                    >
                      <div className="sc-card-cover" style={{ backgroundImage: `url(${s.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'})`, height: '120px' }} />
                      <div className="sc-card-body" style={{ padding: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>{s.title}</h4>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>{s.category}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>

            {/* Categoría 2: Tarjetas (Colapsable y tarjetas de acción rápidas) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Tarjetas creadas ({data.cards.length})
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 0 6px 0' }}>
                {data.cards.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay tarjetas aún.</span>
                ) : (
                  data.cards.map(c => {
                    const isChar = (c.type || '').toLowerCase() === 'personaje';
                    const isMemory = (c.type || '').toLowerCase() === 'memoria';
                    const isInv = (c.type || '').toLowerCase() === 'inventario';
                    return (
                      <div 
                        key={c.id} 
                        style={{ flex: isChar ? '0 1 150px' : '1 1 180px', maxWidth: isChar ? '180px' : '280px', minWidth: '140px', background: 'rgba(20,18,30,0.8)', border: `1px solid ${isMemory ? 'rgba(180, 100, 255, 0.3)' : isInv ? 'rgba(255, 211, 107, 0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setSelectedCard(c)}
                      >
                        <div style={{ backgroundImage: `url(${c.cover || (isMemory ? 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80' : isInv ? 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' : 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80')})`, height: isChar ? '160px' : '100px', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div style={{ padding: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isMemory && '🧠 '}
                            {isInv && '🎒 '}
                            {c.title}
                          </h4>
                          <small style={{ color: isMemory ? '#c084fc' : isInv ? '#ffd36b' : 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                            {c.type}
                          </small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </details>

            {/* Categoría 3: Narradores (Colapsable) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Narradores creados ({data.narrators.length})
              </summary>
              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', padding: '12px 0 6px 0' }}>
                {data.narrators.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay narradores aún.</span>
                ) : (
                  data.narrators.map(n => (
                    <div 
                      key={n.id} 
                      style={{ minWidth: '180px', width: '180px', background: 'rgba(20,18,30,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
                      onClick={() => onOpenCreateModal && onOpenCreateModal('Narrador', n)}
                    >
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#fff' }}>{n.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.bio}</p>
                      {n.tools && n.tools.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#ffd36b' }}>
                          🛠️ {n.tools.length} herramienta(s)
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </details>

            {/* Categoría 4: Herramientas y Funciones del Taller (Colapsable) */}
            <details className="created-details" open style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
              <summary style={{ fontWeight: '700', fontSize: '1rem', color: '#ffd36b', cursor: 'pointer' }}>
                Herramientas y Funciones del Taller ({data.tools?.length || 0})
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '12px 0 6px 0' }}>
                {(!data.tools || data.tools.length === 0) ? (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>No hay herramientas creadas en el taller aún.</span>
                ) : (
                  data.tools.map(tool => {
                    const toolIcons = {
                      attributes: '📊',
                      progression: '📈',
                      dice: '🎲',
                      events: '📜',
                      custom: '⚙️'
                    };
                    return (
                      <div
                        key={tool.id}
                        style={{
                          flex: '1 1 200px',
                          maxWidth: '280px',
                          minWidth: '180px',
                          background: 'rgba(20,18,30,0.85)',
                          border: '1px solid rgba(255,211,107,0.2)',
                          borderRadius: '10px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                        onClick={() => onOpenCreateModal && onOpenCreateModal('Herramienta', tool)}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{toolIcons[tool.toolType] || '🛠️'}</span>
                            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#ffd36b', fontWeight: '700' }}>{tool.name}</h4>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {tool.description || 'Herramienta de juego modular para el Narrador.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                            {tool.toolType}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#ffd36b' }}>Editar →</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* Popup de Detalle de Tarjeta y Acciones */}
      {selectedCard && (
        <div className="char-backdrop" style={{ zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedCard(null); }}>
          <div className="char-modal" style={{ maxWidth: '420px', width: '90%', zIndex: 1201 }}>
            <button className="char-close" onClick={() => setSelectedCard(null)}>×</button>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>{selectedCard.title}</h4>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
              Tarjeta de {selectedCard.type}
            </p>
            <div style={{ 
              backgroundImage: `url(${selectedCard.cover || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80'})`, 
              height: '200px', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              borderRadius: '8px', 
              marginBottom: '14px' 
            }} />
            <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                {selectedCard.intro}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                {selectedCard.text}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="primary" 
                onClick={() => {
                  if (onOpenCreateModal) onOpenCreateModal(selectedCard.type, selectedCard);
                  setSelectedCard(null);
                }}
                style={{ fontWeight: '700', padding: '10px' }}
              >
                Editar Tarjeta
              </button>
              <button 
                className="secondary" 
                onClick={() => {
                  handleCopyCard(selectedCard);
                }}
                style={{ fontWeight: '600', padding: '10px', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                Copiar Tarjeta
              </button>
              <button 
                className="secondary" 
                onClick={() => {
                  handleConvertToScenario(selectedCard);
                }}
                style={{ fontWeight: '600', padding: '10px', background: 'rgba(255, 211, 107, 0.1)', borderColor: 'rgba(255, 211, 107, 0.2)', color: '#ffd36b' }}
                title="Genera un escenario jugable a partir de esta tarjeta"
              >
                Escenificar
              </button>
              <button 
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: '¿Eliminar tarjeta?',
                    message: `¿Estás seguro de que deseas eliminar la tarjeta "${selectedCard.title || selectedCard.name || ''}" del compendio? Esta acción no se puede deshacer.`,
                    type: 'danger',
                    confirmText: 'Eliminar',
                    cancelText: 'Cancelar',
                    onConfirm: () => {
                      setConfirmModal(null);
                      handleDeleteCard(selectedCard.id);
                    },
                    onCancel: () => setConfirmModal(null)
                  });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#eb5757',
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  marginTop: '4px',
                  fontWeight: '600'
                }}
              >
                Eliminar Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </div>
  );
}
