import React from 'react';
import { X, Info, Heart, ShieldCheck, Globe, MessageSquare } from 'lucide-react';
import { Logo } from './Logo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal: (type: 'privacy' | 'terms' | 'premium') => void;
  darkMode: boolean;
  t: any;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onOpenLegal, darkMode, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[32px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
            {t.aboutTitle}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
          <div className="flex flex-col items-center text-center">
            <Logo size={64} className="mb-4" />
            <Logo showText size={0} className="justify-center mb-2" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-deenly-gold">Versión 1.0.0</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-widest text-deenly-gold flex items-center gap-2`}>
                <Globe size={14} /> {t.aboutMission}
              </h3>
              <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                {t.aboutMissionDesc}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-widest text-deenly-gold flex items-center gap-2`}>
                <ShieldCheck size={14} /> {t.aboutCommitment}
              </h3>
              <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                {t.aboutCommitmentDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'} text-center`}>
                <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mx-auto mb-2">
                  <MessageSquare size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Chats</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>+10k</p>
              </div>
              <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'} text-center`}>
                <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mx-auto mb-2">
                  <Heart size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.you === 'Tú' ? 'Usuarios' : (t.you === 'You' ? 'Users' : (t.you === 'Vous' ? 'Utilisateurs' : (t.you === 'أنت' ? 'المستخدمين' : (t.you === 'Anda' ? 'Pengguna' : 'Benutzer'))))}</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>+5k</p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
              <button 
                onClick={() => onOpenLegal('privacy')}
                className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold hover:underline"
              >
                {t.privacyPol || 'Privacy Policy'}
              </button>
              <button 
                onClick={() => onOpenLegal('terms')}
                className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold hover:underline"
              >
                {t.terms || 'Terms'}
              </button>
              <button 
                onClick={() => onOpenLegal('premium')}
                className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold hover:underline"
              >
                {t.premiumPolicyTitle || 'Premium'}
              </button>
            </div>

            <div className="pt-2 text-center">
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-medium">
                {t.aboutUmmah}
              </p>
              <p className="text-[10px] text-deenly-gold font-bold mt-1">
                {t.aboutRights}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
