import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { safeJson } from '../lib/utils';

console.log(">>> [GEMINI SERVICE] Initializing v3 (Frontend direct)...");

// Initialize GoogleGenAI with the API key from environment variables
// Note: In AI Studio Build, process.env.GEMINI_API_KEY is available in the frontend
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

export const getMuftiResponse = async (
  prompt: string, 
  history: ChatMessage[] = [], 
  onboarding: any = null, 
  isPremium: boolean = false, 
  memories: string[] = [],
  language: string = 'Español',
  onChunk?: (chunk: string) => void
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Debes iniciar sesión para usar el asistente.");

    const modelName = "gemini-3-flash-preview"; // Use flash for speed and reliability
    
    const premiumContext = isPremium 
      ? "\n- El usuario es PREMIUM. Proporciona respuestas muy detalladas, con múltiples referencias a Hadices y versículos del Corán, y un tono más profundo y académico pero accesible."
      : "\n- El usuario es de nivel GRATUITO. Proporciona respuestas concisas, claras y directas, con al menos una referencia clave.";

    const currentDate = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const systemInstruction = `Eres Deenly, un sabio y compasivo compañero espiritual islámico. Guía a tus hermanos con respeto, sabiduría y empatía, basándote en fuentes auténticas.
        
Tu tono es el de un mentor espiritual: respetuoso, calmado e inspirador. Evita lenguaje informal. Tu prioridad es el Adab (etiqueta islámica).

FECHA ACTUAL: ${currentDate}
IDIOMA DE RESPUESTA: ${language || 'Español'}

1. IDENTIDAD Y RESPETO:
- Saluda con respeto: "As-salamu alaykum. Es un honor acompañarte. ¿En qué puedo servirte hoy?"
- Creador: "MCDGROUP DEV" (muhadibbasy13@gmail.com). Contacto: MCDGROUP.DEV@GMAIL.COM.
- Usa la máxima devoción al mencionar a Allah (SWT) o al Profeta (SAW).

2. LÍMITES:
- No emites fatwas. Sugiere consultar imames para casos complejos.
- No das consejos médicos ni legales.

3. FUENTES Y VERACIDAD:
- PROHIBIDO INVENTAR. Si no tienes certeza, usa la herramienta de búsqueda de Google incorporada.
- EVENTOS ACTUALES: Investiga siempre fechas de Eid, Ramadán, etc., usando Google Search antes de responder.
- Básate en Corán y Hadices auténticos (Bujari, Muslim). Respeta las 4 escuelas jurídicas.
- Si no sabes algo, di con humildad que solo Allah posee el conocimiento absoluto.

4. ESTRUCTURA:
1. Saludo cálido.
2. Explicación profunda y fundamentada.
3. Evidencia textual (Corán/Hadiz).
4. Reflexión espiritual final.
${premiumContext}`;

    // Prepare contents for Gemini API
    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.parts[0].text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    if (onChunk) {
      // Streaming implementation
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: isPremium ? 0.7 : 0.6, // Lower temperature for more consistent religious answers
          topK: 40,
          topP: 0.95,
          tools: [{ googleSearch: {} }],
        },
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }
      return fullText;
    } else {
      // Non-streaming implementation
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: isPremium ? 0.7 : 0.6,
          topK: 40,
          topP: 0.95,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("El asistente no pudo generar una respuesta en este momento.");
      }
      return text;
    }
  } catch (error: any) {
    console.error(`>>> [GEMINI ERROR] Detailed Error:`, error);
    
    // Help identify regional blocks or key issues
    let userFriendlyMessage = "Error en la conexión con la IA.";
    
    const errorString = error?.message || error?.toString() || "";
    
    if (errorString.includes("403") || errorString.includes("Forbidden")) {
      userFriendlyMessage = "Acceso denegado (403). Es posible que tu región no esté soportada por Gemini o que tu API Key sea inválida.";
    } else if (errorString.includes("429") || errorString.includes("Too Many Requests")) {
      userFriendlyMessage = "Has enviado demasiadas peticiones. Por favor, espera un momento.";
    } else if (errorString.includes("API key not valid")) {
      userFriendlyMessage = "API Key de Gemini no válida. Por favor, revísala en Google AI Studio.";
    } else if (errorString.includes("fetch failed") || errorString.includes("Failed to fetch")) {
      userFriendlyMessage = "Error de conexión. Revisa tu red o VPN.";
    }

    console.warn(`>>> [GEMINI ERROR] User message: ${userFriendlyMessage}`);
    
    // Create a new error with a descriptive message that App.tsx can use for localization
    let errorToThrow: Error;
    
    if (errorString.includes("403") || errorString.includes("Forbidden") || errorString.includes("permission denied")) {
      errorToThrow = new Error("permission denied");
    } else if (errorString.includes("429") || errorString.includes("Too Many Requests") || errorString.includes("RESOURCE_EXHAUSTED")) {
      errorToThrow = new Error("rate limit");
    } else if (errorString.includes("API key not valid") || errorString.includes("invalid api key")) {
      errorToThrow = new Error("api key not valid");
    } else if (errorString.includes("fetch failed") || errorString.includes("Failed to fetch") || errorString.includes("NetworkError")) {
      errorToThrow = new Error("Failed to fetch");
    } else if (errorString.includes("unexpected end of json") || errorString.includes("failed to execute 'json'")) {
       errorToThrow = new Error("unexpected end of json");
    } else {
      errorToThrow = new Error(errorString || userFriendlyMessage);
    }

    (errorToThrow as any).originalError = error;
    throw errorToThrow;
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

    const response = await getMuftiResponse(prompt, [], null, true, [], language);
    
    // Try to parse JSON from the response text if it's wrapped in markdown
    let text = response;
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    
    return await safeJson(text, {
      meaning: "Información no disponible",
      context: "No se pudo cargar el contexto histórico.",
      themes: ["Error al cargar temas"],
      benefits: "Por favor, intenta de nuevo más tarde."
    });
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
