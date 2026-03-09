export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MOCK_MODE = true; // Cambiar a false cuando tengamos API key

async function callGroq(messages: Message[], systemPrompt: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (MOCK_MODE || !apiKey) {
    await new Promise(r => setTimeout(r, 800));
    return getMockResponse(messages[messages.length - 1].content);
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Sin respuesta';
}

function getMockResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes('hola') || msg.includes('hello') || msg.includes('cześć')) {
    return '¡Hola, Marek! ¿En qué puedo ayudarte hoy con tu agenda?';
  }
  if (msg.includes('evento') || msg.includes('event')) {
    return 'Puedo ayudarte a crear, editar o consultar eventos. ¿Qué necesitas, Marek?';
  }
  if (msg.includes('hoy') || msg.includes('today')) {
    return 'Déjame revisar tu agenda de hoy, Marek. ¿Quieres que te haga un resumen?';
  }
  return 'Entendido, Marek. Estoy aquí para ayudarte con tu agenda. ¿Qué necesitas?';
}

export async function sendMessage(
  messages: Message[],
  events: any[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(events);
  return callGroq(messages, systemPrompt);
}

function buildSystemPrompt(events: any[]): string {
  const eventsContext = events.length > 0
    ? events.map(e =>
        `- ${e.date}${e.time ? ' ' + e.time : ''}: ${e.title}${e.client ? ' (cliente: ' + e.client + ')' : ''}${e.urgency ? ' [urgencia: ' + e.urgency + ']' : ''}`
      ).join('\n')
    : 'No hay eventos en el calendario.';

  return `Eres un asistente personal de agenda para Marek. 
Siempre te diriges al usuario como "Marek".
Tienes acceso al calendario actual:

${eventsContext}

Puedes ayudar a:
- Consultar eventos existentes
- Sugerir cuándo crear nuevos eventos
- Identificar conflictos o conexiones entre eventos
- Responder en el idioma en que te hablen

Sé conciso, profesional y útil.`;
}