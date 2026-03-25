import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthProps {
  darkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ darkMode }) => {
  const [language, setLanguage] = useState('Español');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const translations: any = {
    'English': {
      loginTitle: 'Welcome to Deenly',
      signupTitle: 'Create your account',
      loginSubtitle: 'Access your personalized spiritual space',
      signupSubtitle: 'Join our learning community',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      nameLabel: 'Full Name',
      forgotPass: 'Forgot your password?',
      loginBtn: 'Log In',
      signupBtn: 'Sign Up',
      createAcc: 'Create new account',
      haveAcc: 'Already have an account? Log In',
      terms: 'By continuing, you agree to our Terms and Privacy Policy',
      onboardingStep: 'Step',
      finish: 'Finish',
      next: 'Next',
      q1: 'How do you prefer I address you?',
      q1Options: ['Brother', 'Sister'],
      q2: 'What is your level of knowledge about Islam?',
      q2Options: ['Beginner', 'Intermediate', 'Advanced'],
      q3: 'What topics interest you most?',
      q3Options: ['History', 'Fiqh', 'Spirituality', 'Quran', 'Hadith'],
      q4: 'What is your main goal with Deenly?',
      q4Options: ['Learn', 'Resolve doubts', 'Daily connection'],
      confirmEmail: 'Your account has been successfully created! To start your Deenly experience, please verify your email through the link we\'ve sent you.',
      confirmEmailTitle: 'Almost there!',
      confirmEmailBtn: 'Go to Login',
      errorSupabase: 'Supabase is not configured. Please add the environment variables.',
      errorTimeout: 'The connection is taking longer than expected. Please check your internet and try again.',
      errorRateLimit: 'You have tried to register too many times. Please wait a few minutes.',
      errorUnexpected: 'An unexpected error occurred connecting to Supabase',
      errorOnboarding: 'There was a small problem saving to the cloud, but don\'t worry. Click Finish again to enter.',
      skipOnboarding: 'Skip and enter anyway'
    },
    'Español': {
      loginTitle: 'Bienvenido a Deenly',
      signupTitle: 'Crea tu cuenta',
      loginSubtitle: 'Accede a tu espacio espiritual personalizado',
      signupSubtitle: 'Únete a nuestra comunidad de aprendizaje',
      emailLabel: 'Correo electrónico',
      passwordLabel: 'Contraseña',
      nameLabel: 'Nombre completo',
      forgotPass: '¿Olvidaste tu contraseña?',
      loginBtn: 'Iniciar sesión',
      signupBtn: 'Crear cuenta',
      createAcc: 'Crear cuenta',
      haveAcc: '¿Ya tienes cuenta? Inicia sesión',
      terms: 'Al continuar, aceptas nuestros Términos y Política de Privacidad',
      onboardingStep: 'Paso',
      finish: 'Finalizar',
      next: 'Siguiente',
      q1: '¿Cómo prefieres que me dirija a ti?',
      q1Options: ['Hermano', 'Hermana'],
      q2: '¿Cuál es tu nivel de conocimiento sobre el Islam?',
      q2Options: ['Principiante', 'Intermedio', 'Avanzado'],
      q3: '¿Qué temas te interesan más?',
      q3Options: ['Historia', 'Fiqh', 'Espiritualidad', 'Corán', 'Hadiz'],
      q4: '¿Cuál es tu objetivo principal con Deenly?',
      q4Options: ['Aprender', 'Resolver dudas', 'Conexión diaria'],
      confirmEmail: '¡Tu cuenta ha sido creada con éxito! Para comenzar tu experiencia en Deenly, por favor verifica tu correo electrónico a través del enlace que te hemos enviado.',
      confirmEmailTitle: '¡Casi has llegado!',
      confirmEmailBtn: 'Ir al Inicio de Sesión',
      errorSupabase: 'Supabase no está configurado. Por favor, añade las variables de entorno.',
      errorTimeout: 'La conexión está tardando más de lo esperado. Por favor, verifica tu internet e inténtalo de nuevo.',
      errorRateLimit: 'Has intentado registrarte demasiadas veces. Por favor, espera unos minutos.',
      errorUnexpected: 'Ocurrió un error inesperado al conectar con Supabase',
      errorOnboarding: 'Hubo un pequeño problema al guardar en la nube, pero no te preocupes. Haz clic en Finalizar de nuevo para entrar.',
      skipOnboarding: 'Saltar y entrar de todos modos'
    },
    'Français': {
      loginTitle: 'Bienvenue sur Deenly',
      signupTitle: 'Créez votre compte',
      loginSubtitle: 'Accédez à votre espace spirituel personnalisé',
      signupSubtitle: 'Rejoignez notre communauté d\'apprentissage',
      emailLabel: 'Adresse e-mail',
      passwordLabel: 'Mot de passe',
      nameLabel: 'Nom complet',
      forgotPass: 'Mot de passe oublié ?',
      loginBtn: 'Se connecter',
      signupBtn: 'S\'inscrire',
      createAcc: 'Créer un nouveau compte',
      haveAcc: 'Vous avez déjà un compte ? Se connecter',
      terms: 'En continuant, vous acceptez nos Conditions et notre Politique de Confidentialité',
      onboardingStep: 'Étape',
      finish: 'Terminer',
      next: 'Suivant',
      q1: 'Comment préférez-vous que je m\'adresse à vous ?',
      q1Options: ['Frère', 'Sœur'],
      q2: 'Quel est votre niveau de connaissance de l\'Islam ?',
      q2Options: ['Débutant', 'Intermédiaire', 'Avancé'],
      q3: 'Quels sujets vous intéressent le plus ?',
      q3Options: ['Histoire', 'Fiqh', 'Spiritualité', 'Coran', 'Hadith'],
      q4: 'Quel est votre objectif principal avec Deenly ?',
      q4Options: ['Apprendre', 'Résoudre des doutes', 'Connexion quotidienne'],
      confirmEmail: 'Votre compte a été créé avec succès ! Pour commencer votre expérience Deenly, veuillez vérifier votre e-mail via le lien que nous vous avons envoyé.',
      confirmEmailTitle: 'Presque là !',
      confirmEmailBtn: 'Aller à la connexion',
      errorSupabase: 'Supabase n\'est pas configuré. Veuillez ajouter les variables d\'environnement.',
      errorTimeout: 'La connexion prend plus de temps que prévu. Veuillez vérifier votre connexion internet et réessayer.',
      errorRateLimit: 'Vous avez essayé de vous inscrire trop de fois. Veuillez patienter quelques minutes.',
      errorUnexpected: 'Une erreur inattendue s\'est produite lors de la connexion à Supabase',
      errorOnboarding: 'Il y a eu un petit problème lors de l\'enregistrement dans le cloud, mais ne vous inquiétez pas. Cliquez à nouveau sur Terminer untuk entrer.',
      skipOnboarding: 'Passer et entrer quand même'
    },
    'العربية': {
      loginTitle: 'مرحباً بك في Deenly',
      signupTitle: 'أنشئ حسابك',
      loginSubtitle: 'الوصول إلى مساحتك الروحية المخصصة',
      signupSubtitle: 'انضم إلى مجتمع التعلم لدينا',
      emailLabel: 'البريد الإلكتروني',
      passwordLabel: 'كلمة المرور',
      nameLabel: 'الاسم الكامل',
      forgotPass: 'هل نسيت كلمة المرور؟',
      loginBtn: 'تسجيل الدخول',
      signupBtn: 'إنشاء حساب',
      createAcc: 'إنشاء حساب جديد',
      haveAcc: 'لديك حساب بالفعل؟ تسجيل الدخول',
      terms: 'بالاستمرار، فإنك توافق على الشروط وسياسة الخصوصية الخاصة بنا',
      onboardingStep: 'خطوة',
      finish: 'إنهاء',
      next: 'التالي',
      q1: 'كيف تفضل أن أخاطبك؟',
      q1Options: ['أخ', 'أخت'],
      q2: 'ما هو مستوى معرفتك بالإسلام؟',
      q2Options: ['مبتدئ', 'متوسط', 'متقدم'],
      q3: 'ما هي المواضيع التي تهمك أكثر؟',
      q3Options: ['التاريخ', 'الفقه', 'الروحانيات', 'القرآن', 'الحديث'],
      q4: 'ما هو هدفك الرئيسي من Deenly؟',
      q4Options: ['التعلم', 'حل الشكوك', 'الاتصال اليومي'],
      confirmEmail: 'لقد تم إنشاء حسابك بنجاح! لبدء تجربتك في Deenly، يرجى تفعيل حسابك عبر الرابط الذي أرسلناه إلى بريدك الإلكتروني.',
      confirmEmailTitle: 'لقد اقتربت من الوصول!',
      confirmEmailBtn: 'الذهاب لتسجيل الدخول',
      errorSupabase: 'لم يتم تكوين Supabase. يرجى إضافة متغيرات البيئة.',
      errorTimeout: 'الاتصال يستغرق وقتاً أطول من المتوقع. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.',
      errorRateLimit: 'لقد حاولت التسجيل مرات عديدة. يرجى الانتظار بضع دقائق.',
      errorUnexpected: 'حدث خطأ غير متوقع أثناء الاتصال بـ Supabase',
      errorOnboarding: 'حدثت مشكلة صغيرة أثناء الحفظ في السحابة، لكن لا تقلق. انقر فوق إنهاء مرة أخرى للدخول.',
      skipOnboarding: 'تخطي والدخول على أي حال'
    },
    'Indonesian': {
      loginTitle: 'Selamat Datang di Deenly',
      signupTitle: 'Buat akun Anda',
      loginSubtitle: 'Akses ruang spiritual pribadi Anda',
      signupSubtitle: 'Bergabunglah dengan komunitas belajar kami',
      emailLabel: 'Alamat Email',
      passwordLabel: 'Kata Sandi',
      nameLabel: 'Nama Lengkap',
      forgotPass: 'Lupa kata sandi Anda?',
      loginBtn: 'Masuk',
      signupBtn: 'Daftar',
      createAcc: 'Buat akun baru',
      haveAcc: 'Sudah punya akun? Masuk',
      terms: 'Dengan melanjutkan, Anda menyetujui Syarat dan Kebijakan Privasi kami',
      onboardingStep: 'Langkah',
      finish: 'Selesai',
      next: 'Berikutnya',
      q1: 'Bagaimana Anda ingin saya memanggil Anda?',
      q1Options: ['Saudara', 'Saudari'],
      q2: 'Apa tingkat pengetahuan Anda tentang Islam?',
      q2Options: ['Pemula', 'Menengah', 'Lanjutan'],
      q3: 'Topik apa yang paling menarik bagi Anda?',
      q3Options: ['Sejarah', 'Fiqh', 'Spiritualitas', 'Al-Quran', 'Hadits'],
      q4: 'Apa tujuan utama Anda dengan Deenly?',
      q4Options: ['Belajar', 'Menyelesaikan keraguan', 'Koneksi harian'],
      confirmEmail: 'Akun Anda telah berhasil dibuat! Untuk memulai pengalaman Deenly Anda, silakan verifikasi email Anda melalui tautan yang telah kami kirimkan.',
      confirmEmailTitle: 'Hampir sampai!',
      confirmEmailBtn: 'Pergi ke Login',
      errorSupabase: 'Supabase tidak dikonfigurasi. Silakan tambahkan variabel lingkungan.',
      errorTimeout: 'Koneksi memakan waktu lebih lama dari yang diharapkan. Silakan periksa internet Anda dan coba lagi.',
      errorRateLimit: 'Anda telah mencoba mendaftar terlalu sering. Harap tunggu beberapa menit.',
      errorUnexpected: 'Terjadi kesalahan tak terduga saat menghubungkan ke Supabase',
      errorOnboarding: 'Ada masalah kecil saat menyimpan ke cloud, tapi jangan khawatir. Klik Selesai lagi untuk masuk.',
      skipOnboarding: 'Lewati dan masuk saja'
    },
    'Deutsch': {
      loginTitle: 'Willkommen bei Deenly',
      signupTitle: 'Erstellen Sie Ihr Konto',
      loginSubtitle: 'Greifen Sie auf Ihren personalisierten spirituellen Raum zu',
      signupSubtitle: 'Treten Sie unserer Lerngemeinschaft bei',
      emailLabel: 'E-Mail-Adresse',
      passwordLabel: 'Passwort',
      nameLabel: 'Vollständiger Name',
      forgotPass: 'Passwort vergessen?',
      loginBtn: 'Anmelden',
      signupBtn: 'Registrieren',
      createAcc: 'Neues Konto erstellen',
      haveAcc: 'Haben Sie bereits ein Konto? Anmelden',
      terms: 'Durch Fortfahren stimmen Sie unseren Nutzungsbedingungen und Datenschutzbestimmungen zu',
      onboardingStep: 'Schritt',
      finish: 'Beenden',
      next: 'Weiter',
      q1: 'Wie soll ich Sie ansprechen?',
      q1Options: ['Bruder', 'Schwester'],
      q2: 'Wie hoch ist Ihr Wissensstand über den Islam?',
      q2Options: ['Anfänger', 'Fortgeschritten', 'Experte'],
      q3: 'Welche Themen interessieren Sie am meisten?',
      q3Options: ['Geschichte', 'Fiqh', 'Spiritualität', 'Koran', 'Hadith'],
      q4: 'Was ist Ihr Hauptziel mit Deenly?',
      q4Options: ['Lernen', 'Zweifel klären', 'Tägliche Verbindung'],
      confirmEmail: 'Ihr Konto wurde erfolgreich erstellt! Um Ihr Deenly-Erlebnis zu beginnen, bestätigen Sie bitte Ihre E-Mail über den Link, den wir Ihnen gesendet haben.',
      confirmEmailTitle: 'Fast geschafft!',
      confirmEmailBtn: 'Zum Login gehen',
      errorSupabase: 'Supabase ist nicht konfiguriert. Bitte fügen Sie die Umgebungsvariablen hinzu.',
      errorTimeout: 'Die Verbindung dauert länger als erwartet. Bitte überprüfen Sie Ihr Internet und versuchen Sie es erneut.',
      errorRateLimit: 'Sie haben zu oft versucht, sich zu registrieren. Bitte warten Sie einige Minuten.',
      errorUnexpected: 'Ein unerwarteter Fehler ist beim Verbinden mit Supabase aufgetreten',
      errorOnboarding: 'Es gab ein kleines Problem beim Speichern in der Cloud, aber keine Sorge. Klicken Sie erneut auf Beenden, um einzutreten.',
      skipOnboarding: 'Überspringen und trotzdem eintreten'
    }
  };

  const t = translations[language] || translations['Español'];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError(t.errorSupabase);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    console.log('Iniciando proceso de autenticación...', { isLogin, email });

    try {
      // Timeout de 30 segundos para evitar que se quede cargando infinitamente
      const authPromise = isLogin 
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              data: { 
                full_name: fullName,
                settings: { language }, // Save initial language preference
                needs_onboarding: true
              },
            },
          });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(t.errorTimeout)), 30000)
      );

      const { data, error }: any = await Promise.race([authPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('Respuesta de Supabase recibida:', data);
      
      if (!isLogin) {
        if (data?.user) {
          console.log('Usuario creado con éxito.');
          setSuccess(t.confirmEmail);
        } else {
          console.log('Registro exitoso, esperando confirmación de email.');
          setSuccess(t.confirmEmail);
        }
      }
    } catch (err: any) {
      console.error('Error en handleAuth:', err);
      if (err.message.includes('rate limit')) {
        setError(t.errorRateLimit);
      } else {
        setError(err.message || t.errorUnexpected);
      }
    } finally {
      setLoading(false);
      console.log('Proceso de autenticación finalizado.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a2e24] relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e24] via-[#1a4d3e] to-[#0a2e24]" />
      
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => {
            const languages = ['Español', 'English', 'Français', 'العربية', 'Indonesian', 'Deutsch'];
            const currentIndex = languages.indexOf(language);
            const next = languages[(currentIndex + 1) % languages.length];
            setLanguage(next);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all backdrop-blur-md"
        >
          <Globe size={14} className="text-deenly-gold" />
          {language}
        </button>
      </div>

      {/* Stars/Particles Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3}px`,
              height: `${Math.random() * 3}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <path d="M58 42C58 42 54 38 48 38C41.3726 38 36 43.3726 36 50C36 56.6274 41.3726 62 48 62C54 62 58 58 58 58C54 58 51 55 51 50C51 45 54 42 58 42Z" fill="#F0E68C" />
            <path d="M50 20L53 28L62 28L55 33L58 41L50 36L42 41L45 33L38 28L47 28L50 20Z" fill="#F0E68C" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold tracking-[0.2em] text-white mb-2 drop-shadow-lg">DEENLY</h1>
        <p className="text-emerald-100/70 text-sm tracking-widest uppercase font-medium">{language === 'Español' ? 'Tu compañero espiritual en el camino del conocimiento' : (language === 'English' ? 'Your spiritual companion on the path of knowledge' : (language === 'Français' ? 'Votre compagnon spirituel sur le chemin de la connaissance' : (language === 'العربية' ? 'رفيقك الروحي في طريق المعرفة' : (language === 'Indonesian' ? 'Teman spiritual Anda di jalan pengetahuan' : 'Ihr spiritueller Begleiter auf dem Weg des Wissens'))))}</p>
      </motion.div>

      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 rounded-[40px] shadow-2xl bg-white/10 backdrop-blur-2xl border border-white/20 relative z-10 overflow-hidden"
      >
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">
            {success ? (t.confirmEmailTitle || t.signupTitle) : (isLogin ? t.loginTitle : t.signupTitle)}
          </h2>
          <p className="text-white/60 text-sm">
            {success ? '' : (isLogin ? t.loginSubtitle : t.signupSubtitle)}
          </p>
          <div className="flex justify-center mt-4">
            <div className="h-px w-12 bg-white/20" />
            <div className="mx-2 text-white/20 text-[10px]">✦</div>
            <div className="h-px w-12 bg-white/20" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success-view"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-4 space-y-8"
            >
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                  <Mail className="text-emerald-400 relative z-10" size={48} />
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-white/80 text-base leading-relaxed px-2">
                  {success}
                </p>
                <p className="text-white/40 text-xs italic">
                  {language === 'Español' ? 'No olvides revisar tu carpeta de spam.' : 'Don\'t forget to check your spam folder.'}
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setSuccess(null);
                    setIsLogin(true);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-900/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {t.confirmEmailBtn}
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form 
              key="auth-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleAuth} 
              className="space-y-6"
            >
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">{t.nameLabel}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                      <input
                        type="text"
                        required={!isLogin}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                        placeholder={t.nameLabel}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">{t.emailLabel}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                    placeholder={t.emailLabel}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">{t.passwordLabel}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                    placeholder={t.passwordLabel}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button type="button" className="text-xs text-white/40 hover:text-white transition-colors">
                    {t.forgotPass}
                  </button>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm"
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xl shadow-emerald-900/40 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {isLogin ? t.loginBtn : t.signupBtn}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {!success && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a4d3e] px-2 text-white/30">{language === 'العربية' ? 'أو' : (language === 'Indonesian' ? 'atau' : (language === 'Deutsch' ? 'oder' : (language === 'Français' ? 'ou' : 'o')))}</span>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full py-4 rounded-2xl border border-white/10 text-white/80 font-medium hover:bg-white/5 transition-all active:scale-[0.98]"
              >
                {isLogin ? t.createAcc : t.haveAcc}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-white/30 leading-relaxed">
                {t.terms}
              </p>
            </div>
          </>
        )}
      </motion.div>

      {/* Footer Quote */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center relative z-10 max-w-lg"
      >
        <p className="text-white/80 text-xl font-serif mb-2" dir="rtl">
          وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ
        </p>
        <p className="text-white/40 text-xs italic">
          {language === 'Español' ? '"Y cuando mis siervos te pregunten por Mí, diles que estoy cerca..." (Corán 2:186)' : (language === 'English' ? '"And when My servants ask you concerning Me, then surely I am near..." (Quran 2:186)' : (language === 'Français' ? '"Et quand Mes serviteurs t\'interrogent sur Moi, alors Je suis proche..." (Coran 2:186)' : (language === 'العربية' ? '"وإذا سألك عبادي عني فإني قريب..." (القرآن 2:186)' : (language === 'Indonesian' ? '"Dan apabila hamba-hamba-Ku bertanya kepadamu tentang Aku, maka sesungguhnya Aku dekat..." (Al-Quran 2:186)' : '"Und wenn Meine Diener dich nach Mir fragen, siehe, Ich bin nahe..." (Koran 2:186)'))))}
        </p>
      </motion.div>
    </div>
  );
};
