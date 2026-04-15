import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.DEENLY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY is not configured in Netlify" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, prompt, query, history, isPremium, language } = body;
    const actualPrompt = query || message || prompt;

    if (!actualPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Query, message or prompt is required" }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
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
- PROHIBIDO INVENTAR. Si no tienes certeza, usa Google Search.
- EVENTOS ACTUALES: Investiga siempre fechas de Eid, Ramadán, etc., usando Google Search antes de responder.
- Básate en Corán y Hadices auténticos (Bujari, Muslim). Respeta las 4 escuelas jurídicas.
- Si no sabes algo, di con humildad que solo Allah posee el conocimiento absoluto.

4. ESTRUCTURA:
1. Saludo cálido.
2. Explicación profunda y fundamentada.
3. Evidencia textual (Corán/Hadiz).
4. Reflexión espiritual final.
${premiumContext}`;

    const modelName = isPremium ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ 
      model: modelName,
    });

    // Prepare contents for Gemini API
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: msg.parts || [{ text: msg.text || msg.content || "" }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: actualPrompt }]
    });

    let result;
    try {
      result = await model.generateContent({
        contents,
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: isPremium ? 0.8 : 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
    } catch (genError: any) {
      console.error("Netlify generateContent failed:", genError);
      if (genError.message?.includes('404') || genError.message?.includes('not found')) {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        result = await fallbackModel.generateContent({
          contents: contents.map(c => ({ role: c.role, parts: c.parts })),
        });
      } else {
        throw genError;
      }
    }

    const response = await result.response;
    const assistantText = response.text() || "No se pudo generar una respuesta.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: assistantText }),
    };
  } catch (error: any) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
