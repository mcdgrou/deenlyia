import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// The platform provides process.env.GEMINI_API_KEY automatically
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Gemini API Key present:', !!apiKey);
  if (!apiKey) {
    throw new Error("La clave de API de Gemini no está configurada. Por favor, revisa la configuración.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

// Helper for retrying with exponential backoff for 429 errors
const withRetry = async (fn: () => Promise<any>, maxRetries = 2, initialDelay = 2000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = (error.message || "").toLowerCase();
      // Only retry on 429 (Quota Exceeded)
      if (errorMsg.includes('429') || errorMsg.includes('resource_exhausted') || errorMsg.includes('quota')) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Cuota excedida. Reintentando en ${delay}ms... (Intento ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const getMuftiResponse = async (
  prompt: string, 
  history: ChatMessage[] = [], 
  onboarding: any = null, 
  isPremium: boolean = false, 
  memories: string[] = []
) => {
  try {
    const ai = getAI();
    const modelName = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

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

5. ESTRUCTURA:
1. Saludo cálido.
2. Explicación profunda y fundamentada.
3. Evidencia textual (Corán/Hadiz).
4. Reflexión espiritual final.
${premiumContext}
${memoryContext}`;

    const contents = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

      const response = await withRetry(async () => {
        console.log('Calling Gemini API with model:', modelName);
        return await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction,
            temperature: 0.8,
            maxOutputTokens: 2048,
            // tools: [{ googleSearch: {} }],
          },
        });
      });

    if (!response || !response.text) {
      throw new Error("No se recibió respuesta de Gemini.");
    }

    return response.text;
  } catch (error: any) {
    console.error(`Error calling Gemini API:`, error);
    const errorMsg = (error.message || error.toString() || "").toLowerCase();
    console.log('Gemini Error Details:', { message: error.message, stack: error.stack, errorMsg });
    
    if (errorMsg.includes('429') || errorMsg.includes('resource_exhausted') || errorMsg.includes('quota')) {
      throw new Error("Has excedido tu cuota actual de la API de Gemini. Por favor, espera 1-2 minutos antes de intentarlo de nuevo.");
    }

    if (errorMsg.includes('expired') || errorMsg.includes('api_key_invalid') || errorMsg.includes('key not valid')) {
      throw new Error("La clave de API de Gemini ha expirado o no es válida.");
    }
    
    throw error;
  }
};

export const getSurahDetails = async (surahNumber: number, surahName: string, language: string) => {
  try {
    const ai = getAI();
    const prompt = `Proporciona detalles profundos sobre la Sura ${surahNumber} (${surahName}) del Corán en ${language}. 
    Incluye:
    1. Significado detallado del nombre.
    2. Contexto histórico de la revelación (Asbab al-Nuzul).
    3. Temas clave tratados en la Sura.
    4. Importancia espiritual o beneficios mencionados en la tradición.`;

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              meaning: { type: "STRING" },
              context: { type: "STRING" },
              keyThemes: { type: "ARRAY", items: { type: "STRING" } },
              historicalSignificance: { type: "STRING" }
            },
            required: ["meaning", "context", "keyThemes", "historicalSignificance"]
          }
        }
      });
    });

    if (!response || !response.text) {
      throw new Error("No se recibió respuesta de Gemini.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    throw error;
  }
};
