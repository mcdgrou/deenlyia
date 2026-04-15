import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log("DEENLY SERVER STARTING...");

// --- Scraping Logic ---
async function scrapeIslamicContent(query: string): Promise<string> {
  try {
    console.log(`Scraping Islamic content for: ${query}`);
    
    // We'll search on Sunnah.com as a primary source for Hadiths
    const searchUrl = `https://sunnah.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Sunnah.com: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let extractedText = "";
    
    // Extract Hadith text from search results
    // Sunnah.com search results usually have hadiths in .hadith_basic or similar classes
    $(".hadith_basic").each((i, el) => {
      if (i < 3) { // Limit to top 3 results
        const text = $(el).text().trim();
        if (text) {
          extractedText += text + "\n---\n";
        }
      }
    });

    // If no hadiths found, try to get some general text from the page
    if (!extractedText) {
      $("p").each((i, el) => {
        if (i < 5) {
          const text = $(el).text().trim();
          if (text.length > 50) {
            extractedText += text + "\n";
          }
        }
      });
    }

    // Clean and limit
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .substring(0, 1500);

    return cleanedText || "No specific Islamic context found for this query.";
  } catch (error) {
    console.error("Scraping error:", error);
    return "";
  }
}

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

async function getOrCreateProfile(supabaseAdmin: any, userId: string, email?: string) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at, email')
      .eq('id', userId)
      .single();

    if (profile) return profile;

    // If not found, create it
    console.log(`Profile not found for user ${userId}, creating one...`);
    
    // Use upsert to handle potential race conditions where profile was created between select and insert
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .upsert([{ 
        id: userId, 
        email: email || '',
        is_premium: false,
        daily_questions_count: 0,
        last_question_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' })
      .select()
      .single();

    if (createError) {
      console.error('Error creating/upserting profile for user', userId, ':', JSON.stringify(createError, null, 2));
      throw new Error(`Could not create user profile: ${createError.message || JSON.stringify(createError)}`);
    }

    return newProfile;
  } catch (error: any) {
    console.error('getOrCreateProfile critical error:', error);
    throw error;
  }
}

app.post("/api/usage/check", async (req, res) => {
  const { userId } = req.body;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    const profile = await getOrCreateProfile(supabaseAdmin, userId);
    
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
    const profile = await getOrCreateProfile(supabaseAdmin, userId);
    
    if (profile.is_premium) return res.json({ success: true, isPremium: true });

    const now = new Date();
    const lastReset = profile.last_question_reset_at ? new Date(profile.last_question_reset_at) : null;
    let currentCount = profile.daily_questions_count || 0;
    let resetAt = profile.last_question_reset_at;

    if (!lastReset || (now.getTime() - lastReset.getTime()) >= (12 * 60 * 60 * 1000)) {
      currentCount = 0;
      resetAt = now.toISOString();
    }

    const FREE_LIMIT = 25;
    if (currentCount >= FREE_LIMIT) {
      return res.status(403).json({ error: "Limit reached", message: `Has alcanzado el límite de ${FREE_LIMIT} preguntas cada 12h.` });
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

app.post("/api/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    const text = await scrapeIslamicContent(query);
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Compatibility route for Netlify function path
app.post("/.netlify/functions/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    const text = await scrapeIslamicContent(query);
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/.netlify/functions/chat", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 1. Scrape context
    const context = await scrapeIslamicContent(query);

    // 2. Call Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.DEENLY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key missing" });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Eres un asistente islámico experto.
      Contexto extraído de fuentes confiables:
      ${context}

      Pregunta del usuario: ${query}

      Responde de manera precisa, amable y basándote en el contexto proporcionado si es relevante.
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = result.text || "No se pudo generar una respuesta.";

    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  // We'll keep this as a proxy or just a placeholder if we follow the "AI in frontend" skill.
  // However, to satisfy the user's request for a backend chat, we can implement it here.
  // But the skill says NEVER. So I will redirect the user to the frontend implementation
  // or provide a "context-only" response that the frontend then uses.
  res.status(400).json({ error: "Please use the frontend geminiService for AI generation to support streaming and platform best practices. Use /api/search for context." });
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
