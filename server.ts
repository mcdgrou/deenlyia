import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log("DEENLY SERVER STARTING...");

// Lazy initialization helpers
let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is missing. Please add it to the Settings > Environment Variables.");
    }
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
};

let supabaseAdminClient: any = null;
const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("Missing Supabase environment variables for admin client");
      return null;
    }
    supabaseAdminClient = createClient(url, key);
  }
  return supabaseAdminClient;
};

const app = express();
const PORT = 3000;

// Simple in-memory cache for chat responses to save quota
const chatCache = new Map<string, { text: string; timestamp: number }>();
const surahCache = new Map<number, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SURAH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for surah details

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
        console.warn(`Quota exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      supabase: !!process.env.VITE_SUPABASE_URL,
      gemini: !!(process.env.GEMINI_API_KEY || process.env.DEENLY_API_KEY)
    }
  });
});

// Middleware for Stripe Webhook (needs raw body)
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Stripe Webhook
app.post("/api/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  let event;
  try {
    const body = (req as any).rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;

        if (userId) {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { 
              is_premium: true,
              stripe_customer_id: customerId,
              stripe_subscription_id: session.subscription as string
            }
          });

          await supabaseAdmin
            .from('profiles')
            .update({
              is_premium: true,
              stripe_customer_id: customerId,
              subscription_id: session.subscription as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: { is_premium: false }
          });

          await supabaseAdmin
            .from('profiles')
            .update({ is_premium: false, updated_at: new Date().toISOString() })
            .eq('id', profile.id);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error processing webhook event:", error);
  }

  res.json({ received: true });
});

// Other API Routes
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { userId, userEmail, priceId } = req.body;
    const stripe = getStripe();
    const origin = req.headers.origin || `https://${req.headers.host}`;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
      customer_email: userEmail,
      client_reference_id: userId,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/surah-details", async (req, res) => {
  try {
    const { surahNumber, surahName, language } = req.body;
    
    // Check cache first
    const cached = surahCache.get(surahNumber);
    if (cached && (Date.now() - cached.timestamp < SURAH_CACHE_TTL)) {
      console.log(`Serving details for Surah ${surahNumber} from cache.`);
      return res.json(JSON.parse(cached.text));
    }

    const apiKey = process.env.CLAVE_API_DE_DEENLY || 
                   process.env.DEENLY_API_KEY || 
                   process.env.GEMINI_API_KEY;
                   
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is missing on server." });
    }

    const ai = new GoogleGenAI({ apiKey });
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
            type: "OBJECT" as any, // Cast to any to avoid Type enum issues in server
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

    // Cache the response
    surahCache.set(surahNumber, { text: response.text, timestamp: Date.now() });
    
    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error(`Error fetching Surah details:`, error);
    const errorMsg = (error.message || "").toLowerCase();
    if (errorMsg.includes('429') || errorMsg.includes('resource_exhausted') || errorMsg.includes('quota')) {
      return res.status(429).json({ error: "Cuota excedida. Por favor, inténtalo de nuevo en un minuto." });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, history, onboarding, isPremium, memories } = req.body;
    
    // Create a cache key based on prompt and history
    const cacheKey = JSON.stringify({ prompt, history: history.slice(-2), isPremium });
    const cached = chatCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log("Serving response from cache to save quota.");
      return res.json({ text: cached.text });
    }

    const apiKey = process.env.CLAVE_API_DE_DEENLY || 
                   process.env.DEENLY_API_KEY || 
                   process.env.GEMINI_API_KEY;
                   
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is missing on server." });
    }

    const ai = new GoogleGenAI({ apiKey });
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
      return await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.8,
          maxOutputTokens: 2048,
          tools: [{ googleSearch: {} }],
        },
      });
    });

    if (!response || !response.text) {
      throw new Error("No se recibió respuesta de Gemini.");
    }

    // Cache the response
    chatCache.set(cacheKey, { text: response.text, timestamp: Date.now() });
    
    // Clean up old cache entries occasionally
    if (chatCache.size > 100) {
      const now = Date.now();
      for (const [key, val] of chatCache.entries()) {
        if (now - val.timestamp > CACHE_TTL) chatCache.delete(key);
      }
    }

    res.json({ text: response.text });
  } catch (error: any) {
    console.error(`Error calling Gemini API:`, error);
    
    // Handle specific Gemini API errors
    const errorMsg = (error.message || error.toString() || "").toLowerCase();
    
    if (errorMsg.includes('429') || errorMsg.includes('resource_exhausted') || errorMsg.includes('quota')) {
      return res.status(429).json({ 
        error: "Has excedido tu cuota actual de la API de Gemini. Esto suele ocurrir con las claves gratuitas tras varios mensajes seguidos. Por favor, espera 1-2 minutos antes de intentarlo de nuevo. Puedes verificar tus límites en: https://aistudio.google.com/app/plan_and_billing",
        code: "RESOURCE_EXHAUSTED"
      });
    }

    if (errorMsg.includes('expired') || errorMsg.includes('api_key_invalid') || errorMsg.includes('key not valid')) {
      return res.status(400).json({
        error: "La clave de API de Gemini ha expirado o no es válida. Por favor, actualiza la clave en la configuración del servidor.",
        code: "API_KEY_EXPIRED"
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/create-portal-session", async (req, res) => {
  try {
    const { customerId } = req.body;
    const stripe = getStripe();
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/usage/check", async (req, res) => {
  const { userId } = req.body;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const lastReset = new Date(profile.last_question_reset_at || new Date());
    const now = new Date();
    const diffHours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let currentCount = profile.daily_questions_count || 0;

    if (diffHours >= 12) {
      currentCount = 0;
      await supabaseAdmin
        .from('profiles')
        .update({ daily_questions_count: 0, last_question_reset_at: now.toISOString() })
        .eq('id', userId);
    }

    res.json({ isPremium: profile.is_premium, count: currentCount, limit: 15 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/usage/increment", async (req, res) => {
  const { userId } = req.body;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: "Profile not found" });
    if (profile.is_premium) return res.json({ success: true, isPremium: true });

    const now = new Date();
    const lastReset = profile.last_question_reset_at ? new Date(profile.last_question_reset_at) : null;
    let currentCount = profile.daily_questions_count || 0;
    let resetAt = profile.last_question_reset_at;

    if (!lastReset || (now.getTime() - lastReset.getTime()) >= (12 * 60 * 60 * 1000)) {
      currentCount = 0;
      resetAt = now.toISOString();
    }

    if (currentCount >= 15) {
      return res.status(403).json({ error: "Limit reached", message: "Has alcanzado el límite de 15 preguntas cada 12h." });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ daily_questions_count: currentCount + 1, last_question_reset_at: resetAt || now.toISOString() })
      .eq('id', userId);

    res.json({ success: true, count: currentCount + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite / Static Serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.log("Starting in DEVELOPMENT mode with Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  // Fallback listen if something goes wrong
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fallback server running on http://0.0.0.0:${PORT}`);
  });
});

export default app;
