import React from 'react';
import { X, Check, Zap, ShieldCheck, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isPremium: boolean;
  onUpgrade: () => void;
  onManage: () => void;
  showToast: (message: string, type: 'error' | 'success') => void;
  t: any;
}

export const PlansModal: React.FC<PlansModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  isPremium, 
  onUpgrade, 
  onManage,
  showToast,
  t 
}) => {
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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        <div className="p-8 sm:p-12">
          <div className="flex justify-between items-start mb-12">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">{t.plansTitle}</h2>
              <p className="text-sm sm:text-lg opacity-60 leading-relaxed">{t.plansSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/health');
                    const data = await res.json();
                    if (data.env) {
                      const envStatus = Object.entries(data.env)
                        .map(([key, val]) => `${key}: ${val ? '✅' : '❌'}`)
                        .join(', ');
                      showToast(`API Health: ${data.status} (${envStatus})`, 'success');
                    } else {
                      showToast(`API Health: ${data.status}`, 'success');
                    }
                  } catch (e: any) {
                    showToast(`API Error: ${e.message}`, 'error');
                  }
                }}
                className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
                title="Test API Health"
              >
                <Zap size={20} />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
              >
                <X size={28} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className={`p-8 rounded-[32px] border transition-all ${
              darkMode ? 'bg-deenly-dark-bg/40 border-white/5' : 'bg-white border-deenly-gold/10'
            }`}>
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold/60 mb-2 block">{t.plansFree}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-xs opacity-40 uppercase font-bold tracking-widest">{t.plansForever}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-12">
                {t.plansFeaturesFree.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm opacity-70">
                    <Check size={18} className="text-deenly-gold shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                disabled={!isPremium}
                className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                  !isPremium 
                    ? 'bg-deenly-gold/10 text-deenly-gold cursor-default' 
                    : 'bg-deenly-gold text-white hover:bg-deenly-gold/90'
                }`}
              >
                {!isPremium ? t.plansCurrent : t.viewPlan}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`p-8 rounded-[32px] border-2 relative transition-all ${
              isPremium
                ? 'bg-deenly-gold border-deenly-gold shadow-2xl shadow-deenly-gold/20'
                : darkMode 
                  ? 'bg-deenly-gold/10 border-deenly-gold shadow-2xl shadow-deenly-gold/10' 
                  : 'bg-deenly-gold/5 border-deenly-gold shadow-2xl shadow-deenly-gold/10'
            }`}>
              <div className={`absolute top-6 right-6 px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full ${
                isPremium ? 'bg-white text-deenly-gold' : 'bg-deenly-gold text-white'
              }`}>
                {isPremium ? 'Premium Active' : t.plansPopular}
              </div>

              <div className="mb-8">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ${
                  isPremium ? 'text-white/80' : 'text-deenly-gold'
                }`}>{t.plansPro}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${isPremium ? 'text-white' : 'text-deenly-gold'}`}>$9.99</span>
                  <span className={`text-xs uppercase font-bold tracking-widest ${
                    isPremium ? 'text-white/60' : 'text-deenly-gold/60'
                  }`}>{t.plansMonthly}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-12">
                {t.plansFeaturesPro.map((feature: string, i: number) => (
                  <li key={i} className={`flex items-start gap-3 text-sm ${isPremium ? 'text-white/90' : ''}`}>
                    <Zap size={18} className={`shrink-0 mt-0.5 ${
                      isPremium ? 'text-white fill-white' : 'text-deenly-gold fill-deenly-gold'
                    }`} />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={isPremium ? onManage : onUpgrade}
                className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${
                  isPremium 
                    ? 'bg-white text-deenly-gold hover:bg-white/90 shadow-white/10' 
                    : 'bg-deenly-gold text-white hover:bg-deenly-gold/90 shadow-deenly-gold/20'
                }`}
              >
                {isPremium ? 'Gestionar Suscripción' : t.plansUpgrade}
              </button>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 pt-12 border-t border-deenly-gold/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest">{t.plansSecure}</p>
                <p className="text-[10px] opacity-40">{t.plansSecureDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                <CreditCard size={20} />
              </div>
              <div className="flex gap-2 opacity-40 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
