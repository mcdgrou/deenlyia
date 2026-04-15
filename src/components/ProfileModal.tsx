import React, { useState, useEffect } from 'react';
import { X, User, Mail, ShieldCheck, Zap, LogOut, Calendar, Heart, BookOpen, TrendingUp, ChevronRight, Trash2, Trophy, Edit2, Lock, Save, AlertCircle, CheckCircle2, Settings, Flame, MessageSquare, Search, FileText } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { favoriteService, type Favorite } from '../services/favoriteService';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (modalName: string) => void;
  session: Session | null;
  darkMode: boolean;
  isPremium: boolean;
  t: any;
  language: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onNavigate, session, darkMode, isPremium, t, language }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'favorites' | 'progress' | 'settings'>('profile');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session?.user.user_metadata?.full_name || '');
  const [editEmail, setEditEmail] = useState(session?.user.email || '');
  const [editPassword, setEditPassword] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Stats for progress tab
  const stats = session?.user.user_metadata?.stats || {
    messagesSent: 0,
    surahsRead: 0,
    streak: 0,
    quranSearches: 0,
    hadithsRead: 0
  };

  useEffect(() => {
    if (isOpen) {
      setEditName(session?.user.user_metadata?.full_name || '');
      setEditEmail(session?.user.email || '');
      setEditPassword('');
      setUpdateStatus(null);
      setIsEditing(false);
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (isOpen && activeTab === 'favorites') {
      loadFavorites();
    }
  }, [isOpen, activeTab]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favs = await favoriteService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (surahNumber: number, ayahNumber: number) => {
    try {
      await favoriteService.removeFavorite(surahNumber, ayahNumber);
      setFavorites(prev => prev.filter(f => !(f.surah_number === surahNumber && f.ayah_number === ayahNumber)));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    setUpdateStatus(null);
    try {
      const updates: any = {
        data: { 
          ...session?.user.user_metadata,
          full_name: editName 
        }
      };

      if (editEmail !== session?.user.email) {
        updates.email = editEmail;
      }

      if (editPassword) {
        updates.password = editPassword;
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      setUpdateStatus({
        type: 'success',
        message: language === 'Español' 
          ? 'Perfil actualizado correctamente. Revisa tu correo si cambiaste el email.' 
          : 'Profile updated successfully. Check your email if you changed it.'
      });
      setIsEditing(false);
      setEditPassword('');
    } catch (error: any) {
      setUpdateStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !session) return null;

  const user = session.user;
  const joinDate = new Date(user.created_at).toLocaleDateString(language === 'Español' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tabs = [
    { id: 'profile', label: t.profile || 'Perfil', icon: User },
    { id: 'favorites', label: t.favorites || 'Favoritos', icon: Heart },
    { id: 'progress', label: t.progress || 'Progreso', icon: TrendingUp },
    { id: 'settings', label: t.settings || 'Ajustes', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-2xl h-[80vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
              <User className="text-white" size={20} />
            </div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
              {t.myProfile || 'Mi Perfil'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <button 
                onClick={() => onNavigate('settings')}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
                title={t.settings}
              >
                <TrendingUp size={20} className="rotate-90" />
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

        {/* Tabs */}
        <div className="flex p-2 gap-1 border-b border-deenly-gold/10 bg-deenly-gold/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20'
                  : darkMode ? 'text-white/40 hover:bg-white/5 hover:text-white' : 'text-black/40 hover:bg-black/5 hover:text-black'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold border-2 border-deenly-gold/20 mb-4 relative">
                    <User size={48} />
                    {isPremium && (
                      <div className="absolute -right-1 -bottom-1 bg-deenly-gold text-white p-1.5 rounded-full shadow-lg">
                        <Zap size={16} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                      {user.user_metadata?.full_name || 'Usuario de Deenly'}
                    </h3>
                    {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 rounded-lg hover:bg-deenly-gold/10 text-deenly-gold transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-50 font-medium uppercase tracking-widest mt-1">
                    <ShieldCheck size={12} className="text-deenly-gold" />
                    <span>{isPremium ? t.premiumMember || 'Miembro Premium' : t.freeAccount || 'Cuenta Gratuita'}</span>
                  </div>
                </div>

                {updateStatus && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    updateStatus.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {updateStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} /> }
                    <p className="text-xs font-medium">{updateStatus.message}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">
                          {t.fullName || 'Nombre Completo'}
                        </label>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border border-deenly-gold/20 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-white'}`}>
                          <User size={18} className="text-deenly-gold" />
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                            placeholder={t.fullName || 'Nombre Completo'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">
                          {t.email || 'Correo Electrónico'}
                        </label>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border border-deenly-gold/20 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-white'}`}>
                          <Mail size={18} className="text-deenly-gold" />
                          <input 
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                            placeholder={t.email || 'Correo Electrónico'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">
                          {t.newPassword || 'Nueva Contraseña (opcional)'}
                        </label>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border border-deenly-gold/20 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-white'}`}>
                          <Lock size={18} className="text-deenly-gold" />
                          <input 
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setIsEditing(false)}
                          disabled={isUpdating}
                          className={`flex-1 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                            darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                          }`}
                        >
                          {t.cancel || 'Cancelar'}
                        </button>
                        <button 
                          onClick={handleUpdateProfile}
                          disabled={isUpdating}
                          className="flex-1 py-3 bg-deenly-gold text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-deenly-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          {isUpdating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          {t.saveChanges || 'Guardar Cambios'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                            <Mail size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.email || 'Correo Electrónico'}</p>
                            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.memberSince || 'Miembro desde'}</p>
                            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{joinDate}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full py-4 flex items-center justify-center gap-3 text-red-500 font-bold text-xs uppercase tracking-widest border border-red-500/20 rounded-2xl hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut size={18} />
                    {t.logout || 'Cerrar Sesión'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deenly-gold"></div>
                  </div>
                ) : favorites.length > 0 ? (
                  favorites.map((fav) => (
                    <div 
                      key={fav.id}
                      className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold text-[10px] font-bold">
                            {fav.ayah_number}
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest text-deenly-gold`}>
                            {fav.surah_name} • {fav.surah_number}:{fav.ayah_number}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFavorite(fav.surah_number, fav.ayah_number)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className={`text-xl text-right mb-4 font-serif leading-loose ${darkMode ? 'text-white' : 'text-deenly-green'}`} dir="rtl">
                        {fav.ayah_text}
                      </p>
                      <p className={`text-sm leading-relaxed opacity-70 italic ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                        "{fav.translation_text}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-50">
                    <Heart size={48} className="mx-auto mb-4 text-deenly-gold/20" />
                    <p className="text-sm font-medium">{t.noFavoritesYet || 'Aún no tienes favoritos'}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <Heart size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {favorites.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.favoritesCount || 'Ayas Favoritas'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <Flame size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {stats.streak || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.streakDays || 'Días de Racha'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <MessageSquare size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {stats.messagesSent || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.messagesCount || 'Mensajes Enviados'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <BookOpen size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {stats.surahsRead || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.surahsReadCount || 'Suras Leídas'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <Search size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {stats.quranSearches || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.quranSearchesCount || 'Búsquedas'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <FileText size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {stats.hadithsRead || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.hadithsReadCount || 'Hadices Leídos'}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onNavigate?.('achievements')}
                  className={`w-full p-6 rounded-3xl border border-deenly-gold/20 flex items-center justify-between group transition-all duration-300 ${
                    darkMode ? 'bg-deenly-gold/10 hover:bg-deenly-gold/20' : 'bg-deenly-gold/5 hover:bg-deenly-gold/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
                      <Trophy className="text-white" size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                        {t.achievementsTitle || 'Logros y Premios'}
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                        {t.viewBadges || 'Ver medallas y recompensas'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-deenly-gold transition-transform group-hover:translate-x-1" />
                </button>

                <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-gold/5' : 'bg-deenly-gold/5'}`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-4 flex items-center gap-2">
                    <TrendingUp size={16} />
                    {t.learningGoals || 'Objetivos de Aprendizaje'}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-deenly-gold" />
                        <span className={`text-sm font-medium ${darkMode ? 'text-white/80' : 'text-deenly-green/80'}`}>
                          {t.knowledgeLevel || 'Nivel'}: {user.user_metadata?.onboarding?.knowledgeLevel || 'Principiante'}
                        </span>
                      </div>
                    </div>
                    {user.user_metadata?.onboarding?.interests?.map((interest: string, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-deenly-gold" />
                          <span className={`text-sm font-medium ${darkMode ? 'text-white/80' : 'text-deenly-green/80'}`}>
                            {interest}
                          </span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold px-2">
                    {t.quickSettings || 'Ajustes Rápidos'}
                  </h4>
                  
                  <button 
                    onClick={() => onNavigate?.('settings')}
                    className={`w-full p-4 rounded-2xl border border-deenly-gold/10 flex items-center justify-between transition-all ${
                      darkMode ? 'bg-deenly-dark-bg/50 hover:bg-deenly-dark-bg' : 'bg-white/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                        <Settings size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{t.allSettings || 'Todos los Ajustes'}</p>
                        <p className="text-[10px] opacity-50">{t.allSettingsDesc || 'Idioma, notificaciones, apariencia y más'}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-deenly-gold" />
                  </button>

                  <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{t.privacySettings || 'Privacidad'}</p>
                          <p className="text-[10px] opacity-50">{t.privacySettingsDesc || 'Gestiona tus datos y permisos'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onNavigate?.('settings')}
                        className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest hover:underline"
                      >
                        {t.manage || 'Gestionar'}
                      </button>
                    </div>
                  </div>

                  {!isPremium && (
                    <button 
                      onClick={() => onNavigate?.('plans')}
                      className="w-full p-6 rounded-3xl bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20 flex items-center justify-between group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
                        <Zap size={80} fill="currentColor" />
                      </div>
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Zap className="text-white" size={24} fill="currentColor" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold">{t.upgradeToPro || 'Actualizar a Deenly Pro'}</h3>
                          <p className="text-[10px] opacity-80">{t.upgradeDesc || 'IA ilimitada, temas exclusivos y más'}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="relative z-10 transition-transform group-hover:translate-x-1" />
                    </button>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold px-2">
                    {t.support || 'Soporte'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button className={`p-4 rounded-2xl border border-deenly-gold/10 text-center transition-all ${darkMode ? 'bg-deenly-dark-bg/50 hover:bg-deenly-dark-bg' : 'bg-white/50 hover:bg-white'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">{t.helpCenter || 'Ayuda'}</p>
                    </button>
                    <button className={`p-4 rounded-2xl border border-deenly-gold/10 text-center transition-all ${darkMode ? 'bg-deenly-dark-bg/50 hover:bg-deenly-dark-bg' : 'bg-white/50 hover:bg-white'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">{t.contactUs || 'Contacto'}</p>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
