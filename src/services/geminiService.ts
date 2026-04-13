import { supabase } from '../lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

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

    const res = await withRetry(async () => {
      // Use the Netlify function as requested by the user
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: prompt, // Netlify function expects 'message'
          prompt,
          history,
          systemInstruction,
          isPremium,
          memories,
          language
        })
      });

      if (!response.ok) {
        let errorMessage = "Error en la respuesta del servidor";
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, get text from the clone
          try {
            const text = await responseClone.text();
            if (text) errorMessage = text;
          } catch (textError) {
            // Fallback to default
          }
        }
        throw new Error(errorMessage);
      }
      return response;
    });

    const contentType = res.headers.get('content-type');
    
    // If it's a standard JSON response (from our new Netlify function)
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.text) {
        if (onChunk) onChunk(data.text);
        return data.text;
      }
    }

    // Fallback for streaming (if the endpoint still returns a stream)
    if (!res.body) throw new Error("No response body");

    if (!contentType || !contentType.includes('text/event-stream')) {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          if (onChunk) onChunk(parsed.text);
          return parsed.text;
        }
        return text;
      } catch (e) {
        throw new Error(text || "Respuesta inesperada del servidor");
      }
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Handle lines that might not start with 'data:' but are part of the stream
        // or handle multiple 'data:' prefixes
        let data = trimmedLine;
        if (trimmedLine.startsWith('data:')) {
          data = trimmedLine.replace(/^(data:\s*)+/i, '').trim();
        } else if (!trimmedLine.startsWith('{')) {
          // Skip lines that are not data and not JSON
          continue;
        }

        if (data === '[DONE]') continue;
        
        // Safety check for multiple JSON objects in one line (glued JSON)
        // This happens sometimes in high-speed streams
        const jsonObjects = data.split('}{').map((obj, index, array) => {
          if (array.length === 1) return obj;
          if (index === 0) return obj + '}';
          if (index === array.length - 1) return '{' + obj;
          return '{' + obj + '}';
        });

        for (const jsonObj of jsonObjects) {
          try {
            // Final check: if it still starts with data:, something is wrong
            let cleanData = jsonObj.trim();
            if (cleanData.startsWith('data:')) {
              cleanData = cleanData.replace(/^(data:\s*)+/i, '').trim();
            }
            
            if (!cleanData || cleanData === '[DONE]') continue;
            
            // If it doesn't start with { or [, it's definitely not JSON
            if (!cleanData.startsWith('{') && !cleanData.startsWith('[')) {
              console.warn("Skipping non-JSON chunk:", cleanData);
              continue;
            }

            const parsed = JSON.parse(cleanData);
            if (parsed.error) {
              const streamError = new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
              throw streamError;
            }
            if (parsed.text) {
              fullText += parsed.text;
              if (onChunk) onChunk(parsed.text);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
            console.error("Error parsing stream chunk:", e, "Data string:", jsonObj);
          }
        }
      }
    }

    if (!fullText) {
      throw new Error("El asistente no pudo generar una respuesta en este momento. Por favor, intenta de nuevo en unos segundos.");
    }

    return fullText;
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
        let errorMessage = "Error fetching surah details";
        const resClone = res.clone();
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          try {
            const text = await resClone.text();
            if (text) errorMessage = text;
          } catch (textError) {
            // Fallback
          }
        }
        throw new Error(errorMessage);
      }

      return await res.json();
    });

    return response;
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    throw error;
  }
};
