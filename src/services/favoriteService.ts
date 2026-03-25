import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Favorite {
  id: string;
  user_id: string;
  surah_number: number;
  ayah_number: number;
  surah_name: string;
  ayah_text: string;
  translation_text: string;
  created_at: string;
}

export const favoriteService = {
  async getFavorites() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(`Error al obtener favoritos: ${error.message}`);
      return data as Favorite[];
    } catch (error: any) {
      console.error('Error in getFavorites:', error);
      throw error;
    }
  },

  async addFavorite(surahNumber: number, ayahNumber: number, surahName: string, ayahText: string, translationText: string) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para guardar favoritos');

      const { data, error } = await supabase
        .from('favorites')
        .insert([{ 
          user_id: user.id, 
          surah_number: surahNumber, 
          ayah_number: ayahNumber, 
          surah_name: surahName,
          ayah_text: ayahText,
          translation_text: translationText
        }])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return null; 
        }
        throw new Error(`Error al añadir favorito: ${error.message}`);
      }
      return data as Favorite;
    } catch (error: any) {
      console.error('Error in addFavorite:', error);
      throw error;
    }
  },

  async removeFavorite(surahNumber: number, ayahNumber: number) {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para eliminar favoritos');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('surah_number', surahNumber)
        .eq('ayah_number', ayahNumber);
      
      if (error) throw new Error(`Error al eliminar favorito: ${error.message}`);
    } catch (error: any) {
      console.error('Error in removeFavorite:', error);
      throw error;
    }
  },

  async isFavorite(surahNumber: number, ayahNumber: number) {
    if (!isSupabaseConfigured) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('surah_number', surahNumber)
        .eq('ayah_number', ayahNumber)
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    } catch (error) {
      console.error('Error in isFavorite:', error);
      return false;
    }
  }
};
