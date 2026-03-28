import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

export const getMuftiResponse = async (
  prompt: string, 
  history: ChatMessage[] = [], 
  onboarding: any = null, 
  isPremium: boolean = false, 
  memories: string[] = []
) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history,
        onboarding,
        isPremium,
        memories
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al comunicarse con el servidor.");
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error(`Error calling Gemini API proxy:`, error);
    
    let userMessage = "Error al comunicarse con Deenly. Por favor, inténtalo de nuevo en unos momentos.";
    
    if (error.message) {
      if (error.message.includes('API key not valid')) {
        userMessage = "La clave de API de Gemini no es válida en el servidor. Por favor, verifica la configuración en Netlify/AI Studio.";
      } else {
        userMessage = `Error de Deenly: ${error.message}`;
      }
    }
    
    throw new Error(userMessage);
  }
};
