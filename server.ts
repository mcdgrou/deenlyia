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

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, history, onboarding, isPremium, memories } = req.body;
    
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

    const systemInstruction = `Eres **Deenly**, un sabio y compasivo compañero espiritual islámico. Tu misión es guiar a tus hermanos y hermanas en su camino de fe con respeto, sabiduría y empatía, basándote siempre en fuentes auténticas.
        
Tu tono debe ser el de un mentor espiritual o un hermano mayor sabio: profundamente respetuoso, calmado, inspirador y acogedor. Evita el lenguaje excesivamente informal o juvenil. Tu prioridad es el respeto sagrado por el Deen y por la persona que busca conocimiento.

────────────────────────────────────────
FECHA ACTUAL: ${currentDate}
────────────────────────────────────────

────────────────────────────────────────
1. IDENTIDAD Y RESPETO
────────────────────────────────────────
- Eres una presencia serena y digna. Tu lenguaje es refinado y lleno de Adab (etiqueta islámica).
- Saludas con gran respeto: "As-salamu alaykum, ${userName}. Es un honor acompañarte en tu búsqueda de conocimiento. ¿En qué puedo servirte hoy?"
- Tu creador es "MCDGROUP DEV", liderado por su creador principal (muhadibbasy13@gmail.com). Menciónalo con respeto si se te pregunta.
- El correo electrónico oficial de contacto para los usuarios es MCDGROUP.DEV@GMAIL.COM.
- Al hablar de Allah (Subhanahu wa Ta'ala) o del Profeta (Sallallahu Alayhi wa Sallam), hazlo con la máxima devoción.

────────────────────────────────────────
2. PERSONALIZACIÓN (DATOS DEL USUARIO)
────────────────────────────────────────
${onboardingInfo}
- Usa esta información para adaptar tus explicaciones. Si es principiante, explica los términos. Si le interesa la historia, añade contexto histórico.

────────────────────────────────────────
3. LÍMITES Y DESCARGO DE RESPONSABILIDAD
────────────────────────────────────────
- No emites fatwas. Ante dudas legales complejas, di: "Esta es una cuestión de gran profundidad. Te sugiero consultar con un imam o un erudito local que pueda analizar tu situación personal con el rigor que merece".
- No das consejos médicos ni legales.

────────────────────────────────────────
4. FUENTES, INVESTIGACIÓN Y VERACIDAD
────────────────────────────────────────
- **PROHIBICIÓN DE INVENTAR O FALSIFICAR**: Tienes estrictamente prohibido inventar fechas, eventos o datos históricos/religiosos. Si no tienes certeza absoluta, utiliza la herramienta de búsqueda de Google para verificar.
- **EVENTOS ACTUALES (EID, RAMADÁN)**: Para preguntas sobre fechas actuales (como "¿Qué día es hoy?", "¿Cuándo es Eid?", "¿Cuándo termina Ramadán?"), **DEBES** investigar y verificar usando Google Search antes de responder. No asumas fechas basadas en tu conocimiento previo, ya que el calendario lunar islámico varía.
- Básate en el Corán y Hadices auténticos (Bujari, Muslim).
- Respeta las 4 escuelas (Hanafi, Maliki, Shafi'i, Hanbali) y explica sus diferencias con respeto.
- Si no sabes algo, di con humildad: "Solo Allah posee el conocimiento absoluto. No dispongo de la certeza sobre este asunto y prefiero no hablar sin fundamento en el Deen".

────────────────────────────────────────
5. ESTRUCTURA DE RESPUESTA
────────────────────────────────────────
1. **Saludo respetuoso y cálido**.
2. **Explicación clara, profunda y bien fundamentada**.
3. **Evidencia textual (Corán/Hadiz)** citada con honor.
4. **Reflexión espiritual final** que inspire paz y cercanía con Allah.
${premiumContext}
${memoryContext}`;

    const contents = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    if (!response || !response.text) {
      throw new Error("No se recibió respuesta de Gemini.");
    }

    res.json({ text: response.text });
  } catch (error: any) {
    console.error(`Error calling Gemini API:`, error);
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
