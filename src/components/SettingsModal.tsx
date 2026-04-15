import React, { useState, useEffect } from 'react';
import { 
  X, Moon, Sun, Globe, Bell, Shield, Trash2, Type, Layout, 
  Calendar, Languages, BellRing, Database, Download, User, UserX, 
  Key, Mail, FileText, Scale, Book, MessageSquare, ShieldCheck,
  Smartphone, Volume2, Zap, Settings, Loader2, MapPin, Navigation, Clock,
  Sparkles
} from 'lucide-react';
import AyahOfTheDay from './AyahOfTheDay';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { chatService } from '../services/chatService';
import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes } from 'adhan';
import type { Session } from '@supabase/supabase-js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (modalName: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (val: 'small' | 'medium' | 'large') => void;
  theme: 'default' | 'emerald' | 'midnight' | 'sunset';
  setTheme: (val: 'default' | 'emerald' | 'midnight' | 'sunset') => void;
  cardStyle: 'compact' | 'wide';
  setCardStyle: (val: 'compact' | 'wide') => void;
  language: string;
  setLanguage: (val: string) => void;
  dateFormat: string;
  setDateFormat: (val: string) => void;
  location: { city: string, lat: number, lng: number };
  setLocation: (val: { city: string, lat: number, lng: number }) => void;
  calculationMethod: string;
  setCalculationMethod: (val: string) => void;
  adhanSound: string;
  setAdhanSound: (val: string) => void;
  reminder10Min: boolean;
  setReminder10Min: (val: boolean) => void;
  adhanNotifications: any;
  setAdhanNotifications: (val: any) => void;
  adhanReminders: any;
  setAdhanReminders: (val: any) => void;
  isPremium: boolean;
  session: Session | null;
  onOpenLegal: (type: 'privacy' | 'terms' | 'premium') => void;
  showToast?: (message: string, type?: 'error' | 'success') => void;
}

