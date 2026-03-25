import React from 'react';
import { X, Award, Star, Zap, Check, Lock, Trophy, Target, Flame, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  isUnlocked: boolean;
  isPremium?: boolean;
  progress?: number;
  total?: number;
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

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  isPremium, 
  t,
  stats,
  onUpgrade
}) => {
  if (!isOpen) return null;

  const achievements: Achievement[] = [
    {
      id: 'first_step',
      title: t.achFirstStep || 'Primer Paso',
      description: t.achFirstStepDesc || 'Envía tu primer mensaje a Deenly.',
      icon: Star,
      isUnlocked: stats.messagesSent >= 1,
    },
    {
      id: 'seeker',
      title: t.achSeeker || 'Buscador de Conocimiento',
      description: t.achSeekerDesc || 'Lee 5 Suras de la biblioteca.',
      icon: Award,
      isUnlocked: stats.surahsRead >= 5,
      progress: stats.surahsRead,
      total: 5
    },
    {
      id: 'consistent',
      title: t.achConsistent || 'Alma Constante',
      description: t.achConsistentDesc || 'Mantén una racha de 3 días.',
      icon: Flame,
      isUnlocked: stats.streak >= 3,
      progress: stats.streak,
      total: 3
    },
    {
      id: 'pro_member',
      title: t.achPro || 'Miembro Pro',
      description: t.achProDesc || 'Suscríbete a Deenly Pro para apoyo ilimitado.',
      icon: Zap,
      isUnlocked: isPremium,
      isPremium: true
    },
    {
      id: 'explorer',
      title: t.achExplorer || 'Explorador del Corán',
      description: t.achExplorerDesc || 'Realiza 10 búsquedas en el Corán.',
      icon: Trophy,
      isUnlocked: stats.quranSearches >= 10,
      progress: stats.quranSearches,
      total: 10
    },
    {
      id: 'scholar',
      title: t.achScholar || 'Erudito de Hadices',
      description: t.achScholarDesc || 'Lee 5 Hadices de la biblioteca.',
      icon: Target,
      isUnlocked: stats.hadithsRead >= 5,
      progress: stats.hadithsRead,
      total: 5
    }
  ];

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`relative w-full max-w-lg h-[70vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
              <Trophy className="text-white" size={20} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                {t.achievementsTitle || 'Logros y Premios'}
              </h2>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                {unlockedCount} / {achievements.length} {t.achievementsUnlocked || 'Desbloqueados'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {achievements.map((achievement) => (
            <div 
              key={achievement.id}
              className={`p-4 rounded-3xl border transition-all duration-300 ${
                achievement.isUnlocked 
                  ? darkMode ? 'bg-deenly-gold/10 border-deenly-gold/30' : 'bg-white border-deenly-gold/20'
                  : darkMode ? 'bg-white/5 border-white/5 opacity-60' : 'bg-black/5 border-black/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                  achievement.isUnlocked 
                    ? 'bg-deenly-gold text-white' 
                    : darkMode ? 'bg-white/10 text-white/20' : 'bg-black/10 text-black/20'
                }`}>
                  {achievement.isUnlocked ? <achievement.icon size={24} /> : <Lock size={20} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {achievement.title}
                    </h3>
                    {achievement.isPremium && (
                      <span className="bg-deenly-gold/20 text-deenly-gold text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight opacity-60 mt-0.5 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                    {achievement.description}
                  </p>
                  
                  {achievement.total && !achievement.isUnlocked && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-40">
                        <span>{t.progress || 'Progreso'}</span>
                        <span>{achievement.progress} / {achievement.total}</span>
                      </div>
                      <div className={`h-1 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                        <div 
                          className="h-full bg-deenly-gold transition-all duration-500"
                          style={{ width: `${Math.min(100, ((achievement.progress || 0) / achievement.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {achievement.isUnlocked && (
                  <div className="w-6 h-6 rounded-full bg-deenly-gold/20 flex items-center justify-center text-deenly-gold">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isPremium && (
          <div className="p-6 bg-deenly-gold/5 border-t border-deenly-gold/10">
            <button 
              onClick={() => {
                if (onUpgrade) onUpgrade();
                onClose();
              }}
              className={`w-full p-4 rounded-2xl bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20 flex items-center justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
            >
              <div className="flex items-center gap-3">
                <Zap size={20} fill="currentColor" />
                <div className="text-left">
                  <p className="text-xs font-bold">{t.unlockProAchievements || 'Desbloquea Logros Pro'}</p>
                  <p className="text-[10px] opacity-80">{t.proAchievementsDesc || 'Acceso a medallas exclusivas y recompensas.'}</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
