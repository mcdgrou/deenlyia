import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, ChevronRight, ChevronLeft, Search, Sparkles, User, Hash, MessageSquare, ArrowLeft, ArrowRight, Filter, Share2, Copy, Check } from 'lucide-react';
import { HADITH_COLLECTIONS, type Hadith } from '../data/hadiths';

interface HadithModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  t: any;
  onAction?: () => void;
}

type ViewMode = 'collections' | 'narrators' | 'topics';

const HadithModal: React.FC<HadithModalProps> = ({ isOpen, onClose, darkMode, t, onAction }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('collections');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedNarrator, setSelectedNarrator] = useState<string | null>(null);
  const [selectedNarrators, setSelectedNarrators] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedHadithIndex, setSelectedHadithIndex] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'list' | 'detail'>('sidebar');
  const searchRef = React.useRef<HTMLDivElement>(null);

  const collections = HADITH_COLLECTIONS;
  
  const allHadiths = useMemo(() => {
    return collections.flatMap(c => c.hadiths);
  }, [collections]);

  const narrators = useMemo(() => {
    return Array.from(new Set(allHadiths.map(h => h.narrator))).sort();
  }, [allHadiths]);

  const topics = useMemo(() => {
    return Array.from(new Set(allHadiths.map(h => h.book))).sort();
  }, [allHadiths]);

  const currentCollection = collections.find(c => c.id === selectedCollection);

  const availableNarrators = useMemo(() => {
    let base = allHadiths;
    if (viewMode === 'collections' && selectedCollection) {
      base = currentCollection?.hadiths || [];
    }
    return Array.from(new Set(base.map(h => h.narrator))).sort();
  }, [viewMode, selectedCollection, allHadiths, currentCollection]);

  const availableTopics = useMemo(() => {
    let base = allHadiths;
    if (viewMode === 'collections' && selectedCollection) {
      base = currentCollection?.hadiths || [];
    } else if (viewMode === 'narrators' && selectedNarrator) {
      base = allHadiths.filter(h => h.narrator === selectedNarrator);
    }
    return Array.from(new Set(base.map(h => h.book))).sort();
  }, [viewMode, selectedCollection, selectedNarrator, allHadiths, currentCollection]);

  const books = currentCollection 
    ? Array.from(new Set(currentCollection.hadiths.map(h => h.book)))
    : [];

  const filteredHadiths = useMemo(() => {
    let base = allHadiths;
    const hasActiveFilters = !!searchQuery || selectedNarrators.length > 0 || selectedTopics.length > 0 || (viewMode === 'collections' && !!selectedBook);

    if (viewMode === 'collections') {
      if (selectedCollection) {
        base = currentCollection?.hadiths || [];
      } else if (!hasActiveFilters) {
        return [];
      }
      if (selectedBook) {
        base = base.filter(h => h.book === selectedBook);
      }
    } else if (viewMode === 'narrators') {
      if (selectedNarrator) {
        base = allHadiths.filter(h => h.narrator === selectedNarrator);
      } else if (!hasActiveFilters) {
        return [];
      }
      if (selectedBook) {
        base = base.filter(h => h.book === selectedBook);
      }
    } else if (viewMode === 'topics') {
      if (selectedBook) {
        base = allHadiths.filter(h => h.book === selectedBook);
      } else if (!hasActiveFilters) {
        return [];
      }
    }

    if (selectedNarrators.length > 0 && viewMode !== 'narrators') {
      base = base.filter(h => selectedNarrators.includes(h.narrator));
    }

    if (selectedTopics.length > 0 && viewMode !== 'topics') {
      base = base.filter(h => selectedTopics.includes(h.book));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(h => 
        h.text.toLowerCase().includes(q) || 
        h.narrator.toLowerCase().includes(q) ||
        h.book.toLowerCase().includes(q)
      );
    }

    return base;
  }, [viewMode, selectedCollection, selectedBook, selectedNarrator, selectedNarrators, selectedTopics, searchQuery, allHadiths, currentCollection]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const q = searchQuery.toLowerCase();
    const results: { type: 'hadith' | 'narrator' | 'book' | 'topic', text: string, id?: string, hadith?: Hadith }[] = [];

    // Narrators
    narrators.forEach(n => {
      if (n.toLowerCase().includes(q)) {
        results.push({ type: 'narrator', text: n });
      }
    });

    // Topics/Books
    topics.forEach(t => {
      if (t.toLowerCase().includes(q)) {
        results.push({ type: 'topic', text: t });
      }
    });

    // Hadiths
    allHadiths.forEach(h => {
      if (h.text.toLowerCase().includes(q)) {
        results.push({ type: 'hadith', text: h.text, id: h.id, hadith: h });
      }
    });

    return results.slice(0, 8); // Limit to 8 suggestions
  }, [searchQuery, narrators, topics, allHadiths]);

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'narrator') {
      setSelectedNarrators([suggestion.text]);
      setSearchQuery('');
    } else if (suggestion.type === 'topic') {
      setSelectedTopics([suggestion.text]);
      setSearchQuery('');
    } else if (suggestion.type === 'hadith') {
      const index = filteredHadiths.findIndex(h => h.id === suggestion.id);
      if (index !== -1) {
        setSelectedHadithIndex(index);
      } else {
        // If not in current filtered list, we might need to clear filters or just show it
        setSearchQuery(suggestion.text);
      }
    }
    setShowSuggestions(false);
  };

  // Reset selected hadith when filters change
  useEffect(() => {
    setSelectedHadithIndex(null);
    if (selectedHadithIndex === null) {
      if (selectedCollection || selectedNarrator || (viewMode === 'topics' && selectedBook) || searchQuery) {
        setMobileView('list');
      } else {
        setMobileView('sidebar');
      }
    } else {
      setMobileView('detail');
    }
  }, [viewMode, selectedCollection, selectedBook, selectedNarrator, selectedNarrators, selectedTopics, searchQuery]);

  useEffect(() => {
    if (selectedHadithIndex !== null) {
      setMobileView('detail');
    } else if (selectedCollection || selectedNarrator || (viewMode === 'topics' && selectedBook) || searchQuery) {
      setMobileView('list');
    } else {
      setMobileView('sidebar');
    }
  }, [selectedHadithIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const handleNext = () => {
    if (selectedHadithIndex !== null && selectedHadithIndex < filteredHadiths.length - 1) {
      setSelectedHadithIndex(selectedHadithIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedHadithIndex !== null && selectedHadithIndex > 0) {
      setSelectedHadithIndex(selectedHadithIndex - 1);
    }
  };

  const handleCopy = async (hadith: Hadith) => {
    const text = `"${hadith.text}"\n\n— ${hadith.narrator}\n${hadith.reference}\n\nCompartido vía Deenly`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async (hadith: Hadith) => {
    const text = `"${hadith.text}"\n\n— ${hadith.narrator}\n${hadith.reference}`;
    const shareData = {
      title: 'Hadiz del Día - Deenly',
      text: text,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopy(hadith);
        }
      }
    } else {
      handleCopy(hadith);
    }
  };

  if (!isOpen) return null;

  const currentHadith = selectedHadithIndex !== null ? filteredHadiths[selectedHadithIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        {/* Header - Hidden on mobile detail view to give more space */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between transition-all duration-300 ${
          darkMode ? 'border-white/10' : 'border-deenly-gold/10'
        } ${mobileView === 'detail' ? 'hidden sm:flex' : 'flex'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            {mobileView === 'list' && (
              <button
                onClick={() => {
                  setSelectedCollection(null);
                  setSelectedNarrator(null);
                  setSelectedBook(null);
                  setSearchQuery('');
                  setMobileView('sidebar');
                }}
                className={`p-2 rounded-xl sm:hidden ${darkMode ? 'bg-white/5 text-white' : 'bg-deenly-gold/10 text-deenly-gold'}`}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-colors ${
              darkMode ? 'bg-deenly-gold/20 text-deenly-gold' : 'bg-deenly-gold/10 text-deenly-gold'
            }`}>
              <Book size={20} className="sm:size-24" />
            </div>
            <div>
              <h2 className={`text-lg sm:text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                {t.hadithLibrary || 'Biblioteca de Hadices'}
              </h2>
              <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] font-bold text-deenly-gold/60">
                {t.prophetWisdom || 'Sabiduría del Profeta (SAW)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              darkMode ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-deenly-gold/10 text-deenly-gold'
            }`}
          >
            <X size={20} className="sm:size-24" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row relative">
          {/* Sidebar / Selectors */}
          <div className={`w-full sm:w-85 border-r overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 scrollbar-hide transition-all duration-300 ${
            darkMode ? 'bg-black/20 border-white/10' : 'bg-white/20 border-deenly-gold/10'
          } ${mobileView !== 'sidebar' ? 'hidden sm:block' : 'block'}`}>
            {/* View Mode Switcher */}
            <div className={`flex p-1 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-deenly-gold/5'}`}>
              <button
                onClick={() => { setViewMode('collections'); setSelectedNarrator(null); setSelectedBook(null); setSelectedNarrators([]); setSidebarSearchQuery(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'collections' 
                    ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                    : darkMode ? 'text-white/40 hover:text-white/60' : 'text-deenly-gold/60 hover:text-deenly-gold'
                }`}
              >
                {t.collections || 'Colecciones'}
              </button>
              <button
                onClick={() => { setViewMode('narrators'); setSelectedCollection(null); setSelectedBook(null); setSelectedNarrators([]); setSidebarSearchQuery(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'narrators' 
                    ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                    : darkMode ? 'text-white/40 hover:text-white/60' : 'text-deenly-gold/60 hover:text-deenly-gold'
                }`}
              >
                {t.narrators || 'Narradores'}
              </button>
              <button
                onClick={() => { setViewMode('topics'); setSelectedCollection(null); setSelectedNarrator(null); setSelectedNarrators([]); setSidebarSearchQuery(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'topics' 
                    ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                    : darkMode ? 'text-white/40 hover:text-white/60' : 'text-deenly-gold/60 hover:text-deenly-gold'
                }`}
              >
                {t.topics || 'Temas'}
              </button>
            </div>

            {/* Sidebar Search */}
            <div className="relative group">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                darkMode ? 'text-white/20 group-focus-within:text-deenly-gold' : 'text-deenly-gold/40 group-focus-within:text-deenly-gold'
              }`} size={14} />
              <input
                type="text"
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                placeholder={viewMode === 'collections' ? t.searchCollections || "Buscar colecciones..." : viewMode === 'narrators' ? t.searchNarrators || "Buscar narradores..." : t.searchTopics || "Buscar temas..."}
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-4 transition-all ${
                  darkMode 
                    ? 'bg-deenly-dark-bg border-white/5 text-white focus:border-deenly-gold/50 focus:ring-deenly-gold/10' 
                    : 'bg-white border-deenly-gold/10 text-deenly-green focus:border-deenly-gold/50 focus:ring-deenly-gold/10'
                }`}
              />
            </div>

            {/* Collections View */}
            {viewMode === 'collections' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2">{t.collections || 'Colecciones'}</h3>
                  <div className="space-y-1">
                    {collections
                      .filter(c => c.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCollection(c.id);
                            setSelectedBook(null);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                            selectedCollection === c.id 
                              ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                              : darkMode 
                                ? 'text-white/40 hover:text-white hover:bg-white/5' 
                                : 'text-deenly-green/60 hover:text-deenly-green hover:bg-deenly-gold/5'
                          }`}
                        >
                          {c.name}
                          {selectedCollection === c.id && <ChevronRight size={14} />}
                        </button>
                      ))}
                  </div>
                </div>

                {selectedCollection && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2">{t.books || 'Libros'}</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedBook(null)}
                        className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                          selectedBook === null 
                            ? 'bg-deenly-gold/20 text-deenly-gold' 
                            : darkMode 
                              ? 'text-white/40 hover:text-white hover:bg-white/5' 
                              : 'text-deenly-green/60 hover:text-deenly-green hover:bg-deenly-gold/5'
                        }`}
                      >
                        {t.allBooks || 'Todos los libros'}
                      </button>
                      {books.map(book => (
                        <button
                          key={book}
                          onClick={() => setSelectedBook(book)}
                          className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            selectedBook === book 
                              ? 'bg-deenly-gold/20 text-deenly-gold' 
                              : darkMode 
                                ? 'text-white/40 hover:text-white hover:bg-white/5' 
                                : 'text-deenly-green/60 hover:text-deenly-green hover:bg-deenly-gold/5'
                          }`}
                        >
                          {book}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Narrators View */}
            {viewMode === 'narrators' && (
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2 flex items-center gap-2">
                  <User size={12} />
                  {t.narratorThreads || 'Hilos de Narradores'}
                </h3>
                <div className="space-y-1">
                  {narrators
                    .filter(n => n.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))
                    .map(narrator => (
                      <button
                        key={narrator}
                        onClick={() => setSelectedNarrator(narrator)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          selectedNarrator === narrator 
                            ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                            : darkMode 
                              ? 'text-white/40 hover:text-white hover:bg-white/5' 
                              : 'text-deenly-green/60 hover:text-deenly-green hover:bg-deenly-gold/5'
                        }`}
                      >
                        {narrator}
                        {selectedNarrator === narrator && <ChevronRight size={14} />}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Topics View */}
            {viewMode === 'topics' && (
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2 flex items-center gap-2">
                  <Hash size={12} />
                  {t.topicThreads || 'Hilos por Tema'}
                </h3>
                <div className="space-y-1">
                  {topics
                    .filter(t => t.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))
                    .map(topic => (
                      <button
                        key={topic}
                        onClick={() => setSelectedBook(topic)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          selectedBook === topic 
                            ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                            : darkMode 
                              ? 'text-white/40 hover:text-white hover:bg-white/5' 
                              : 'text-deenly-green/60 hover:text-deenly-green hover:bg-deenly-gold/5'
                        }`}
                      >
                        {topic}
                        {selectedBook === topic && <ChevronRight size={14} />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Hadith List / Detail */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            mobileView === 'sidebar' ? 'hidden sm:flex' : 'flex'
          }`}>
            <AnimatePresence mode="wait">
              {currentHadith ? (
                /* Detail View */
                <motion.div 
                  key="detail"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="flex-1 flex flex-col overflow-hidden bg-inherit"
                >
                  <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-20 ${
                    darkMode ? 'bg-deenly-dark-surface border-white/10' : 'bg-deenly-cream border-deenly-gold/10'
                  }`}>
                    <button
                      onClick={() => setSelectedHadithIndex(null)}
                      className={`flex items-center gap-2 text-xs font-bold transition-all ${
                        darkMode ? 'text-white/60 hover:text-white' : 'text-deenly-gold hover:opacity-70'
                      }`}
                    >
                      <ArrowLeft size={16} />
                      <span className="hidden sm:inline">{t.backToList || 'Volver a la lista'}</span>
                      <span className="sm:hidden">{t.back || 'Volver'}</span>
                    </button>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        onClick={handlePrev}
                        disabled={selectedHadithIndex === 0}
                        className={`p-2 rounded-xl transition-all disabled:opacity-20 ${
                          darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                        }`}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                        darkMode ? 'text-white/40' : 'text-deenly-gold/60'
                      }`}>
                        {selectedHadithIndex + 1} / {filteredHadiths.length}
                      </span>
                      <button
                        onClick={handleNext}
                        disabled={selectedHadithIndex === filteredHadiths.length - 1}
                        className={`p-2 rounded-xl transition-all disabled:opacity-20 ${
                          darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                        }`}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 sm:p-16 flex flex-col items-center justify-start sm:justify-center text-center scrollbar-hide">
                    <div className="max-w-3xl w-full">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-12">
                        <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          darkMode ? 'bg-deenly-gold/20 text-deenly-gold shadow-deenly-gold/5' : 'bg-deenly-gold/10 text-deenly-gold shadow-deenly-gold/10'
                        }`}>
                          <Sparkles size={20} className="sm:size-28" />
                        </div>
                        <div className="text-center sm:text-left">
                          <h3 className={`text-base sm:text-xl font-bold uppercase tracking-widest ${darkMode ? 'text-white' : 'text-deenly-gold'}`}>
                            {t.hadith || 'Hadiz'} {currentHadith.number}
                          </h3>
                          <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-white/40' : 'text-deenly-gold/40'}`}>
                            {currentHadith.reference}
                          </p>
                        </div>
                      </div>
                      
                      <p className={`text-lg sm:text-3xl leading-relaxed italic mb-8 sm:mb-12 font-serif ${darkMode ? 'text-white/90' : 'text-deenly-green'}`}>
                        "{currentHadith.text}"
                      </p>

                      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                        <button
                          onClick={() => handleShare(currentHadith)}
                          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${
                            darkMode 
                              ? 'bg-deenly-gold text-white hover:bg-deenly-gold/90 shadow-lg shadow-deenly-gold/20' 
                              : 'bg-deenly-gold text-white hover:bg-deenly-gold/90 shadow-lg shadow-deenly-gold/20'
                          }`}
                        >
                          <Share2 size={14} className="sm:size-16" />
                          {t.share || 'Compartir'}
                        </button>
                        <button
                          onClick={() => handleCopy(currentHadith)}
                          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${
                            copied
                              ? 'bg-green-500 text-white'
                              : darkMode
                                ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                          }`}
                        >
                          {copied ? <Check size={14} className="sm:size-16" /> : <Copy size={14} className="sm:size-16" />}
                          {copied ? (t.copied || 'Copiado') : (t.copy || 'Copiar')}
                        </button>
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-8 sm:pt-12 border-t ${
                        darkMode ? 'border-white/10' : 'border-deenly-gold/10'
                      }`}>
                        <div className={`p-4 sm:p-6 rounded-3xl flex items-center gap-4 sm:gap-5 transition-all ${
                          darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                        }`}>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-deenly-gold/20 text-deenly-gold flex items-center justify-center shadow-inner">
                            <User size={18} className="sm:size-20" />
                          </div>
                          <div className="text-left">
                            <p className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-widest mb-1 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                              {t.narratedBy || 'Narrado por'}
                            </p>
                            <p className="text-sm sm:text-base font-bold text-deenly-gold">{currentHadith.narrator}</p>
                          </div>
                        </div>
                        <div className={`p-4 sm:p-6 rounded-3xl flex items-center gap-4 sm:gap-5 transition-all ${
                          darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                        }`}>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-deenly-gold/20 text-deenly-gold flex items-center justify-center shadow-inner">
                            <Hash size={18} className="sm:size-20" />
                          </div>
                          <div className="text-left">
                            <p className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-widest mb-1 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                              {t.topic || 'Tema'}
                            </p>
                            <p className="text-sm sm:text-base font-bold text-deenly-gold">{currentHadith.book}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* List View */
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className={`p-4 sm:p-6 border-b flex flex-col gap-4 sm:gap-6 ${
                    darkMode ? 'border-white/10' : 'border-deenly-gold/10'
                  }`}>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                      <div className="hidden sm:block">
                        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                          {selectedCollection ? collections.find(c => c.id === selectedCollection)?.name : selectedNarrator || selectedBook || t.search || 'Buscar'}
                        </h3>
                      </div>
                      <div ref={searchRef} className="relative flex-1 w-full group">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                        darkMode ? 'text-white/20 group-focus-within:text-deenly-gold' : 'text-deenly-gold/40 group-focus-within:text-deenly-gold'
                      }`} size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowSuggestions(false);
                          }
                        }}
                        placeholder={t.searchHadiths || "Buscar hadices..."}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-4 transition-all ${
                          darkMode 
                            ? 'bg-deenly-dark-bg border-white/5 text-white focus:border-deenly-gold/50 focus:ring-deenly-gold/10' 
                            : 'bg-white border-deenly-gold/10 text-deenly-green focus:border-deenly-gold/50 focus:ring-deenly-gold/10'
                        }`}
                      />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
                          darkMode ? 'bg-deenly-dark-surface border-white/10' : 'bg-white border-deenly-gold/10'
                        }`}>
                          <div className="p-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => handleSuggestionClick(s)}
                                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                                  darkMode ? 'hover:bg-white/5' : 'hover:bg-deenly-gold/5'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  darkMode ? 'bg-deenly-gold/20 text-deenly-gold' : 'bg-deenly-gold/10 text-deenly-gold'
                                }`}>
                                  {s.type === 'narrator' ? <User size={14} /> : s.type === 'topic' ? <Hash size={14} /> : <MessageSquare size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${darkMode ? 'text-deenly-gold/60' : 'text-deenly-gold/60'}`}>
                                    {s.type === 'narrator' ? (t.narrator || 'Narrador') : s.type === 'topic' ? (t.topic || 'Tema') : (t.hadith || 'Hadiz')}
                                  </p>
                                  <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                                    {s.text}
                                  </p>
                                </div>
                                <ChevronRight size={14} className="text-deenly-gold/40" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                          showFilters || selectedNarrators.length > 0 || selectedTopics.length > 0
                            ? 'bg-deenly-gold text-white border-deenly-gold shadow-lg shadow-deenly-gold/20'
                            : darkMode 
                              ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white' 
                              : 'bg-deenly-gold/5 border-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/10'
                        }`}
                      >
                        <Filter size={14} />
                        <span>{t.filters || 'Filtros'}</span>
                        {(selectedNarrators.length > 0 || selectedTopics.length > 0) && (
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${
                            showFilters || selectedNarrators.length > 0 || selectedTopics.length > 0
                              ? 'bg-white text-deenly-gold'
                              : 'bg-deenly-gold text-white'
                          }`}>
                            {selectedNarrators.length + selectedTopics.length}
                          </span>
                        )}
                      </button>
                      {(searchQuery || selectedNarrators.length > 0 || selectedTopics.length > 0 || selectedBook) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedNarrators([]);
                            setSelectedTopics([]);
                            setSelectedBook(null);
                          }}
                          className={`p-3 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                            darkMode ? 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white' : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20'
                          }`}
                          title={t.clearFilters || "Limpiar filtros"}
                        >
                          <X size={14} />
                          <span className="hidden sm:inline">{t.clearFilters || "Limpiar"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Advanced Filters Panel */}
                  {showFilters && (
                    <div className={`p-4 rounded-2xl border ${
                      darkMode ? 'bg-black/20 border-white/10' : 'bg-deenly-gold/5 border-deenly-gold/10'
                    } space-y-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Narrators Filter */}
                        {viewMode !== 'narrators' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold/60 flex items-center gap-2">
                              <User size={12} />
                              {t.narrators || 'Narradores'}
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-hide">
                              {availableNarrators.map(n => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    setSelectedNarrators(prev => 
                                      prev.includes(n) ? prev.filter(item => item !== n) : [...prev, n]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    selectedNarrators.includes(n)
                                      ? 'bg-deenly-gold text-white shadow-md'
                                      : darkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-white text-deenly-green/60 hover:bg-white/80'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Topics Filter */}
                        {viewMode !== 'topics' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold/60 flex items-center gap-2">
                              <Hash size={12} />
                              {t.topics || 'Temas'}
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-hide">
                              {availableTopics.map(topic => (
                                <button
                                  key={topic}
                                  onClick={() => {
                                    setSelectedTopics(prev => 
                                      prev.includes(topic) ? prev.filter(item => item !== topic) : [...prev, topic]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    selectedTopics.includes(topic)
                                      ? 'bg-deenly-gold text-white shadow-md'
                                      : darkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-white text-deenly-green/60 hover:bg-white/80'
                                  }`}
                                >
                                  {topic}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active Filter Chips */}
                  {(selectedNarrators.length > 0 || selectedTopics.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {selectedNarrators.map(n => (
                        <span key={n} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-deenly-gold/10 text-deenly-gold text-[9px] font-bold uppercase tracking-widest border border-deenly-gold/20">
                          <User size={10} />
                          {n}
                          <button onClick={() => setSelectedNarrators(prev => prev.filter(item => item !== n))} className="hover:text-red-500">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {selectedTopics.map(topic => (
                        <span key={topic} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-deenly-gold/10 text-deenly-gold text-[9px] font-bold uppercase tracking-widest border border-deenly-gold/20">
                          <Hash size={10} />
                          {topic}
                          <button onClick={() => setSelectedTopics(prev => prev.filter(item => item !== topic))} className="hover:text-red-500">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-10 scrollbar-hide">
                  {filteredHadiths.length > 0 ? (
                    <div className="space-y-6 sm:space-y-10 relative">
                      {/* Thread Line for Narrators/Topics */}
                      {(selectedNarrator || (viewMode === 'topics' && selectedBook)) && (
                        <div className={`absolute left-[23px] sm:left-[31px] top-10 bottom-10 w-0.5 ${
                          darkMode ? 'bg-white/5' : 'bg-deenly-gold/10'
                        }`} />
                      )}

                      {filteredHadiths.map((hadith, index) => (
                        <motion.div
                          key={hadith.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative pl-12 sm:pl-16 group cursor-pointer`}
                          onClick={() => {
                            setSelectedHadithIndex(index);
                            if (onAction) onAction();
                          }}
                        >
                          {/* Thread Node */}
                          {(selectedNarrator || (viewMode === 'topics' && selectedBook)) && (
                            <div className={`absolute left-6 sm:left-8 top-8 -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 z-10 group-hover:scale-125 transition-all duration-300 ${
                              darkMode ? 'border-deenly-gold bg-deenly-dark-surface' : 'border-deenly-gold bg-deenly-cream'
                            }`} />
                          )}

                          <div className={`p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 hover:shadow-2xl ${
                            darkMode 
                              ? 'bg-white/5 border-white/5 hover:border-deenly-gold/30 hover:bg-white/10' 
                              : 'bg-white border-deenly-gold/10 hover:border-deenly-gold/30 hover:shadow-deenly-gold/5'
                          }`}>
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${
                                  darkMode ? 'bg-deenly-gold/20 text-deenly-gold' : 'bg-deenly-gold/10 text-deenly-gold'
                                }`}>
                                  <Sparkles size={14} className="sm:size-16" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-deenly-gold">
                                  {t.hadith || 'Hadiz'} {hadith.number}
                                </span>
                              </div>
                              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${
                                darkMode ? 'text-white/30' : 'text-black/30'
                              }`}>
                                {hadith.reference}
                              </span>
                            </div>
                            <p className={`text-sm sm:text-base leading-relaxed italic mb-6 sm:mb-8 line-clamp-3 font-serif ${
                              darkMode ? 'text-white/80' : 'text-deenly-green'
                            }`}>
                              "{hadith.text}"
                            </p>
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t ${
                              darkMode ? 'border-white/5' : 'border-deenly-gold/5'
                            }`}>
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                                  darkMode ? 'bg-white/5 text-deenly-gold' : 'bg-deenly-gold/10 text-deenly-gold'
                                }`}>
                                  <User size={12} className="sm:size-14" />
                                </div>
                                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${
                                  darkMode ? 'text-white/60' : 'text-deenly-gold'
                                }`}>
                                  {hadith.narrator}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                                  darkMode ? 'bg-white/5 text-white/20' : 'bg-black/5 text-black/20'
                                }`}>
                                  <Hash size={12} className="sm:size-14" />
                                </div>
                                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${
                                  darkMode ? 'text-white/30' : 'text-black/30'
                                }`}>
                                  {hadith.book}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 sm:p-8">
                      {viewMode === 'collections' && !selectedCollection ? (
                        <>
                          <Book size={48} className={`sm:size-64 mb-4 sm:mb-6 text-deenly-gold ${darkMode ? 'opacity-10' : 'opacity-20'}`} />
                          <h3 className={`text-lg sm:text-xl font-bold mb-2 ${darkMode ? 'text-white/40' : 'text-deenly-green/40'}`}>{t.selectCollection || 'Selecciona una colección'}</h3>
                          <p className={`text-xs sm:text-sm max-w-xs ${darkMode ? 'text-white/30' : 'text-deenly-green/30'}`}>{t.exploreProphetTeachings || 'Explora las enseñanzas del Profeta Muhammad (SAW) a través de las colecciones más auténticas.'}</p>
                        </>
                      ) : viewMode === 'narrators' && !selectedNarrator ? (
                        <>
                          <User size={48} className={`sm:size-64 mb-4 sm:mb-6 text-deenly-gold ${darkMode ? 'opacity-10' : 'opacity-20'}`} />
                          <h3 className={`text-lg sm:text-xl font-bold mb-2 ${darkMode ? 'text-white/40' : 'text-deenly-green/40'}`}>{t.selectNarrator || 'Selecciona un narrador'}</h3>
                          <p className={`text-xs sm:text-sm max-w-xs ${darkMode ? 'text-white/30' : 'text-deenly-green/30'}`}>Sigue el hilo de sabiduría de narradores específicos como Abu Hurairah o Umar bin Al-Khattab.</p>
                        </>
                      ) : viewMode === 'topics' && !selectedBook ? (
                        <>
                          <Hash size={48} className={`sm:size-64 mb-4 sm:mb-6 text-deenly-gold ${darkMode ? 'opacity-10' : 'opacity-20'}`} />
                          <h3 className={`text-lg sm:text-xl font-bold mb-2 ${darkMode ? 'text-white/40' : 'text-deenly-green/40'}`}>{t.selectTopic || 'Selecciona un tema'}</h3>
                          <p className={`text-xs sm:text-sm max-w-xs ${darkMode ? 'text-white/30' : 'text-deenly-green/30'}`}>Explora hilos de hadices agrupados por temas como la Fe, los Modales o el Conocimiento.</p>
                        </>
                      ) : (
                        <>
                          <Book size={32} className={`sm:size-48 mb-3 sm:mb-4 ${darkMode ? 'text-white/10' : 'text-black/10'}`} />
                          <p className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-white/40' : 'text-black/40'}`}>{t.noHadithsFound || 'No se encontraron hadices'}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HadithModal;
