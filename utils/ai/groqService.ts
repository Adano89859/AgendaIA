// utils/ai/groqService.ts
// Cerebras primero (2 modelos) → fallback OpenRouter (2 modelos)

import { Event } from '../../database/db';

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

export type ActionType = 'create_event' | 'edit_event' | 'delete_event' | 'complete_event';

export interface AIAction {
  type: ActionType;
  id?: number;
  title?: string;
  date?: string;   // formato YYYY-MM-DD
  time?: string;   // formato HH:MM
  urgency?: 'low' | 'medium' | 'high';
  client?: string;
  extraInfo?: string;
}

export interface ParsedAIResponse {
  message: string;
  action: AIAction | null;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(events: Event[]): string {
  const today = new Date().toISOString().split('T')[0];

  const eventSummary =
    events.length === 0
      ? 'No hay eventos registrados.'
      : events
          .map(
            (e) =>
              `- ID:${e.id} [${e.date}${e.time ? ' ' + e.time : ''}] ${e.title}` +
              (e.client ? ` (Cliente: ${e.client})` : '') +
              (e.urgency ? ` [Urgencia: ${e.urgency}]` : '') +
              (e.completed ? ' [Completado]' : '')
          )
          .join('\n');

  return `Eres el asistente personal de agenda de Marek. Hoy es ${today}.
Tu ÚNICO propósito es ayudar a gestionar la agenda: crear, editar, eliminar y consultar eventos.
NO eres un asistente general. Si el usuario te pide algo que no tenga relación directa con su agenda
(redactar textos, hacer planes de ocio, responder preguntas generales, etc.), NO lo hagas.
En ese caso responde amablemente preguntando si quiere añadirlo como evento a la agenda.
Ejemplo: "Eso está fuera de mi área, pero ¿quieres que lo añada como evento a tu agenda?"

Agenda actual:
${eventSummary}

Instrucciones generales:
- Responde siempre en el mismo idioma que el usuario.
- Sé conciso y amigable.
- Puedes consultar, resumir y dar consejos sobre los eventos existentes.
- Si el usuario pregunta qué tiene pendiente, filtra los no completados.
- No inventes eventos que no existen en la lista.

Instrucciones para acciones:
Cuando el usuario quiera CREAR, EDITAR, ELIMINAR o COMPLETAR un evento, responde con un mensaje natural Y añade al final una línea que empiece exactamente con "ACTION:" seguida de un objeto JSON válido.

Formatos de acción:
- Crear:    ACTION:{"type":"create_event","title":"...","date":"YYYY-MM-DD","time":"HH:MM","urgency":"low|medium|high","client":"...","extraInfo":"..."}
- Editar:   ACTION:{"type":"edit_event","id":123,"title":"...","date":"YYYY-MM-DD","time":"HH:MM","urgency":"low|medium|high","client":"...","extraInfo":"..."}
- Eliminar: ACTION:{"type":"delete_event","id":123,"title":"..."}
- Completar:ACTION:{"type":"complete_event","id":123,"title":"..."}

Reglas:
- "date" SIEMPRE en formato YYYY-MM-DD. Deduce la fecha exacta a partir de hoy (${today}).
- "time" SIEMPRE en formato HH:MM o vacío "".
- "urgency" SIEMPRE uno de: "low", "medium", "high". Si no se menciona, usa "medium".
- Para edit/delete/complete, usa el ID de la lista de eventos de arriba.
- Si faltan datos clave (como el título), pregunta antes de generar ACTION.
- Incluye SOLO los campos que tengas información. No inventes datos.
- La línea ACTION debe ser la última del mensaje, sin nada después.`;
}

// ─── Parser de respuesta ──────────────────────────────────────────────────────

export function parseAIResponse(raw: string): ParsedAIResponse {
  const actionPrefix = 'ACTION:';
  const lines = raw.split('\n');

  let actionLineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trimStart().startsWith(actionPrefix)) {
      actionLineIndex = i;
      break;
    }
  }

  if (actionLineIndex === -1) {
    return { message: raw.trim(), action: null };
  }

  const actionLine = lines[actionLineIndex].trim();
  const jsonStr = actionLine.slice(actionPrefix.length).trim();
  const message = lines.slice(0, actionLineIndex).join('\n').trim();

  try {
    const action = JSON.parse(jsonStr) as AIAction;
    return { message, action };
  } catch {
    return { message: raw.trim(), action: null };
  }
}

// ─── Llamadas a API ───────────────────────────────────────────────────────────

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
    }
  }

  return null;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function sendMessage(messages: Message[], events: Event[]): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: buildSystemPrompt(events),
  };

  const cerebrasResponse = await tryCerebras(systemMessage, messages);
  if (cerebrasResponse) return cerebrasResponse;

  const openRouterResponse = await tryOpenRouter(systemMessage, messages);
  if (openRouterResponse) return openRouterResponse;

  throw new Error('No se pudo conectar con ningún proveedor de IA. Inténtalo de nuevo.');
}