import React from 'react';
import { X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  t: any;
  type?: 'privacy' | 'terms' | 'premium';
}

const LegalModal: React.FC<LegalModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  t,
  type
}) => {
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
            className={`relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
              darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
            }`}
          >
            <div className="p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
                  <Shield className="text-white" size={20} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                    Legal
                  </h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                    Términos y Privacidad
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

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <section className="space-y-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-deenly-gold' : 'text-deenly-green'}`}>
                  Términos de Servicio
                </h3>
                <div className={`text-sm leading-relaxed space-y-4 opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  <p>
                    Al utilizar Deenly, aceptas nuestros términos de servicio. Esta aplicación está diseñada para fines educativos y espirituales.
                  </p>
                  <p>
                    El contenido proporcionado por la IA debe ser verificado con fuentes académicas tradicionales para asuntos de jurisprudencia (Fiqh) compleja.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-deenly-gold' : 'text-deenly-green'}`}>
                  Política de Privacidad
                </h3>
                <div className={`text-sm leading-relaxed space-y-4 opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  <p>
                    Valoramos tu privacidad. Tus chats y datos personales están protegidos y no se comparten con terceros con fines comerciales.
                  </p>
                  <p>
                    Utilizamos Supabase para el almacenamiento seguro de datos y Stripe para el procesamiento de pagos, ambos líderes en seguridad de datos.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-deenly-gold' : 'text-deenly-green'}`}>
                  Uso de IA
                </h3>
                <div className={`text-sm leading-relaxed space-y-4 opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  <p>
                    Deenly utiliza modelos avanzados de lenguaje para proporcionar respuestas. Aunque nos esforzamos por la precisión, la IA puede cometer errores.
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LegalModal;
