import { supabase } from '../lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

// Helper for retrying with exponential backoff
const withRetry = async (fn: () => Promise<any>, maxRetries = 2, initialDelay = 2000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = (error.message || "").toLowerCase();
      if (
        errorMsg.includes('429') || 
        errorMsg.includes('resource_exhausted') || 
        errorMsg.includes('quota') ||
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

export const getMuftiResponse = async (
  prompt: string, 
  history: ChatMessage[] = [], 
  onboarding: any = null, 
  isPremium: boolean = false, 
  memories: string[] = []
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

    const response = await withRetry(async () => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt,
          history,
          systemInstruction,
          isPremium,
          memories
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || "Error en la respuesta del servidor");
      }

      return await res.json();
    });

    return response.text;
  } catch (error: any) {
    console.error(`Error calling Chat API:`, error);
    throw error;
  }
};

export const getSurahDetails = async (surahNumber: number, surahName: string, language: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Debes iniciar sesión.");

    const response = await withRetry(async () => {
      const res = await fetch('/api/surah-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          surahNumber,
          surahName,
          language
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error fetching surah details");
      }

      return await res.json();
    });

    return response;
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    throw error;
  }
};
