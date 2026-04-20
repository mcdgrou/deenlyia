import React, { useState, useEffect, useRef } from 'react';
import { Book, Search, X, Sparkles, Loader2, Info, BookOpen, ChevronRight, ChevronLeft, Play, Pause, Volume2, Book as BookIcon, Heart, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSurah, type QuranAyah } from '../services/quranService';
import { getSurahDetails } from '../services/geminiService';
import { favoriteService } from '../services/favoriteService';
import { safeJson } from '../lib/utils';
import type { Session } from '@supabase/supabase-js';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface SurahDetail extends Surah {
  meaning?: string;
  context?: string;
  keyThemes?: string[];
  historicalSignificance?: string;
}

const SURAHS_FALLBACK: Surah[] = [
  { number: 1, name: "Al-Fatihah", englishName: "Al-Fatihah", englishNameTranslation: "The Opening", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 2, name: "Al-Baqarah", englishName: "Al-Baqarah", englishNameTranslation: "The Cow", numberOfAyahs: 286, revelationType: "Medinan" },
  { number: 3, name: "Al-Imran", englishName: "Al-Imran", englishNameTranslation: "Family of Imran", numberOfAyahs: 200, revelationType: "Medinan" },
  { number: 4, name: "An-Nisa", englishName: "An-Nisa", englishNameTranslation: "The Women", numberOfAyahs: 176, revelationType: "Medinan" },
  { number: 18, name: "Al-Kahf", englishName: "Al-Kahf", englishNameTranslation: "The Cave", numberOfAyahs: 110, revelationType: "Meccan" },
  { number: 36, name: "Ya-Sin", englishName: "Ya-Sin", englishNameTranslation: "Ya Sin", numberOfAyahs: 83, revelationType: "Meccan" },
  { number: 55, name: "Ar-Rahman", englishName: "Ar-Rahman", englishNameTranslation: "The Beneficent", numberOfAyahs: 78, revelationType: "Meccan" },
  { number: 67, name: "Al-Mulk", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 112, name: "Al-Ikhlas", englishName: "Al-Ikhlas", englishNameTranslation: "The Sincerity", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 113, name: "Al-Falaq", englishName: "Al-Falaq", englishNameTranslation: "The Daybreak", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 114, name: "An-Nas", englishName: "An-Nas", englishNameTranslation: "The Mankind", numberOfAyahs: 6, revelationType: "Meccan" },
];

interface SurahLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  session: Session | null;
  language: string;
  showToast?: (message: string, type?: 'error' | 'success') => void;
  onAction?: () => void;
}

