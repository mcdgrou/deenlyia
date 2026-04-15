import React from 'react';
import { X, Check, Star, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isPremium: boolean;
  onUpgrade: () => void;
  onManage?: () => void;
  showToast?: (message: string, type?: 'error' | 'success') => void;
  t: any;
}

const PlansModal: React.FC<PlansModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  isPremium, 
  onUpgrade, 
  onManage,
  showToast,
  t 
}) => {
  const plans = [
    {
      name: 'Gratis',
      price: '0€',
      description: 'Ideal para comenzar tu camino',
      features: [
        'Chat básico con IA',
        'Biblioteca del Corán',
        'Horarios de oración',
        'Logros básicos'
      ],
      current: !isPremium,
      buttonText: 'Plan Actual',
      premium: false
    },
    {
      name: 'Premium',
      price: '9.99€',
      period: '/mes',
      description: 'La experiencia espiritual completa',
      features: [
        'Chat avanzado (GPT-4/Gemini Pro)',
        'Análisis profundo de Aleyas',
        'Diario espiritual ilimitado',
        'Estadísticas avanzadas',
        'Soporte prioritario',
        'Sin anuncios'
      ],
      current: isPremium,
      buttonText: isPremium ? 'Plan Actual' : 'Actualizar a Premium',
      premium: true
    }
  ];

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
            className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
              darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
            }`}
          >
            <div className="p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                    Planes y Suscripción
                  </h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                    Elige tu experiencia
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan, idx) => (
                  <div 
                    key={idx}
                    className={`relative p-8 rounded-[40px] border-2 transition-all ${
                      plan.premium 
                        ? 'border-deenly-gold bg-deenly-gold/5 shadow-xl shadow-deenly-gold/10' 
                        : 'border-deenly-gold/10 bg-white/50'
                    }`}
                  >
                    {plan.premium && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-deenly-gold text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                        Recomendado
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${darkMode ? 'text-deenly-gold' : 'text-deenly-green'}`}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-sm opacity-50">{plan.period}</span>
                        )}
                      </div>
                      <p className="text-sm opacity-60 mt-2">{plan.description}</p>
                    </div>

                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            plan.premium ? 'bg-deenly-gold/20 text-deenly-gold' : 'bg-deenly-green/10 text-deenly-green'
                          }`}>
                            <Check size={12} />
                          </div>
                          <span className="text-sm opacity-80">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => !plan.current && plan.premium && onUpgrade()}
                      disabled={plan.current}
                      className={`w-full py-4 rounded-2xl font-bold transition-all ${
                        plan.current
                          ? 'bg-deenly-gold/10 text-deenly-gold cursor-default'
                          : plan.premium
                            ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20 hover:bg-deenly-gold/90 active:scale-[0.98]'
                            : 'bg-deenly-green/10 text-deenly-green hover:bg-deenly-green/20 active:scale-[0.98]'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                ))}
              </div>

              <div className={`mt-12 p-8 rounded-[40px] border border-deenly-gold/10 text-center ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
                <Sparkles className="text-deenly-gold mx-auto mb-4" size={32} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  ¿Por qué Premium?
                </h3>
                <p className="text-sm opacity-60 max-w-lg mx-auto leading-relaxed">
                  Tu suscripción Premium no solo te da acceso a funciones exclusivas, sino que también ayuda a mantener Deenly libre de anuncios y apoya el desarrollo continuo de herramientas para la comunidad musulmana.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PlansModal;
