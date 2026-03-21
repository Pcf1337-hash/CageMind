import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'claude_api_key';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `Du bist CageMind, ein einfulgsamer, warmer digitaler Begleiter fur
Menschen mit Angst und Stress. Du bist kein Therapeut und kein Arzt —
du bist wie ein guter Freund, der immer zuhort.

Deine Regeln:
- Antworte auf Deutsch, warm und personlich (du-Form)
- Halte Antworten kurz (max. 3-4 Satze), auber der Nutzer fragt nach mehr
- Frage nach wie es dem Nutzer geht, zeig echtes Interesse
- Gib keine medizinischen Diagnosen oder Ratschlage
- Wenn jemand sehr verzweifelt klingt: ruhig bleiben, Telefonseelsorge
  sanft erwahnen (0800 111 0 111, kostenlos, 24/7)
- Schlage passende Ubungen aus der App vor wenn sinnvoll (Atemubung, Affirmationen)
- Nutze gelegentlich sanfte Emojis (nicht ubertreiben)
- Du erinnerst dich an den Gesprachsverlauf innerhalb der Session`;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.trim().length > 0;
}

export async function sendMessage(
  messages: Message[],
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const conversationHistory: Message[] = [
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const attemptRequest = async (attempt: number): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: conversationHistory,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          throw new Error('INVALID_API_KEY');
        }
        if (status === 429) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error(`API_ERROR_${status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('STREAM_ERROR');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text: string };
            };
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              const chunk = parsed.delta.text;
              fullText += chunk;
              onChunk(chunk);
            }
          } catch {
            // Malformed JSON chunk — skip
          }
        }
      }

      return fullText;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (attempt < 2) {
            return attemptRequest(attempt + 1);
          }
          throw new Error('TIMEOUT');
        }
        throw error;
      }
      throw error;
    }
  };

  return attemptRequest(1);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case 'NO_API_KEY':
        return 'Kein API-Schlussel hinterlegt. Bitte in den Einstellungen eintragen.';
      case 'INVALID_API_KEY':
        return 'Der API-Schlussel ist ungultig. Bitte in den Einstellungen prüfen.';
      case 'RATE_LIMIT':
        return 'Kurze Pause — gleich weiter...';
      case 'TIMEOUT':
        return 'Die Verbindung hat zu lange gedauert. Bitte versuche es erneut.';
      case 'STREAM_ERROR':
        return 'Fehler beim Empfangen der Antwort. Bitte versuche es erneut.';
      default:
        if (error.message.startsWith('API_ERROR_')) {
          return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
        }
        return 'Keine Verbindung moglich. Bitte prüfe deine Internetverbindung.';
    }
  }
  return 'Unbekannter Fehler. Bitte versuche es erneut.';
}
