import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const thinkingMessages = [
  "Consultando fuentes auténticas...",
  "Reflexionando sobre tu pregunta...",
  "Buscando sabiduría en el Corán y la Sunnah...",
  "Preparando una respuesta compasiva...",
  "Deenly está pensando...",
  "Casi listo...",
  "Analizando el contexto espiritual...",
  "Buscando la mejor guía para ti...",
  "Conectando con el conocimiento islámico...",
];

export const ThinkingIndicator: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-deenly-gold/5 border border-deenly-gold/10 max-w-[80%] animate-pulse">
      <div className="flex items-center gap-2 text-deenly-gold">
        <Sparkles size={16} className="animate-spin-slow" />
        <span className="text-xs font-bold uppercase tracking-widest">Deenly está pensando</span>
      </div>
      
      <div className="h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-sm text-deenly-green/70 italic"
          >
            {thinkingMessages[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex gap-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-deenly-gold"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          className="w-1.5 h-1.5 rounded-full bg-deenly-gold"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          className="w-1.5 h-1.5 rounded-full bg-deenly-gold"
        />
      </div>
    </div>
  );
};
