export type StreamEvent<T> =
  | { type: 'status'; message: string }
  | { type: 'partial'; data: Partial<T> }
  | { type: 'done'; data: T }
  | { type: 'error'; error: string };

interface PostStreamOptions<T> {
  url: string;
  body: unknown;
  onStatus?: (message: string) => void;
  onPartial?: (data: Partial<T>) => void;
}

export async function postStreamingJson<T>({
  url,
  body,
  onStatus,
  onPartial,
}: PostStreamOptions<T>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.body || contentType.includes('application/json')) {
    const rawText = await response.text();
    let data: Partial<T> & { error?: string } = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(
        response.ok
          ? 'Received an unexpected non-JSON response from the server.'
          : `Server error (${response.status}). Check your GEMINI_API_KEY configuration and try again.`,
      );
    }
    if (!response.ok || data.error) {
      throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
    }
    return data as T;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: T | null = null;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: StreamEvent<T>;
    try {
      event = JSON.parse(trimmed) as StreamEvent<T>;
    } catch {
      return;
    }

    if (event.type === 'status' && event.message) {
      onStatus?.(event.message);
    } else if (event.type === 'partial' && event.data) {
      onPartial?.(event.data);
    } else if (event.type === 'done' && event.data) {
      finalResult = event.data;
    } else if (event.type === 'error') {
      throw new Error(event.error || 'Gemini request failed.');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    processLine(buffer);
  }

  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status}).`);
  }
  if (!finalResult) {
    throw new Error('Stream ended before receiving a complete response.');
  }
  return finalResult;
}
