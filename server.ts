import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import path from "path";

console.log("SERVER.TS LOADING...");
dotenv.config();

// Lazy initialization helpers
let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      console.error("CRITICAL: STRIPE_SECRET_KEY is missing");
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

// Log environment variable presence (not values)
console.log("Environment check:");
console.log("- STRIPE_SECRET_KEY:", !!process.env.STRIPE_SECRET_KEY);
console.log("- STRIPE_WEBHOOK_SECRET:", !!process.env.STRIPE_WEBHOOK_SECRET);
console.log("- VITE_SUPABASE_URL:", !!process.env.VITE_SUPABASE_URL);
console.log("- SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("- VITE_STRIPE_PRICE_ID_PREMIUM:", !!process.env.VITE_STRIPE_PRICE_ID_PREMIUM);
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- VERCEL:", process.env.VERCEL);

// Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`API Request: ${req.method} ${req.path}`);
  }
  next();
});

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
    return res.status(500).json({ error: "Server configuration error: Supabase not configured" });
  }

  let event;

  try {
    // Use rawBody if available (from express.json verify)
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

  console.log(`Received Stripe event: ${event.type}`);

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;

        if (userId) {
          console.log(`Checkout completed for user: ${userId}`);
          
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { 
              is_premium: true,
              stripe_customer_id: customerId,
              stripe_subscription_id: session.subscription as string
            }
          });

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              is_premium: true,
              stripe_customer_id: customerId,
              subscription_id: session.subscription as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (profileError) {
            console.error("Error updating profile premium status:", profileError);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profiles, error: searchError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!searchError && profiles) {
          const userId = profiles.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { is_premium: false }
          });

          await supabaseAdmin
            .from('profiles')
            .update({
              is_premium: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error processing webhook event:", error);
  }

  res.json({ received: true });
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      supabase: !!process.env.VITE_SUPABASE_URL,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      priceId: !!process.env.VITE_STRIPE_PRICE_ID_PREMIUM
    }
  });
});

app.post("/api/create-checkout-session", async (req, res) => {
  console.log("POST /api/create-checkout-session - Body:", JSON.stringify(req.body));
  try {
    const { userId, userEmail, priceId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    if (!priceId) {
      return res.status(400).json({ error: "Price ID is required." });
    }

    const stripe = getStripe();
    const host = req.headers.host || "";
    const proto = req.headers["x-forwarded-proto"];
    const protocol = (Array.isArray(proto) ? proto[0] : proto) || (host.includes("localhost") ? "http" : "https");
    const origin = req.headers.origin || `${protocol}://${host}`;
    
    console.log(`Creating checkout session for user ${userId}, origin: ${origin}`);

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
    console.error("Error creating checkout session:", error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error",
      type: error.type
    });
  }
});

app.post("/api/create-portal-session", async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: "Customer ID required" });

    const stripe = getStripe();
    const host = req.headers.host || "";
    const proto = req.headers["x-forwarded-proto"];
    const protocol = (Array.isArray(proto) ? proto[0] : proto) || (host.includes("localhost") ? "http" : "https");
    const origin = req.headers.origin || `${protocol}://${host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/usage/check", async (req, res) => {
  const { userId } = req.body;
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: "Server error" });

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at')
      .eq('id', userId)
      .single();

    if (error || !profile) return res.status(404).json({ error: "Profile not found" });

    const lastReset = new Date(profile.last_question_reset_at || new Date());
    const now = new Date();
    const diffHours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let currentCount = profile.daily_questions_count || 0;
    let resetAt = profile.last_question_reset_at;

    if (diffHours >= 12) {
      currentCount = 0;
      resetAt = now.toISOString();
      await supabaseAdmin
        .from('profiles')
        .update({ daily_questions_count: 0, last_question_reset_at: resetAt })
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
    // 1. Get current profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, daily_questions_count, last_question_reset_at')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) return res.status(404).json({ error: "Profile not found" });

    // 2. Premium users have no limits
    if (profile.is_premium) {
      return res.json({ success: true, isPremium: true, count: profile.daily_questions_count, limit: 15 });
    }

    const now = new Date();
    const lastReset = profile.last_question_reset_at ? new Date(profile.last_question_reset_at) : null;
    
    let currentCount = profile.daily_questions_count || 0;
    let resetAt = profile.last_question_reset_at;

    // 3. Check for 12h reset
    const shouldReset = !lastReset || (now.getTime() - lastReset.getTime()) >= (12 * 60 * 60 * 1000);

    if (shouldReset) {
      currentCount = 0;
      resetAt = now.toISOString();
      // Reset in DB immediately
      await supabaseAdmin
        .from('profiles')
        .update({ daily_questions_count: 0, last_question_reset_at: resetAt })
        .eq('id', userId);
    }

    // 4. Check if limit is reached
    if (currentCount >= 15) {
      return res.status(403).json({ 
        error: "Limit reached", 
        count: currentCount, 
        limit: 15,
        message: "Has alcanzado el límite de 15 preguntas cada 12h."
      });
    }

    // 5. Increment and update
    const newCount = currentCount + 1;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        daily_questions_count: newCount, 
        last_question_reset_at: resetAt || now.toISOString() 
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    res.json({ 
      success: true, 
      count: newCount, 
      limit: 15,
      isPremium: false
    });
  } catch (err: any) {
    console.error("Usage increment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message
  });
});

async function startApp() {
  const isDev = process.env.NODE_ENV !== "production";
  const isVercel = process.env.VERCEL === "1";
  const isNetlify = process.env.NETLIFY === "true";
  
  if (isDev) {
    console.log("Initializing Vite middleware...");
    // Dynamic import to avoid loading Vite in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: process.cwd(),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!isVercel && !isNetlify) {
    console.log("Serving static files from dist...");
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  if (!isVercel && !isNetlify) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startApp().catch((err) => {
  console.error("CRITICAL: Failed to start app:", err);
});

export default app;
