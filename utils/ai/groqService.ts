// utils/ai/groqService.ts
// Cerebras primero (2 modelos) → fallback OpenRouter (2 modelos)

const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CEREBRAS_MODELS = ['gpt-oss-120b', 'llama3.1-8b'];

const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
];

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Eres un asistente personal de agenda inteligente. 
Ayudas al usuario a organizar sus eventos, recordatorios y tareas.
Responde siempre de forma concisa, amigable y en el idioma del usuario.
Si el usuario menciona fechas, horas o tareas, extrae esa información claramente.`;

async function tryCerebras(
  systemMessage: Message,
  messages: Message[]
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_CEREBRAS_API_KEY;
  if (!apiKey) return null;

  for (const model of CEREBRAS_MODELS) {
    try {
      const response = await fetch(CEREBRAS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [systemMessage, ...messages],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn(`[AI] Cerebras ${model} -> ${response.status}: ${body}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      console.warn(`[AI] Cerebras ${model} excepción:`, e);
      continue;
    }
  }

  return null;
}

async function tryOpenRouter(
  systemMessage: Message,
  messages: Message[]
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) return null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://mrp-agenda.app',
          'X-Title': 'MRP Agenda',
        },
        body: JSON.stringify({
          model,
          messages: [systemMessage, ...messages],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn(`[AI] OpenRouter ${model} -> ${response.status}: ${body}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      console.warn(`[AI] OpenRouter ${model} excepción:`, e);
      continue;
    }
  }

  return null;
}

export async function sendMessage(messages: Message[]): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: SYSTEM_PROMPT,
  };

  // 1. Intentar Cerebras (gpt-oss-120b → llama3.1-8b)
  const cerebrasResponse = await tryCerebras(systemMessage, messages);
  if (cerebrasResponse) return cerebrasResponse;

  // 2. Fallback OpenRouter (llama-3.3-70b → mistral-small)
  const openRouterResponse = await tryOpenRouter(systemMessage, messages);
  if (openRouterResponse) return openRouterResponse;

  // 3. Todos fallaron
  throw new Error('No se pudo conectar con ningún proveedor de IA. Inténtalo de nuevo.');
}