const SurahLibrary: React.FC<SurahLibraryProps> = ({ isOpen, onClose, darkMode, session, language, showToast, onAction }) => {
  const [surahs, setSurahs] = useState<Surah[]>(SURAHS_FALLBACK);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'info' | 'read'>('info');
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const [isSurahPlaying, setIsSurahPlaying] = useState(false);
  const [copiedAyah, setCopiedAyah] = useState<string | null>(null);
  const surahDetailsCache = useRef<Record<number, SurahDetail>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextNextAudioRef = useRef<HTMLAudioElement | null>(null);
  const surahTimeoutRef = React.useRef<any>(null);
  const isSurahPlayingRef = React.useRef(false);
  const currentSessionIdRef = React.useRef<number>(0);
  const currentSurahNumberRef = React.useRef<number | null>(null);

  const quranReciter = session?.user?.user_metadata?.settings?.quranReciter || 'ar.alafasy';

  useEffect(() => {
    const fetchAllSurahs = async () => {
      try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        if (!response.ok) return;
        const data = await safeJson(response, { code: 500, data: [] });
        if (data.code === 200) {
          setSurahs(data.data);
        }
      } catch (error) {
        console.error("Error fetching all surahs:", error);
        // Fallback to SURAHS_FALLBACK is already the initial state
      }
    };
    fetchAllSurahs();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.removeAttribute('src');
        nextAudioRef.current.load();
        nextAudioRef.current = null;
      }
      if (nextNextAudioRef.current) {
        nextNextAudioRef.current.pause();
        nextNextAudioRef.current.removeAttribute('src');
        nextNextAudioRef.current.load();
        nextNextAudioRef.current = null;
      }
      if (surahTimeoutRef.current) {
        clearTimeout(surahTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && session) {
      loadFavorites();
    }
  }, [isOpen, session]);

  const loadFavorites = async () => {
    try {
      const favs = await favoriteService.getFavorites();
      setFavorites(new Set(favs.map(f => `${f.surah_number}:${f.ayah_number}`)));
    } catch (e: any) {
      console.error("Error loading favorites", e);
      if (showToast) showToast(e.message || 'Error al cargar favoritos');
    }
  };

  const isAyahFavorite = (surahNumber: number, ayahNumber: number) => {
    return favorites.has(`${surahNumber}:${ayahNumber}`);
  };

  const toggleFavorite = async (ayah: any) => {
    const key = `${selectedSurah?.number}:${ayah.numberInSurah}`;
    const isFav = favorites.has(key);

    try {
      if (isFav) {
        await favoriteService.removeFavorite(selectedSurah!.number, ayah.numberInSurah);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        if (showToast) showToast('Eliminado de favoritos', 'success');
      } else {
        await favoriteService.addFavorite(
          selectedSurah!.number, 
          ayah.numberInSurah, 
          selectedSurah!.englishName, 
          ayah.arabicText, 
          ayah.translation
        );
        setFavorites(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        if (showToast) showToast('Añadido a favoritos', 'success');
      }
    } catch (e: any) {
      console.error("Error toggling favorite", e);
      if (showToast) showToast(e.message || 'Error al actualizar favoritos');
    }
  };

  const playAyahAudio = (ayah: any) => {
    const ayahId = `${ayah.surah.number}:${ayah.numberInSurah}`;
    
    if (playingAyah === ayahId) {
      stopPlayback();
      return;
    }

    stopPlayback();
    
    isSurahPlayingRef.current = false;
    setIsSurahPlaying(false);

    const audioUrl = `https://cdn.islamic.network/quran/audio/128/${quranReciter}/${ayah.number}.mp3`;
    console.log(`Playing single ayah ${ayah.number}:`, audioUrl);
    
    const audio = new Audio();
    // Removed crossOrigin as it might cause issues with some CDNs if not configured correctly
    
    audio.onended = () => {
      setPlayingAyah(null);
    };

    audio.onerror = () => {
      const error = audio.error;
      console.error(`Audio error for single ayah ${ayah.number}:`, error?.message || "Unknown error", "URL:", audioUrl);
      setPlayingAyah(null);
      if (showToast) showToast('Error al cargar el audio de la Aleya', 'error');
    };

    audio.src = audioUrl;
    audioRef.current = audio;
    setPlayingAyah(ayahId);

    audio.play().catch(err => {
      console.error(`Play promise failed for single ayah ${ayah.number}:`, err);
      setPlayingAyah(null);
    });
  };

  const playFullSurah = async (surahNumber: number) => {
    // If clicking the same surah that is already playing, toggle it off
    if (isSurahPlayingRef.current && currentSurahNumberRef.current === surahNumber) {
      stopPlayback();
      return;
    }

    // If something else is playing, stop it first
    stopPlayback();

    // Start new playback session
    const sessionId = ++currentSessionIdRef.current;
    isSurahPlayingRef.current = true;
    setIsSurahPlaying(true);
    currentSurahNumberRef.current = surahNumber;
    setPlayingAyah(null);

    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${quranReciter}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await safeJson(response, { code: 500, data: { ayahs: [] } });
      
      if (data.code === 200 && data.data.ayahs && sessionId === currentSessionIdRef.current) {
        let ayahsData = [...data.data.ayahs];
        
        // Add Bismillah if not Surah 1 or 9
        if (surahNumber !== 1 && surahNumber !== 9) {
          ayahsData.unshift({
            number: 1,
            audio: `https://cdn.islamic.network/quran/audio/128/${quranReciter}/1.mp3`,
            numberInSurah: 0,
            text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
          });
        }

        let index = 0;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: selectedSurah?.name || 'Sura',
            artist: 'Deenly Quran Player',
            album: selectedSurah?.englishNameTranslation || 'Corán',
            artwork: [
              { src: 'https://picsum.photos/seed/deenly/512/512', sizes: '512x512', type: 'image/png' }
            ]
          });

          navigator.mediaSession.setActionHandler('play', () => {
            if (audioRef.current) {
              audioRef.current.play().catch(err => {
                console.error("MediaSession play failed:", err);
              });
            }
            navigator.mediaSession.playbackState = 'playing';
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            if (audioRef.current) audioRef.current.pause();
            navigator.mediaSession.playbackState = 'paused';
          });
          navigator.mediaSession.setActionHandler('stop', () => {
            stopPlayback();
          });
        }

        const playNext = () => {
          // Check if this session is still active
          if (!isSurahPlayingRef.current || sessionId !== currentSessionIdRef.current || index >= ayahsData.length) {
            console.log(`Playback session ${sessionId} finished or inactive. Index: ${index}/${ayahsData.length}`);
            if (sessionId === currentSessionIdRef.current) {
              stopPlayback();
            }
            return;
          }

          const ayah = ayahsData[index];
          console.log(`Playing ayah ${index + 1}/${ayahsData.length}: ${surahNumber}:${ayah.numberInSurah}`, ayah.audio);
          
          if (!ayah.audio) {
            console.warn("No audio URL for ayah, skipping...", ayah);
            index++;
            surahTimeoutRef.current = setTimeout(playNext, 100);
            return;
          }

          setPlayingAyah(ayah.numberInSurah === 0 ? `bismillah-${surahNumber}` : `${surahNumber}:${ayah.numberInSurah}`);
          
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: ayah.numberInSurah === 0 ? 'Bismillah' : `${selectedSurah?.name} - Aya ${ayah.numberInSurah}`,
              artist: 'Deenly Quran Player',
              album: selectedSurah?.englishNameTranslation || 'Corán',
              artwork: [
                { src: 'https://picsum.photos/seed/deenly/512/512', sizes: '512x512', type: 'image/png' }
              ]
            });
          }

          if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          }

          let audio: HTMLAudioElement;
          if (nextAudioRef.current && nextAudioRef.current.src === ayah.audio) {
            console.log("Using preloaded audio for ayah", ayah.numberInSurah);
            audio = nextAudioRef.current;
            nextAudioRef.current = nextNextAudioRef.current;
            nextNextAudioRef.current = null;
          } else if (nextNextAudioRef.current && nextNextAudioRef.current.src === ayah.audio) {
            console.log("Using second preloaded audio for ayah", ayah.numberInSurah);
            audio = nextNextAudioRef.current;
            nextNextAudioRef.current = null;
          } else {
            audio = new Audio();
            audio.src = ayah.audio;
          }
          
          audioRef.current = audio;
          audio.preload = 'auto';
          audio.currentTime = 0;
          
          // Preload next ayahs (up to 2 ahead)
          const preloadAyah = (targetIndex: number, ref: React.MutableRefObject<HTMLAudioElement | null>) => {
            if (targetIndex < ayahsData.length) {
              const targetAyah = ayahsData[targetIndex];
              if (targetAyah.audio && (!ref.current || ref.current.src !== targetAyah.audio)) {
                const nextAudio = new Audio();
                nextAudio.src = targetAyah.audio;
                nextAudio.preload = 'auto';
                ref.current = nextAudio;
                nextAudio.load();
              }
            }
          };

          preloadAyah(index + 1, nextAudioRef);
          preloadAyah(index + 2, nextNextAudioRef);
          
          audio.onended = () => {
            if (isSurahPlayingRef.current && sessionId === currentSessionIdRef.current) {
              console.log(`Ayah ${ayah.numberInSurah} ended, moving to next.`);
              index++;
              if (surahTimeoutRef.current) clearTimeout(surahTimeoutRef.current);
              surahTimeoutRef.current = setTimeout(playNext, 50);
            }
          };

          audio.onerror = () => {
            const error = audio.error;
            console.error(`Audio error for ayah ${ayah.numberInSurah}:`, error?.message || "Unknown error", "URL:", audio.src);
            
            if (isSurahPlayingRef.current && sessionId === currentSessionIdRef.current) {
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`Retrying ayah ${ayah.numberInSurah} (${retryCount}/${MAX_RETRIES}) in 2s...`);
                if (surahTimeoutRef.current) clearTimeout(surahTimeoutRef.current);
                surahTimeoutRef.current = setTimeout(playNext, 2000);
              } else {
                console.error(`Max retries reached for ayah ${ayah.numberInSurah}, skipping to next.`);
                retryCount = 0;
                index++;
                if (surahTimeoutRef.current) clearTimeout(surahTimeoutRef.current);
                surahTimeoutRef.current = setTimeout(playNext, 1000);
              }
            }
          };

          audio.play().then(() => {
            retryCount = 0;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'playing';
            }
          }).catch(err => {
            console.error(`Play promise failed for ayah ${ayah.numberInSurah}:`, err);
            if (isSurahPlayingRef.current && sessionId === currentSessionIdRef.current) {
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                if (surahTimeoutRef.current) clearTimeout(surahTimeoutRef.current);
                surahTimeoutRef.current = setTimeout(playNext, 2000);
              } else {
                retryCount = 0;
                index++;
                if (surahTimeoutRef.current) clearTimeout(surahTimeoutRef.current);
                surahTimeoutRef.current = setTimeout(playNext, 1000);
              }
            }
          });
        };

        playNext();
      } else if (sessionId === currentSessionIdRef.current) {
        throw new Error("Invalid response from Quran API");
      }
    } catch (err) {
      if (sessionId === currentSessionIdRef.current) {
        console.error("Error playing full surah audio:", err);
        stopPlayback();
        if (showToast) {
          showToast(language === 'Español' ? "No se pudo cargar el audio de la Sura completa." : "Could not load full Surah audio.", 'error');
        }
      }
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.onended = null;
      nextAudioRef.current.onerror = null;
      nextAudioRef.current.pause();
      nextAudioRef.current.removeAttribute('src');
      nextAudioRef.current.load();
      nextAudioRef.current = null;
    }
    if (nextNextAudioRef.current) {
      nextNextAudioRef.current.onended = null;
      nextNextAudioRef.current.onerror = null;
      nextNextAudioRef.current.pause();
      nextNextAudioRef.current.removeAttribute('src');
      nextNextAudioRef.current.load();
      nextNextAudioRef.current = null;
    }
    if (surahTimeoutRef.current) {
      clearTimeout(surahTimeoutRef.current);
      surahTimeoutRef.current = null;
    }
    isSurahPlayingRef.current = false;
    setIsSurahPlaying(false);
    setPlayingAyah(null);
    currentSurahNumberRef.current = null;
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  };

  const handleCopyAyah = async (ayah: any) => {
    const text = `"${ayah.arabicText}"\n\n${ayah.translation}\n\n— Sura ${selectedSurah?.englishName} (${selectedSurah?.number}:${ayah.numberInSurah})\n\nCompartido vía Deenly`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAyah(`${selectedSurah?.number}:${ayah.numberInSurah}`);
      setTimeout(() => setCopiedAyah(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareAyah = async (ayah: any) => {
    const text = `"${ayah.arabicText}"\n\n${ayah.translation}\n\n— Sura ${selectedSurah?.englishName} (${selectedSurah?.number}:${ayah.numberInSurah})`;
    const shareData = {
      title: `Aleya ${selectedSurah?.number}:${ayah.numberInSurah} - Deenly`,
      text: text,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyAyah(ayah);
        }
      }
    } else {
      handleCopyAyah(ayah);
    }
  };

  const fetchSurahContent = async (surahNum: number) => {
    setIsLoading(true);
    try {
      const edition = language === 'Español' ? 'es.cortes' : 
                      language === 'English' ? 'en.sahih' : 
                      language === 'Français' ? 'fr.hamidullah' : 
                      language === 'Indonesian' ? 'id.indonesian' :
                      language === 'Deutsch' ? 'de.aburida' :
                      'es.cortes'; // Default to Spanish translation instead of reciter
      const data = await getSurah(surahNum, edition);
      if (data && data.ayahs) {
        setAyahs(data.ayahs);
        setViewMode('read');
      }
    } catch (error) {
      console.error("Error fetching surah content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString() === searchQuery
  );

  const fetchSurahDetails = async (surah: Surah) => {
    // Set basic info immediately for instant response
    setSelectedSurah(surah);
    
    // Check cache first
    if (surahDetailsCache.current[surah.number]) {
      setSelectedSurah(surahDetailsCache.current[surah.number]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const details = await getSurahDetails(surah.number, surah.name, language);
      
      const surahWithDetails = {
        ...surah,
        ...details
      };
      
      // Save to cache
      surahDetailsCache.current[surah.number] = surahWithDetails;
      
      // Only update if this is still the selected surah
      setSelectedSurah(prev => {
        if (prev?.number === surah.number) {
          return surahWithDetails;
        }
        return prev;
      });
    } catch (error: any) {
      console.error("Error fetching surah details:", error);
      
      let userMessage = error.message || "No se pudieron cargar los detalles adicionales";
      const msg = userMessage.toLowerCase();
      
      if (msg.includes('cuota') || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
        userMessage = "Has excedido tu cuota de la API de Gemini. Por favor, espera unos minutos o verifica los límites de tu plan en Google AI Studio.";
      } else if (msg.includes('expirado') || msg.includes('expired') || msg.includes('api_key_invalid') || msg.includes('key not valid')) {
        userMessage = "La clave de API de Gemini ha expirado o no es válida. Por favor, actualiza la clave en la configuración.";
      } else if (msg.includes('conexión') || msg.includes('json') || msg.includes('unexpected end')) {
        userMessage = "Error de conexión con el servidor de IA. Por favor, intenta de nuevo en unos segundos.";
      }
      
      // We still have the basic info, so just show a toast
      if (showToast) showToast(userMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const currentIndex = selectedSurah ? surahs.findIndex(s => s.number === selectedSurah.number) : -1;

  const goToNextSurah = () => {
    if (currentIndex < surahs.length - 1) {
      setViewMode('info');
      fetchSurahDetails(surahs[currentIndex + 1]);
    }
  };

  const goToPrevSurah = () => {
    if (currentIndex > 0) {
      setViewMode('info');
      fetchSurahDetails(surahs[currentIndex - 1]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <div className="flex items-center gap-3 sm:gap-4">
            {selectedSurah && (
              <button 
                onClick={() => setSelectedSurah(null)}
                className="md:hidden p-2 hover:bg-deenly-gold/10 rounded-xl text-deenly-gold"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
              <BookOpen className="text-white" size={20} />
            </div>
            <div>
              <h2 className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                Biblioteca
              </h2>
              <p className="text-[8px] sm:text-xs opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                Explora el Corán
              </p>
            </div>
          </div>
            <button 
              onClick={onClose}
              className={`p-2 sm:p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
            >
              <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Surah List */}
            <div className={`w-full md:w-80 border-r border-deenly-gold/10 flex flex-col ${selectedSurah ? 'hidden md:flex' : 'flex'} ${darkMode ? 'bg-deenly-dark-bg/30' : 'bg-white/30'}`}>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-deenly-gold opacity-50" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar Sura..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full py-3 pl-10 pr-4 rounded-2xl text-sm border border-deenly-gold/10 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                      darkMode ? 'bg-deenly-dark-bg text-white' : 'bg-white text-deenly-green'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto md:overflow-y-auto p-2 space-y-1 md:space-y-1 flex md:flex-col overflow-x-auto md:overflow-x-hidden snap-x snap-mandatory scrollbar-hide pb-4 md:pb-2">
                {filteredSurahs.map((surah) => (
                  <button
                    key={surah.number}
                    onClick={() => {
                      setViewMode('info');
                      fetchSurahDetails(surah);
                    }}
                    className={`flex-shrink-0 w-[240px] md:w-full p-4 rounded-2xl flex items-center gap-4 transition-colors group snap-center mx-1 md:mx-0 premium-card ${
                      selectedSurah?.number === surah.number
                        ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20'
                        : darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text bg-deenly-dark-surface/50' : 'hover:bg-deenly-gold/5 text-deenly-green bg-white/50'
                    }`}
                  >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    selectedSurah?.number === surah.number ? 'bg-white/20' : 'bg-deenly-gold/10 text-deenly-gold'
                  }`}>
                    {surah.number}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{surah.name}</div>
                    <div className={`text-[10px] opacity-60 truncate ${selectedSurah?.number === surah.number ? 'text-white' : ''}`}>
                      {surah.englishNameTranslation}
                    </div>
                  </div>
                  <ChevronRight size={16} className={selectedSurah?.number === surah.number ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'} />
                </button>
              ))}
            </div>
          </div>

          {/* Surah Details */}
          <div className={`flex-1 overflow-y-auto p-4 sm:p-8 ${selectedSurah ? 'flex' : 'hidden md:flex'}`}>
            <AnimatePresence mode="wait">
              {selectedSurah ? (
                <motion.div
                  key={selectedSurah.number}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -100) goToNextSurah();
                    if (info.offset.x > 100) goToPrevSurah();
                  }}
                  className="space-y-6 sm:space-y-8 w-full"
                >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-deenly-gold/10 text-deenly-gold text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">
                        Sura {selectedSurah.number}
                      </span>
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-deenly-gold/10 text-deenly-gold text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">
                        {selectedSurah.revelationType}
                      </span>
                    </div>
                    <h1 className={`text-3xl sm:text-5xl font-bold tracking-tighter ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                      {selectedSurah.name}
                    </h1>
                    <p className="text-base sm:text-lg text-deenly-gold font-medium mt-1">
                      {selectedSurah.englishNameTranslation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                    <button 
                      onClick={() => playFullSurah(selectedSurah.number)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-md ${
                        isSurahPlaying 
                          ? 'bg-deenly-gold text-white' 
                          : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                      }`}
                    >
                      {isSurahPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {isSurahPlaying ? 'Pausar' : 'Reproducir'}
                    </button>
                    <button 
                      onClick={() => viewMode === 'info' ? fetchSurahContent(selectedSurah.number) : setViewMode('info')}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-md ${
                        viewMode === 'read'
                          ? 'bg-deenly-green text-white'
                          : 'bg-deenly-green/10 text-deenly-green hover:bg-deenly-green/20'
                      }`}
                    >
                      {viewMode === 'read' ? <Info size={14} /> : <BookIcon size={14} />}
                      {viewMode === 'read' ? 'Info' : 'Leer'}
                    </button>
                  </div>
                </div>

                <div className="md:hidden flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold/40 border-y border-deenly-gold/10 py-2">
                  <button onClick={goToPrevSurah} disabled={currentIndex === 0} className="disabled:opacity-20 flex items-center gap-1">
                    <ChevronLeft size={12} /> Anterior
                  </button>
                  <span>Desliza para cambiar</span>
                  <button onClick={goToNextSurah} disabled={currentIndex === surahs.length - 1} className="disabled:opacity-20 flex items-center gap-1">
                    Siguiente <ChevronRight size={12} />
                  </button>
                </div>

                {viewMode === 'info' ? (
                  isLoading && !selectedSurah.meaning ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                      <Loader2 className="animate-spin text-deenly-gold" size={40} />
                      <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold">Consultando detalles...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                          <div className="flex items-center gap-2 mb-3 sm:mb-4 text-deenly-gold">
                            <Info size={16} />
                            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Significado</h3>
                          </div>
                          <p className={`text-xs sm:text-sm leading-relaxed opacity-80 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                            {selectedSurah.meaning || 'Cargando...'}
                          </p>
                        </div>

                        <div className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                          <div className="flex items-center gap-2 mb-3 sm:mb-4 text-deenly-gold">
                            <Book size={16} />
                            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Contexto</h3>
                          </div>
                          <p className={`text-xs sm:text-sm leading-relaxed opacity-80 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                            {selectedSurah.context || 'Cargando...'}
                          </p>
                        </div>
                      </div>

                      <div className={`p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-deenly-gold/10 ${darkMode ? 'bg-deenly-gold/5' : 'bg-deenly-gold/5'}`}>
                        <div className="flex items-center gap-2 mb-4 sm:mb-6 text-deenly-gold">
                          <Sparkles size={18} />
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest">Temas Clave</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {selectedSurah.keyThemes ? selectedSurah.keyThemes.map((theme, i) => (
                            <div 
                              key={i}
                              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-medium border border-deenly-gold/20 ${
                                darkMode ? 'bg-deenly-dark-surface text-white' : 'bg-white text-deenly-green'
                              }`}
                            >
                              {theme}
                            </div>
                          )) : (
                            <p className="text-[10px] opacity-40">Cargando temas...</p>
                          )}
                        </div>
                      </div>

                      <div className={`p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                        <div className="flex items-center gap-2 mb-3 sm:mb-4 text-deenly-gold">
                          <Sparkles size={18} />
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest">Significado Espiritual</h3>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed opacity-80 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                          {selectedSurah.historicalSignificance || 'Cargando...'}
                        </p>
                      </div>
                    </>
                  )
                ) : (
                  <div className="space-y-6">
                    {ayahs.map((ayah) => (
                      <div 
                        key={ayah.number}
                        className={`p-6 rounded-3xl border border-deenly-gold/10 transition-colors ${
                          darkMode ? 'bg-deenly-dark-bg/30' : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-8 h-8 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold text-[10px] font-bold">
                            {ayah.numberInSurah}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleFavorite(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                isAyahFavorite(selectedSurah.number, ayah.numberInSurah)
                                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                  : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                              }`}
                            >
                              <Heart size={16} fill={isAyahFavorite(selectedSurah.number, ayah.numberInSurah) ? 'currentColor' : 'none'} />
                            </button>
                            <button 
                              onClick={() => playAyahAudio(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                playingAyah === `${selectedSurah.number}:${ayah.numberInSurah}`
                                  ? 'bg-deenly-gold text-white'
                                  : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                              }`}
                            >
                              {playingAyah === `${selectedSurah.number}:${ayah.numberInSurah}` ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button 
                              onClick={() => handleShareAyah(ayah)}
                              className={`p-2 rounded-full transition-colors bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20`}
                              title="Compartir Aleya"
                            >
                              <Share2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleCopyAyah(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                copiedAyah === `${selectedSurah.number}:${ayah.numberInSurah}`
                                  ? 'bg-green-500 text-white'
                                  : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                              }`}
                              title="Copiar Aleya"
                            >
                              {copiedAyah === `${selectedSurah.number}:${ayah.numberInSurah}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                        <p className={`text-2xl text-right mb-4 font-serif leading-loose ${darkMode ? 'text-white' : 'text-deenly-green'}`} dir="rtl">
                          {ayah.arabicText}
                        </p>
                        <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                          {ayah.translation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8 w-full"
              >
                <div className="w-24 h-24 rounded-full bg-deenly-gold/10 flex items-center justify-center mb-6">
                  <BookOpen className="text-deenly-gold" size={48} />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                  Selecciona una Sura
                </h2>
                <p className="text-sm opacity-50 max-w-xs">
                  Elige una Sura de la lista para explorar su significado profundo, contexto y temas clave.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
);
};

export default SurahLibrary;
