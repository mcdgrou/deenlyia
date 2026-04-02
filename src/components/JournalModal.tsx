import React, { useState, useEffect } from 'react';
import { X, BookOpen, Sparkles, Send, History, Calendar, Heart, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getMuftiResponse } from '../services/geminiService';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  userId: string;
  t: any;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  ai_reflection: string;
  created_at: string;
}

export const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, darkMode, userId, t }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [mood, setMood] = useState('blessed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'new'>('list');

  const moods = [
    { id: 'blessed', icon: '✨', label: t.moodBlessed || 'Bendecido' },
    { id: 'grateful', icon: '🙏', label: t.moodGrateful || 'Agradecido' },
    { id: 'peaceful', icon: '🕊️', label: t.moodPeaceful || 'En Paz' },
    { id: 'reflective', icon: '🤔', label: t.moodReflective || 'Reflexivo' },
    { id: 'struggling', icon: '🌱', label: t.moodStruggling || 'Creciendo' },
  ];

  useEffect(() => {
    if (isOpen && userId) {
      fetchEntries();
    }
  }, [isOpen, userId]);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newEntry.trim()) return;
    setIsSubmitting(true);
    try {
      // 1. Get AI Reflection
      const prompt = `Reflexiona sobre esta entrada de diario espiritual: "${newEntry}". Proporciona una breve reflexión islámica de consuelo o motivación (máximo 3 frases).`;
      const ai_reflection = await getMuftiResponse(prompt, [], null, false, []);

      // 2. Save to DB
      const { error } = await supabase.from('journal_entries').insert([{
        user_id: userId,
        content: newEntry,
        mood,
        ai_reflection
      }]);

      if (error) throw error;

      setNewEntry('');
      setView('list');
      fetchEntries();
    } catch (error: any) {
      console.error('Error saving entry:', error);
      const msg = (error.message || "").toLowerCase();
      let userMsg = "No se pudo guardar la reflexión.";
      
      if (msg.includes('cuota') || msg.includes('429') || msg.includes('quota')) {
        userMsg = "Has excedido tu cuota de IA. Por favor, espera un momento.";
      } else if (msg.includes('conexión') || msg.includes('json') || msg.includes('unexpected end')) {
        userMsg = "Error de conexión con el servidor de IA. Inténtalo de nuevo.";
      }
      
      // If we have a showToast function in props we should use it, but it's not there.
      // We'll use a local error state instead of alert.
      setError(userMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t.spiritualJournal || 'Diario Espiritual'}</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-deenly-gold/60">{t.reflectAndGrow || 'Reflexiona y Crece'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex p-4 gap-2">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              view === 'list' ? 'bg-deenly-gold text-white shadow-lg' : 'bg-deenly-gold/5 text-deenly-gold'
            }`}
          >
            <History size={14} />
            {t.myEntries || 'Mis Entradas'}
          </button>
          <button
            onClick={() => setView('new')}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              view === 'new' ? 'bg-deenly-gold text-white shadow-lg' : 'bg-deenly-gold/5 text-deenly-gold'
            }`}
          >
            <Sparkles size={14} />
            {t.newReflection || 'Nueva Reflexión'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {view === 'new' ? (
              <motion.div
                key="new"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold/60 ml-2">
                    {t.howDoYouFeel || '¿Cómo te sientes hoy?'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {moods.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMood(m.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                          mood === m.id 
                            ? 'bg-deenly-gold text-white shadow-md' 
                            : darkMode ? 'bg-white/5 text-white/60' : 'bg-white text-deenly-green/60'
                        }`}
                      >
                        <span>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold/60 ml-2">
                    {t.yourReflection || 'Tu Reflexión'}
                  </label>
                  <textarea
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    placeholder={t.journalPlaceholder || "¿Qué hay en tu corazón hoy? Agradecimientos, luchas, reflexiones..."}
                    className={`w-full h-40 p-6 rounded-[32px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                      darkMode ? 'bg-deenly-dark-bg border border-white/5 text-white' : 'bg-white border border-deenly-gold/10 text-deenly-green'
                    }`}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newEntry.trim()}
                  className="w-full py-4 bg-deenly-gold text-white rounded-3xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-deenly-gold/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {t.saveReflection || 'Guardar Reflexión'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="text-sm font-bold uppercase tracking-widest">{t.loadingJournal || 'Cargando Diario...'}</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <BookOpen size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest mb-2">{t.noEntriesYet || 'No hay entradas aún'}</p>
                    <p className="text-xs max-w-xs">{t.startJournaling || 'Comienza tu viaje de reflexión espiritual hoy mismo.'}</p>
                  </div>
                ) : (
                  entries.map(entry => (
                    <div
                      key={entry.id}
                      className={`p-6 rounded-[32px] border space-y-4 transition-all hover:shadow-lg ${
                        darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-deenly-gold/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{moods.find(m => m.id === entry.mood)?.icon || '✨'}</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">
                              {moods.find(m => m.id === entry.mood)?.label}
                            </p>
                            <div className="flex items-center gap-1 text-[9px] opacity-40 font-bold uppercase tracking-tighter">
                              <Calendar size={10} />
                              {new Date(entry.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <p className="text-sm leading-relaxed italic opacity-80">"{entry.content}"</p>
                      
                      {entry.ai_reflection && (
                        <div className={`p-4 rounded-2xl border-l-4 border-deenly-gold ${
                          darkMode ? 'bg-deenly-gold/10' : 'bg-deenly-gold/5'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={12} className="text-deenly-gold" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">Reflexión de Deenly</span>
                          </div>
                          <p className="text-xs leading-relaxed italic text-deenly-gold/80">{entry.ai_reflection}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
