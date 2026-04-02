import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, Copy, Check, BookOpen, Quote } from 'lucide-react';
import { getAyahOfTheDay } from '../services/quranService';

interface AyahOfTheDayProps {
  darkMode: boolean;
  language: string;
  t: any;
}

const AyahOfTheDay: React.FC<AyahOfTheDayProps> = ({ darkMode, language, t }) => {
  const [ayah, setAyah] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchAyah = async () => {
      setLoading(true);
      const edition = language === 'Español' ? 'es.cortes' : 
                      language === 'English' ? 'en.sahih' : 
                      language === 'Français' ? 'fr.hamidullah' : 
                      language === 'Indonesia' ? 'id.indonesian' :
                      language === 'Deutsch' ? 'de.aburida' :
                      'ar.alafasy';
      const data = await getAyahOfTheDay(edition);
      setAyah(data);
      setLoading(false);
    };
    fetchAyah();
  }, [language]);

  const handleCopy = async () => {
    if (!ayah) return;
    const textToCopy = `${ayah.arabicText}\n\n${ayah.translation}\n\n${ayah.explanation ? `Explicación: ${ayah.explanation}\n\n` : ''}— ${t.quran} ${ayah.surah.number}:${ayah.numberInSurah} (${ayah.surah.englishName})`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!ayah) return;
    const textToShare = `📖 ${t.ayahOfTheDay} en Deenly:\n\n"${ayah.translation}"\n\n— ${t.quran} ${ayah.surah.number}:${ayah.numberInSurah} (${ayah.surah.englishName})`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t.ayahOfTheDay} - Deenly`,
          text: textToShare,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-[32px] border border-deenly-gold/10 animate-pulse ${darkMode ? 'bg-deenly-dark-surface' : 'bg-white'}`}>
        <div className="h-4 w-32 bg-deenly-gold/20 rounded-full mb-4" />
        <div className="h-20 w-full bg-deenly-gold/5 rounded-2xl mb-4" />
        <div className="h-4 w-24 bg-deenly-gold/20 rounded-full" />
      </div>
    );
  }

  if (!ayah) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-deenly-gold/10 shadow-xl premium-card ${
        darkMode ? 'bg-deenly-dark-surface/50' : 'bg-white'
      }`}
    >
      {/* Decorative background element */}
      <div className="absolute -right-8 -top-8 opacity-5 pointer-events-none">
        <BookOpen size={160} className="text-deenly-gold" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-deenly-gold">
            <div className="p-2 bg-deenly-gold/10 rounded-xl">
              <Sparkles size={18} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{t.ayahOfTheDay}</h3>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Quote className="absolute -left-2 -top-2 opacity-10 text-deenly-gold" size={40} />
            <p className={`text-2xl sm:text-3xl text-right font-serif leading-relaxed mb-6 ${darkMode ? 'text-white' : 'text-deenly-green'}`} dir="rtl">
              {ayah.arabicText}
            </p>
          </div>

          <div className="pl-4 border-l-2 border-deenly-gold/30">
            <p className={`text-sm sm:text-base leading-relaxed italic opacity-80 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
              "{ayah.translation}"
            </p>
          </div>

          {ayah.explanation && (
            <div className="space-y-3">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  darkMode ? 'text-deenly-gold hover:text-white' : 'text-deenly-gold hover:text-deenly-green'
                }`}
              >
                <BookOpen size={14} />
                {showExplanation ? 'Ocultar Explicación' : 'Ver Explicación'}
              </button>
              
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`text-xs sm:text-sm leading-relaxed p-4 rounded-2xl border border-deenly-gold/10 ${
                      darkMode ? 'bg-white/5 text-white/70' : 'bg-black/5 text-deenly-green/70'
                    }`}
                  >
                    {ayah.explanation}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-deenly-gold/5">
            <button
              onClick={handleCopy}
              className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                darkMode 
                  ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
                  : 'bg-black/5 hover:bg-black/10 text-deenly-green border border-black/5'
              }`}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? (language === 'Español' ? 'Copiado' : 'Copied') : t.copy}
            </button>
            <button
              onClick={handleShare}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 bg-deenly-gold text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-gold/90 transition-all shadow-lg shadow-deenly-gold/20"
            >
              <Share2 size={14} />
              {t.share}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-deenly-gold/5">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-deenly-gold/60' : 'text-deenly-gold'}`}>
              {t.surah} {ayah.surah.name} • {ayah.surah.number}:{ayah.numberInSurah}
            </div>
            <div className={`text-[10px] font-medium opacity-40 uppercase tracking-widest ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
              {ayah.surah.englishName}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AyahOfTheDay;
