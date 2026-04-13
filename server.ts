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

// Cache for AI responses
const aiCache = new Map<string, { text: string, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of aiCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      aiCache.delete(key);
    }
  }
}, 1000 * 60 * 60); // Every hour

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
      gemini: !!(process.env.DEENLY_API_KEY || process.env.GEMINI_API_KEY)
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
    console.log(`Incrementing usage for user: ${userId}`);
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

app.post("/api/chat", async (req, res) => {
  console.log("Chat API called");
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });

  const token = authHeader.split(" ")[1];
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    // 1. Verify User
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const userId = user.id;

    // 2. Check Usage Limits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const now = new Date();
    const lastReset = profile.last_question_reset_at ? new Date(profile.last_question_reset_at) : null;
    let currentCount = profile.daily_questions_count || 0;
    let resetAt = profile.last_question_reset_at;

    // Reset count if 12h passed
    if (!lastReset || (now.getTime() - lastReset.getTime()) >= (12 * 60 * 60 * 1000)) {
      currentCount = 0;
      resetAt = now.toISOString();
    }

    const FREE_LIMIT = 25; // Increased from 15 for better user experience
    if (!profile.is_premium && currentCount >= FREE_LIMIT) {
      return res.status(403).json({ error: "Limit reached", message: `Has alcanzado el límite de ${FREE_LIMIT} preguntas cada 12h.` });
    }

    // 3. Call Gemini API
    const { prompt, history, systemInstruction, isPremium, memories, language = 'Español' } = req.body;
    
    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ error: "Empty prompt", message: "Por favor, escribe una pregunta." });
    }

    // Special case for simple greetings to ensure a response even if AI is busy
    const lowerPrompt = prompt.toLowerCase().trim();
    if (lowerPrompt === 'hola' || lowerPrompt === 'hi' || lowerPrompt === 'hello') {
      const greeting = language === 'Español' 
        ? "¡As-salamu alaykum! Es un placer saludarte. ¿En qué puedo ayudarte hoy en tu camino espiritual?"
        : "As-salamu alaykum! It is a pleasure to greet you. How can I help you today on your spiritual journey?";
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ text: greeting })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    
    // Simple caching for new chats without history or memories
    const cacheKey = `chat:${prompt}:${systemInstruction.length}`;
    if (!history?.length && !memories?.length) {
      const cached = aiCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ text: cached.text })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    const apiKey = process.env.DEENLY_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBTu80f8AUi9cCkhU61nrPCgIVBg0fx6-4";
    if (!apiKey) return res.status(500).json({ error: "AI API Key not configured." });

    const ai = new GoogleGenAI({ apiKey });
    
    // Fallback logic for models
    const primaryModel = profile.is_premium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    const fallbackModel = "gemini-flash-latest";
    
    const contents = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let stream;
    let usedModel = primaryModel;

    try {
      stream = await ai.models.generateContentStream({
        model: primaryModel,
        contents: contents,
        config: {
          systemInstruction,
          temperature: profile.is_premium ? 0.8 : 0.7,
          maxOutputTokens: profile.is_premium ? 8192 : 4096,
        },
      });
    } catch (primaryError: any) {
      console.warn(`Primary model (${primaryModel}) failed, trying fallback (${fallbackModel}):`, primaryError.message);
      usedModel = fallbackModel;
      try {
        stream = await ai.models.generateContentStream({
          model: fallbackModel,
          contents: contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        });
      } catch (fallbackError: any) {
        console.error("All AI models failed, sending soft fallback response.");
        // If everything fails, send a friendly "busy" message instead of an error
        const softFallback = language === 'Español' 
          ? "As-salamu alaykum. En este momento estoy experimentando una alta demanda y mis servidores están descansando un momento. Por favor, intenta de nuevo en unos minutos o consulta el Corán mientras tanto. ¡Que Allah te bendiga!"
          : "As-salamu alaykum. I am currently experiencing high demand and my servers are taking a short rest. Please try again in a few minutes or consult the Quran in the meantime. May Allah bless you!";
        
        res.write(`data: ${JSON.stringify({ text: softFallback })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    let fullText = "";
    try {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    } catch (streamError: any) {
      console.error("Error during stream iteration:", streamError);
      if (!fullText) {
        const errorMsg = language === 'Español' 
          ? "Interrupción en la conexión. Por favor, intenta de nuevo."
          : "Connection interrupted. Please try again.";
        res.write(`data: ${JSON.stringify({ text: errorMsg })}\n\n`);
        fullText = errorMsg;
      }
    }

    if (!fullText) {
      const softFallback = language === 'Español' 
        ? "As-salamu alaykum. En este momento no pude procesar tu solicitud. Por favor, intenta de nuevo en unos segundos."
        : "As-salamu alaykum. I couldn't process your request at this moment. Please try again in a few seconds.";
      res.write(`data: ${JSON.stringify({ text: softFallback })}\n\n`);
      fullText = softFallback;
    }

    // Cache the response if it was a new chat
    if (!history?.length && !memories?.length && fullText) {
      aiCache.set(cacheKey, { text: fullText, timestamp: Date.now() });
    }

    // 4. Increment Usage (after successful stream)
    if (!profile.is_premium) {
      await supabaseAdmin
        .from('profiles')
        .update({ daily_questions_count: currentCount + 1, last_question_reset_at: resetAt || now.toISOString() })
        .eq('id', userId);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error("Chat API Error:", err);
    let errorMessage = err.message || "Unknown error";
    
    // If error message is a JSON string from Gemini SDK, try to parse it
    if (errorMessage.includes('{') && errorMessage.includes('}')) {
      try {
        const startIdx = errorMessage.indexOf('{');
        const endIdx = errorMessage.lastIndexOf('}') + 1;
        const jsonStr = errorMessage.substring(startIdx, endIdx);
        const parsed = JSON.parse(jsonStr);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch (e) {
        // Keep original if parsing fails
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    } else {
      // Ensure we send a clean JSON object for the error
      res.write(`\n\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Compatibility route for Netlify function path
app.post("/.netlify/functions/chat", async (req, res) => {
  console.log("Netlify compatibility Chat API called");
  const { message, prompt, history, systemInstruction, isPremium, language = 'Español' } = req.body;
  const actualPrompt = message || prompt;

  if (!actualPrompt) return res.status(400).json({ error: "Message is required" });

  const apiKey = process.env.DEENLY_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBTu80f8AUi9cCkhU61nrPCgIVBg0fx6-4";
  if (!apiKey) return res.status(500).json({ error: "AI API Key not configured." });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...(history || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts || [{ text: m.text }]
      })),
      { role: 'user', parts: [{ text: actualPrompt }] }
    ];

    const result = await ai.models.generateContent({
      model: isPremium ? "gemini-1.5-pro" : "gemini-1.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const text = result.text;
    res.json({ text });
  } catch (error: any) {
    console.error("Error in /.netlify/functions/chat compatibility route:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/surah-details", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });

  const token = authHeader.split(" ")[1];
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const { surahNumber, surahName, language } = req.body;
    
    // Check cache for surah details
    const cacheKey = `surah:${surahNumber}:${language}`;
    const cached = aiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json(JSON.parse(cached.text));
    }

    const apiKey = process.env.DEENLY_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBTu80f8AUi9cCkhU61nrPCgIVBg0fx6-4";
    if (!apiKey) return res.status(500).json({ error: "AI API Key not configured." });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Proporciona detalles profundos sobre la Sura ${surahNumber} (${surahName}) del Corán en ${language}. 
    Incluye:
    1. Significado detallado del nombre.
    2. Contexto histórico de la revelación (Asbab al-Nuzul).
    3. Temas clave tratados en la Sura.
    4. Importancia espiritual o beneficios mencionados en la tradición.`;

    const result = await ai.models.generateContent({
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

    if (!result || !result.text) throw new Error("No response from AI");
    res.json(JSON.parse(result.text));
  } catch (err: any) {
    console.error("Surah Details API Error:", err);
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
