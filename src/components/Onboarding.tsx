import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Book, 
  Clock, 
  ChevronRight, 
  Check,
  Star,
  Heart,
  Compass,
  MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  language: string;
  darkMode: boolean;
}

export interface OnboardingData {
  knowledgeLevel: string;
  interests: string[];
  goal: string;
}

const steps = [
  {
    id: 'welcome',
    icon: <Sparkles className="text-deenly-gold" size={32} />,
    title: {
      'Español': 'Bienvenido a Deenly',
      'English': 'Welcome to Deenly'
    },
    description: {
      'Español': 'Tu compañero espiritual impulsado por IA para profundizar en tu conexión con el Islam.',
      'English': 'Your AI-powered spiritual companion to deepen your connection with Islam.'
    }
  },
  {
    id: 'features',
    icon: <Compass className="text-deenly-gold" size={32} />,
    title: {
      'Español': 'Todo en un solo lugar',
      'English': 'Everything in one place'
    },
    items: [
      { icon: <MessageSquare size={18} />, text: { 'Español': 'Guía espiritual con IA', 'English': 'AI Spiritual Guidance' } },
      { icon: <Book size={18} />, text: { 'Español': 'Buscador del Corán y Hadices', 'English': 'Quran & Hadith Search' } },
      { icon: <Clock size={18} />, text: { 'Español': 'Horarios de oración precisos', 'English': 'Accurate Prayer Times' } }
    ]
  },
  {
    id: 'personalize-1',
    id_field: 'knowledgeLevel',
    title: {
      'Español': '¿Cuál es tu nivel de conocimiento?',
      'English': 'What is your knowledge level?'
    },
    options: [
      { id: 'beginner', label: { 'Español': 'Principiante', 'English': 'Beginner' }, desc: { 'Español': 'Estoy empezando a aprender.', 'English': 'I am just starting to learn.' } },
      { id: 'intermediate', label: { 'Español': 'Intermedio', 'English': 'Intermediate' }, desc: { 'Español': 'Conozco los pilares y practico.', 'English': 'I know the pillars and I practice.' } },
      { id: 'advanced', label: { 'Español': 'Avanzado', 'English': 'Advanced' }, desc: { 'Español': 'Busco profundizar en temas complejos.', 'English': 'I seek to deepen into complex topics.' } }
    ]
  },
  {
    id: 'personalize-2',
    id_field: 'interests',
    title: {
      'Español': '¿Qué te interesa más?',
      'English': 'What interests you most?'
    },
    multiSelect: true,
    options: [
      { id: 'quran', label: { 'Español': 'Corán y Tafsir', 'English': 'Quran & Tafsir' } },
      { id: 'hadith', label: { 'Español': 'Hadices y Sunnah', 'English': 'Hadith & Sunnah' } },
      { id: 'history', label: { 'Español': 'Historia Islámica', 'English': 'Islamic History' } },
      { id: 'spirituality', label: { 'Español': 'Espiritualidad (Tazkiyah)', 'English': 'Spirituality (Tazkiyah)' } },
      { id: 'fiqh', label: { 'Español': 'Jurisprudencia (Fiqh)', 'English': 'Jurisprudence (Fiqh)' } }
    ]
  },
  {
    id: 'personalize-3',
    id_field: 'goal',
    title: {
      'Español': '¿Cuál es tu objetivo principal?',
      'English': 'What is your main goal?'
    },
    options: [
      { id: 'learn', label: { 'Español': 'Aprender lo básico', 'English': 'Learn the basics' } },
      { id: 'practice', label: { 'Español': 'Mejorar mi práctica diaria', 'English': 'Improve my daily practice' } },
      { id: 'connect', label: { 'Español': 'Sentirme más cerca de Allah', 'English': 'Feel closer to Allah' } },
      { id: 'share', label: { 'Español': 'Poder enseñar a otros', 'English': 'Be able to teach others' } }
    ]
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, language, darkMode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    knowledgeLevel: '',
    interests: [],
    goal: ''
  });

  const lang = language === 'Español' ? 'Español' : 'English';
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(data);
    }
  };

  const toggleInterest = (id: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id]
    }));
  };

  const isNextDisabled = () => {
    if (step.id === 'personalize-1') return !data.knowledgeLevel;
    if (step.id === 'personalize-2') return data.interests.length === 0;
    if (step.id === 'personalize-3') return !data.goal;
    return false;
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-deenly-cream'}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-deenly-gold/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-deenly-gold/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative w-full max-w-lg rounded-[40px] p-8 sm:p-12 shadow-2xl border ${
          darkMode ? 'bg-deenly-dark-surface border-deenly-gold/20' : 'bg-white border-deenly-gold/10'
        }`}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 p-1">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-deenly-gold' : darkMode ? 'bg-white/10' : 'bg-black/5'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Icon/Logo Header */}
            <div className="flex flex-col items-center text-center space-y-4">
              {step.id === 'welcome' ? (
                <Logo size={80} />
              ) : (
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-deenly-gold/10'}`}>
                  {step.icon || <Star className="text-deenly-gold" size={32} />}
                </div>
              )}
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                {step.title[lang]}
              </h2>
              {step.description && (
                <p className={`text-sm sm:text-base opacity-60 leading-relaxed max-w-xs mx-auto ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  {step.description[lang]}
                </p>
              )}
            </div>

            {/* Content Area */}
            <div className="space-y-3">
              {step.items && (
                <div className="grid grid-cols-1 gap-3">
                  {step.items.map((item, i) => (
                    <div 
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${
                        darkMode ? 'bg-white/5 border-white/10' : 'bg-deenly-gold/5 border-deenly-gold/10'
                      }`}
                    >
                      <div className="text-deenly-gold">{item.icon}</div>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white/80' : 'text-deenly-green/80'}`}>
                        {item.text[lang]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {step.options && (
                <div className="grid grid-cols-1 gap-3">
                  {step.options.map((opt) => {
                    const isSelected = step.multiSelect 
                      ? data.interests.includes(opt.id)
                      : (step.id_field === 'knowledgeLevel' ? data.knowledgeLevel === opt.id : data.goal === opt.id);
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (step.multiSelect) {
                            toggleInterest(opt.id);
                          } else {
                            setData(prev => ({ ...prev, [step.id_field!]: opt.id }));
                          }
                        }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                          isSelected 
                            ? 'bg-deenly-gold border-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                            : darkMode 
                              ? 'bg-white/5 border-white/10 hover:border-deenly-gold/50 text-white/80' 
                              : 'bg-white border-deenly-gold/10 hover:border-deenly-gold/50 text-deenly-green'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{opt.label[lang]}</p>
                            {opt.desc && <p className={`text-[10px] mt-0.5 opacity-60 ${isSelected ? 'text-white' : ''}`}>{opt.desc[lang]}</p>}
                          </div>
                          {isSelected && <Check size={16} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
            className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${
              currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100'
            } ${darkMode ? 'text-white' : 'text-deenly-green'}`}
          >
            {lang === 'Español' ? 'Atrás' : 'Back'}
          </button>

          <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
              isNextDisabled()
                ? 'bg-deenly-gold/20 text-deenly-gold/40 cursor-not-allowed'
                : 'bg-deenly-gold text-white shadow-xl shadow-deenly-gold/20 hover:shadow-deenly-gold/40'
            }`}
          >
            {currentStep === steps.length - 1 
              ? (lang === 'Español' ? 'Empezar' : 'Get Started')
              : (lang === 'Español' ? 'Continuar' : 'Continue')}
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
