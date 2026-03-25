import React from 'react';
import { X, Shield, FileText, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  type: 'privacy' | 'terms' | 'premium';
  t: any;
}

export const LegalModal: React.FC<LegalModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  type,
  t 
}) => {
  if (!isOpen) return null;

  const getContent = () => {
    switch (type) {
      case 'privacy':
        return {
          title: t.privacyTitle,
          icon: <Shield size={24} className="text-deenly-gold" />,
          content: t.privacyContent
        };
      case 'terms':
        return {
          title: t.termsTitle,
          icon: <FileText size={24} className="text-deenly-gold" />,
          content: t.termsContent
        };
      case 'premium':
        return {
          title: t.premiumPolicyTitle,
          icon: <CreditCard size={24} className="text-deenly-gold" />,
          content: t.premiumPolicyContent
        };
      default:
        return { title: '', icon: null, content: '' };
    }
  };

  const { title, icon, content } = getContent();

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[32px] shadow-2xl ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(80vh-80px)] scrollbar-hide">
          <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed opacity-80">
              {content}
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-deenly-gold/10 text-center">
            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
              © 2026 MCDGROUP DEV • {t.aboutRights}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
