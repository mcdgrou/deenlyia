import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper for retrying with exponential backoff
const withRetry = async (fn: () => Promise<any>, maxRetries = 3, initialDelay = 2000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = (error.message || "").toLowerCase();
      if (
        errorMsg.includes('429') || 
        errorMsg.includes('503') ||
        errorMsg.includes('resource_exhausted') || 
        errorMsg.includes('quota') ||
        errorMsg.includes('unavailable') ||
        (errorMsg.includes('json') && errorMsg.includes('unexpected end'))
      ) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Error recuperable detectado (${errorMsg}). Reintentando en ${delay}ms... (Intento ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

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

    const userName = onboarding?.full_name || "hermano";
    const onboardingInfo = onboarding ? `
- Nivel de conocimiento: ${onboarding.knowledgeLevel || 'Principiante'}
- Intereses: ${onboarding.interests?.join(', ') || 'General'}
- Objetivo: ${onboarding.goal || 'Aprender'}` : "";

    const premiumContext = isPremium 
      ? "\n- El usuario es PREMIUM. Proporciona respuestas muy detalladas, con múltiples referencias a Hadices y versículos del Corán, y un tono más profundo y académico pero accesible."
      : "\n- El usuario es de nivel GRATUITO. Proporciona respuestas concisas, claras y directas, con al menos una referencia clave.";

    const memoryContext = memories?.length > 0 
      ? `\n\nINFORMACIÓN QUE RECUERDAS SOBRE EL USUARIO:\n${memories.map((m: string) => `- ${m}`).join('\n')}`
      : "";

    const islamicContext = context 
      ? `\n\nUSA ESTA INFORMACIÓN ISLÁMICA AUTÉNTICA COMO CONTEXTO PRINCIPAL PARA TU RESPUESTA:\n${context}\n\nResponde basándote en esta información y en el conocimiento auténtico del Corán y la Sunnah.`
      : "";

    const currentDate = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const systemInstruction = `Eres Deenly, un sabio y compasivo compañero espiritual islámico. Guía a tus hermanos con respeto, sabiduría y empatía, basándote en fuentes auténticas.
        
Tu tono es el de un mentor espiritual: respetuoso, calmado e inspirador. Evita lenguaje informal. Tu prioridad es el Adab (etiqueta islámica).

FECHA ACTUAL: ${currentDate}

1. IDENTIDAD Y RESPETO:
- Saluda con respeto: "As-salamu alaykum, ${userName}. Es un honor acompañarte. ¿En qué puedo servirte hoy?"
- Creador: "MCDGROUP DEV" (muhadibbasy13@gmail.com). Contacto: MCDGROUP.DEV@GMAIL.COM.
- Usa la máxima devoción al mencionar a Allah (SWT) o al Profeta (SAW).

2. PERSONALIZACIÓN:
${onboardingInfo}
- Adapta tus explicaciones según esta información.

3. LÍMITES:
- No emites fatwas. Sugiere consultar imames para casos complejos.
- No das consejos médicos ni legales.

4. FUENTES Y VERACIDAD:
- PROHIBIDO INVENTAR. Si no tienes certeza, usa Google Search.
- EVENTOS ACTUALES: Investiga siempre fechas de Eid, Ramadán, etc., usando Google Search antes de responder.
- Básate en Corán y Hadices auténticos (Bujari, Muslim). Respeta las 4 escuelas jurídicas.
- Si no sabes algo, di con humildad que solo Allah posee el conocimiento absoluto.
${islamicContext}

5. ESTRUCTURA:
1. Saludo cálido.
2. Explicación profunda y fundamentada.
3. Evidencia textual (Corán/Hadiz).
4. Reflexión espiritual final.
${premiumContext}
${memoryContext}`;

    // Call Gemini API directly from frontend
    const primaryModel = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    const fallbackModel = "gemini-3-flash-preview";

    const contents = [
      ...history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    let fullText = "";
    
    try {
      const stream = await ai.models.generateContentStream({
        model: primaryModel,
        contents,
        config: {
          systemInstruction,
          temperature: isPremium ? 0.8 : 0.7,
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          if (onChunk) onChunk(chunk.text);
        }
      }
    } catch (primaryError: any) {
      console.warn(`Primary model (${primaryModel}) failed, trying fallback (${fallbackModel}):`, primaryError.message);
      
      const stream = await ai.models.generateContentStream({
        model: fallbackModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      fullText = ""; // Reset for fallback
      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          if (onChunk) onChunk(chunk.text);
        }
      }
    }

    if (!fullText) {
      throw new Error("El asistente no pudo generar una respuesta en este momento.");
    }

    return fullText;
  } catch (error: any) {
    console.error(`Error calling Gemini API:`, error);
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
    4. Importancia espiritual o beneficios mencionados en la tradición.`;

    const response = await withRetry(async () => {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              meaning: { type: Type.STRING },
              context: { type: Type.STRING },
              keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
              historicalSignificance: { type: Type.STRING }
            },
            required: ["meaning", "context", "keyThemes", "historicalSignificance"]
          }
        }
      });

      if (!result || !result.text) throw new Error("No response from AI");
      return JSON.parse(result.text);
    });

    return response;
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    throw error;
  }
};
