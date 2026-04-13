import { Handler } from "@netlify/functions";

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
    const { message, prompt, history, systemInstruction, isPremium } = body;
    const actualPrompt = message || prompt;

    if (!actualPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Message or prompt is required" }),
      };
    }

    // Prepare contents for Gemini API
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: msg.parts || [{ text: msg.text }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: actualPrompt }]
    });

    const modelName = isPremium ? "gemini-1.5-pro" : "gemini-1.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: "Error from Gemini API", 
          details: errorData 
        }),
      };
    }

    const data = await response.json();
    const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar una respuesta.";

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
