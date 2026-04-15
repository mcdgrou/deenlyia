import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, ChevronRight, Loader2, AlertCircle, Globe, Filter, Heart, Play, Pause, Volume2, Share2, Copy, Check } from 'lucide-react';
import { searchQuranByKeyword, getAyah, getAllSurahs, getSurah, type QuranAyah, type Surah } from '../services/quranService';
import { favoriteService } from '../services/favoriteService';
import type { Session } from '@supabase/supabase-js';

interface QuranSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isPremium: boolean;
  session: Session | null;
  onAction?: () => void;
  showToast?: (message: string, type?: 'error' | 'success') => void;
}

const TRANSLATIONS = [
  { id: 'es.cortes', name: 'Español (Cortes)' },
  { id: 'es.asad', name: 'Español (Asad)' },
  { id: 'en.ahmedali', name: 'English (Ahmed Ali)' },
  { id: 'en.sahih', name: 'English (Sahih Intl)' },
  { id: 'fr.hamidullah', name: 'Français (Hamidullah)' },
  { id: 'ar.alafasy', name: 'Arabic (Alafasy)' },
];

const QuranSearchModal: React.FC<QuranSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  isPremium,
  session,
  onAction,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [surahNum, setSurahNum] = useState('');
  const [ayahNum, setAyahNum] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState('es.cortes');
  const [searchInSurah, setSearchInSurah] = useState('all');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [results, setResults] = useState<QuranAyah[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favoritesKeys, setFavoritesKeys] = useState<Set<string>>(new Set());
  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const [copiedAyah, setCopiedAyah] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const quranReciter = session?.user?.user_metadata?.settings?.quranReciter || 'ar.alafasy';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAyahAudio = (ayah: QuranAyah) => {
    const ayahId = `${ayah.surah.number}:${ayah.numberInSurah}`;
    
    if (playingAyah === ayahId) {
      audioRef.current?.pause();
      setPlayingAyah(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Use global ayah number for cdn.islamic.network
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/${quranReciter}/${ayah.number}.mp3`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAyah(ayahId);

    audio.play().catch(err => {
      console.error("Error playing audio:", err);
      setPlayingAyah(null);
      if (showToast) showToast('Error al cargar el audio', 'error');
    });

    audio.onended = () => {
      setPlayingAyah(null);
    };

    audio.onerror = () => {
      console.error("Audio error:", audio.error);
      setPlayingAyah(null);
      if (showToast) showToast('Error en el archivo de audio', 'error');
    };
  };

  useEffect(() => {
    if (isOpen && session) {
      loadFavorites();
    }
  }, [isOpen, session]);

  const loadFavorites = async () => {
    try {
      const favs = await favoriteService.getFavorites();
      setFavorites(favs);
      setFavoritesKeys(new Set(favs.map(f => `${f.surah_number}:${f.ayah_number}`)));
    } catch (e) {
      console.error("Error loading favorites", e);
    }
  };

  const isAyahFavorite = (surahNum: number, ayahNum: number) => {
    return favoritesKeys.has(`${surahNum}:${ayahNum}`);
  };

  const toggleFavorite = async (ayah: QuranAyah) => {
    const key = `${ayah.surah.number}:${ayah.numberInSurah}`;
    const isFav = favoritesKeys.has(key);

    try {
      if (isFav) {
        await favoriteService.removeFavorite(ayah.surah.number, ayah.numberInSurah);
        setFavoritesKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setFavorites(prev => prev.filter(f => `${f.surah_number}:${f.ayah_number}` !== key));
        if (showToast) showToast('Eliminado de favoritos', 'success');
      } else {
        let arabicText = (ayah as any).arabicText;
        let translation = ayah.text;

        // If Arabic text is missing (common in search results), fetch it
        if (!arabicText) {
          const fullAyah = await getAyah(ayah.surah.number, ayah.numberInSurah, selectedTranslation);
          if (fullAyah) {
            arabicText = fullAyah.arabicText;
            translation = fullAyah.translation;
          } else {
            arabicText = ayah.text; // Fallback
          }
        }

        const newFav = await favoriteService.addFavorite(
          ayah.surah.number, 
          ayah.numberInSurah, 
          ayah.surah.englishName, 
          arabicText, 
          translation
        );
        if (newFav) {
          setFavoritesKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          setFavorites(prev => [newFav, ...prev]);
          if (showToast) showToast('Añadido a favoritos', 'success');
        }
      }
    } catch (e: any) {
      console.error("Error toggling favorite", e);
      if (showToast) showToast(e.message || 'Error al actualizar favoritos', 'error');
    }
  };

  const handleShowFavorites = () => {
    // Convert favorites to QuranAyah format for results
    const formattedFavs: QuranAyah[] = favorites.map(f => ({
      number: 0, // Not strictly needed for display
      text: f.ayah_text,
      surah: {
        number: f.surah_number,
        name: f.surah_name,
        englishName: f.surah_name,
        englishNameTranslation: ''
      },
      numberInSurah: f.ayah_number,
      juz: 0,
      manzil: 0,
      page: 0,
      ruku: 0,
      hizbQuarter: 0,
      arabicText: f.ayah_text, // Assuming arabicText was saved in ayah_text or similar
      translation: f.translation_text
    } as any));

    setResults(formattedFavs);
    if (favorites.length === 0) {
      setError('No tienes versos guardados como favoritos aún.');
    } else {
      setError(null);
    }
  };

  useEffect(() => {
    const fetchSurahs = async () => {
      const data = await getAllSurahs();
      setSurahs(data);
    };
    if (isOpen) fetchSurahs();
  }, [isOpen]);

  const handleKeywordSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Por favor, introduce una palabra clave para buscar.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const matches = await searchQuranByKeyword(searchQuery, searchInSurah, selectedTranslation);
      setResults(matches);
      if (matches.length === 0) setError('No se encontraron resultados para esta búsqueda.');
    } catch (err) {
      setError('Error al buscar. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAyahSearch = async () => {
    if (!surahNum) {
      setError('Por favor, selecciona una Sura.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (ayahNum) {
        const ayah = await getAyah(parseInt(surahNum), parseInt(ayahNum), selectedTranslation);
        if (ayah) {
          setResults([ayah]);
        } else {
          setError('No se encontró el verso especificado.');
          setResults([]);
        }
      } else {
        // Fetch whole surah
        const surahData = await getSurah(parseInt(surahNum), selectedTranslation);
        if (surahData && surahData.ayahs) {
          const formattedAyahs = surahData.ayahs.map((a: any) => ({
            ...a,
            surah: {
              number: surahData.number,
              name: surahData.name,
              englishName: surahData.englishName,
              englishNameTranslation: surahData.englishNameTranslation
            },
            numberInSurah: a.numberInSurah
          }));
          setResults(formattedAyahs);
        } else {
          setError('No se pudo cargar la Sura.');
        }
      }
    } catch (err) {
      setError('Error al buscar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAyah = async (ayah: QuranAyah) => {
    const text = `"${(ayah as any).arabicText || ayah.text}"\n\n${ayah.text}\n\n— Sura ${ayah.surah.englishName} (${ayah.surah.number}:${ayah.numberInSurah})\n\nCompartido vía Deenly`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAyah(`${ayah.surah.number}:${ayah.numberInSurah}`);
      setTimeout(() => setCopiedAyah(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareAyah = async (ayah: QuranAyah) => {
    const text = `"${(ayah as any).arabicText || ayah.text}"\n\n${ayah.text}\n\n— Sura ${ayah.surah.englishName} (${ayah.surah.number}:${ayah.numberInSurah})`;
    const shareData = {
      title: `Aleya ${ayah.surah.number}:${ayah.numberInSurah} - Deenly`,
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-deenly-green/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl border border-deenly-gold/20 overflow-hidden ${
          darkMode ? "bg-deenly-dark-surface" : "bg-deenly-cream"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-deenly-gold/10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? "text-deenly-dark-text" : "text-deenly-green"}`}>
                    Buscador del Corán
                  </h3>
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold opacity-40">Búsqueda por Sura, Verso y Palabra</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Keyword Search */}
                <div className="lg:col-span-2 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                      placeholder="Buscar palabra clave..."
                      className={`w-full py-3 pl-10 pr-4 rounded-2xl text-sm border border-deenly-gold/10 focus:outline-none focus:ring-1 focus:ring-deenly-gold/30 ${
                        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                      }`}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-deenly-gold/40">
                      <Search size={16} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={searchInSurah}
                      onChange={(e) => setSearchInSurah(e.target.value)}
                      className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-sm border border-deenly-gold/10 focus:outline-none focus:ring-1 focus:ring-deenly-gold/30 ${
                        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                      }`}
                    >
                      <option value="all">Todo el Corán</option>
                      {surahs.map(s => (
                        <option key={s.number} value={s.number}>Sura {s.number}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={handleKeywordSearch}
                      className="px-6 py-3 bg-deenly-gold text-white rounded-2xl text-xs font-bold hover:bg-deenly-gold/90 transition-colors shadow-md"
                    >
                      Buscar
                    </button>
                  </div>
                </div>

                {/* Translation Selector & Favorites */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTranslation}
                    onChange={(e) => setSelectedTranslation(e.target.value)}
                    className={`flex-1 py-3 px-4 rounded-2xl text-sm border border-deenly-gold/10 focus:outline-none focus:ring-1 focus:ring-deenly-gold/30 ${
                      darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                    }`}
                  >
                    {TRANSLATIONS.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={handleShowFavorites}
                    className={`p-3 rounded-2xl transition-colors border border-deenly-gold/20 flex items-center justify-center ${
                      darkMode ? "bg-deenly-dark-bg text-deenly-gold hover:bg-deenly-gold/10" : "bg-white text-deenly-gold hover:bg-deenly-gold/5"
                    }`}
                    title="Ver mis favoritos"
                  >
                    <Heart size={18} className={favorites.length > 0 ? "fill-deenly-gold" : ""} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-deenly-gold/5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-deenly-gold uppercase tracking-widest">
                  <Filter size={12} />
                  <span>Referencia:</span>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={surahNum}
                    onChange={(e) => setSurahNum(e.target.value)}
                    className={`flex-1 sm:w-48 py-2 px-3 rounded-xl text-xs border border-deenly-gold/10 focus:outline-none ${
                      darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                    }`}
                  >
                    <option value="">Sura</option>
                    {surahs.map(s => (
                      <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    value={ayahNum}
                    onChange={(e) => setAyahNum(e.target.value)}
                    placeholder="Verso"
                    className={`w-20 py-2 px-3 rounded-xl text-xs border border-deenly-gold/10 focus:outline-none ${
                      darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                    }`}
                  />
                  <button 
                    type="button"
                    onClick={handleAyahSearch}
                    disabled={!surahNum}
                    className="px-4 py-2 bg-deenly-green text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-green/90 transition-colors disabled:opacity-30"
                  >
                    Ir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-sm font-medium">Buscando en el Sagrado Corán...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-red-500/60">
                <AlertCircle size={48} className="mb-4" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-deenly-gold uppercase tracking-widest">
                    Resultados encontrados ({results.length})
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setResults([])}
                    className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-500"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {results.map((ayah, idx) => (
                    <div 
                      key={`${ayah.surah.number}-${ayah.numberInSurah}-${idx}`}
                      className={`p-6 rounded-3xl border border-deenly-gold/10 transition-colors hover:border-deenly-gold/30 ${
                        darkMode ? "bg-deenly-dark-bg/30" : "bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-deenly-gold uppercase tracking-tighter">
                              Sura {ayah.surah.number}: {ayah.surah.englishName}
                            </span>
                            <span className="text-[10px] opacity-40 font-medium">— {ayah.surah.englishNameTranslation}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-deenly-gold/10 text-deenly-gold px-2 py-1 rounded-full uppercase tracking-tighter">
                            Verso {ayah.numberInSurah}
                          </span>
                        </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => playAyahAudio(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                playingAyah === `${ayah.surah.number}:${ayah.numberInSurah}`
                                  ? "bg-deenly-gold text-white" 
                                  : "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20"
                              }`}
                              title={playingAyah === `${ayah.surah.number}:${ayah.numberInSurah}` ? "Pausar" : "Reproducir"}
                            >
                              {playingAyah === `${ayah.surah.number}:${ayah.numberInSurah}` ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleShareAyah(ayah)}
                              className={`p-2 rounded-full transition-colors bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20`}
                              title="Compartir Aleya"
                            >
                              <Share2 size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleCopyAyah(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                copiedAyah === `${ayah.surah.number}:${ayah.numberInSurah}`
                                  ? "bg-green-500 text-white" 
                                  : "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20"
                              }`}
                              title="Copiar Aleya"
                            >
                              {copiedAyah === `${ayah.surah.number}:${ayah.numberInSurah}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => toggleFavorite(ayah)}
                              className={`p-2 rounded-full transition-colors ${
                                isAyahFavorite(ayah.surah.number, ayah.numberInSurah)
                                  ? "bg-red-500 text-white" 
                                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              }`}
                              title={isAyahFavorite(ayah.surah.number, ayah.numberInSurah) ? "Quitar de favoritos" : "Añadir a favoritos"}
                            >
                              <Heart size={16} fill={isAyahFavorite(ayah.surah.number, ayah.numberInSurah) ? "currentColor" : "none"} />
                            </button>
                          </div>
                      </div>
                      <p className={`text-2xl text-right mb-4 font-serif leading-loose ${darkMode ? "text-white" : "text-deenly-green"}`} dir="rtl">
                        {(ayah as any).arabicText}
                      </p>
                      <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? "text-deenly-dark-text" : "text-deenly-green"}`}>
                        {ayah.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 opacity-20">
                <BookOpen size={64} className="mx-auto mb-4" />
                <p className="text-sm max-w-xs mx-auto">
                  Busca por palabra clave en todo el Corán o en una Sura específica. También puedes navegar directamente por número de Sura y Verso.
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default QuranSearchModal;
