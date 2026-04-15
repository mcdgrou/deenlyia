import { supabase } from '../lib/supabase';

console.log(">>> [GEMINI SERVICE] Initializing v2 (Server-side only)...");

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

export const getIslamicContext = async (query: string): Promise<string> => {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("Error fetching Islamic context:", error);
    return "";
  }
};

export const getMuftiResponse = async (
  prompt: string, 
  history: ChatMessage[] = [], 
  onboarding: any = null, 
  isPremium: boolean = false, 
  memories: string[] = [],
  language: string = 'Español',
  onChunk?: (chunk: string) => void,
  context: string = ""
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Debes iniciar sesión para usar el asistente.");

    // Call our server-side API instead of calling Gemini directly
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: prompt,
        history: history.map(m => ({
          role: m.role,
          content: m.parts[0].text
        })),
        isPremium,
        language
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || "Error al llamar al asistente");
    }

    const data = await response.json();
    const fullText = data.text;

    if (!fullText) {
      throw new Error("El asistente no pudo generar una respuesta en este momento.");
    }

    // Since we are not streaming from the server yet, we just call onChunk once if provided
    if (onChunk) onChunk(fullText);

    return fullText;
  } catch (error: any) {
    console.error(`Error calling Chat API:`, error);
    throw error;
  }
};

export const getSurahDetails = async (surahNumber: number, surahName: string, language: string) => {
  try {
    const prompt = `Proporciona detalles profundos sobre la Sura ${surahNumber} (${surahName}) del Corán en ${language}. 
    Incluye:
    1. Significado detallado del nombre.
    2. Contexto histórico de la revelación (Asbab al-Nuzul).
    3. Temas clave tratados en la Sura.
    4. Importancia espiritual o beneficios mencionados en la tradición.
    RESPONDE ÚNICAMENTE EN FORMATO JSON con estas llaves: meaning, context, themes, benefits.`;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt })
    });

    if (!response.ok) throw new Error("Error fetching surah details");
    
    const data = await response.json();
    // Try to parse JSON from the response text if it's wrapped in markdown
    let text = data.text;
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    // Return a fallback object so the UI doesn't break
    return {
      meaning: "Información no disponible",
      context: "No se pudo cargar el contexto histórico.",
      themes: ["Error al cargar temas"],
      benefits: "Por favor, intenta de nuevo más tarde."
    };
  }
};
