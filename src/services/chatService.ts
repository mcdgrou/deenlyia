import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const chatService = {
  async getChats() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(`Error al obtener chats: ${error.message}`);
      return data as Chat[];
    } catch (error: any) {
      console.error('Error in getChats:', error);
      throw error;
    }
  },

  async getMessages(chatId: string) {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw new Error(`Error al obtener mensajes: ${error.message}`);
      return data as Message[];
    } catch (error: any) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  },

  async createChat(title: string = 'Nueva conversación') {
    if (!isSupabaseConfigured) {
      return {
        id: Date.now().toString(),
        user_id: 'local',
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Chat;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          id: Date.now().toString(),
          user_id: 'local',
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Chat;
      }

      const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, title }])
        .select()
        .single();
      
      if (error) throw new Error(`Error al crear chat: ${error.message}`);
      return data as Chat;
    } catch (error: any) {
      console.error('Error in createChat:', error);
      throw error;
    }
  },

  async updateChatTitle(chatId: string, title: string) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId);
      
      if (error) throw new Error(`Error al actualizar título: ${error.message}`);
    } catch (error: any) {
      console.error('Error in updateChatTitle:', error);
      throw error;
    }
  },

  async deleteChat(chatId: string) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      
      if (error) throw new Error(`Error al eliminar chat: ${error.message}`);
    } catch (error: any) {
      console.error('Error in deleteChat:', error);
      throw error;
    }
  },

  async addMessage(chatId: string, role: 'user' | 'assistant', content: string) {
    if (!isSupabaseConfigured) {
      return {
        id: Date.now().toString(),
        chat_id: chatId,
        user_id: 'local',
        role,
        content,
        created_at: new Date().toISOString()
      } as Message;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          id: Date.now().toString(),
          chat_id: chatId,
          user_id: 'local',
          role,
          content,
          created_at: new Date().toISOString()
        } as Message;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([{ 
          chat_id: chatId, 
          user_id: user.id, 
          role, 
          content 
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting message:', error);
        if (error.code === 'PGRST204' || error.message?.includes('user_id')) {
          const { data: retryData, error: retryError } = await supabase
            .from('messages')
            .insert([{ 
              chat_id: chatId, 
              user_id: user.id, 
              role, 
              content 
            }])
            .select()
            .single();
          if (retryError) throw new Error(`Error al guardar mensaje (reintento): ${retryError.message}`);
          return retryData as Message;
        }
        throw new Error(`Error al guardar mensaje: ${error.message}`);
      }

      return data as Message;
    } catch (error: any) {
      console.error('Error in addMessage:', error);
      throw error;
    }
  },

  async clearAllChats() {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para limpiar el historial');

      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw new Error(`Error al limpiar historial: ${error.message}`);
    } catch (error: any) {
      console.error('Error in clearAllChats:', error);
      throw error;
    }
  },

  async deleteMessage(messageId: string) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw new Error(`Error al eliminar mensaje: ${error.message}`);
    } catch (error: any) {
      console.error('Error in deleteMessage:', error);
      throw error;
    }
  },

  async updateMessage(messageId: string, content: string) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId);
      
      if (error) throw new Error(`Error al actualizar mensaje: ${error.message}`);
    } catch (error: any) {
      console.error('Error in updateMessage:', error);
      throw error;
    }
  }
};