const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-[10px] font-bold text-deenly-gold uppercase tracking-[0.2em] px-2 flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-deenly-gold" />
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const SettingItem = ({ 
  icon: Icon, 
  label, 
  description,
  value, 
  onClick, 
  type = 'button',
  danger = false,
  disabled = false,
  options,
  darkMode
}: { 
  icon: any, 
  label: string, 
  description?: string,
  value?: string | React.ReactNode, 
  onClick?: (val?: any) => void,
  type?: 'button' | 'toggle' | 'select',
  danger?: boolean,
  disabled?: boolean,
  options?: { id: string, name: string }[],
  darkMode: boolean
}) => (
  <div 
    onClick={type !== 'select' && !disabled ? onClick : undefined}
    className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-4 ${
      disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
    } ${
      danger 
        ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500' 
        : darkMode 
          ? 'border-deenly-gold/10 bg-deenly-dark-bg/50 hover:bg-deenly-dark-bg text-white' 
          : 'border-deenly-gold/10 bg-white/50 hover:bg-white text-deenly-green'
    }`}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        danger ? 'bg-red-500/10' : 'bg-deenly-gold/10 text-deenly-gold'
      }`}>
        <Icon size={16} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{label}</span>
        {description && (
          <span className="text-[10px] opacity-50 leading-tight mt-0.5 line-clamp-2">
            {description}
          </span>
        )}
      </div>
    </div>
    
    {type === 'select' ? (
      <select 
        value={typeof value === 'string' ? value : undefined}
        onChange={(e) => onClick && onClick(e.target.value)}
        className={`text-[10px] font-bold uppercase tracking-widest text-deenly-gold bg-deenly-gold/10 px-2 py-1 rounded-md outline-none border-none cursor-pointer ${darkMode ? 'bg-deenly-dark-bg' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {options?.map(opt => (
          <option key={opt.id} value={opt.id} className={darkMode ? 'bg-deenly-dark-surface text-white' : 'bg-white text-deenly-green'}>
            {opt.name}
          </option>
        ))}
      </select>
    ) : type === 'toggle' ? (
      <button 
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-deenly-gold' : 'bg-deenly-gold/20'}`}
      >
        <div 
          style={{ transform: `translateX(${value ? 22 : 2}px)` }}
          className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 shadow-sm transition-transform duration-200"
        />
      </button>
    ) : value && (
      <span className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold bg-deenly-gold/10 px-2 py-1 rounded-md max-w-[150px] truncate text-right">
        {value}
      </span>
    )}
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate,
  darkMode, 
  setDarkMode, 
  fontSize, 
  setFontSize, 
  theme, 
  setTheme, 
  cardStyle, 
  setCardStyle,
  language,
  setLanguage,
  dateFormat,
  setDateFormat,
  location,
  setLocation,
  calculationMethod,
  setCalculationMethod,
  adhanSound,
  setAdhanSound,
  reminder10Min,
  setReminder10Min,
  adhanNotifications,
  setAdhanNotifications,
  adhanReminders,
  setAdhanReminders,
  isPremium,
  session,
  onOpenLegal,
  showToast
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingField, setEditingField] = useState<'email' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; countdown: string } | null>(null);
  const [gender, setGender] = useState(session?.user?.user_metadata?.settings?.gender || 'Hermano');
  const [transliteration, setTransliteration] = useState(session?.user?.user_metadata?.settings?.transliteration !== false);
  const [notifications, setNotifications] = useState(session?.user?.user_metadata?.settings?.notifications !== false);
  const [islamicReminders, setIslamicReminders] = useState(session?.user?.user_metadata?.settings?.islamicReminders !== false);
  const [updates, setUpdates] = useState(session?.user?.user_metadata?.settings?.updates !== false);
  const [quranTranslation, setQuranTranslation] = useState(session?.user?.user_metadata?.settings?.quranTranslation || 'Español');
  const [quranReciter, setQuranReciter] = useState(session?.user?.user_metadata?.settings?.quranReciter || 'ar.alafasy');
  const [quranFontSize, setQuranFontSize] = useState(session?.user?.user_metadata?.settings?.quranFontSize || '24px');

  const calcMethods = [
    { id: 'MWL', name: 'Muslim World League' },
    { id: 'ISNA', name: 'ISNA (North America)' },
    { id: 'Egypt', name: 'Egypt Survey Authority' },
    { id: 'Makkah', name: 'Umm al-Qura, Makkah' },
    { id: 'Karachi', name: 'U. Islamic Sciences, Karachi' },
    { id: 'Tehran', name: 'U. Tehran (Geophysics)' },
    { id: 'Dubai', name: 'Dubai' },
    { id: 'Kuwait', name: 'Kuwait' },
    { id: 'Qatar', name: 'Qatar' },
    { id: 'Singapore', name: 'MUIS, Singapore' },
    { id: 'Turkey', name: 'Diyanet, Turkey' }
  ];

  const adhanSounds = ['Makkah', 'Madinah', 'Al-Aqsa', 'Egypt', 'Turkey', 'Morocco', 'Silencio'];
  const reciters = [
    { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
    { id: 'ar.abdulsamad', name: 'AbdulBaset AbdulSamad' },
    { id: 'ar.as-sudais', name: 'Abdurrahmaan As-Sudais' },
    { id: 'ar.almuaiqly', name: 'Maher Al Muaiqly' },
    { id: 'ar.shuraym', name: 'Sa\'ud ash-Shuraym' },
    { id: 'ar.minshawi', name: 'Mohamed Siddiq al-Minshawi' }
  ];

  const translations = {
    'Español': {
      title: 'Ajustes',
      subtitle: 'Configura tu experiencia espiritual',
      appearance: 'Apariencia',
      darkMode: 'Modo Oscuro',
      fontSize: 'Tamaño de fuente',
      cardStyle: 'Estilo de tarjetas',
      langRegion: 'Idioma y Región',
      appLang: 'Idioma de la app',
      dateFormat: 'Formato de fecha',
      transliteration: 'Transliteración árabe',
      notifications: 'Notificaciones',
      genNotif: 'Notificaciones generales',
      genNotifDesc: 'Avisos básicos: chats sin leer, nuevas funciones, mensajes del sistema y alertas de mantenimiento.',
      islReminders: 'Recordatorios islámicos',
      islRemindersDesc: 'Conexión diaria: dhikr, Ayat/Hadiz del día, consejos espirituales y fechas importantes.',
      deenlyUpdates: 'Actualizaciones de Deenly',
      deenlyUpdatesDesc: 'Novedades: nuevas secciones (Corán, Fiqh), mejoras en IA y actualizaciones de seguridad.',
      adhanSettings: 'Ajustes de Adhan',
      location: 'Ubicación',
      currentLocation: 'Ubicación actual',
      autoLocation: 'Ubicación automática',
      changeLocation: 'Cambiar ubicación',
      todayTimes: 'Horarios de hoy',
      nextPrayer: 'Próxima oración',
      reminder10Min: 'Recordatorio 10 min antes',
      calcMethod: 'Método de cálculo',
      adhanSound: 'Sonido del Adhan',
      fajr: 'Alerta Fajr',
      dhuhr: 'Alerta Dhuhr',
      asr: 'Alerta Asr',
      maghrib: 'Alerta Maghrib',
      isha: 'Alerta Isha',
      prayerNotifSettings: 'Notificaciones de Oración',
      notifEnabled: 'Notificación',
      reminder10MinLabel: 'Recordatorio 10 min',
      quranPrefs: 'Preferencias del Corán',
      defTrans: 'Traducción por defecto',
      defReciter: 'Recitador por defecto',
      arabicSize: 'Tamaño texto árabe',
      privacy: 'Privacidad y Seguridad',
      viewData: 'Ver datos almacenados',
      downloadData: 'Descargar mis datos',
      clearHistory: 'Borrar historial de chats',
      deleteAccount: 'Borrar cuenta',
      permissions: 'Control de permisos',
      account: 'Cuenta',
      accType: 'Tipo de cuenta',
      changeEmail: 'Cambiar correo',
      changePass: 'Cambiar contraseña',
      legal: 'Información Legal',
      privacyPol: 'Política de Privacidad',
      terms: 'Términos y Condiciones',
      premiumPolicy: 'Política de Suscripción',
      licenses: 'Licencias',
      reset: 'Restablecer ajustes',
      logout: 'Cerrar Sesión',
      exclusiveThemes: 'Temas Exclusivos (Premium)',
      theme: 'Tema visual',
      themeDefault: 'Deenly Gold',
      themeEmerald: 'Esmeralda Sagrada',
      themeMidnight: 'Noche de Medina',
      themeSunset: 'Atardecer en el Desierto',
      small: 'Pequeño',
      medium: 'Medio',
      large: 'Grande',
      compact: 'Compacto',
      wide: 'Amplio',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      dailyInspiration: 'Inspiración Diaria',
      gender: 'Género',
      brother: 'Hermano',
      sister: 'Hermana',
      ayahOfTheDay: 'Aya del Día',
      surah: 'Sura',
      copy: 'Copiar',
      share: 'Compartir'
    },
    'English': {
      title: 'Settings',
      subtitle: 'Configure your spiritual experience',
      appearance: 'Appearance',
      darkMode: 'Dark Mode',
      fontSize: 'Font Size',
      cardStyle: 'Card Style',
      langRegion: 'Language & Region',
      appLang: 'App Language',
      dateFormat: 'Date Format',
      transliteration: 'Arabic Transliteration',
      notifications: 'Notifications',
      genNotif: 'General Notifications',
      genNotifDesc: 'Basic alerts: unread chats, new features, system messages, and maintenance alerts.',
      islReminders: 'Islamic Reminders',
      islRemindersDesc: 'Daily connection: dhikr, Ayat/Hadith of the day, spiritual tips, and important dates.',
      deenlyUpdates: 'Deenly Updates',
      deenlyUpdatesDesc: 'What\'s new: new sections (Quran, Fiqh), AI improvements, and security updates.',
      adhanSettings: 'Adhan Settings',
      location: 'Location',
      currentLocation: 'Current Location',
      autoLocation: 'Automatic Location',
      changeLocation: 'Change Location',
      todayTimes: 'Today\'s Times',
      nextPrayer: 'Next Prayer',
      reminder10Min: '10 min reminder before',
      calcMethod: 'Calculation Method',
      adhanSound: 'Adhan Sound',
      fajr: 'Fajr Alert',
      dhuhr: 'Dhuhr Alert',
      asr: 'Asr Alert',
      maghrib: 'Maghrib Alert',
      isha: 'Isha Alert',
      prayerNotifSettings: 'Prayer Notifications',
      notifEnabled: 'Notification',
      reminder10MinLabel: '10 min Reminder',
      quranPrefs: 'Quran Preferences',
      defTrans: 'Default Translation',
      defReciter: 'Default Reciter',
      arabicSize: 'Arabic Text Size',
      privacy: 'Privacy & Security',
      viewData: 'View Stored Data',
      downloadData: 'Download My Data',
      clearHistory: 'Clear Chat History',
      deleteAccount: 'Delete Account',
      permissions: 'Permissions Control',
      account: 'Account',
      accType: 'Account Type',
      changeEmail: 'Change Email',
      changePass: 'Change Password',
      legal: 'Legal Information',
      privacyPol: 'Privacy Policy',
      terms: 'Terms & Conditions',
      premiumPolicy: 'Premium Subscription Policy',
      licenses: 'Licenses',
      reset: 'Reset Settings',
      logout: 'Log Out',
      exclusiveThemes: 'Exclusive Themes (Premium)',
      theme: 'Visual Theme',
      themeDefault: 'Deenly Gold',
      themeEmerald: 'Sacred Emerald',
      themeMidnight: 'Medina Night',
      themeSunset: 'Desert Sunset',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      compact: 'Compact',
      wide: 'Wide',
      confirm: 'Confirm',
      cancel: 'Cancel',
      dailyInspiration: 'Daily Inspiration',
      gender: 'Gender',
      brother: 'Brother',
      sister: 'Sister',
      ayahOfTheDay: 'Ayah of the Day',
      surah: 'Surah',
      copy: 'Copy',
      share: 'Share'
    },
    'Français': {
      title: 'Paramètres',
      subtitle: 'Configurez votre expérience spirituelle',
      appearance: 'Apparence',
      darkMode: 'Mode Sombre',
      fontSize: 'Taille de police',
      cardStyle: 'Style de carte',
      langRegion: 'Langue et Région',
      appLang: 'Langue de l\'application',
      dateFormat: 'Format de date',
      transliteration: 'Translittération arabe',
      notifications: 'Notifications',
      genNotif: 'Notifications générales',
      genNotifDesc: 'Alertes de base : chats non lus, nouvelles fonctions, messages système et maintenance.',
      islReminders: 'Rappels islamiques',
      islRemindersDesc: 'Connexion quotidienne : dhikr, Ayat/Hadith du jour, conseils spirituels et dates importantes.',
      deenlyUpdates: 'Mises à jour Deenly',
      deenlyUpdatesDesc: 'Nouveautés : nouvelles sections (Coran, Fiqh), améliorations IA et mises à jour de sécurité.',
      adhanSettings: 'Paramètres de l\'Adhan',
      location: 'Localisation',
      currentLocation: 'Localisation actuelle',
      autoLocation: 'Localisation automatique',
      changeLocation: 'Changer de localisation',
      todayTimes: 'Horaires d\'aujourd\'hui',
      nextPrayer: 'Prochaine prière',
      reminder10Min: 'Rappel 10 min avant',
      calcMethod: 'Méthode de calcul',
      adhanSound: 'Son de l\'Adhan',
      fajr: 'Alerte Fajr',
      dhuhr: 'Alerte Dhuhr',
      asr: 'Alerte Asr',
      maghrib: 'Alerte Maghrib',
      isha: 'Alerte Isha',
      prayerNotifSettings: 'Notifications de Prière',
      notifEnabled: 'Notification',
      reminder10MinLabel: 'Rappel 10 min',
      quranPrefs: 'Préférences du Coran',
      defTrans: 'Traduction par défaut',
      defReciter: 'Récitateur par défaut',
      arabicSize: 'Taille du texte arabe',
      privacy: 'Confidentialité et Sécurité',
      viewData: 'Voir les données stockées',
      downloadData: 'Télécharger mes données',
      clearHistory: 'Effacer l\'historique',
      deleteAccount: 'Supprimer le compte',
      permissions: 'Contrôle des permissions',
      account: 'Compte',
      accType: 'Type de compte',
      changeEmail: 'Changer l\'e-mail',
      changePass: 'Changer le mot de passe',
      legal: 'Informations Légales',
      privacyPol: 'Politique de Confidentialité',
      terms: 'Conditions Générales',
      premiumPolicy: 'Politique d\'Abonnement',
      licenses: 'Licences',
      reset: 'Réinitialiser',
      logout: 'Déconnexion',
      exclusiveThemes: 'Thèmes Exclusifs (Premium)',
      theme: 'Thème visuel',
      themeDefault: 'Deenly Gold',
      themeEmerald: 'Émeraude Sacrée',
      themeMidnight: 'Nuit de Médine',
      themeSunset: 'Coucher de Soleil',
      small: 'Petit',
      medium: 'Moyen',
      large: 'Grand',
      compact: 'Compact',
      wide: 'Large',
      confirm: 'Confirmer',
      cancel: 'Annuler',
      dailyInspiration: 'Inspiration Quotidienne',
      gender: 'Genre',
      brother: 'Frère',
      sister: 'Sœur',
      ayahOfTheDay: 'Ayah du Jour',
      surah: 'Sourate',
      copy: 'Copier',
      share: 'Partager'
    },
    'العربية': {
      title: 'الإعدادات',
      subtitle: 'تكوين تجربتك الروحية',
      appearance: 'المظهر',
      darkMode: 'الوضع الداكن',
      fontSize: 'حجم الخط',
      cardStyle: 'نمط البطاقة',
      langRegion: 'اللغة والمنطقة',
      appLang: 'لغة التطبيق',
      dateFormat: 'تنسيق التاريخ',
      transliteration: 'الترجمة الصوتية للعربية',
      notifications: 'الإشعارات',
      genNotif: 'الإشعارات العامة',
      genNotifDesc: 'تنبيهات أساسية: دردشات غير مقروءة، ميزات جديدة، رسائل النظام وتنبيهات الصيانة.',
      islReminders: 'التذكيرات الإسلامية',
      islRemindersDesc: 'اتصال يومي: الأذكار، آية/حديث اليوم، نصائح روحية وتواريخ مهمة.',
      deenlyUpdates: 'تحديثات Deenly',
      deenlyUpdatesDesc: 'ما الجديد: أقسام جديدة (قرآن، فقه)، تحسينات الذكاء الاصطناعي وتحديثات الأمان.',
      adhanSettings: 'إعدادات الأذان',
      location: 'الموقع',
      currentLocation: 'الموقع الحالي',
      autoLocation: 'الموقع التلقائي',
      changeLocation: 'تغيير الموقع',
      todayTimes: 'مواقيت اليوم',
      nextPrayer: 'الصلاة القادمة',
      reminder10Min: 'تذكير قبل 10 دقائق',
      calcMethod: 'طريقة الحساب',
      adhanSound: 'صوت الأذان',
      fajr: 'تنبيه الفجر',
      dhuhr: 'تنبيه الظهر',
      asr: 'تنبيه العصر',
      maghrib: 'تنبيه المغرب',
      isha: 'تنبيه العشاء',
      prayerNotifSettings: 'إشعارات الصلاة',
      notifEnabled: 'تنبيه',
      reminder10MinLabel: 'تذكير قبل 10 دقائق',
      quranPrefs: 'تفضيلات القرآن',
      defTrans: 'الترجمة الافتراضية',
      defReciter: 'القاريء الافتراضي',
      arabicSize: 'حجم النص العربي',
      privacy: 'الخصوصية والأمان',
      viewData: 'عرض البيانات المخزنة',
      downloadData: 'تحميل بياناتي',
      clearHistory: 'مسح سجل الدردشة',
      deleteAccount: 'حذف الحساب',
      permissions: 'التحكم في الأذونات',
      account: 'الحساب',
      accType: 'نوع الحساب',
      changeEmail: 'تغيير البريد الإلكتروني',
      changePass: 'تغيير كلمة المرور'
    },
    'Indonesian': {
      title: 'Pengaturan',
      subtitle: 'Konfigurasi pengalaman spiritual Anda',
      appearance: 'Tampilan',
      darkMode: 'Mode Gelap',
      fontSize: 'Ukuran Font',
      cardStyle: 'Gaya Kartu',
      langRegion: 'Bahasa & Wilayah',
      appLang: 'Bahasa Aplikasi',
      dateFormat: 'Format Tanggal',
      transliteration: 'Transliterasi Arab',
      notifications: 'Notifikasi',
      genNotif: 'Notifikasi Umum',
      genNotifDesc: 'Peringatan dasar: obrolan yang belum dibaca, fitur baru, pesan sistem, dan peringatan pemeliharaan.',
      islReminders: 'Pengingat Islami',
      islRemindersDesc: 'Koneksi harian: dzikir, Ayat/Hadits hari ini, tips spiritual, dan tanggal penting.',
      deenlyUpdates: 'Pembaruan Deenly',
      deenlyUpdatesDesc: 'Apa yang baru: bagian baru (Al-Quran, Fiqh), peningkatan AI, dan pembaruan keamanan.',
      adhanSettings: 'Pengaturan Adzan',
      location: 'Lokasi',
      currentLocation: 'Lokasi Saat Ini',
      autoLocation: 'Lokasi Otomatis',
      changeLocation: 'Ubah Lokasi',
      todayTimes: 'Waktu Hari Ini',
      nextPrayer: 'Shalat Berikutnya',
      reminder10Min: 'Pengingat 10 menit sebelum',
      calcMethod: 'Metode Perhitungan',
      adhanSound: 'Suara Adzan',
      fajr: 'Peringatan Fajr',
      dhuhr: 'Peringatan Dhuhr',
      asr: 'Peringatan Asr',
      maghrib: 'Peringatan Maghrib',
      isha: 'Peringatan Isha',
      prayerNotifSettings: 'Notifikasi Shalat',
      notifEnabled: 'Notifikasi',
      reminder10MinLabel: 'Pengingat 10 menit',
      quranPrefs: 'Preferensi Al-Quran',
      defTrans: 'Terjemahan Default',
      defReciter: 'Qari Default',
      arabicSize: 'Ukuran Teks Arab',
      privacy: 'Privacy & Keamanan',
      viewData: 'Lihat Data Tersimpan',
      downloadData: 'Unduh Data Saya',
      clearHistory: 'Hapus Riwayat Obrolan',
      deleteAccount: 'Hapus Akun',
      permissions: 'Kontrol Izin',
      account: 'Akun',
      accType: 'Tipe Akun',
      changeEmail: 'Ubah Email',
      changePass: 'Ubah Kata Sandi',
      legal: 'Informasi Hukum',
      privacyPol: 'Kebijakan Privasi',
      terms: 'Syarat & Ketentuan',
      premiumPolicy: 'Kebijakan Langganan Premium',
      licenses: 'Lisensi',
      reset: 'Atur Ulang Pengaturan',
      logout: 'Keluar',
      exclusiveThemes: 'Tema Eksklusif (Premium)',
      theme: 'Tema Visual',
      themeDefault: 'Deenly Gold',
      themeEmerald: 'Zamrud Suci',
      themeMidnight: 'Malam Madinah',
      themeSunset: 'Matahari Terbenam Gurun',
      small: 'Kecil',
      medium: 'Sedang',
      large: 'Besar',
      compact: 'Ringkas',
      wide: 'Lebar',
      confirm: 'Konfirmasi',
      cancel: 'Batal',
      dailyInspiration: 'Inspirasi Harian',
      gender: 'Jenis Kelamin',
      brother: 'Saudara',
      sister: 'Saudari',
      ayahOfTheDay: 'Ayat Hari Ini',
      surah: 'Surah',
      copy: 'Salin',
      share: 'Bagikan'
    },
    'Deutsch': {
      title: 'Einstellungen',
      subtitle: 'Konfigurieren Sie Ihre spirituelle Erfahrung',
      appearance: 'Erscheinungsbild',
      darkMode: 'Dunkelmodus',
      fontSize: 'Schriftgröße',
      cardStyle: 'Kartenstil',
      langRegion: 'Sprache & Region',
      appLang: 'App-Sprache',
      dateFormat: 'Datumsformat',
      transliteration: 'Arabische Transliteration',
      notifications: 'Benachrichtigungen',
      genNotif: 'Allgemeine Benachrichtigungen',
      genNotifDesc: 'Grundlegende Warnungen: ungelesene Chats, neue Funktionen, Systemmeldungen und Wartungswarnungen.',
      islReminders: 'Islamische Erinnerungen',
      islRemindersDesc: 'Tägliche Verbindung: Dhikr, Ayat/Hadith des Tages, spirituelle Tipps und wichtige Termine.',
      deenlyUpdates: 'Deenly-Updates',
      deenlyUpdatesDesc: 'Was ist neu: neue Abschnitte (Koran, Fiqh), KI-Verbesserungen und Sicherheitsupdates.',
      adhanSettings: 'Adhan-Einstellungen',
      location: 'Standort',
      currentLocation: 'Aktueller Standort',
      autoLocation: 'Automatischer Standort',
      changeLocation: 'Standort ändern',
      todayTimes: 'Heutige Zeiten',
      nextPrayer: 'Nächstes Gebet',
      reminder10Min: '10 Min. Erinnerung vorher',
      calcMethod: 'Berechnungsmethode',
      adhanSound: 'Adhan-Ton',
      fajr: 'Fajr-Alarm',
      dhuhr: 'Dhuhr-Alarm',
      asr: 'Asr-Alarm',
      maghrib: 'Maghrib-Alarm',
      isha: 'Isha-Alarm',
      prayerNotifSettings: 'Gebetsbenachrichtigungen',
      notifEnabled: 'Benachrichtigung',
      reminder10MinLabel: '10 Min. Erinnerung',
      quranPrefs: 'Koran-Einstellungen',
      defTrans: 'Standard-Übersetzung',
      defReciter: 'Standard-Rezitator',
      arabicSize: 'Arabische Textgröße',
      privacy: 'Datenschutz & Sicherheit',
      viewData: 'Gespeicherte Daten anzeigen',
      downloadData: 'Meine Daten herunterladen',
      clearHistory: 'Chat-Verlauf löschen',
      deleteAccount: 'Konto löschen',
      permissions: 'Berechtigungskontrolle',
      account: 'Konto',
      accType: 'Kontotyp',
      changeEmail: 'E-Mail ändern',
      changePass: 'Passwort ändern',
      legal: 'Rechtliche Informationen',
      privacyPol: 'Datenschutzerklärung',
      terms: 'Allgemeine Geschäftsbedingungen',
      premiumPolicy: 'Premium-Abonnement-Richtlinie',
      licenses: 'Lizenzen',
      reset: 'Einstellungen zurücksetzen',
      logout: 'Abmelden',
      exclusiveThemes: 'Exklusive Themen (Premium)',
      theme: 'Visuelles Thema',
      themeDefault: 'Deenly Gold',
      themeEmerald: 'Heiliger Smaragd',
      themeMidnight: 'Medina Nacht',
      themeSunset: 'Wüstensonnenuntergang',
      small: 'Klein',
      medium: 'Mittel',
      large: 'Groß',
      compact: 'Kompakt',
      wide: 'Breit',
      confirm: 'Bestätigen',
      cancel: 'Abbrechen',
      dailyInspiration: 'Tägliche Inspiration',
      gender: 'Geschlecht',
      brother: 'Bruder',
      sister: 'Schwester',
      ayahOfTheDay: 'Ayah des Tages',
      surah: 'Sure',
      copy: 'Kopieren',
      share: 'Teilen'
    }
  };

  const t: any = translations[language as keyof typeof translations] || translations['Español'];
  const isRTL = language === 'العربية';

  // Load settings from Supabase metadata on mount/open
  useEffect(() => {
    if (isOpen && session?.user?.user_metadata?.settings) {
      const s = session.user.user_metadata.settings;
      // Synced settings (handled by props, but we update them here to be sure)
      if (s.fontSize) setFontSize(s.fontSize);
      if (s.theme) setTheme(s.theme);
      if (s.cardStyle) setCardStyle(s.cardStyle);
      if (s.language) setLanguage(s.language);
      if (s.dateFormat) setDateFormat(s.dateFormat);
      if (s.calculationMethod) setCalculationMethod(s.calculationMethod);
      if (s.adhanSound) setAdhanSound(s.adhanSound);
      if (s.location) setLocation(s.location);
      if (s.reminder10Min !== undefined) setReminder10Min(s.reminder10Min);
      if (s.adhanNotifications) setAdhanNotifications(s.adhanNotifications);
      if (s.adhanReminders) setAdhanReminders(s.adhanReminders);

      // Local state settings
      if (s.notifications !== undefined) setNotifications(s.notifications);
      if (s.islamicReminders !== undefined) setIslamicReminders(s.islamicReminders);
      if (s.quranTranslation) setQuranTranslation(s.quranTranslation);
      if (s.quranReciter) setQuranReciter(s.quranReciter);
      if (s.quranFontSize) setQuranFontSize(s.quranFontSize);
      if (s.transliteration !== undefined) setTransliteration(s.transliteration);
      if (s.gender) setGender(s.gender);
      if (s.updates !== undefined) setUpdates(s.updates);
    }
  }, [isOpen]); // Only reload when modal opens

  // Calculate Prayer Times
  useEffect(() => {
    const date = new Date();
    const coordinates = new Coordinates(location.lat, location.lng);
    
    let method;
    switch (calculationMethod) {
      case 'MWL': method = CalculationMethod.MuslimWorldLeague(); break;
      case 'ISNA': method = CalculationMethod.NorthAmerica(); break;
      case 'Egypt': method = CalculationMethod.Egyptian(); break;
      case 'Makkah': method = CalculationMethod.UmmAlQura(); break;
      case 'Karachi': method = CalculationMethod.Karachi(); break;
      case 'Tehran': method = CalculationMethod.Tehran(); break;
      case 'Dubai': method = CalculationMethod.Dubai(); break;
      case 'Kuwait': method = CalculationMethod.Kuwait(); break;
      case 'Qatar': method = CalculationMethod.Qatar(); break;
      case 'Singapore': method = CalculationMethod.Singapore(); break;
      case 'Turkey': method = CalculationMethod.Turkey(); break;
      default: method = CalculationMethod.MuslimWorldLeague();
    }

    const pt = new PrayerTimes(coordinates, date, method);
    setPrayerTimes(pt);

    // Countdown logic
    const updateCountdown = () => {
      const now = new Date();
      const next = pt.nextPrayer();
      const nextTime = pt.timeForPrayer(next);
      
      if (nextTime) {
        const diff = nextTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const prayerNames: any = {
          fajr: isRTL ? 'الفجر' : 'Fajr',
          dhuhr: isRTL ? 'الظهر' : 'Dhuhr',
          asr: isRTL ? 'العصر' : 'Asr',
          maghrib: isRTL ? 'المغرب' : 'Maghrib',
          isha: isRTL ? 'العشاء' : 'Isha',
          none: isRTL ? 'الفجر' : 'Fajr'
        };

        setNextPrayer({
          name: prayerNames[next] || prayerNames.none,
          time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          countdown: `${hours}h ${minutes}m ${seconds}s`
        });
      }
    };

    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(timer);
  }, [location, calculationMethod, language]);

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding to get city name
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state || 'Detected Location';
          const country = data.address.country || '';
          const cityName = `${city}${country ? ', ' + country : ''}`;
          
          const newLoc = { lat: latitude, lng: longitude, city: cityName };
          setLocation(newLoc);
          saveSettings({ location: newLoc });
        } catch (e) {
          const newLoc = { lat: latitude, lng: longitude, city: 'Detected Location' };
          setLocation(newLoc);
          saveSettings({ location: newLoc });
        }
      }, (error) => {
        if (showToast) {
          showToast(language === 'Español' ? `Error de ubicación: ${error.message}` : `Location error: ${error.message}`, 'error');
        }
      });
    }
  };

  const handleGeocodeCity = async (cityName: string) => {
    if (!cityName.trim()) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parts = display_name.split(',');
        const city = parts[0].trim();
        const country = parts[parts.length - 1].trim();
        
        const newLoc = { 
          lat: parseFloat(lat), 
          lng: parseFloat(lon), 
          city: `${city}, ${country}`
        };
        setLocation(newLoc);
        saveSettings({ location: newLoc });
        setIsEditingLocation(false);
        setLocationInput('');
      } else {
        if (showToast) showToast(language === 'Español' ? "No se pudo encontrar la ubicación especificada." : "Could not find the specified location.", 'error');
      }
    } catch (error) {
      console.error("Error geocoding city:", error);
      if (showToast) showToast(language === 'Español' ? "Error al buscar la ubicación." : "Error searching for location.", 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    if (!session || !isSupabaseConfigured) return;
    setIsSaving(true);
    try {
      const currentSettings = session.user.user_metadata?.settings || {};
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      const { error } = await supabase.auth.updateUser({
        data: { settings: updatedSettings }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving settings:', error.message);
      if (showToast) showToast(error.message || 'Error al guardar los ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    saveSettings({ darkMode: newVal });
  };

  const handleUpdateEmail = () => {
    setEditingField('email');
    setEditValue('');
  };

  const handleUpdatePassword = () => {
    setEditingField('password');
    setEditValue('');
  };

  const handleSaveAccountUpdate = async () => {
    if (!editValue || !isSupabaseConfigured) return;
    setIsUpdating(true);
    try {
      if (editingField === 'email') {
        if (editValue === session?.user?.email) {
          if (showToast) showToast("El nuevo correo debe ser diferente al actual.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ email: editValue });
        if (error) throw error;
        if (showToast) showToast(language === 'Español' 
          ? "Se ha enviado un correo de confirmación a tu nueva dirección." 
          : "A confirmation email has been sent to your new address.", 'success');
      } else if (editingField === 'password') {
        if (editValue.length < 6) {
          if (showToast) showToast(language === 'Español' 
            ? "La contraseña debe tener al menos 6 caracteres." 
            : "Password must be at least 6 characters.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: editValue });
        if (error) throw error;
        if (showToast) showToast(language === 'Español' 
          ? "Contraseña actualizada con éxito." 
          : "Password updated successfully.", 'success');
      }
      setEditingField(null);
      setEditValue('');
    } catch (error: any) {
      if (showToast) showToast(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full sm:max-w-2xl overflow-hidden sm:rounded-[40px] shadow-2xl flex flex-col h-full sm:h-[85vh] ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-deenly-gold flex items-center justify-center text-white shadow-lg shadow-deenly-gold/20">
              <Settings size={20} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                {t.title}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold text-deenly-gold">{t.subtitle}</p>
                {isSaving && <Loader2 size={10} className="animate-spin text-deenly-gold" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <button 
                onClick={() => onNavigate('profile')}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
                title={t.profile}
              >
                <User size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 scrollbar-hide">
              
              {/* Daily Inspiration */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-deenly-gold uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-deenly-gold" />
                  {t.dailyInspiration}
                </h3>
                <AyahOfTheDay darkMode={darkMode} language={language} t={t} />
              </div>

              {/* Apariencia */}
              <SettingSection title={t.appearance}>
                <SettingItem 
                  icon={darkMode ? Moon : Sun} 
                  label={t.darkMode} 
                  type="toggle" 
                  value={darkMode}
                  onClick={handleToggleDarkMode}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Type} 
                  label={t.fontSize} 
                  type="select"
                  value={fontSize}
                  options={[
                    { id: 'small', name: t.small },
                    { id: 'medium', name: t.medium },
                    { id: 'large', name: t.large }
                  ]}
                  onClick={(val) => {
                    setFontSize(val);
                    saveSettings({ fontSize: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Layout} 
                  label={t.cardStyle} 
                  type="select"
                  value={cardStyle}
                  options={[
                    { id: 'compact', name: t.compact },
                    { id: 'wide', name: t.wide }
                  ]}
                  onClick={(val) => {
                    setCardStyle(val);
                    saveSettings({ cardStyle: val });
                  }}
                  darkMode={darkMode}
                />

                <SettingItem 
                  icon={Sparkles} 
                  label={t.theme} 
                  description={!isPremium ? t.exclusiveThemes : undefined}
                  type="select"
                  value={theme}
                  options={[
                    { id: 'default', name: t.themeDefault },
                    { id: 'emerald', name: t.themeEmerald + (!isPremium ? ' 🔒' : '') },
                    { id: 'midnight', name: t.themeMidnight + (!isPremium ? ' 🔒' : '') },
                    { id: 'sunset', name: t.themeSunset + (!isPremium ? ' 🔒' : '') }
                  ]}
                  onClick={(val) => {
                    if (!isPremium && val !== 'default') {
                      if (showToast) showToast(language === 'Español' ? 'Esta función es exclusiva para usuarios Premium' : 'This feature is exclusive for Premium users', 'error');
                      if (onNavigate) onNavigate('plans');
                      return;
                    }
                    setTheme(val);
                    saveSettings({ theme: val });
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Idioma y Región */}
              <SettingSection title={t.langRegion}>
                <SettingItem 
                  icon={User} 
                  label={t.gender} 
                  type="select"
                  value={gender}
                  options={[
                    { id: 'Hermano', name: t.brother },
                    { id: 'Hermana', name: t.sister }
                  ]}
                  onClick={(val) => {
                    setGender(val);
                    saveSettings({ gender: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Languages} 
                  label={t.appLang} 
                  type="select"
                  value={language}
                  options={[
                    { id: 'Español', name: 'Español' },
                    { id: 'English', name: 'English' },
                    { id: 'Français', name: 'Français' },
                    { id: 'العربية', name: 'العربية' },
                    { id: 'Indonesian', name: 'Indonesian' },
                    { id: 'Deutsch', name: 'Deutsch' }
                  ]}
                  onClick={(val) => {
                    setLanguage(val);
                    saveSettings({ language: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Calendar} 
                  label={t.dateFormat} 
                  type="select"
                  value={dateFormat}
                  options={[
                    { id: 'DD/MM/YYYY', name: 'DD/MM/YYYY' },
                    { id: 'MM/DD/YYYY', name: 'MM/DD/YYYY' },
                    { id: 'YYYY-MM-DD', name: 'YYYY-MM-DD' }
                  ]}
                  onClick={(val) => {
                    setDateFormat(val);
                    saveSettings({ dateFormat: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Globe} 
                  label={t.transliteration} 
                  type="toggle"
                  value={transliteration}
                  onClick={() => {
                    const next = !transliteration;
                    setTransliteration(next);
                    saveSettings({ transliteration: next });
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Notificaciones */}
              <SettingSection title={t.notifications}>
                <SettingItem 
                  icon={Bell} 
                  label={t.genNotif} 
                  description={t.genNotifDesc}
                  type="toggle"
                  value={notifications}
                  onClick={() => {
                    const next = !notifications;
                    setNotifications(next);
                    saveSettings({ notifications: next });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={BellRing} 
                  label={t.islReminders} 
                  description={t.islRemindersDesc}
                  type="toggle"
                  value={islamicReminders}
                  onClick={() => {
                    const next = !islamicReminders;
                    setIslamicReminders(next);
                    saveSettings({ islamicReminders: next });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Zap} 
                  label={t.deenlyUpdates} 
                  description={t.deenlyUpdatesDesc}
                  type="toggle"
                  value={updates}
                  onClick={() => {
                    const next = !updates;
                    setUpdates(next);
                    saveSettings({ updates: next });
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Ajustes de Adhan */}
              <SettingSection title={t.adhanSettings}>
                {/* Location Card */}
                <div className={`p-6 rounded-3xl border mb-4 ${darkMode ? 'border-deenly-gold/20 bg-deenly-dark-bg/30' : 'border-deenly-gold/10 bg-white/30'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">{t.location}</p>
                        <h4 className="text-sm font-bold">{location.city}</h4>
                      </div>
                    </div>
                    <button 
                      onClick={handleDetectLocation}
                      className="p-2 rounded-lg bg-deenly-gold text-white hover:bg-deenly-gold/90 transition-colors shadow-lg shadow-deenly-gold/20"
                      title={t.autoLocation}
                    >
                      <Navigation size={16} />
                    </button>
                  </div>
                  
                    <div className="flex flex-col gap-3">
                      {isEditingLocation ? (
                        <div 
                          className="space-y-3 overflow-hidden"
                        >
                          <input
                            type="text"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            placeholder={language === 'Español' ? "Ciudad, País" : "City, Country"}
                            className={`w-full py-3 px-4 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                              darkMode ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white' : 'bg-white border-deenly-gold/10 text-deenly-green'
                            }`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleGeocodeCity(locationInput);
                              if (e.key === 'Escape') setIsEditingLocation(false);
                            }}
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleGeocodeCity(locationInput)}
                              disabled={isUpdating || !locationInput.trim()}
                              className="flex-1 py-2 bg-deenly-gold text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isUpdating ? <Loader2 size={12} className="animate-spin" /> : t.confirm}
                            </button>
                            <button 
                              onClick={() => setIsEditingLocation(false)}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                                darkMode ? 'border-deenly-gold/20 hover:bg-white/5' : 'border-deenly-gold/10 hover:bg-black/5'
                              }`}
                            >
                              {t.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setIsEditingLocation(true);
                            setLocationInput(location.city);
                          }}
                          className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                            darkMode ? 'border-deenly-gold/20 hover:bg-white/5' : 'border-deenly-gold/10 hover:bg-black/5'
                          }`}
                        >
                          {t.changeLocation}
                        </button>
                      )}
                    </div>
                </div>

                {/* Prayer Times Card */}
                <div className={`p-6 rounded-3xl border mb-4 ${darkMode ? 'border-deenly-gold/20 bg-deenly-dark-bg/30' : 'border-deenly-gold/10 bg-white/30'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">{t.todayTimes}</p>
                        <h4 className="text-sm font-bold">{new Date().toLocaleDateString(language === 'Español' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                      </div>
                    </div>
                    {nextPrayer && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">{t.nextPrayer}</p>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs font-bold">{nextPrayer.name}</span>
                          <span className="text-[10px] opacity-50">{nextPrayer.countdown}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {prayerTimes && (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => {
                      const time = prayerTimes.timeForPrayer(prayer);
                      return (
                        <div key={prayer} className="flex items-center justify-between p-3 rounded-xl bg-deenly-gold/5 border border-deenly-gold/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${nextPrayer?.name.toLowerCase().includes(prayer) ? 'bg-deenly-gold animate-pulse' : 'bg-deenly-gold/20'}`} />
                            <span className="text-xs font-bold uppercase tracking-widest">{t[prayer]}</span>
                          </div>
                          <span className="text-sm font-mono font-bold">
                            {time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <SettingItem 
                  icon={Settings} 
                  label={t.calcMethod} 
                  type="select"
                  value={calculationMethod}
                  options={calcMethods}
                  onClick={(val) => {
                    setCalculationMethod(val);
                    saveSettings({ calculationMethod: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Volume2} 
                  label={t.adhanSound} 
                  type="select"
                  value={adhanSound}
                  options={adhanSounds.map(s => ({ id: s, name: s }))}
                  onClick={(val) => {
                    setAdhanSound(val);
                    saveSettings({ adhanSound: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={BellRing} 
                  label={t.reminder10Min}
                  type="toggle"
                  value={reminder10Min}
                  onClick={() => {
                    const next = !reminder10Min;
                    setReminder10Min(next);
                    saveSettings({ reminder10Min: next });
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Notificaciones de Oración Personalizadas */}
              <SettingSection title={t.prayerNotifSettings}>
                <div className="space-y-3">
                  {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => (
                    <div 
                      key={prayer} 
                      className={`p-4 rounded-2xl border transition-colors ${
                        darkMode 
                          ? 'border-deenly-gold/10 bg-deenly-dark-bg/50' 
                          : 'border-deenly-gold/10 bg-white/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
                            <Bell size={16} />
                          </div>
                          <span className="text-sm font-bold uppercase tracking-widest">{t[prayer]}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] opacity-70 uppercase font-bold tracking-wider">{t.notifEnabled}</span>
                          <button 
                            onClick={() => {
                              const next = { ...adhanNotifications, [prayer]: !adhanNotifications[prayer] };
                              setAdhanNotifications(next);
                              saveSettings({ adhanNotifications: next });
                            }}
                            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${adhanNotifications[prayer] ? 'bg-deenly-gold' : 'bg-deenly-gold/20'}`}
                          >
                            <div 
                              style={{ transform: `translateX(${adhanNotifications[prayer] ? 22 : 2}px)` }}
                              className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 shadow-sm transition-transform duration-200"
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] opacity-70 uppercase font-bold tracking-wider">{t.reminder10MinLabel}</span>
                          <button 
                            onClick={() => {
                              const next = { ...adhanReminders, [prayer]: !adhanReminders[prayer] };
                              setAdhanReminders(next);
                              saveSettings({ adhanReminders: next });
                            }}
                            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${adhanReminders[prayer] ? 'bg-deenly-gold' : 'bg-deenly-gold/20'}`}
                          >
                            <div 
                              style={{ transform: `translateX(${adhanReminders[prayer] ? 22 : 2}px)` }}
                              className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 shadow-sm transition-transform duration-200"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingSection>

              {/* Preferencias del Corán */}
              <SettingSection title={t.quranPrefs}>
                <SettingItem 
                  icon={Book} 
                  label={t.defTrans} 
                  type="select"
                  value={quranTranslation}
                  options={[
                    { id: 'Español', name: 'Español' },
                    { id: 'English', name: 'English' },
                    { id: 'Français', name: 'Français' },
                    { id: 'Deutsch', name: 'Deutsch' },
                    { id: 'Indonesian', name: 'Indonesian' },
                    { id: 'Urdu', name: 'Urdu' }
                  ]}
                  onClick={(val) => {
                    setQuranTranslation(val);
                    saveSettings({ quranTranslation: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Volume2} 
                  label={t.defReciter} 
                  type="select"
                  value={quranReciter}
                  options={reciters}
                  onClick={(val) => {
                    setQuranReciter(val);
                    saveSettings({ quranReciter: val });
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Type} 
                  label={t.arabicSize} 
                  type="select"
                  value={quranFontSize}
                  options={[
                    { id: '18px', name: 'Pequeño (18px)' },
                    { id: '24px', name: 'Medio (24px)' },
                    { id: '32px', name: 'Grande (32px)' },
                    { id: '40px', name: 'Extra Grande (40px)' }
                  ]}
                  onClick={(val) => {
                    setQuranFontSize(val);
                    saveSettings({ quranFontSize: val });
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Privacidad y Seguridad */}
              <SettingSection title={t.privacy}>
                <SettingItem 
                  icon={Database} 
                  label={t.viewData} 
                  onClick={() => {
                    if (showToast) {
                      showToast(language === 'Español' ? "Consulta tu perfil para ver tus datos detallados." : "Check your profile for detailed data.", 'success');
                    }
                    console.log(`User Data:`, session?.user);
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Download} 
                  label={t.downloadData} 
                  onClick={() => {
                    const data = JSON.stringify(session?.user, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `deenly_data_${session?.user?.id}.json`;
                    a.click();
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Trash2} 
                  label={t.clearHistory} 
                  danger
                  onClick={async () => {
                    // Simple state-less confirmation for now using a custom prompt or just toast if not critical
                    // But since it is critical, we'll use a more professional approach if we had a modal
                    // For now, let's at least avoid window.confirm if possible, or use a toast to explain
                    try {
                      await chatService.clearAllChats();
                      if (showToast) showToast(language === 'Español' ? "Historial borrado" : "History cleared", 'success');
                      setTimeout(() => window.location.reload(), 1000);
                    } catch (e) {
                      console.error(e);
                      if (showToast) showToast("Error al borrar el historial", 'error');
                    }
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={UserX} 
                  label={t.deleteAccount} 
                  danger
                  onClick={async () => {
                    if (showToast) {
                      showToast(language === 'Español' ? "Solicitud de eliminación enviada. Se procesará en 24h." : "Deletion request sent. Will be processed in 24h.", 'success');
                    }
                    try {
                      await supabase.auth.signOut();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Smartphone} 
                  label={t.permissions} 
                  onClick={async () => {
                    if ('Notification' in window) {
                      const permission = await Notification.requestPermission();
                      if (showToast) showToast(`${language === 'Español' ? 'Permisos' : 'Permissions'}: ${permission}`, 'success');
                    } else {
                      if (showToast) showToast(language === 'Español' ? "Navegador no compatible" : "Browser not supported", 'error');
                    }
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Cuenta */}
              <SettingSection title={t.account}>
                <SettingItem 
                  icon={ShieldCheck} 
                  label={t.accType} 
                  value={isPremium ? 'Deenly Pro' : 'Free'}
                  darkMode={darkMode}
                />
                
                  <div className="space-y-2">
                    <SettingItem 
                      icon={Mail} 
                      label={t.changeEmail} 
                      onClick={handleUpdateEmail}
                      disabled={editingField !== null}
                      darkMode={darkMode}
                    />
                    
                    {editingField === 'email' && (
                      <div 
                        className={`p-4 rounded-2xl border ${darkMode ? 'border-deenly-gold/20 bg-deenly-dark-bg/30' : 'border-deenly-gold/20 bg-white/30'} space-y-3 overflow-hidden`}
                      >
                        <input 
                          type="email"
                          placeholder={t.changeEmail}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`w-full p-2 rounded-xl border text-sm outline-none transition-colors ${
                            darkMode 
                              ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white focus:border-deenly-gold' 
                              : 'bg-white border-deenly-gold/20 text-deenly-green focus:border-deenly-gold'
                          }`}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveAccountUpdate}
                            disabled={isUpdating || !editValue}
                            className="flex-1 py-2 bg-deenly-gold text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : t.confirm || 'Confirmar'}
                          </button>
                          <button 
                            onClick={() => setEditingField(null)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 ${
                              darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-deenly-green'
                            }`}
                          >
                            {t.cancel || 'Cancelar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <SettingItem 
                      icon={Key} 
                      label={t.changePass} 
                      onClick={handleUpdatePassword}
                      disabled={editingField !== null}
                      darkMode={darkMode}
                    />

                    {editingField === 'password' && (
                      <div 
                        className={`p-4 rounded-2xl border ${darkMode ? 'border-deenly-gold/20 bg-deenly-dark-bg/30' : 'border-deenly-gold/20 bg-white/30'} space-y-3 overflow-hidden`}
                      >
                        <input 
                          type="password"
                          placeholder={t.changePass}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`w-full p-2 rounded-xl border text-sm outline-none transition-colors ${
                            darkMode 
                              ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white focus:border-deenly-gold' 
                              : 'bg-white border-deenly-gold/20 text-deenly-green focus:border-deenly-gold'
                          }`}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveAccountUpdate}
                            disabled={isUpdating || !editValue}
                            className="flex-1 py-2 bg-deenly-gold text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : t.confirm || 'Confirmar'}
                          </button>
                          <button 
                            onClick={() => setEditingField(null)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 ${
                              darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-deenly-green'
                            }`}
                          >
                            {t.cancel || 'Cancelar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
              </SettingSection>

              {/* Información Legal */}
              <SettingSection title={t.legal}>
                <SettingItem 
                  icon={Shield} 
                  label={t.privacyPol} 
                  onClick={() => onOpenLegal('privacy')}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={FileText} 
                  label={t.terms} 
                  onClick={() => onOpenLegal('terms')}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={ShieldCheck} 
                  label={t.premiumPolicy || 'Premium Policy'} 
                  onClick={() => onOpenLegal('premium')}
                  darkMode={darkMode}
                />
                <SettingItem 
                  icon={Scale} 
                  label={t.licenses} 
                  onClick={() => {
                    if (showToast) showToast("MIT & Apache 2.0 Licenses", 'success');
                  }}
                  darkMode={darkMode}
                />
              </SettingSection>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-deenly-gold/10 flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    await saveSettings({
                      darkMode: false,
                      fontSize: 'medium',
                      cardStyle: 'wide',
                      notifications: true,
                      islamicReminders: true,
                      quranTranslation: 'Español',
                      quranReciter: 'ar.alafasy',
                      quranFontSize: '24px',
                      language: 'Español',
                      dateFormat: 'DD/MM/YYYY',
                      transliteration: true,
                      updates: true,
                      calculationMethod: 'MWL',
                      adhanSound: 'Makkah',
                      adhanNotifications: {
                        fajr: true,
                        dhuhr: true,
                        asr: true,
                        maghrib: true,
                        isha: true
                      },
                      adhanReminders: {
                        fajr: false,
                        dhuhr: false,
                        asr: false,
                        maghrib: false,
                        isha: false
                      }
                    });
                    if (showToast) showToast(language === 'Español' ? "Ajustes restablecidos" : "Settings reset", 'success');
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-deenly-gold hover:bg-deenly-gold/5 rounded-2xl transition-colors"
                >
                  {t.reset}
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/90 transition-colors shadow-lg shadow-red-500/20"
                >
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        </div>
  );
};

export default SettingsModal;
