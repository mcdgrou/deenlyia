import React, { useState, useEffect } from 'react';
import { X, TrendingUp, CheckCircle2, Circle, Target, Award, BookOpen, Star, Loader2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  userId: string;
  t: any;
  isPremium: boolean;
}

interface TopicProgress {
  id: string;
  topic: string;
  level: number;
  completed_lessons: string[];
  updated_at: string;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ isOpen, onClose, darkMode, userId, t, isPremium }) => {
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const roadmap = [
    {
      id: 'fundamentals',
      title: t.fundamentals || 'Fundamentos del Islam',
      description: t.fundamentalsDesc || 'Aprende los 5 pilares y los 6 artículos de fe.',
      lessons: ['shahada', 'salat', 'zakat', 'sawm', 'hajj', 'iman']
    },
    {
      id: 'hajj_premium',
      title: 'Hajj: El Viaje de la Vida',
      description: 'Guía completa sobre la peregrinación mayor y sus ritos.',
      lessons: ['hajj_history', 'ihram_rules', 'tawaf_saee', 'arafat_day', 'eid_ul_adha'],
      isPremium: true
    },
    {
      id: 'quran',
      title: t.quranStudies || 'Estudios del Corán',
      description: t.quranStudiesDesc || 'Historia de la revelación y Tafsir básico.',
      lessons: ['revelation', 'compilation', 'tafsir_intro', 'surah_fatiha']
    },
    {
      id: 'character',
      title: t.characterAdab || 'Carácter y Adab',
      description: t.characterAdabDesc || 'Modales del Profeta (SAW) y ética islámica.',
      lessons: ['honesty', 'patience', 'kindness', 'respect_parents']
    },
    {
      id: 'history',
      title: t.islamicHistory || 'Historia Islámica',
      description: t.islamicHistoryDesc || 'La vida del Profeta (SAW) y los Califas.',
      lessons: ['seerah_mecca', 'seerah_medina', 'rashidun', 'golden_age']
    }
  ];

  useEffect(() => {
    if (isOpen && userId) {
      fetchProgress();
    }
  }, [isOpen, userId]);

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLesson = async (topicId: string, lessonId: string) => {
    const currentTopic = progress.find(p => p.topic === topicId);
    const isCompleted = currentTopic?.completed_lessons.includes(lessonId);
    
    let newCompleted = currentTopic?.completed_lessons || [];
    if (isCompleted) {
      newCompleted = newCompleted.filter(l => l !== lessonId);
    } else {
      newCompleted = [...newCompleted, lessonId];
    }

    try {
      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: userId,
          topic: topicId,
          completed_lessons: newCompleted,
          level: Math.floor(newCompleted.length / 2) + 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,topic' });

      if (error) throw error;
      fetchProgress();
    } catch (error) {
      console.error('Error updating progress:', error);
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
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t.spiritualRoadmap || 'Hoja de Ruta Espiritual'}</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-deenly-gold/60">{t.trackYourGrowth || 'Sigue tu Crecimiento'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="text-sm font-bold uppercase tracking-widest">{t.loadingProgress || 'Cargando Progreso...'}</p>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-3xl text-center space-y-1 ${darkMode ? 'bg-white/5' : 'bg-white'}`}>
                  <Award className="mx-auto text-deenly-gold" size={20} />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.level || 'Nivel'}</p>
                  <p className="text-xl font-bold text-deenly-gold">
                    {progress.reduce((acc, curr) => acc + curr.level, 0)}
                  </p>
                </div>
                <div className={`p-4 rounded-3xl text-center space-y-1 ${darkMode ? 'bg-white/5' : 'bg-white'}`}>
                  <CheckCircle2 className="mx-auto text-deenly-gold" size={20} />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.lessons || 'Lecciones'}</p>
                  <p className="text-xl font-bold text-deenly-gold">
                    {progress.reduce((acc, curr) => acc + curr.completed_lessons.length, 0)}
                  </p>
                </div>
                <div className={`p-4 rounded-3xl text-center space-y-1 ${darkMode ? 'bg-white/5' : 'bg-white'}`}>
                  <Star className="mx-auto text-deenly-gold" size={20} />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.badges || 'Insignias'}</p>
                  <p className="text-xl font-bold text-deenly-gold">
                    {Math.floor(progress.reduce((acc, curr) => acc + curr.completed_lessons.length, 0) / 5)}
                  </p>
                </div>
              </div>

              {/* Roadmap Topics */}
              <div className="space-y-6">
                {roadmap.map(topic => {
                  const topicProgress = progress.find(p => p.topic === topic.id);
                  const completedCount = topicProgress?.completed_lessons.length || 0;
                  const totalCount = topic.lessons.length;
                  const percentage = (completedCount / totalCount) * 100;

                  return (
                    <div
                      key={topic.id}
                      className={`p-6 rounded-[32px] border space-y-6 relative overflow-hidden ${
                        darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-deenly-gold/10'
                      } ${topic.isPremium && !isPremium ? 'opacity-60 grayscale' : ''}`}
                    >
                      {topic.isPremium && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-deenly-gold text-white text-[8px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                          Premium
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
                            <BookOpen size={24} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-deenly-gold">{topic.title}</h3>
                            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{topic.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-deenly-gold">{Math.round(percentage)}%</p>
                          <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">{completedCount}/{totalCount}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-deenly-gold/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-full bg-deenly-gold"
                        />
                      </div>

                      {/* Lessons Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {topic.lessons.map(lesson => {
                          const isCompleted = topicProgress?.completed_lessons.includes(lesson);
                          const isLocked = topic.isPremium && !isPremium;
                          return (
                            <button
                              key={lesson}
                              disabled={isLocked}
                              onClick={() => toggleLesson(topic.id, lesson)}
                              className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                                isCompleted 
                                  ? 'bg-deenly-gold text-white shadow-md' 
                                  : darkMode ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-deenly-gold/5 text-deenly-gold hover:bg-deenly-gold/10'
                              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {isLocked ? <Lock size={12} /> : (isCompleted ? <CheckCircle2 size={12} /> : <Circle size={12} />)}
                              {t[lesson] || lesson.replace(/_/g, ' ')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProgressModal;
