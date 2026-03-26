import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  User, 
  Bell,
  Settings, 
  Sparkles, 
  ChevronRight,
  ChevronDown,
  MessageSquare,
  BookOpen,
  Loader2,
  Plus,
  History,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Book,
  Trash2,
  Edit2,
  Check,
  Heart,
  TrendingUp,
  Award,
  Trophy,
  Download
} from 'lucide-react';
import { Logo } from './components/Logo';
import { QuranSearchModal } from './components/QuranSearchModal';
import { SurahLibrary } from './components/SurahLibrary';
import { Auth } from './components/Auth';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { LegalModal } from './components/LegalModal';
import { PlansModal } from './components/PlansModal';
import { HadithModal } from './components/HadithModal';
import { PrayerTimesModal } from './components/PrayerTimesModal';
import { AchievementsModal } from './components/AchievementsModal';
import { Onboarding, type OnboardingData } from './components/Onboarding';
import { JournalModal } from './components/JournalModal';
import { ProgressModal } from './components/ProgressModal';
import AyahOfTheDay from './components/AyahOfTheDay';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getMuftiResponse, type ChatMessage as GeminiChatMessage } from './services/geminiService';
import { chatService, type Chat, type Message as DbMessage } from './services/chatService';
import ReactMarkdown from 'react-markdown';
import type { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

const Splash = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeInOut" }}
    className="fixed inset-0 z-[300] bg-deenly-cream flex flex-col items-center justify-center p-8 text-center"
  >
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-deenly-gold/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-deenly-gold/10 blur-[120px] rounded-full animate-pulse" />
    </div>

    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="mb-12 relative"
    >
      <div className="absolute inset-0 bg-deenly-gold/20 blur-3xl rounded-full animate-pulse" />
      <div className="relative">
        <Logo size={120} />
      </div>
    </motion.div>

    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="text-center space-y-4"
    >
      <Logo showText size={0} className="justify-center" />
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold text-deenly-gold/60">
        Tu compañero espiritual inteligente
      </p>
      
      <div className="mt-12 flex gap-2 justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5, 
              delay: i * 0.2 
            }}
            className="w-2 h-2 rounded-full bg-deenly-gold"
          />
        ))}
      </div>
    </motion.div>

    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className="absolute bottom-12 text-[10px] font-bold text-deenly-gold/40 uppercase tracking-widest"
    >
      MCDGROUP DEV
    </motion.div>
  </motion.div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'premium'>('privacy');
  
  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    setIsSidebarOpen(false);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const openLegalModal = (type: 'privacy' | 'terms' | 'premium') => {
    setLegalModalType(type);
    setActiveModal('legal');
  };
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'default' | 'emerald' | 'midnight' | 'sunset'>('default');
  const [cardStyle, setCardStyle] = useState<'compact' | 'wide'>('wide');
  const [language, setLanguage] = useState('Español');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [isPremium, setIsPremium] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(15);
  const [memories, setMemories] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [achievementsStats, setAchievementsStats] = useState({
    messagesSent: 0,
    surahsRead: 0,
    streak: 1,
    quranSearches: 0,
    hadithsRead: 0
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    // Check for success/cancel from Stripe
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      showToast(language === 'Español' ? '¡Suscripción activada con éxito!' : 'Subscription activated successfully!', 'success');
      // Refresh session to get updated metadata
      supabase.auth.refreshSession();
    }
    if (query.get('canceled')) {
      showToast(language === 'Español' ? 'El proceso de pago fue cancelado.' : 'Payment process was canceled.', 'error');
    }
  }, []);

  const fetchUsage = async (userId: string) => {
    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.count !== undefined) {
        setUsageCount(data.count);
        setUsageLimit(data.limit);
        setIsPremium(data.isPremium);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUsage(session.user.id);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsPremium(false);
      return;
    }

    // Initial check from metadata
    if (session.user.user_metadata?.is_premium) {
      setIsPremium(true);
    }

    // Real-time listener for profile changes
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload: any) => {
          if (payload.new.is_premium !== undefined) {
            setIsPremium(payload.new.is_premium);
          }
        }
      )
      .subscribe();

    // Also fetch once to be sure
    supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsPremium(data.is_premium);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    // Expose openAchievements to window for ProfileModal
    (window as any).openAchievements = () => openModal('achievements');
    
    // Load stats from localStorage or user metadata
    if (session?.user) {
      const savedStats = localStorage.getItem(`deenly_stats_${session.user.id}`);
      if (savedStats) {
        setAchievementsStats(JSON.parse(savedStats));
      } else if (session.user.user_metadata?.stats) {
        setAchievementsStats(session.user.user_metadata.stats);
      }
    }
  }, [session?.user?.id]);

  const updateStats = (key: keyof typeof achievementsStats, increment = 1) => {
    setAchievementsStats(prev => {
      const newStats = { ...prev, [key]: prev[key] + increment };
      if (session?.user) {
        localStorage.setItem(`deenly_stats_${session.user.id}`, JSON.stringify(newStats));
        // Optionally sync to Supabase metadata
        supabase.auth.updateUser({
          data: { stats: newStats }
        });
      }
      return newStats;
    });
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadSessions();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const needsOnboarding = session.user.user_metadata?.needs_onboarding;
        if (needsOnboarding) {
          setShowOnboarding(true);
        }
      }
      if (session?.user?.user_metadata?.settings?.darkMode !== undefined) {
        setDarkMode(session.user.user_metadata.settings.darkMode);
      }
      if (session?.user?.user_metadata?.settings?.fontSize) {
        setFontSize(session.user.user_metadata.settings.fontSize);
      }
      if (session?.user?.user_metadata?.settings?.theme) {
        setTheme(session.user.user_metadata.settings.theme);
      }
      if (session?.user?.user_metadata?.settings?.cardStyle) {
        setCardStyle(session.user.user_metadata.settings.cardStyle);
      }
      if (session?.user?.user_metadata?.settings?.language) {
        setLanguage(session.user.user_metadata.settings.language);
      }
      if (session?.user?.user_metadata?.settings?.dateFormat) {
        setDateFormat(session.user.user_metadata.settings.dateFormat);
      }
    });

    const {
      data: { subscription },
    } = isSupabaseConfigured 
      ? supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if (!session) {
            setMessages([]);
            setSessions([]);
            setCurrentSessionId(null);
            setIsPremium(false);
            setShowOnboarding(false);
          } else {
            const needsOnboarding = session.user.user_metadata?.needs_onboarding;
            if (needsOnboarding) {
              setShowOnboarding(true);
            }
            if (session?.user?.user_metadata?.is_premium) {
              setIsPremium(true);
            } else {
              setIsPremium(false);
            }
          }
          
          if (session?.user?.user_metadata?.settings?.darkMode !== undefined) {
            setDarkMode(session.user.user_metadata.settings.darkMode);
          }
          if (session?.user?.user_metadata?.settings?.fontSize) {
            setFontSize(session.user.user_metadata.settings.fontSize);
          }
          if (session?.user?.user_metadata?.settings?.theme) {
            setTheme(session.user.user_metadata.settings.theme);
          }
          if (session?.user?.user_metadata?.settings?.cardStyle) {
            setCardStyle(session.user.user_metadata.settings.cardStyle);
          }
          if (session?.user?.user_metadata?.settings?.language) {
            setLanguage(session.user.user_metadata.settings.language);
          }
          if (session?.user?.user_metadata?.settings?.dateFormat) {
            setDateFormat(session.user.user_metadata.settings.dateFormat);
          }
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-emerald', 'theme-midnight', 'theme-sunset');
    if (theme !== 'default') {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('card-style-compact', 'card-style-wide');
    root.classList.add(`card-style-${cardStyle}`);
  }, [cardStyle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    
    // Clear state immediately if session is null (logout)
    if (!session) {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
    }
    
    // Load sessions from Supabase or LocalStorage when session changes
    loadSessions(!!currentSessionId);

    return () => clearTimeout(timer);
  }, [session, language]);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    localStorage.setItem('deenly_onboarding_completed', 'true');
    setShowOnboarding(false);
    
    if (session?.user?.id) {
      // Save onboarding data to Supabase profile
      try {
        await supabase
          .from('profiles')
          .update({ 
            onboarding: data,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
          
        // Also update auth metadata for immediate use in geminiService
        await supabase.auth.updateUser({
          data: { 
            onboarding: data,
            needs_onboarding: false
          }
        });
      } catch (error) {
        console.error('Error saving onboarding data:', error);
      }
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const translations: any = {
    'Español': {
      welcomeBrother: '¡As-salamu alaykum! Bienvenido de nuevo, hermano. ¿En qué puedo ayudarte hoy?',
      welcomeSister: '¡As-salamu alaykum! Bienvenida de nuevo, hermana. ¿En qué puedo ayudarte hoy?',
      goodMorningBrother: '¡Buenos días, hermano! ¿En qué puedo ayudarte hoy?',
      goodMorningSister: '¡Buenos días, hermana! ¿En qué puedo ayudarte hoy?',
      goodAfternoonBrother: '¡Buenas tardes, hermano! ¿En qué puedo ayudarte hoy?',
      goodAfternoonSister: '¡Buenas tardes, hermana! ¿En qué puedo ayudarte hoy?',
      goodNightBrother: '¡Buenas noches, hermano! ¿En qué puedo ayudarte hoy?',
      goodNightSister: '¡Buenas noches, hermana! ¿En qué puedo ayudarte hoy?',
      error: 'Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
      newChat: 'Nueva conversación',
      placeholder: 'Pregunta sobre el Islam...',
      searchQuran: 'Buscar Corán',
      you: 'Tú',
      history: 'Historial de Chats',
      noHistory: 'Sin historial',
      explore: 'Explorar',
      surahLib: 'Biblioteca de Suras',
      quranSearch: 'Buscador del Corán',
      hadith: 'Hadith',
      prayerTimes: 'Oraciones',
      clearHistory: 'Borrar Historial',
      confirmClear: '¿Estás seguro de que quieres borrar todos los chats?',
      premium: 'Premium',
      proDesc: 'Acceso ilimitado, respuestas profundas y soporte prioritario.',
      upgrade: 'Mejorar Ahora',
      viewPlan: 'Ver Plan',
      settings: 'Ajustes',
      about: 'Sobre Deenly',
      logout: 'Cerrar Sesión',
      disclaimer: 'Deenly puede cometer errores. Considera verificar la información.',
      dailyInspiration: 'Inspiración Diaria',
      aboutTitle: 'Sobre Deenly',
      aboutMission: 'Nuestra Misión',
      aboutMissionDesc: 'Deenly nace con el propósito de democratizar el acceso al conocimiento islámico auténtico mediante el uso de inteligencia artificial avanzada. Queremos ser un puente entre la tradición y la tecnología moderna.',
      aboutCommitment: 'Compromiso con la Verdad',
      aboutCommitmentDesc: 'Nuestras respuestas se basan en fuentes académicas reconocidas y el Sagrado Corán. Aunque la IA puede cometer errores, trabajamos continuamente para mejorar la precisión y fidelidad de la información proporcionada.',
      aboutUmmah: 'Hecho con ❤️ por MCDGROUP DEV para la Ummah',
      aboutRights: '© 2026 MCDGROUP DEV. Todos los derechos reservados.',
      aboutContact: 'Contacto',
      aboutContactDesc: 'Para soporte o consultas: MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'Planes de Deenly',
      plansSubtitle: 'Elige el plan que mejor se adapte a tu búsqueda espiritual',
      plansFree: 'Gratis',
      plansPro: 'Deenly Pro',
      plansForever: 'para siempre',
      plansMonthly: 'al mes',
      plansPopular: 'Más Popular',
      plansCurrent: 'Plan Actual',
      plansUpgrade: 'Mejorar Ahora',
      plansAlreadyPro: 'Ya eres Pro',
      plansSecure: 'Pago Seguro y Garantizado',
      plansSecureDesc: 'Utilizamos Stripe para procesar todos los pagos de forma segura. Puedes cancelar tu suscripción en cualquier momento sin compromisos.',
      plansFeaturesFree: ['15 consultas de IA cada 12h', 'Buscador del Corán', 'Biblioteca de Suras', 'Historial de chats limitado', 'Respuestas estándar'],
      plansFeaturesPro: [
        'Consultas ilimitadas (Deep Deen)', 
        'Respuestas profundas y detalladas con Tafsir', 
        'Diario Espiritual con reflexiones de IA',
        'Hoja de Ruta y Seguimiento de Progreso',
        'Memorias Inteligentes (AI recuerda tu camino)',
        'Personalización estética y temas exclusivos',
        'Soporte prioritario 24/7'
      ],
      spiritualJournal: 'Diario Espiritual',
      spiritualRoadmap: 'Hoja de Ruta',
      reflectAndGrow: 'Reflexiona y Crece',
      trackYourGrowth: 'Sigue tu Crecimiento',
      moodBlessed: 'Bendecido',
      moodGrateful: 'Agradecido',
      moodPeaceful: 'En Paz',
      moodReflective: 'Reflexivo',
      moodStruggling: 'Creciendo',
      myEntries: 'Mis Entradas',
      newReflection: 'Nueva Reflexión',
      howDoYouFeel: '¿Cómo te sientes hoy?',
      yourReflection: 'Tu Reflexión',
      journalPlaceholder: '¿Qué hay en tu corazón hoy? Agradecimientos, luchas, reflexiones...',
      saveReflection: 'Guardar Reflexión',
      loadingJournal: 'Cargando Diario...',
      noEntriesYet: 'No hay entradas aún',
      startJournaling: 'Comienza tu viaje de reflexión espiritual hoy mismo.',
      fundamentals: 'Fundamentos del Islam',
      fundamentalsDesc: 'Aprende los 5 pilares y los 6 artículos de fe.',
      quranStudies: 'Estudios del Corán',
      quranStudiesDesc: 'Historia de la revelación y Tafsir básico.',
      characterAdab: 'Carácter y Adab',
      characterAdabDesc: 'Modales del Profeta (SAW) y ética islámica.',
      islamicHistory: 'Historia Islámica',
      islamicHistoryDesc: 'La vida del Profeta (SAW) y los Califas.',
      level: 'Nivel',
      lessons: 'Lecciones',
      badges: 'Insignias',
      loadingProgress: 'Cargando Progreso...',
      shahada: 'Shahada',
      salat: 'Salat',
      zakat: 'Zakat',
      sawm: 'Sawm',
      hajj: 'Hajj',
      iman: 'Iman',
      revelation: 'Revelación',
      compilation: 'Compilación',
      tafsir_intro: 'Intro al Tafsir',
      surah_fatiha: 'Surah Al-Fatiha',
      honesty: 'Honestidad',
      patience: 'Paciencia',
      kindness: 'Bondad',
      respect_parents: 'Respeto a los padres',
      seerah_mecca: 'Seerah (Meca)',
      seerah_medina: 'Seerah (Medina)',
      rashidun: 'Califas Rashidun',
      golden_age: 'Edad de Oro',
      usageLimitReached: 'Has alcanzado el límite de preguntas de tu plan. Te invitamos a mejorar a Deenly Pro para continuar tu búsqueda de conocimiento sin interrupciones. ¡BarakAllahu Feek!',
      upgradeToPro: 'Mejora a Deenly Pro para obtener consultas ilimitadas y respuestas más profundas.',
      hadithLibrary: 'Biblioteca de Hadices',
      prophetWisdom: 'Sabiduría del Profeta (SAW)',
      collections: 'Colecciones',
      books: 'Libros',
      allBooks: 'Todos los libros',
      searchInCollection: 'Buscar en esta colección...',
      noHadithsFound: 'No se encontraron hadices',
      selectCollection: 'Selecciona una colección',
      exploreProphetTeachings: 'Explora las enseñanzas del Profeta Muhammad (SAW) a través de las colecciones más auténticas.',
      narrators: 'Narradores',
      topics: 'Temas',
      narratorThreads: 'Hilos de Narradores',
      topicThreads: 'Hilos por Tema',
      selectNarrator: 'Selecciona un narrador',
      selectTopic: 'Selecciona un tema',
      backToList: 'Volver a la lista',
      narratedBy: 'Narrado por',
      topic: 'Tema',
      searchHadiths: 'Buscar hadices...',
      searchCollections: 'Buscar colecciones...',
      searchNarrators: 'Buscar narradores...',
      searchTopics: 'Buscar temas...',
      allNarrators: 'Todos los narradores',
      allTopics: 'Todos los temas',
      today: 'Hoy',
      prayerTitle: 'Horarios de Oración',
      prayerSubtitle: 'Conexión espiritual diaria',
      location: 'Ubicación',
      todayTimes: 'Horarios de Hoy',
      nextPrayer: 'Siguiente Oración',
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      autoLocation: 'Detectar automáticamente',
      changeLocation: 'Cambiar ubicación',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      loading: 'Cargando horarios...',
      startsIn: 'Comienza en',
      profile: 'Perfil',
      favorites: 'Favoritos',
      progress: 'Progreso',
      myProfile: 'Mi Perfil',
      premiumMember: 'Miembro Premium',
      freeAccount: 'Cuenta Gratuita',
      email: 'Correo Electrónico',
      memberSince: 'Miembro desde',
      noFavoritesYet: 'Aún no tienes favoritos',
      favoritesCount: 'Ayas Favoritas',
      knowledgeLevel: 'Nivel de Conocimiento',
      learningGoals: 'Objetivos de Aprendizaje',
      ayahOfTheDay: 'Aya del Día',
      surah: 'Sura',
      copy: 'Copiar',
      share: 'Compartir',
      privacyTitle: 'Política de Privacidad',
      privacyContent: `Política de Privacidad – Deenly\n\nÚltima actualización: 2026\n\nDeenly es una aplicación educativa islámica diseñada para ayudar a los usuarios a aprender sobre el Islam a través de asistencia de IA, recursos del Corán, colecciones de hadices, recordatorios de oración y guía espiritual.\n\nInformación que Recopilamos\n\nPodemos recopilar la siguiente información:\n- Dirección de correo electrónico e información de la cuenta cuando los usuarios se registran.\n- Preferencias y ajustes del usuario.\n- Mensajes de chat enviados al asistente de IA.\n- Datos de uso para mejorar la experiencia de la aplicación.\n- Información de suscripción para usuarios Premium.\n\nServicios de Terceros\n\nDeenly utiliza servicios de terceros de confianza, incluyendo:\n- Servicios de autenticación y base de datos proporcionados por Supabase.\n- Procesamiento de pagos proporcionado por Stripe.\n- Servicios de inteligencia artificial proporcionados por Google AI Studio.\n\nEstos servicios pueden procesar los datos limitados necesarios para que la aplicación funcione.\n\nCómo Utilizamos la Información\n\nLa información del usuario se utiliza para:\n- proporcionar el servicio Deenly\n- personalizar la experiencia del usuario\n- gestionar suscripciones\n- mejorar la calidad de la aplicación\n- garantizar la seguridad y prevenir el mal uso\n\nProtección de Datos\n\nTomamos las medidas adecuadas para proteger los datos del usuario y garantizar un almacenamiento seguro.\n\nDerechos del Usuario\n\nLos usuarios pueden solicitar:\n- acceder a sus datos\n- eliminar su cuenta\n- eliminar información personal\n\nLas solicitudes pueden enviarse al contacto de soporte proporcionado en la aplicación.\n\nDescargo de Responsabilidad de Contenido Religioso\n\nDeenly proporciona información educativa islámica. Para decisiones religiosas importantes, se alienta a los usuarios a consultar a académicos islámicos calificados.`,
      termsTitle: 'Términos de Servicio',
      termsContent: `Términos de Servicio – Deenly\n\nAl utilizar la aplicación Deenly, aceptas los siguientes términos.\n\nUso de la Aplicación\n\nDeenly proporciona contenido educativo islámico que incluye recursos del Corán, colecciones de hadices, explicaciones basadas en IA y guía espiritual.\n\nLos usuarios aceptan utilizar la aplicación de manera respetuosa y no hacer un mal uso del servicio.\n\nCuentas de Usuario\n\nLos usuarios son responsables de mantener la seguridad de sus credenciales de cuenta.\n\nUso Aceptable\n\nLos usuarios no pueden:\n- intentar hackear el sistema\n- hacer un mal uso del asistente de IA\n- utilizar el servicio para actividades ilegales\n\nLa violación de estas reglas puede resultar en la suspensión de la cuenta.\n\nDisponibilidad del Servicio\n\nNos esforzamos por mantener el servicio disponible en todo momento, pero la disponibilidad no puede ser garantizada.\n\nLimitación de Responsabilidad\n\nDeenly proporciona contenido educativo y no se hace responsable de las decisiones personales basadas en la información proporcionada.`,
      premiumPolicyTitle: 'Política de Suscripción',
      premiumPolicyContent: `Suscripción Premium – Deenly\n\nDeenly ofrece una suscripción Premium que desbloquea funciones adicionales.\n\nPlan Gratuito\n\nEl plan gratuito incluye:\n- acceso a recursos islámicos básicos\n- navegación por el Corán y hadices\n- recordatorios de oración\n- hasta 15 preguntas de IA cada 12h\n\nPlan Premium\n\nLos usuarios Premium reciben:\n- preguntas de IA ilimitadas\n- explicaciones islámicas avanzadas\n- respuestas de IA prioritarias\n- futuras funciones premium\n\nPrecios de Suscripción\n\nSuscripción Premium:\n- 9,99 € al mes\n\nLas suscripciones se renuevan automáticamente a menos que se cancelen.\n\nPagos\n\nLos pagos se procesan de forma segura a través de Stripe.\n\nLos usuarios pueden gestionar o cancelar su suscripción a través del portal de gestión de suscripciones.`,
      questionsLeftWarning: 'Te quedan {{count}} preguntas cada 12h. ¡Mejora a Premium para preguntas ilimitadas!',
      achievementsTitle: 'Logros y Premios',
      achievementsUnlocked: 'Logros Desbloqueados',
      viewBadges: 'Ver Insignias',
      achFirstStep: 'Primer Paso',
      achFirstStepDesc: 'Envía tu primer mensaje al asistente.',
      achSeeker: 'Buscador de Conocimiento',
      achSeekerDesc: 'Envía 50 mensajes para profundizar en tu fe.',
      achConsistent: 'Alma Constante',
      achConsistentDesc: 'Mantén una racha de 7 días de actividad espiritual.',
      achPro: 'Miembro Pro',
      achProDesc: 'Únete a Deenly Pro para apoyar la Ummah.',
      achExplorer: 'Explorador del Corán',
      achExplorerDesc: 'Lee 5 Suras completas en la biblioteca.',
      achScholar: 'Estudiante de Hadiz',
      achScholarDesc: 'Lee 20 Hadices para aprender de la Sunnah.',
      achSearcher: 'Investigador Fiel',
      achSearcherDesc: 'Realiza 10 búsquedas en el Corán.',
      unlockProAchievements: 'Desbloquea Logros Pro',
      proAchievementsDesc: 'Acceso a medallas exclusivas y recompensas.'
    },
    'English': {
      welcomeBrother: 'As-salamu alaykum! Welcome back, brother. How can I help you today?',
      welcomeSister: 'As-salamu alaykum! Welcome back, sister. How can I help you today?',
      error: 'I am sorry, an error occurred while processing your request. Please try again.',
      newChat: 'New Conversation',
      placeholder: 'Ask about Islam...',
      searchQuran: 'Search Quran',
      you: 'You',
      history: 'Chat History',
      noHistory: 'No history',
      explore: 'Explore',
      surahLib: 'Surah Library',
      quranSearch: 'Quran Search',
      hadith: 'Hadith',
      prayerTimes: 'Prayer Times',
      clearHistory: 'Clear History',
      confirmClear: 'Are you sure you want to clear all chats?',
      premium: 'Premium',
      proDesc: 'Unlimited access, deep answers, and priority support.',
      upgrade: 'Upgrade Now',
      viewPlan: 'View Plan',
      settings: 'Settings',
      about: 'About Deenly',
      logout: 'Log Out',
      disclaimer: 'Deenly can make mistakes. Consider verifying the information.',
      dailyInspiration: 'Daily Inspiration',
      aboutTitle: 'About Deenly',
      aboutMission: 'Our Mission',
      aboutMissionDesc: 'Deenly was born with the purpose of democratizing access to authentic Islamic knowledge through the use of advanced artificial intelligence. We want to be a bridge between tradition and modern technology.',
      aboutCommitment: 'Commitment to Truth',
      aboutCommitmentDesc: 'Our answers are based on recognized academic sources and the Holy Quran. Although AI can make mistakes, we work continuously to improve the accuracy and fidelity of the information provided.',
      aboutUmmah: 'Made with ❤️ by MCDGROUP DEV for the Ummah',
      aboutRights: '© 2026 MCDGROUP DEV. All rights reserved.',
      aboutContact: 'Contact',
      aboutContactDesc: 'For support or inquiries: MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'Deenly Plans',
      plansSubtitle: 'Choose the plan that best suits your spiritual search',
      plansFree: 'Free',
      plansPro: 'Deenly Pro',
      plansForever: 'forever',
      plansMonthly: 'per month',
      plansPopular: 'Most Popular',
      plansCurrent: 'Current Plan',
      plansUpgrade: 'Upgrade Now',
      plansAlreadyPro: 'You are already Pro',
      plansSecure: 'Secure and Guaranteed Payment',
      plansSecureDesc: 'We use Stripe to process all payments securely. You can cancel your subscription at any time without commitment.',
      plansFeaturesFree: ['15 AI queries every 12h', 'Quran Search', 'Surah Library', 'Limited chat history', 'Standard responses'],
      plansFeaturesPro: [
        'Unlimited queries (Deep Deen)', 
        'Deep and detailed answers with Tafsir', 
        'Spiritual Journal with AI reflections',
        'Personalized Roadmap and Progress',
        'Smart Memories (AI remembers your journey)',
        'Aesthetic customization and exclusive themes',
        '24/7 priority support'
      ],
      spiritualJournal: 'Spiritual Journal',
      spiritualRoadmap: 'Spiritual Roadmap',
      reflectAndGrow: 'Reflect and Grow',
      trackYourGrowth: 'Track Your Growth',
      moodBlessed: 'Blessed',
      moodGrateful: 'Grateful',
      moodPeaceful: 'Peaceful',
      moodReflective: 'Reflective',
      moodStruggling: 'Growing',
      myEntries: 'My Entries',
      newReflection: 'New Reflection',
      howDoYouFeel: 'How do you feel today?',
      yourReflection: 'Your Reflection',
      journalPlaceholder: 'What is on your heart today? Gratitude, struggles, reflections...',
      saveReflection: 'Save Reflection',
      loadingJournal: 'Loading Journal...',
      noEntriesYet: 'No entries yet',
      startJournaling: 'Start your spiritual reflection journey today.',
      fundamentals: 'Islamic Fundamentals',
      fundamentalsDesc: 'Learn the 5 pillars and 6 articles of faith.',
      quranStudies: 'Quranic Studies',
      quranStudiesDesc: 'History of revelation and basic Tafsir.',
      characterAdab: 'Character and Adab',
      characterAdabDesc: 'Manners of the Prophet (SAW) and Islamic ethics.',
      islamicHistory: 'Islamic History',
      islamicHistoryDesc: 'Life of the Prophet (SAW) and the Caliphs.',
      level: 'Level',
      lessons: 'Lessons',
      badges: 'Badges',
      loadingProgress: 'Loading Progress...',
      shahada: 'Shahada',
      salat: 'Salat',
      zakat: 'Zakat',
      sawm: 'Sawm',
      hajj: 'Hajj',
      iman: 'Iman',
      revelation: 'Revelation',
      compilation: 'Compilation',
      tafsir_intro: 'Intro to Tafsir',
      surah_fatiha: 'Surah Al-Fatiha',
      honesty: 'Honesty',
      patience: 'Patience',
      kindness: 'Kindness',
      respect_parents: 'Respect Parents',
      seerah_mecca: 'Seerah (Mecca)',
      seerah_medina: 'Seerah (Medina)',
      rashidun: 'Rashidun Caliphs',
      golden_age: 'Golden Age',
      usageLimitReached: 'You have reached your question limit. We invite you to upgrade to Deenly Pro to continue your spiritual journey without interruptions. BarakAllahu Feek!',
      upgradeToPro: 'Upgrade to Deenly Pro for unlimited queries and deeper answers.',
      hadithLibrary: 'Hadith Library',
      prophetWisdom: 'Wisdom of the Prophet (SAW)',
      collections: 'Collections',
      books: 'Books',
      allBooks: 'All Books',
      searchInCollection: 'Search in this collection...',
      noHadithsFound: 'No hadiths found',
      selectCollection: 'Select a collection',
      exploreProphetTeachings: 'Explore the teachings of Prophet Muhammad (SAW) through the most authentic collections.',
      narrators: 'Narrators',
      topics: 'Topics',
      narratorThreads: 'Narrator Threads',
      topicThreads: 'Topic Threads',
      selectNarrator: 'Select a narrator',
      selectTopic: 'Select a topic',
      backToList: 'Back to list',
      narratedBy: 'Narrated by',
      topic: 'Topic',
      searchHadiths: 'Search hadiths...',
      searchCollections: 'Search collections...',
      searchNarrators: 'Search narrators...',
      searchTopics: 'Search topics...',
      allNarrators: 'All narrators',
      allTopics: 'All topics',
      today: 'Today',
      prayerTitle: 'Prayer Times',
      prayerSubtitle: 'Daily spiritual connection',
      location: 'Location',
      todayTimes: 'Today\'s Times',
      nextPrayer: 'Next Prayer',
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      autoLocation: 'Detect automatically',
      changeLocation: 'Change location',
      confirm: 'Confirm',
      cancel: 'Cancel',
      loading: 'Loading times...',
      startsIn: 'Starts in',
      profile: 'Profile',
      favorites: 'Favorites',
      progress: 'Progress',
      myProfile: 'My Profile',
      premiumMember: 'Premium Member',
      freeAccount: 'Free Account',
      email: 'Email',
      memberSince: 'Member Since',
      noFavoritesYet: 'No favorites yet',
      favoritesCount: 'Favorite Ayahs',
      knowledgeLevel: 'Knowledge Level',
      learningGoals: 'Learning Goals',
      ayahOfTheDay: 'Ayah of the Day',
      surah: 'Surah',
      copy: 'Copy',
      share: 'Share',
      privacyTitle: 'Privacy Policy',
      privacyContent: `Privacy Policy – Deenly\n\nLast updated: 2026\n\nDeenly is an Islamic educational application designed to help users learn about Islam through AI assistance, Quran resources, hadith collections, prayer reminders, and spiritual guidance.\n\nInformation We Collect\n\nWe may collect the following information:\n- Email address and account information when users register\n- User preferences and settings\n- Chat messages sent to the AI assistant\n- Usage data to improve the app experience\n- Subscription information for Premium users\n\nThird-Party Services\n\nDeenly uses trusted third-party services including:\n- Authentication and database services provided by Supabase\n- Payment processing provided by Stripe\n- Artificial intelligence services provided by Google AI Studio\n\nThese services may process limited data necessary for the app to function.\n\nHow We Use Information\n\nUser information is used to:\n- provide the Deenly service\n- personalize the user experience\n- manage subscriptions\n- improve the quality of the application\n- ensure security and prevent misuse\n\nData Protection\n\nWe take appropriate measures to protect user data and ensure secure storage.\n\nUser Rights\n\nUsers may request to:\n- access their data\n- delete their account\n- remove personal information\n\nRequests can be sent to the support contact provided in the application.\n\nReligious Content Disclaimer\n\nDeenly provides educational Islamic information. For important religious decisions, users are encouraged to consult qualified Islamic scholars.`,
      termsTitle: 'Terms of Service',
      termsContent: `Terms of Service – Deenly\n\nBy using the Deenly application you agree to the following terms.\n\nUse of the App\n\nDeenly provides educational Islamic content including Quran resources, hadith collections, AI-based explanations and spiritual guidance.\n\nUsers agree to use the application respectfully and not misuse the service.\n\nUser Accounts\n\nUsers are responsible for maintaining the security of their account credentials.\n\nAcceptable Use\n\nUsers may not:\n- attempt to hack the system\n- misuse the AI assistant\n- use the service for illegal activities\n\nViolation of these rules may result in account suspension.\n\nService Availability\n\nWe strive to keep the service available at all times, but availability cannot be guaranteed.\n\nLimitation of Liability\n\nDeenly provides educational content and cannot be held responsible for personal decisions based on the information provided.`,
      premiumPolicyTitle: 'Premium Subscription',
      premiumPolicyContent: `Premium Subscription – Deenly\n\nDeenly offers a Premium subscription that unlocks additional features.\n\nFree Plan\n\nThe free plan includes:\n- access to core Islamic resources\n- Quran and hadith browsing\n- prayer reminders\n- up to 15 AI questions every 12h\n\nPremium Plan\n\nPremium users receive:\n- unlimited AI questions\n- advanced Islamic explanations\n- priority AI responses\n- future premium features\n\nSubscription Pricing\n\nPremium subscription:\n- 9.99 € per month\n\nSubscriptions renew automatically unless cancelled.\n\nPayments\n\nPayments are processed securely through Stripe.\n\nUsers may manage or cancel their subscription through the subscription management portal.`,
      questionsLeftWarning: 'You have {{count}} questions left every 12h. Upgrade to Premium for unlimited questions!',
      achievementsTitle: 'Achievements & Awards',
      achievementsUnlocked: 'Achievements Unlocked',
      viewBadges: 'View Badges',
      achFirstStep: 'First Step',
      achFirstStepDesc: 'Send your first message to the assistant.',
      achSeeker: 'Seeker of Knowledge',
      achSeekerDesc: 'Send 50 messages to deepen your faith.',
      achConsistent: 'Consistent Soul',
      achConsistentDesc: 'Maintain a 7-day streak of spiritual activity.',
      achPro: 'Pro Member',
      achProDesc: 'Join Deenly Pro to support the Ummah.',
      achExplorer: 'Quran Explorer',
      achExplorerDesc: 'Read 5 complete Surahs in the library.',
      achScholar: 'Hadith Scholar',
      achScholarDesc: 'Read 20 Hadiths to learn from the Sunnah.',
      achSearcher: 'Faithful Searcher',
      achSearcherDesc: 'Perform 10 searches in the Quran.',
      unlockProAchievements: 'Unlock Pro Achievements',
      proAchievementsDesc: 'Access to exclusive badges and rewards.'
    },
    'Français': {
      welcomeBrother: 'As-salamu alaykum ! Bon retour, mon frère. Comment puis-je t\'aider aujourd\'hui ?',
      welcomeSister: 'As-salamu alaykum ! Bon retour, ma sœur. Comment puis-je t\'aider aujourd\'hui ?',
      error: 'Désolé, une erreur s\'est produite lors du traitement de votre demande. Veuillez réessayer.',
      newChat: 'Nouvelle conversation',
      placeholder: 'Posez une question sur l\'Islam...',
      searchQuran: 'Chercher dans le Coran',
      you: 'Vous',
      history: 'Historique des discussions',
      noHistory: 'Aucun historique',
      explore: 'Explorer',
      surahLib: 'Bibliothèque de Sourates',
      quranSearch: 'Recherche Coran',
      hadith: 'Hadith',
      prayerTimes: 'Prières',
      clearHistory: 'Effacer l\'historique',
      confirmClear: 'Êtes-vous sûr de vouloir effacer tous les chats ?',
      premium: 'Premium',
      proDesc: 'Accès illimité, réponses approfondies et support prioritaire.',
      upgrade: 'Améliorer maintenant',
      viewPlan: 'Voir le plan',
      settings: 'Paramètres',
      about: 'À propos de Deenly',
      logout: 'Déconnexion',
      disclaimer: 'Deenly peut faire des erreurs. Pensez à vérifier les informations.',
      dailyInspiration: 'Inspiration Quotidienne',
      aboutTitle: 'À propos de Deenly',
      aboutMission: 'Notre Mission',
      aboutMissionDesc: 'Deenly est né dans le but de démocratiser l\'accès au savoir islamique authentique grâce à l\'utilisation d\'une intelligence artificielle avancée. Nous voulons être un pont entre la tradition et la technologie moderne.',
      aboutCommitment: 'Engagement envers la Vérité',
      aboutCommitmentDesc: 'Nos réponses sont basées sur des sources académiques reconnues et le Saint Coran. Bien que l\'IA puisse faire des erreurs, nous travaillons continuellement à améliorer la précision et la fidélité des informations fournies.',
      aboutUmmah: 'Fait avec ❤️ par MCDGROUP DEV pour la Ummah',
      aboutRights: '© 2026 MCDGROUP DEV. Tous droits réservés.',
      aboutContact: 'Contact',
      aboutContactDesc: 'Pour toute assistance ou demande : MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'Plans Deenly',
      plansSubtitle: 'Choisissez le plan qui convient le mieux à votre recherche spirituelle',
      plansFree: 'Gratuit',
      plansPro: 'Deenly Pro',
      plansForever: 'pour toujours',
      plansMonthly: 'par mois',
      plansPopular: 'Plus Populaire',
      plansCurrent: 'Plan Actuel',
      plansUpgrade: 'Améliorer Maintenant',
      plansAlreadyPro: 'Vous êtes déjà Pro',
      plansSecure: 'Paiement Sécurisé et Garanti',
      plansSecureDesc: 'Nous utilisons Stripe pour traiter tous les paiements en toute sécurité. Vous pouvez annuler votre abonnement à tout moment sans engagement.',
      plansFeaturesFree: ['15 requêtes IA toutes les 12h', 'Recherche dans le Coran', 'Bibliothèque de Sourates', 'Historique des chats limité', 'Réponses standard'],
      plansFeaturesPro: ['Requêtes illimitées', 'Réponses approfondies et détaillées', 'Support prioritaire 24/7', 'Historique des chats illimité', 'Accès anticipé aux nouvelles fonctions', 'Sans publicités ni interruptions'],
      hadithLibrary: 'Bibliothèque de Hadiths',
      prophetWisdom: 'Sagesse du Prophète (SAW)',
      collections: 'Collections',
      books: 'Livres',
      allBooks: 'Tous les livres',
      searchInCollection: 'Rechercher dans cette collection...',
      noHadithsFound: 'Aucun hadith trouvé',
      selectCollection: 'Sélectionnez une collection',
      exploreProphetTeachings: 'Explorez les enseignements du Prophète Muhammad (SAW) à travers les collections les plus authentiques.',
      prayerTitle: 'Horaires de Prière',
      prayerSubtitle: 'Connexion spirituelle quotidienne',
      location: 'Emplacement',
      todayTimes: 'Horaires d\'aujourd\'hui',
      nextPrayer: 'Prochaine Prière',
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      autoLocation: 'Détecter automatiquement',
      changeLocation: 'Changer l\'emplacement',
      confirm: 'Confirmer',
      cancel: 'Annuler',
      loading: 'Chargement des horaires...',
      startsIn: 'Commence dans',
      profile: 'Profil',
      favorites: 'Favoris',
      progress: 'Progrès',
      myProfile: 'Mon Profil',
      premiumMember: 'Membre Premium',
      freeAccount: 'Compte Gratuit',
      email: 'E-mail',
      memberSince: 'Membre depuis',
      noFavoritesYet: 'Pas encore de favoris',
      favoritesCount: 'Ayahs Favorites',
      knowledgeLevel: 'Niveau de Connaissance',
      learningGoals: 'Objectifs d\'Apprentissage',
      ayahOfTheDay: 'Ayah du Jour',
      surah: 'Sourate',
      copy: 'Copier',
      share: 'Partager',
      usageLimitReached: 'Vous avez atteint votre limite de questions. Nous vous invitons à passer à Deenly Pro pour continuer votre voyage spirituel sans interruptions. BarakAllahu Feek!',
      questionsLeftWarning: 'Il vous reste {{count}} questions toutes les 12h. Passez au Premium pour des questions illimitées !',
      achievementsTitle: 'Hauts Faits et Récompenses',
      achievementsUnlocked: 'Débloqués',
      viewBadges: 'Voir les badges et récompenses',
      achFirstStep: 'Premier Pas',
      achFirstStepDesc: 'Envoyez votre premier message à Deenly.',
      achSeeker: 'Chercheur de Savoir',
      achSeekerDesc: 'Lisez 5 Sourates de la bibliothèque.',
      achConsistent: 'Âme Constante',
      achConsistentDesc: 'Maintenez une série de 3 jours.',
      achPro: 'Membre Pro',
      achProDesc: 'Abonnez-vous à Deenly Pro pour un soutien illimité.',
      achExplorer: 'Explorateur du Coran',
      achExplorerDesc: 'Effectuez 10 recherches dans le Coran.',
      achScholar: 'Érudit du Hadith',
      achScholarDesc: 'Lisez 5 Hadiths de la bibliothèque.',
      unlockProAchievements: 'Débloquer les Hauts Faits Pro',
      proAchievementsDesc: 'Accès à des badges et récompenses exclusifs.'
    },
    'العربية': {
      welcomeBrother: 'السلام عليكم! أهلاً بك من جديد يا أخي. كيف يمكنني مساعدتك اليوم؟',
      welcomeSister: 'السلام عليكم! أهلاً بكِ من جديد يا أختي. كيف يمكنني مساعدتك اليوم؟',
      error: 'عذرًا، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
      newChat: 'محادثة جديدة',
      placeholder: 'اسأل عن الإسلام...',
      searchQuran: 'البحث في القرآن',
      you: 'أنت',
      history: 'سجل الدردشة',
      noHistory: 'لا يوجد سجل',
      explore: 'استكشاف',
      surahLib: 'مكتبة السور',
      quranSearch: 'البحث في القرآن',
      hadith: 'الحديث',
      prayerTimes: 'مواقيت الصلاة',
      clearHistory: 'مسح السجل',
      confirmClear: 'هل أنت متأكد أنك تريد مسح جميع المحادثات؟',
      premium: 'بريميوم',
      proDesc: 'وصول غير محدود، إجابات عميقة، ودعم ذو أولوية.',
      upgrade: 'ترقية الآن',
      viewPlan: 'عرض الخطة',
      settings: 'الإعدادات',
      about: 'حول Deenly',
      logout: 'تسجيل الخروج',
      disclaimer: 'قد يرتكب Deenly أخطاء. يرجى التحقق من المعلومات.',
      dailyInspiration: 'إلهام يومي',
      aboutTitle: 'حول Deenly',
      aboutMission: 'مهمتنا',
      aboutMissionDesc: 'ولدت Deenly بهدف إضفاء الطابع الديمقراطي على الوصول إلى المعرفة الإسلامية الأصيلة من خلال استخدام الذكاء الاصطناعي المتقدم. نريد أن نكون جسراً بين التقاليد والتكنولوجيا الحديثة.',
      aboutCommitment: 'الالتزام بالحق',
      aboutCommitmentDesc: 'تستند إجاباتنا إلى مصادر أكاديمية معترف بها والقرآن الكريم. على الرغم من أن الذكاء الاصطناعي يمكن أن يرتكب أخطاء، إلا أننا نعمل باستمرار لتحسين دقة وموثوقية المعلومات المقدمة.',
      aboutUmmah: 'صنع بـ ❤️ بواسطة MCDGROUP DEV للأمة',
      aboutRights: '© 2026 MCDGROUP DEV. جميع الحقوق محفوظة.',
      aboutContact: 'اتصل بنا',
      aboutContactDesc: 'للدعم أو الاستفسارات: MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'خطط Deenly',
      plansSubtitle: 'اختر الخطة التي تناسب بحثك الروحي بشكل أفضل',
      plansFree: 'مجاني',
      plansPro: 'Deenly Pro',
      plansForever: 'للأبد',
      plansMonthly: 'شهرياً',
      plansPopular: 'الأكثر شعبية',
      plansCurrent: 'الخطة الحالية',
      plansUpgrade: 'ترقية الآن',
      plansAlreadyPro: 'أنت مشترك بالفعل في Pro',
      plansSecure: 'دفع آمن ومضمون',
      plansSecureDesc: 'نحن نستخدم Stripe لمعالجة جميع المدفوعات بشكل آمن. يمكنك إلغاء اشتراكك في أي وقت دون التزام.',
      plansFeaturesFree: ['15 استفساراً للذكاء الاصطناعي كل 12 ساعة', 'البحث في القرآن', 'مكتبة السور', 'سجل دردشة محدود', 'استجابات قياسية'],
      plansFeaturesPro: ['استفسارات غير محدودة', 'إجابات عميقة ومفصلة', 'دعم ذو أولوية 24/7', 'سجل دردشة غير محدود', 'وصول مبكر للميزات الجديدة', 'بدون إعلانات أو انقطاعات'],
      hadithLibrary: 'مكتبة الأحاديث',
      prophetWisdom: 'حكمة النبي (صلى الله عليه وسلم)',
      collections: 'المجموعات',
      books: 'الكتب',
      allBooks: 'جميع الكتب',
      searchInCollection: 'البحث في هذه المجموعة...',
      noHadithsFound: 'لم يتم العثور على أحاديث',
      selectCollection: 'اختر مجموعة',
      exploreProphetTeachings: 'استكشف تعاليم النبي محمد (صلى الله عليه وسلم) من خلال المجموعات الأكثر صحة.',
      prayerTitle: 'مواقيت الصلاة',
      prayerSubtitle: 'اتصال روحي يومي',
      location: 'الموقع',
      todayTimes: 'مواقيت اليوم',
      nextPrayer: 'الصلاة القادمة',
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
      autoLocation: 'تحديد تلقائي',
      changeLocation: 'تغيير الموقع',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
      loading: 'جاري تحميل المواقيت...',
      startsIn: 'تبدأ في',
      profile: 'الملف الشخصي',
      favorites: 'المفضلات',
      progress: 'التقدم',
      myProfile: 'ملفي الشخصي',
      premiumMember: 'عضو بريميوم',
      freeAccount: 'حساب مجاني',
      email: 'البريد الإلكتروني',
      memberSince: 'عضو منذ',
      noFavoritesYet: 'لا توجد مفضلات بعد',
      favoritesCount: 'الآيات المفضلة',
      knowledgeLevel: 'مستوى المعرفة',
      learningGoals: 'أهداف التعلم',
      ayahOfTheDay: 'آية اليوم',
      surah: 'سورة',
      copy: 'نسخ',
      share: 'مشاركة',
      usageLimitReached: 'لقد وصلت إلى الحد الأقصى للأسئلة. ندعوك للترقية إلى Deenly Pro لمواصلة رحلتك الروحية دون انقطاع. بارك الله فيك!',
      questionsLeftWarning: 'لديك {{count}} أسئلة متبقية كل 12 ساعة. قم بالترقية إلى بريميوم للحصول على أسئلة غير محدودة!',
      achievementsTitle: 'الإنجازات والجوائز',
      achievementsUnlocked: 'تم إلغاء القفل',
      viewBadges: 'عرض الشارات والمكافآت',
      achFirstStep: 'الخطوة الأولى',
      achFirstStepDesc: 'أرسل رسالتك الأولى إلى Deenly.',
      achSeeker: 'طالب العلم',
      achSeekerDesc: 'اقرأ 5 سور من المكتبة.',
      achConsistent: 'الروح الثابتة',
      achConsistentDesc: 'حافظ على سلسلة نشاط لمدة 3 أيام.',
      achPro: 'عضو برو',
      achProDesc: 'اشترك في Deenly Pro للحصول على دعم غير محدود.',
      achExplorer: 'مستكشف القرآن',
      achExplorerDesc: 'قم بإجراء 10 عمليات بحث في القرآن.',
      achScholar: 'عالم الحديث',
      achScholarDesc: 'اقرأ 5 أحاديث من المكتبة.',
      unlockProAchievements: 'فتح إنجازات برو',
      proAchievementsDesc: 'الوصول إلى شارات ومكافآت حصرية.'
    },
    'Indonesian': {
      welcomeBrother: 'As-salamu alaykum! Selamat datang kembali, saudara. Apa yang bisa saya bantu hari ini?',
      welcomeSister: 'As-salamu alaykum! Selamat datang kembali, saudari. Apa yang bisa saya bantu hari ini?',
      error: 'Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.',
      newChat: 'Percakapan Baru',
      placeholder: 'Tanya tentang Islam...',
      searchQuran: 'Cari Al-Quran',
      you: 'Anda',
      history: 'Riwayat Obrolan',
      noHistory: 'Tidak ada riwayat',
      explore: 'Jelajahi',
      surahLib: 'Perpustakaan Surah',
      quranSearch: 'Pencarian Al-Quran',
      hadith: 'Hadits',
      prayerTimes: 'Waktu Shalat',
      clearHistory: 'Hapus Riwayat',
      confirmClear: 'Apakah Anda yakin ingin menghapus semua obrolan?',
      premium: 'Premium',
      proDesc: 'Akses tidak terbatas, jawaban mendalam, dan dukungan prioritas.',
      upgrade: 'Tingkatkan Sekarang',
      viewPlan: 'Lihat Paket',
      settings: 'Pengaturan',
      about: 'Tentang Deenly',
      logout: 'Keluar',
      disclaimer: 'Deenly dapat membuat kesalahan. Pertimbangkan untuk memverifikasi informasi.',
      dailyInspiration: 'Inspirasi Harian',
      aboutTitle: 'Tentang Deenly',
      aboutMission: 'Misi Kami',
      aboutMissionDesc: 'Deenly lahir dengan tujuan mendemokratisasi akses ke pengetahuan Islam yang otentik melalui penggunaan kecerdasan buatan yang canggih. Kami ingin menjadi jembatan antara tradisi dan teknologi modern.',
      aboutCommitment: 'Komitmen terhadap Kebenaran',
      aboutCommitmentDesc: 'Jawaban kami didasarkan pada sumber akademik yang diakui dan Al-Quran Suci. Meskipun AI dapat membuat kesalahan, kami bekerja terus menerus untuk meningkatkan akurasi dan kesetiaan informasi yang diberikan.',
      aboutUmmah: 'Dibuat dengan ❤️ oleh MCDGROUP DEV untuk Ummah',
      aboutRights: '© 2026 MCDGROUP DEV. Hak cipta dilindungi undang-undang.',
      aboutContact: 'Kontak',
      aboutContactDesc: 'Untuk dukungan atau pertanyaan: MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'Paket Deenly',
      plansSubtitle: 'Pilih paket yang paling sesuai dengan pencarian spiritual Anda',
      plansFree: 'Gratis',
      plansPro: 'Deenly Pro',
      plansForever: 'selamanya',
      plansMonthly: 'per bulan',
      plansPopular: 'Paling Populer',
      plansCurrent: 'Paket Saat Ini',
      plansUpgrade: 'Tingkatkan Sekarang',
      plansAlreadyPro: 'Anda sudah Pro',
      plansSecure: 'Pembayaran Aman dan Terjamin',
      plansSecureDesc: 'Kami menggunakan Stripe untuk memproses semua pembayaran dengan aman. Anda dapat membatalkan langganan kapan saja tanpa komitmen.',
      plansFeaturesFree: ['15 kueri AI setiap 12 jam', 'Pencarian Al-Quran', 'Perpustakaan Surah', 'Riwayat obrolan terbatas', 'Tanggapan standar'],
      plansFeaturesPro: ['Kueri tidak terbatas', 'Jawaban mendalam dan mendetail', 'Dukungan prioritas 24/7', 'Riwayat obrolan tidak terbatas', 'Akses awal ke fitur baru', 'Tanpa iklan atau gangguan'],
      hadithLibrary: 'Perpustakaan Hadits',
      prophetWisdom: 'Kebijaksanaan Nabi (SAW)',
      collections: 'Koleksi',
      books: 'Kitab',
      allBooks: 'Semua Kitab',
      searchInCollection: 'Cari dalam koleksi ini...',
      noHadithsFound: 'Hadits tidak ditemukan',
      selectCollection: 'Pilih koleksi',
      exploreProphetTeachings: 'Jelajahi ajaran Nabi Muhammad (SAW) melalui koleksi yang paling otentik.',
      prayerTitle: 'Waktu Shalat',
      prayerSubtitle: 'Koneksi spiritual harian',
      location: 'Lokasi',
      todayTimes: 'Waktu Hari Ini',
      nextPrayer: 'Shalat Berikutnya',
      fajr: 'Subuh',
      dhuhr: 'Dzuhur',
      asr: 'Ashar',
      maghrib: 'Maghrib',
      isha: 'Isya',
      autoLocation: 'Deteksi otomatis',
      changeLocation: 'Ubah lokasi',
      confirm: 'Konfirmasi',
      cancel: 'Batal',
      loading: 'Memuat waktu...',
      startsIn: 'Mulai dalam',
      profile: 'Profil',
      favorites: 'Favorit',
      progress: 'Kemajuan',
      myProfile: 'Profil Saya',
      premiumMember: 'Anggota Premium',
      freeAccount: 'Akun Gratis',
      email: 'Email',
      memberSince: 'Anggota Sejak',
      noFavoritesYet: 'Belum ada favorit',
      favoritesCount: 'Ayat Favorit',
      knowledgeLevel: 'Tingkat Pengetahuan',
      learningGoals: 'Tujuan Pembelajaran',
      ayahOfTheDay: 'Ayat Hari Ini',
      surah: 'Surah',
      copy: 'Salin',
      share: 'Bagikan',
      usageLimitReached: 'Anda telah mencapai batas pertanyaan Anda. Kami mengundang Anda untuk meningkatkan ke Deenly Pro untuk melanjutkan perjalanan spiritual Anda tanpa gangguan. BarakAllahu Feek!',
      questionsLeftWarning: 'Anda memiliki {{count}} pertanyaan tersisa setiap 12 jam. Tingkatkan ke Premium untuk pertanyaan tanpa batas!',
      achievementsTitle: 'Pencapaian & Penghargaan',
      achievementsUnlocked: 'Terbuka',
      viewBadges: 'Lihat lencana dan hadiah',
      achFirstStep: 'Langkah Pertama',
      achFirstStepDesc: 'Kirim pesan pertama Anda ke Deenly.',
      achSeeker: 'Pencari Ilmu',
      achSeekerDesc: 'Baca 5 Surah dari perpustakaan.',
      achConsistent: 'Jiwa yang Konsisten',
      achConsistentDesc: 'Pertahankan rincian aktivitas selama 3 hari.',
      achPro: 'Anggota Pro',
      achProDesc: 'Berlangganan Deenly Pro untuk dukungan tanpa batas.',
      achExplorer: 'Penjelajah Al-Quran',
      achExplorerDesc: 'Lakukan 10 pencarian di Al-Quran.',
      achScholar: 'Sarjana Hadits',
      achScholarDesc: 'Baca 5 Hadits dari perpustakaan.',
      unlockProAchievements: 'Buka Pencapaian Pro',
      proAchievementsDesc: 'Akses ke lencana dan hadiah eksklusif.'
    },
    'Deutsch': {
      welcomeBrother: 'As-salamu alaykum! Willkommen zurück, Bruder. Wie kann ich dir heute helfen?',
      welcomeSister: 'As-salamu alaykum! Willkommen zurück, Schwester. Wie kann ich dir heute helfen?',
      error: 'Entschuldigung, beim Verarbeiten Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
      newChat: 'Neuer Chat',
      placeholder: 'Frage über den Islam...',
      searchQuran: 'Koran durchsuchen',
      you: 'Du',
      history: 'Chat-Verlauf',
      noHistory: 'Kein Verlauf',
      explore: 'Erkunden',
      surahLib: 'Suren-Bibliothek',
      quranSearch: 'Koran-Suche',
      hadith: 'Hadith',
      prayerTimes: 'Gebetszeiten',
      clearHistory: 'Verlauf löschen',
      confirmClear: 'Sind Sie sicher, dass Sie alle Chats löschen möchten?',
      premium: 'Premium',
      proDesc: 'Unbegrenzter Zugang, tiefgründige Antworten und vorrangiger Support.',
      upgrade: 'Jetzt upgraden',
      viewPlan: 'Paket ansehen',
      settings: 'Einstellungen',
      about: 'Über Deenly',
      logout: 'Abmelden',
      disclaimer: 'Deenly kann Fehler machen. Bitte überprüfen Sie die Informationen.',
      dailyInspiration: 'Tägliche Inspiration',
      aboutTitle: 'Über Deenly',
      aboutMission: 'Unsere Mission',
      aboutMissionDesc: 'Deenly wurde mit dem Ziel geboren, den Zugang zu authentischem islamischem Wissen durch den Einsatz fortschrittlicher künstlicher Intelligenz zu demokratisieren. Wir wollen eine Brücke zwischen Tradition und moderner Technologie schlagen.',
      aboutCommitment: 'Verpflichtung zur Wahrheit',
      aboutCommitmentDesc: 'Unsere Antworten basieren auf anerkannten akademischen Quellen und dem Heiligen Koran. Obwohl KI Fehler machen kann, arbeiten wir kontinuierlich daran, die Genauigkeit und Treue der bereitgestellten Informationen zu verbessern.',
      aboutUmmah: 'Mit ❤️ von MCDGROUP DEV für die Ummah gemacht',
      aboutRights: '© 2026 MCDGROUP DEV. Alle Rechte vorbehalten.',
      aboutContact: 'Kontakt',
      aboutContactDesc: 'Für Support oder Anfragen: MCDGROUP.DEV@GMAIL.COM',
      plansTitle: 'Deenly Pläne',
      plansSubtitle: 'Wählen Sie den Plan, der am besten zu Ihrer spirituellen Suche passt',
      plansFree: 'Kostenlos',
      plansPro: 'Deenly Pro',
      plansForever: 'für immer',
      plansMonthly: 'pro Monat',
      plansPopular: 'Am beliebtesten',
      plansCurrent: 'Aktueller Plan',
      plansUpgrade: 'Jetzt upgraden',
      plansAlreadyPro: 'Du bist bereits Pro',
      plansSecure: 'Sichere und garantierte Zahlung',
      plansSecureDesc: 'Wir verwenden Stripe, um alle Zahlungen sicher abzuwickeln. Sie können Ihr Abonnement jederzeit ohne Verpflichtung kündigen.',
      plansFeaturesFree: ['15 KI-Abfragen alle 12 Stunden', 'Koran-Suche', 'Suren-Bibliothek', 'Begrenzter Chat-Verlauf', 'Standard-Antworten'],
      plansFeaturesPro: ['Unbegrenzte Abfragen', 'Tiefe und detaillierte Antworten', '24/7 Prioritäts-Support', 'Unbegrenzter Chat-Verlauf', 'Frühzeitiger Zugriff auf neue Funktionen', 'Keine Werbung oder Unterbrechungen'],
      hadithLibrary: 'Hadith-Bibliothek',
      prophetWisdom: 'Weisheit des Propheten (SAW)',
      collections: 'Sammlungen',
      books: 'Bücher',
      allBooks: 'Alle Bücher',
      searchInCollection: 'In dieser Sammlung suchen...',
      noHadithsFound: 'Keine Hadithe gefunden',
      selectCollection: 'Wählen Sie eine Sammlung',
      exploreProphetTeachings: 'Erkunden Sie die Lehren des Propheten Muhammad (SAW) durch die authentischsten Sammlungen.',
      prayerTitle: 'Gebetszeiten',
      prayerSubtitle: 'Tägliche spirituelle Verbindung',
      location: 'Standort',
      todayTimes: 'Heutige Zeiten',
      nextPrayer: 'Nächstes Gebet',
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      autoLocation: 'Automatisch erkennen',
      changeLocation: 'Standort ändern',
      confirm: 'Bestätigen',
      cancel: 'Abbrechen',
      loading: 'Zeiten werden geladen...',
      startsIn: 'Beginnt in',
      profile: 'Profil',
      favorites: 'Favoriten',
      progress: 'Fortschritt',
      myProfile: 'Mein Profil',
      premiumMember: 'Premium-Mitglied',
      freeAccount: 'Kostenloses Konto',
      email: 'E-Mail',
      memberSince: 'Mitglied seit',
      noFavoritesYet: 'Noch keine Favoriten',
      favoritesCount: 'Lieblings-Ayahs',
      knowledgeLevel: 'Wissensstand',
      learningGoals: 'Lernziele',
      ayahOfTheDay: 'Ayah des Tages',
      surah: 'Sure',
      copy: 'Kopieren',
      share: 'Teilen',
      usageLimitReached: 'Sie haben Ihr Fragenlimit erreicht. Wir laden Sie ein, auf Deenly Pro umzusteigen, um Ihre spirituelle Reise ohne Unterbrechungen fortzusetzen. BarakAllahu Feek!',
      questionsLeftWarning: 'Sie haben alle 12 Stunden noch {{count}} Fragen übrig. Upgraden Sie auf Premium für unbegrenzte Fragen!',
      achievementsTitle: 'Erfolge & Auszeichnungen',
      achievementsUnlocked: 'Freigeschaltet',
      viewBadges: 'Abzeichen und Belohnungen ansehen',
      achFirstStep: 'Erster Schritt',
      achFirstStepDesc: 'Senden Sie Ihre erste Nachricht an Deenly.',
      achSeeker: 'Suchender nach Wissen',
      achSeekerDesc: 'Lesen Sie 5 Suren aus der Bibliothek.',
      achConsistent: 'Beständige Seele',
      achConsistentDesc: 'Halten Sie eine 3-Tage-Serie aufrecht.',
      achPro: 'Pro-Mitglied',
      achProDesc: 'Abonnieren Sie Deenly Pro für unbegrenzte Unterstützung.',
      achExplorer: 'Koran-Entdecker',
      achExplorerDesc: 'Führen Sie 10 Suchen im Koran durch.',
      achScholar: 'Hadith-Gelehrter',
      achScholarDesc: 'Lesen Sie 5 Hadithe aus der Bibliothek.',
      unlockProAchievements: 'Pro-Erfolge freischalten',
      proAchievementsDesc: 'Zugriff auf exklusive Abzeichen und Belohnungen.'
    }
  };

  const t = translations[language] || translations['Español'];

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadSessions = async (preserveActive = false) => {
    try {
      const chats = await chatService.getChats();
      if (chats && chats.length > 0) {
        const formattedSessions: ChatSession[] = await Promise.all(chats.map(async (chat) => {
          try {
            const dbMessages = await chatService.getMessages(chat.id);
            return {
              id: chat.id,
              title: chat.title,
              lastUpdated: new Date(chat.created_at),
              messages: dbMessages.map(m => ({
                id: m.id,
                role: m.role,
                text: m.content,
                timestamp: new Date(m.created_at)
              }))
            };
          } catch (e) {
            console.error(`Error loading messages for chat ${chat.id}:`, e);
            return {
              id: chat.id,
              title: chat.title,
              lastUpdated: new Date(chat.created_at),
              messages: []
            };
          }
        }));
        
        setSessions(formattedSessions);
        
        // If we want to preserve the active session, check if it still exists
        if (preserveActive && currentSessionId) {
          const current = formattedSessions.find(s => s.id === currentSessionId);
          if (current) {
            setMessages(current.messages);
            return;
          }
        }

        // Default to the most recent session
        setCurrentSessionId(formattedSessions[0].id);
        setMessages(formattedSessions[0].messages);
      } else {
        // Check if there are local sessions to migrate or just start fresh
        const localSessions = localStorage.getItem('deenly_local_sessions');
        if (localSessions) {
          try {
            const parsed = JSON.parse(localSessions).map((s: any) => ({
              ...s,
              lastUpdated: new Date(s.lastUpdated),
              messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
            }));
            
            if (parsed.length > 0) {
              if (session && isSupabaseConfigured) {
                // Migrate local sessions to Supabase
                showToast('Sincronizando historial local...', 'success');
                try {
                  for (const s of parsed) {
                    // Create the chat in Supabase
                    const newChat = await chatService.createChat(s.title);
                    // Add all messages to the new chat
                    for (const m of s.messages) {
                      await chatService.addMessage(newChat.id, m.role, m.text);
                    }
                  }
                  // Clear local sessions after successful migration
                  localStorage.removeItem('deenly_local_sessions');
                  // Reload from Supabase to get the real IDs and associated data
                  await loadSessions(preserveActive);
                  return;
                } catch (migrateError: any) {
                  console.error('Error migrating sessions:', migrateError);
                  showToast('Error al sincronizar historial: ' + migrateError.message);
                }
              }
              
              setSessions(parsed);
              setCurrentSessionId(parsed[0].id);
              setMessages(parsed[0].messages);
              return;
            }
          } catch (e) {
            console.error('Error parsing local sessions:', e);
            localStorage.removeItem('deenly_local_sessions');
          }
        }
        await createInitialChat();
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      showToast(error.message || 'Error al cargar las conversaciones');
      
      // ONLY fallback to local storage if NOT logged in
      if (!session) {
        const localSessions = localStorage.getItem('deenly_local_sessions');
        if (localSessions) {
          const parsed = JSON.parse(localSessions).map((s: any) => ({
            ...s,
            lastUpdated: new Date(s.lastUpdated),
            messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
          }));
          setSessions(parsed);
          if (parsed.length > 0) {
            setCurrentSessionId(parsed[0].id);
            setMessages(parsed[0].messages);
          }
        } else {
          startInitialChat();
        }
      } else {
        // If logged in and cloud fetch fails, show empty state for safety
        setSessions([]);
        setMessages([]);
        setCurrentSessionId(null);
      }
    }
  };

  // Save sessions to localStorage as backup ONLY if not logged in
  useEffect(() => {
    if (sessions.length > 0 && !session) {
      localStorage.setItem('deenly_local_sessions', JSON.stringify(sessions));
    }
  }, [sessions, session]);

  const getWelcomeMessage = () => {
    const gender = session?.user?.user_metadata?.settings?.gender || session?.user?.user_metadata?.onboarding?.gender || 'Hermano';
    const hour = new Date().getHours();
    const isSister = gender === 'Hermana';
    
    // Determine time of day
    let timeOfDay: 'morning' | 'afternoon' | 'night';
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 20) {
      timeOfDay = 'afternoon';
    } else {
      timeOfDay = 'night';
    }

    // Return specific greeting if in Spanish, otherwise fallback to standard welcome
    if (language === 'Español') {
      if (timeOfDay === 'morning') return isSister ? t.goodMorningSister : t.goodMorningBrother;
      if (timeOfDay === 'afternoon') return isSister ? t.goodAfternoonSister : t.goodAfternoonBrother;
      return isSister ? t.goodNightSister : t.goodNightBrother;
    }

    return isSister ? t.welcomeSister : t.welcomeBrother;
  };

  const createInitialChat = async () => {
    try {
      const newChat = await chatService.createChat(t.newChat);
      const initialMessageText = getWelcomeMessage();
      const dbMsg = await chatService.addMessage(newChat.id, 'assistant', initialMessageText);
      
      const initialMessage: Message = {
        id: dbMsg.id,
        role: 'assistant',
        text: initialMessageText,
        timestamp: new Date(dbMsg.created_at)
      };

      const initialSession: ChatSession = {
        id: newChat.id,
        title: newChat.title,
        messages: [initialMessage],
        lastUpdated: new Date(newChat.created_at)
      };

      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
      setMessages([initialMessage]);
    } catch (error: any) {
      console.error('Error creating initial chat:', error);
      showToast(error.message || 'Error al iniciar la conversación');
      startInitialChat();
    }
  };

  const startInitialChat = () => {
    const initialMessage: Message = {
      id: '1',
      role: 'assistant',
      text: getWelcomeMessage(),
      timestamp: new Date()
    };
    const initialSession: ChatSession = {
      id: Date.now().toString(),
      title: t.newChat,
      messages: [initialMessage],
      lastUpdated: new Date()
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
    setMessages([initialMessage]);
  };

  const createNewChat = async () => {
    try {
      const newChat = await chatService.createChat(t.newChat);
      const initialMessageText = getWelcomeMessage();
      const dbMsg = await chatService.addMessage(newChat.id, 'assistant', initialMessageText);

      const initialMessage: Message = {
        id: dbMsg.id,
        role: 'assistant',
        text: initialMessageText,
        timestamp: new Date(dbMsg.created_at)
      };

      const newSession: ChatSession = {
        id: newChat.id,
        title: newChat.title,
        messages: [initialMessage],
        lastUpdated: new Date(newChat.created_at)
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([initialMessage]);
      setIsSidebarOpen(false);
    } catch (error: any) {
      console.error('Error creating new chat:', error);
      showToast(error.message || 'Error al crear nueva conversación');
    }
  };

  const switchChat = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
    setIsSidebarOpen(false);
  };

  const deleteChat = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setConfirmAction({
      message: t.confirmClear,
      onConfirm: async () => {
        try {
          await chatService.deleteChat(sessionId);
          const newSessions = sessions.filter(s => s.id !== sessionId);
          setSessions(newSessions);
          if (currentSessionId === sessionId) {
            if (newSessions.length > 0) {
              switchChat(newSessions[0].id);
            } else {
              await createInitialChat();
            }
          }
          showToast('Conversación eliminada correctamente', 'success');
        } catch (error: any) {
          console.error('Error deleting chat:', error);
          showToast(error.message || 'Error al eliminar la conversación');
        }
        setConfirmAction(null);
      }
    });
  };

  const clearAllChats = async () => {
    setConfirmAction({
      message: t.confirmClear,
      onConfirm: async () => {
        try {
          await chatService.clearAllChats();
          setSessions([]);
          setMessages([]);
          setCurrentSessionId(null);
          await createInitialChat();
          showToast('Historial limpiado correctamente', 'success');
        } catch (error: any) {
          console.error('Error clearing all chats:', error);
          showToast(error.message || 'Error al limpiar el historial');
        }
        setConfirmAction(null);
      }
    });
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      console.error('Error deleting message:', error);
      showToast(error.message || 'Error al eliminar el mensaje');
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditValue(message.text);
  };

  const saveEdit = async (messageId: string) => {
    try {
      await chatService.updateMessage(messageId, editValue);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: editValue } : m));
      setEditingMessageId(null);
    } catch (error: any) {
      console.error('Error updating message:', error);
      showToast(error.message || 'Error al actualizar el mensaje');
    }
  };

  useEffect(() => {
    if (isAtBottom || messages[messages.length - 1]?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const activeSessionId = currentSessionId;
    const tempId = Date.now().toString();
    // Check and increment usage
    if (!isPremium && session?.user?.id) {
      // Pre-check local state
      if (usageCount >= usageLimit) {
        openModal('plans');
        showToast(t.usageLimitReached, 'error');
        return;
      }

      try {
        const usageResponse = await fetch('/api/usage/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        });
        
        if (usageResponse.status === 403) {
          openModal('plans');
          showToast(t.usageLimitReached, 'error');
          // Update local count if server says it's higher
          const usageData = await usageResponse.json();
          if (usageData.count !== undefined) setUsageCount(usageData.count);
          return;
        }
        
        const usageData = await usageResponse.json();
        if (usageData.count !== undefined) {
          setUsageCount(usageData.count);
          const remaining = usageLimit - usageData.count;
          if (remaining > 0 && remaining <= 3) {
            showToast(t.questionsLeftWarning.replace('{{count}}', remaining.toString()), 'success');
          }
        }
      } catch (error) {
        console.error('Error incrementing usage:', error);
      }
    }

    const userMessage: Message = {
      id: tempId,
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update session title if it's the first user message
    let updatedTitle = sessions.find(s => s.id === activeSessionId)?.title || 'Nueva conversación';
    if (messages.length <= 1) {
      updatedTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '');
      await chatService.updateChatTitle(activeSessionId, updatedTitle);
    }

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: updatedMessages, title: updatedTitle, lastUpdated: new Date() } 
        : s
    ));

    setInput('');
    setIsLoading(true);

    // Update achievement stats
    updateStats('messagesSent');

    try {
      // Save user message to DB
      const dbUserMsg = await chatService.addMessage(activeSessionId, 'user', input);
      if (!dbUserMsg) throw new Error("No se pudo guardar el mensaje del usuario en la base de datos.");
      
      const history: GeminiChatMessage[] = updatedMessages.slice(-6).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Fetch memories if premium
      let userMemories: string[] = [];
      if (isPremium && session?.user?.id) {
        const { data: memData } = await supabase
          .from('ai_memories')
          .select('memory_text')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        userMemories = memData?.map(m => m.memory_text) || [];
      }
      
      const response = await getMuftiResponse(input, history, session?.user?.user_metadata?.onboarding, isPremium, userMemories);
      
      // Save model response to DB
      const dbModelMsg = await chatService.addMessage(activeSessionId, 'assistant', response);
      if (!dbModelMsg) throw new Error("No se pudo guardar la respuesta en la base de datos.");

      const modelMessage: Message = {
        id: dbModelMsg.id,
        role: 'assistant',
        text: response,
        timestamp: new Date(dbModelMsg.created_at)
      };
      
      const finalMessages = [...updatedMessages.filter(m => m.id !== tempId), { ...userMessage, id: dbUserMsg.id }, modelMessage];
      
      // Only update current messages if we are still on the same session
      setCurrentSessionId(prev => {
        if (prev === activeSessionId) {
          setMessages(finalMessages);
        }
        return prev;
      });

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: finalMessages, lastUpdated: new Date() } 
          : s
      ));
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: error.message || t.error,
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      
      setCurrentSessionId(prev => {
        if (prev === activeSessionId) {
          setMessages(finalMessages);
        }
        return prev;
      });

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: finalMessages, lastUpdated: new Date() } 
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!session?.user) return;
    
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM;
    
    if (!priceId) {
      showToast(language === 'Español' 
        ? 'Error: ID de precio de Stripe no configurado. Por favor, añada VITE_STRIPE_PRICE_ID_PREMIUM en los Ajustes.' 
        : 'Error: Stripe Price ID not configured. Please add VITE_STRIPE_PRICE_ID_PREMIUM in Settings.', 'error');
      return;
    }
    
    try {
      console.log('Initiating checkout session creation...');
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
          priceId: priceId,
        }),
      });

      console.log('Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server returned non-JSON response (Status: ${response.status})`);
      }

      if (!response.ok) {
        console.error('Server error data:', data);
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      const { url } = data;
      console.log('Checkout URL received:', url);

      if (url) {
        const win = window.open(url, '_blank');
        if (!win) {
          showToast(language === 'Español' 
            ? 'El navegador bloqueó la ventana de pago. Por favor, permite las ventanas emergentes.' 
            : 'Browser blocked the payment window. Please allow popups.', 'error');
        }
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error: any) {
      console.error('Detailed handleUpgrade error:', error);
      const msg = error.message || 'Unknown error';
      showToast(`${language === 'Español' ? 'Error al iniciar el proceso de pago' : 'Error starting payment process'}: ${msg}`, 'error');
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.user) return;
    
    const customerId = session.user.user_metadata?.stripe_customer_id;
    if (!customerId) {
      showToast(language === 'Español' ? 'No se encontró información de suscripción.' : 'No subscription information found.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || (language === 'Español' ? 'Error al abrir el portal de gestión.' : 'Error opening management portal.'), 'error');
    }
  };

  if (!session) {
    return <Auth darkMode={darkMode} />;
  }

  if (showOnboarding) {
    return <Onboarding language={language} darkMode={darkMode} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-deenly-dark-bg text-deenly-dark-text' : 'bg-deenly-cream text-deenly-green'
    } ${
      fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'
    }`}>
      {showSplash && <Splash />}

      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${darkMode ? 'bg-deenly-dark-surface/90 border-deenly-gold/10' : 'bg-white/90 border-deenly-gold/10'} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
            >
              <Menu size={24} />
            </button>
            <Logo showText size={28} variant={darkMode ? 'gold' : 'default'} className="sm:scale-110" />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => openModal('search')}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-deenly-gold/10 text-deenly-gold rounded-full hover:bg-deenly-gold/20 transition-colors group"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">{t.searchQuran}</span>
            </button>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => openModal('settings')}
              className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#141414]"></span>
            </button>

            <button 
              onClick={() => openModal('profile')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold border border-deenly-gold/20 hover:bg-deenly-gold/20 transition-colors"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-[calc(100vh-64px)]">
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-4 scroll-smooth"
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${
                  cardStyle === 'compact' ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-[95%] sm:max-w-[85%]'
                } p-4 rounded-2xl shadow-sm relative group premium-card ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-deenly-gold to-deenly-gold/80 text-white rounded-tr-none' 
                    : darkMode 
                      ? 'bg-deenly-dark-surface/50 backdrop-blur-sm border border-deenly-gold/20 rounded-tl-none' 
                      : 'bg-white/80 backdrop-blur-sm border border-deenly-gold/10 rounded-tl-none'
                }`}>
                  <div className="flex items-center justify-between mb-2 opacity-60">
                    <div className="flex items-center gap-2">
                      {message.role === 'assistant' ? <Sparkles size={14} className="text-deenly-gold" /> : <User size={14} />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {message.role === 'assistant' ? 'Deenly' : t.you}
                      </span>
                    </div>
                  </div>
                  <div className="markdown-body prose prose-sm max-w-none dark:prose-invert">
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                            darkMode ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white' : 'bg-white border-deenly-gold/10 text-deenly-green'
                          }`}
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingMessageId(null)}
                            className="p-1.5 rounded-lg hover:bg-black/5 text-[10px] font-bold uppercase tracking-widest"
                          >
                            {t.cancel}
                          </button>
                          <button 
                            onClick={() => saveEdit(message.id)}
                            className="p-1.5 rounded-lg bg-deenly-gold text-white text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {message.role === 'user' && (
                        <button 
                          onClick={() => startEditing(message)}
                          className={`p-1 rounded-md hover:bg-deenly-gold/10 ${message.role === 'user' ? 'text-white/60 hover:text-white' : 'text-deenly-gold/60 hover:text-deenly-gold'}`}
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteMessage(message.id)}
                        className={`p-1 rounded-md hover:bg-deenly-gold/10 ${message.role === 'user' ? 'text-white/60 hover:text-white' : 'text-deenly-gold/60 hover:text-deenly-gold'}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-[8px] opacity-40 uppercase tracking-tighter">
                        {new Date(message.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className={`p-4 rounded-2xl rounded-tl-none ${darkMode ? 'bg-deenly-dark-surface/50 border-deenly-gold/20' : 'bg-white/80 border-deenly-gold/10'} border backdrop-blur-sm shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.2, 
                          delay: i * 0.2 
                        }}
                        className="w-1.5 h-1.5 rounded-full bg-deenly-gold"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold/60 animate-pulse">
                    {language === 'Español' ? 'Deenly está pensando...' : 'Deenly is thinking...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className={`absolute bottom-24 right-6 p-3 rounded-full shadow-lg z-30 transition-colors ${
                darkMode ? 'bg-deenly-dark-surface text-deenly-gold border border-deenly-gold/20' : 'bg-white text-deenly-gold border border-deenly-gold/10'
              }`}
            >
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className={`p-4 pb-6 sm:pb-8 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-deenly-cream'} border-t border-deenly-gold/5`}>
          <div className="max-w-3xl mx-auto mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-2">
            {!isPremium ? (
              (usageLimit - usageCount <= 3) && (
                <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                    usageLimit - usageCount <= 3 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-deenly-gold/10 border-deenly-gold/20'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      usageCount >= usageLimit 
                        ? 'bg-red-500' 
                        : 'bg-orange-500 animate-pulse'
                    }`}></div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${
                      usageLimit - usageCount <= 3 ? 'text-red-500' : 'text-deenly-gold'
                    }`}>
                      {language === 'Español' 
                        ? `${Math.max(0, usageLimit - usageCount)} preguntas cada 12h` 
                        : `${Math.max(0, usageLimit - usageCount)} questions every 12h`}
                    </span>
                  </div>
                  <button 
                    onClick={() => openModal('plans')}
                    className={`text-[9px] font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                      usageLimit - usageCount <= 3 
                        ? 'bg-red-500 text-white border-red-500' 
                        : 'bg-deenly-gold/10 text-deenly-gold border-deenly-gold/20'
                    }`}
                  >
                    <Zap size={10} className="fill-current" />
                    {language === 'Español' ? 'Mejorar a Premium' : 'Upgrade to Premium'}
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-deenly-gold rounded-full shadow-md">
                <Zap size={10} className="text-white fill-white" />
                <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                  Premium Active
                </span>
              </div>
            )}
          </div>
          <div className={`max-w-3xl mx-auto relative group transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.placeholder}
              className={`w-full py-4 pl-6 pr-14 rounded-3xl text-sm border border-deenly-gold/20 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 shadow-lg resize-none transition-colors ${
                darkMode ? 'bg-deenly-dark-surface text-deenly-dark-text' : 'bg-white text-deenly-green'
              }`}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-deenly-gold text-white rounded-2xl hover:bg-deenly-gold/90 transition-colors disabled:opacity-30 shadow-md"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-center text-[7px] sm:text-[8px] mt-3 opacity-30 uppercase tracking-[0.2em] font-medium">
            {!isPremium && (usageLimit - usageCount <= 3) && (
              <span className="block mb-1">
                {language === 'Español' 
                  ? 'Plan Gratuito: 15 preguntas cada 12h' 
                  : 'Free Plan: 15 questions every 12h'}
              </span>
            )}
            {t.disclaimer}
          </p>
        </div>
      </main>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <div 
            className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl flex flex-col ${darkMode ? 'bg-deenly-dark-surface' : 'bg-deenly-cream'}`}
          >
            <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
              <Logo showText size={28} variant={darkMode ? 'gold' : 'default'} />
              <button onClick={() => setIsSidebarOpen(false)} className="text-deenly-gold">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button 
                onClick={createNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 bg-deenly-gold text-white rounded-xl hover:bg-deenly-gold/90 transition-colors shadow-md mb-6"
              >
                <Plus size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">{t.newChat}</span>
              </button>

              <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.history}</div>
              
              <div className="space-y-1 mb-8">
                {sessions.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => switchChat(s.id)}
                    className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      currentSessionId === s.id 
                        ? 'bg-deenly-gold/20 text-deenly-gold' 
                        : 'hover:bg-deenly-gold/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="text-xs font-medium truncate">{s.title}</span>
                    </div>
                    <button 
                      onClick={(e) => deleteChat(e, s.id)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-1 hover:bg-deenly-gold/10 rounded-md transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="px-4 py-8 text-center opacity-30">
                    <History size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-widest">{t.noHistory}</p>
                  </div>
                )}
              </div>

                <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.explore}</div>
                
                <div className="space-y-1">
                  <button 
                    onClick={() => openModal('profile')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <User size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.profile}</span>
                  </button>

                  <button 
                    onClick={() => openModal('settings')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Sparkles size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.dailyInspiration}</span>
                  </button>

                  <button 
                    onClick={() => openModal('surah')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <BookOpen size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.surahLib}</span>
                  </button>

                  <button 
                    onClick={() => openModal('search')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Search size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.quranSearch}</span>
                  </button>

                  <button 
                    onClick={() => openModal('hadith')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Book size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.hadith}</span>
                  </button>

                  <button 
                    onClick={() => openModal('prayer')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Clock size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.prayerTimes}</span>
                  </button>

                  <button 
                    onClick={() => openModal('journal')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <MessageSquare size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.journal || 'Diario'}</span>
                  </button>

                  <button 
                    onClick={() => openModal('progress')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <TrendingUp size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.progress}</span>
                  </button>

                  <button 
                    onClick={() => openModal('achievements')}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Trophy size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.achievementsTitle}</span>
                  </button>

                  {showInstallButton && (
                    <button 
                      onClick={handleInstallClick}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors bg-deenly-gold/10 text-deenly-gold border border-deenly-gold/20 animate-pulse`}
                    >
                      <Download size={18} />
                      <span className="text-sm font-bold">{language === 'Español' ? 'Instalar Deenly' : 'Install Deenly'}</span>
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      clearAllChats();
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-red-500 hover:bg-red-500/10`}
                  >
                    <Trash2 size={18} />
                    <span className="text-sm font-medium">{t.clearHistory}</span>
                  </button>
                </div>

                <div className="pt-6">
                  <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.premium}</div>
                  
                  {isPremium && (
                    <div className="space-y-1 mb-4">
                      <button 
                        onClick={() => {
                          openModal('journal');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                      >
                        <Heart size={18} className="text-deenly-gold" />
                        <span className="text-sm font-medium">{t.spiritualJournal || 'Diario Espiritual'}</span>
                      </button>

                      <button 
                        onClick={() => {
                          openModal('progress');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                      >
                        <TrendingUp size={18} className="text-deenly-gold" />
                        <span className="text-sm font-medium">{t.spiritualRoadmap || 'Hoja de Ruta'}</span>
                      </button>
                    </div>
                  )}

                  <div className={`p-4 rounded-3xl border border-deenly-gold/20 relative overflow-hidden ${darkMode ? 'bg-deenly-gold/5' : 'bg-deenly-gold/5'}`}>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-deenly-gold fill-deenly-gold" />
                        <span className="text-xs font-bold uppercase tracking-wider text-deenly-gold">Deenly Pro</span>
                      </div>
                      <p className="text-[10px] opacity-60 mb-4">{t.proDesc}</p>
                <button 
                  onClick={() => {
                    openModal('plans');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full py-2 bg-deenly-gold text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-gold/90 transition-colors"
                >
                  {isPremium ? t.viewPlan : t.upgrade}
                </button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                      <Logo size={80} variant="gold" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-deenly-gold/10 space-y-4">
                <button 
                  onClick={() => openModal('plans')}
                  className="w-full flex items-center gap-3 text-deenly-gold hover:opacity-80 transition-opacity"
                >
                  <Zap size={18} />
                  <span className="text-sm font-medium">{t.plansTitle || 'Planes'}</span>
                </button>
                <button 
                  onClick={() => openModal('settings')}
                  className="w-full flex items-center gap-3 text-deenly-gold hover:opacity-80 transition-opacity"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium">{t.settings}</span>
                </button>
                <button 
                  onClick={() => openModal('about')}
                  className="w-full flex items-center gap-3 text-deenly-gold hover:opacity-80 transition-opacity"
                >
                  <Info size={18} />
                  <span className="text-sm font-medium">{t.about}</span>
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center gap-3 text-red-500 hover:opacity-80 transition-opacity pt-4 border-t border-deenly-gold/10"
                >
                  <X size={18} />
                  <span className="text-sm font-medium">{t.logout}</span>
                </button>
              </div>
            </div>
          </>
        )}

      {/* Quran Search Modal */}
      <QuranSearchModal 
        isOpen={activeModal === 'search'} 
        onClose={closeModal} 
        darkMode={darkMode}
        isPremium={isPremium}
        session={session}
        onAction={() => updateStats('quranSearches')}
      />

      {/* Surah Library Modal */}
      <SurahLibrary
        isOpen={activeModal === 'surah'}
        onClose={closeModal}
        darkMode={darkMode}
        session={session}
        language={language}
        showToast={showToast}
        onAction={() => updateStats('surahsRead')}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={closeModal}
        onNavigate={openModal}
        session={session}
        darkMode={darkMode}
        isPremium={isPremium}
        t={t}
        language={language}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={activeModal === 'settings'}
        onClose={closeModal}
        onNavigate={openModal}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
        theme={theme}
        setTheme={setTheme}
        cardStyle={cardStyle}
        setCardStyle={setCardStyle}
        isPremium={isPremium}
        session={session}
        onOpenLegal={openLegalModal}
        showToast={showToast}
      />

      <HadithModal
        isOpen={activeModal === 'hadith'}
        onClose={closeModal}
        darkMode={darkMode}
        t={t}
        onAction={() => updateStats('hadithsRead')}
      />

      <AchievementsModal
        isOpen={activeModal === 'achievements'}
        onClose={closeModal}
        darkMode={darkMode}
        isPremium={isPremium}
        stats={achievementsStats}
        t={t}
        onUpgrade={() => openModal('plans')}
      />

      <PrayerTimesModal
        isOpen={activeModal === 'prayer'}
        onClose={closeModal}
        darkMode={darkMode}
        language={language}
        t={t}
        showToast={showToast}
      />

      <JournalModal
        isOpen={activeModal === 'journal'}
        onClose={closeModal}
        darkMode={darkMode}
        userId={session?.user?.id || ''}
        t={t}
      />

      <ProgressModal
        isOpen={activeModal === 'progress'}
        onClose={closeModal}
        darkMode={darkMode}
        userId={session?.user?.id || ''}
        isPremium={isPremium}
        t={t}
      />

      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={closeModal}
        onOpenLegal={openLegalModal}
        darkMode={darkMode}
        t={t}
      />

      <LegalModal
        isOpen={activeModal === 'legal'}
        onClose={closeModal}
        type={legalModalType}
        darkMode={darkMode}
        t={t}
      />

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-sm p-8 rounded-[32px] shadow-2xl ${
                darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-white border border-deenly-gold/10'
              }`}
            >
              <h3 className="text-lg font-bold mb-4 text-center">{confirmAction.message}</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                    darkMode ? 'border-deenly-gold/20 hover:bg-white/5' : 'border-deenly-gold/10 hover:bg-black/5'
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] ${
              toast.type === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-deenly-gold text-white'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {toast.type === 'error' ? <X size={14} /> : <Check size={14} />}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plans Modal */}
      <PlansModal
        isOpen={activeModal === 'plans'}
        onClose={closeModal}
        darkMode={darkMode}
        isPremium={isPremium}
        onUpgrade={handleUpgrade}
        onManage={handleManageSubscription}
        showToast={showToast}
        t={t}
      />
    </div>
  );
}
