import React from 'react';
import { X, Award, Star, Zap, Check, Lock, Trophy, Target, Flame, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  isUnlocked: boolean;
  progress: number;
  target: number;
  category: 'spiritual' | 'knowledge' | 'community';
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isPremium: boolean;
  t: any;
  stats: {
    messagesSent: number;
    surahsRead: number;
    streak: number;
    quranSearches: number;
    hadithsRead: number;
  };
  onUpgrade?: () => void;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  isPremium, 
  t,
  stats,
  onUpgrade
}) => {
  const achievements: Achievement[] = [
    {
      id: 'first-steps',
      title: 'Primeros Pasos',
      description: 'Envía tu primer mensaje a Deenly',
      icon: Zap,
      isUnlocked: stats.messagesSent >= 1,
      progress: Math.min(stats.messagesSent, 1),
      target: 1,
      category: 'knowledge'
    },
    {
      id: 'seeker',
      title: 'Buscador de Verdad',
      description: 'Envía 50 mensajes a Deenly',
      icon: Target,
      isUnlocked: stats.messagesSent >= 50,
      progress: Math.min(stats.messagesSent, 50),
      target: 50,
      category: 'knowledge'
    },
    {
      id: 'quran-reader',
      title: 'Lector del Corán',
      description: 'Lee 5 Suras diferentes',
      icon: Award,
      isUnlocked: stats.surahsRead >= 5,
      progress: Math.min(stats.surahsRead, 5),
      target: 5,
      category: 'spiritual'
    },
    {
      id: 'streak-3',
      title: 'Constancia',
      description: 'Mantén una racha de 3 días',
      icon: Flame,
      isUnlocked: stats.streak >= 3,
      progress: Math.min(stats.streak, 3),
      target: 3,
      category: 'spiritual'
    },
    {
      id: 'hadith-scholar',
      title: 'Estudiante de Hadiz',
      description: 'Lee 10 Hadices diferentes',
      icon: Trophy,
      isUnlocked: stats.hadithsRead >= 10,
      progress: Math.min(stats.hadithsRead, 10),
      target: 10,
      category: 'knowledge'
    }
  ];

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
              darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
            }`}
          >
            <div className="p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
                  <Trophy className="text-white" size={20} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                    Logros
                  </h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                    Tu progreso espiritual
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                {[
                  { label: 'Desbloqueados', value: `${unlockedCount}/${totalCount}`, icon: Star },
                  { label: 'Racha Actual', value: `${stats.streak} días`, icon: Flame },
                  { label: 'Mensajes', value: stats.messagesSent, icon: Zap },
                  { label: 'Suras', value: stats.surahsRead, icon: Award }
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-3xl border border-deenly-gold/10 text-center ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
                    <stat.icon className="mx-auto mb-2 text-deenly-gold opacity-50" size={16} />
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{stat.value}</div>
                    <div className="text-[10px] opacity-40 uppercase tracking-widest font-bold">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Achievements List */}
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`p-6 rounded-[32px] border transition-all flex items-center gap-6 ${
                      achievement.isUnlocked 
                        ? 'border-deenly-gold/30 bg-deenly-gold/5' 
                        : 'border-deenly-gold/10 bg-white/5 opacity-60'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
                      achievement.isUnlocked ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' : 'bg-deenly-gold/10 text-deenly-gold'
                    }`}>
                      <achievement.icon size={24} />
                      {!achievement.isUnlocked && (
                        <div className="absolute -top-1 -right-1 bg-deenly-dark-surface p-1 rounded-full border border-deenly-gold/20">
                          <Lock size={10} className="text-deenly-gold" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-bold truncate ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                          {achievement.title}
                        </h4>
                        {achievement.isUnlocked && (
                          <Check size={16} className="text-deenly-gold" />
                        )}
                      </div>
                      <p className="text-xs opacity-50 mb-3 truncate">{achievement.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-deenly-gold/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                          className="h-full bg-deenly-gold"
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">Progreso</span>
                        <span className="text-[10px] text-deenly-gold font-bold">{achievement.progress}/{achievement.target}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <div className="mt-10 p-8 rounded-[40px] bg-gradient-to-br from-deenly-gold/20 to-deenly-gold/5 border border-deenly-gold/20 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-xl shadow-deenly-gold/20 flex-shrink-0">
                    <Star className="text-white" size={32} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      ¡Desbloquea Logros Exclusivos!
                    </h4>
                    <p className="text-xs opacity-60 leading-relaxed">
                      Los usuarios Premium tienen acceso a una lista extendida de logros y recompensas especiales.
                    </p>
                  </div>
                  <button 
                    onClick={onUpgrade}
                    className="px-6 py-3 bg-deenly-gold text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-deenly-gold/20 hover:bg-deenly-gold/90 transition-all flex items-center gap-2"
                  >
                    Saber más
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AchievementsModal;
