import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepForward, faStepBackward, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import './musicView.css';

const GENRES = [
  'Soundtrack', 'Anime', 'Electronic', 'Epic', 'Metal', 
  'Classical', 'Drum & Bass', 'Synthwave', 'Jazz', 'Indie', 'Acoustic'
];

const PLAYLISTS = [
  { id: 'pl-1', title: 'Michiru Radio', desc: 'Mezcla de descubrimiento sónico e inmersión', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80', frequency: 120 },
  { id: 'pl-2', title: 'Top 100', desc: 'Isekai Zero - 100 canciones más escuchadas', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80', frequency: 150 },
  { id: 'pl-3', title: 'Viral 50', desc: 'Tendencia en la comunidad de rol', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80', frequency: 180 },
  { id: 'pl-4', title: 'Fresh 50', desc: 'Nuevos lanzamientos generados con IA', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80', frequency: 220 }
];

const SONGS = [
  { id: 's-1', title: 'I Was There and I Stayed', artist: 'sporkdemcspork', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80', notes: [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66] },
  { id: 's-2', title: 'Nyan, Payment due!', artist: 'avacyin101', cover: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=300&q=80', notes: [329.63, 329.63, 329.63, 261.63, 329.63, 392.00, 196.00] },
  { id: 's-3', title: 'Music To Write', artist: 'nikk', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=300&q=80', notes: [220.00, 261.63, 293.66, 220.00, 220.00, 261.63, 293.66] },
  { id: 's-4', title: 'Lord of the Ninth Circle', artist: 'kailamind', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80', notes: [146.83, 164.81, 174.61, 196.00, 220.00, 196.00, 174.61, 164.81] }
];

export default function MusicView() {
  const [currentSong, setCurrentSong] = useState(SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35); 
  const [duration] = useState(120); 
  const [currentTime, setCurrentTime] = useState(42);
  const [selectedGenre, setSelectedGenre] = useState('Soundtrack');

  const audioCtxRef = useRef(null);
  const noteIndexRef = useRef(0);
  const intervalRef = useRef(null);

  const startSynth = (song) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    noteIndexRef.current = 0;
    
    const playNote = () => {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const osc = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);

      const notesList = song.notes || [261.63, 329.63, 392.00];
      const freq = notesList[noteIndexRef.current % notesList.length];
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime); 
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.6);
      
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.6);
      
      noteIndexRef.current++;
    };

    playNote();
    intervalRef.current = setInterval(playNote, 700);
  };

  const stopSynth = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startSynth(currentSong);
    } else {
      stopSynth();
    }
    return () => stopSynth();
  }, [isPlaying, currentSong]);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime(t => {
          const next = t + 1;
          if (next >= duration) {
            setProgress(0);
            return 0;
          }
          setProgress((next / duration) * 100);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  const handlePlaySong = (song) => {
    if (currentSong.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      setCurrentTime(0);
      setProgress(0);
    }
  };

  const handleNext = () => {
    const currentIndex = SONGS.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % SONGS.length;
    handlePlaySong(SONGS[nextIndex]);
  };

  const handlePrev = () => {
    const currentIndex = SONGS.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + SONGS.length) % SONGS.length;
    handlePlaySong(SONGS[prevIndex]);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="music-page">
      <div className="music-header">
        <h2>Música</h2>
        <p>Genera y explora bandas sonoras envolventes e inmersivas para tus mundos de rol.</p>
      </div>

      <div className="genres-row">
        {GENRES.map(g => (
          <button 
            key={g} 
            className={`genre-pill ${selectedGenre === g ? 'active' : ''}`}
            onClick={() => setSelectedGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="music-body-scroll">
        <section className="music-section">
          <h3>Listas de éxitos</h3>
          <div className="playlists-grid">
            {PLAYLISTS.map(pl => (
              <div key={pl.id} className="playlist-card" onClick={() => handlePlaySong({
                id: pl.id,
                title: pl.title,
                artist: 'Ambient Soundscape',
                cover: pl.cover,
                notes: [pl.frequency, pl.frequency * 1.25, pl.frequency * 1.5, pl.frequency * 1.8]
              })}>
                <div className="pl-cover-container">
                  <div className="pl-cover" style={{ backgroundImage: `url(${pl.cover})` }} />
                  <div className="pl-play-overlay">
                    <FontAwesomeIcon icon={(currentSong.id === pl.id && isPlaying) ? faPause : faPlay} />
                  </div>
                </div>
                <h4>{pl.title}</h4>
                <p>{pl.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="music-section" style={{ marginTop: '20px' }}>
          <h3>Sencillos del momento</h3>
          <div className="songs-grid">
            {SONGS.map(s => (
              <div key={s.id} className={`song-row-item ${currentSong.id === s.id ? 'active' : ''}`} onClick={() => handlePlaySong(s)}>
                <img src={s.cover} alt={s.title} className="song-row-cover" />
                <div className="song-row-info">
                  <div className="song-row-title">{s.title}</div>
                  <div className="song-row-artist">{s.artist}</div>
                </div>
                <button className="song-row-play-btn">
                  <FontAwesomeIcon icon={(currentSong.id === s.id && isPlaying) ? faPause : faPlay} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="bottom-music-player">
        <div className="player-song-details">
          <img src={currentSong.cover} alt={currentSong.title} className="player-cover" />
          <div className="player-text">
            <span className="player-title">{currentSong.title}</span>
            <span className="player-artist">{currentSong.artist}</span>
          </div>
        </div>

        <div className="player-controls-container">
          <div className="player-buttons">
            <button onClick={handlePrev} className="player-btn"><FontAwesomeIcon icon={faStepBackward} /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="player-btn play-pause-btn">
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            <button onClick={handleNext} className="player-btn"><FontAwesomeIcon icon={faStepForward} /></button>
          </div>

          <div className="player-progress-bar-wrapper">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="player-progress-track" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = clickX / rect.width;
              setCurrentTime(Math.floor(percent * duration));
              setProgress(percent * 100);
            }}>
              <div className="player-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-audio-visuals">
          <FontAwesomeIcon icon={faVolumeUp} style={{ marginRight: '14px', opacity: 0.7 }} />
          {isPlaying ? (
            <div className="sound-wave-bars">
              <div className="wave-bar bar-1"></div>
              <div className="wave-bar bar-2"></div>
              <div className="wave-bar bar-3"></div>
              <div className="wave-bar bar-4"></div>
            </div>
          ) : (
            <div className="sound-wave-bars idle">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
