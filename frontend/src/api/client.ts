import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, MessageMetadata } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

export async function sendMessage(
  request: ChatRequest,
  simulateFailure?: string,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const headers: Record<string, string> = {};
  if (simulateFailure) {
    headers['X-Simulate-Failure'] = simulateFailure;
  }
  const response = await apiClient.post<ChatResponse>('/chat', request, { headers, signal });
  return response.data;
}

/**
 * Stream a message via Server-Sent Events.
 * Calls onChunk for each text token, onMeta when metadata arrives, onDone when finished.
 */
export async function streamMessage(
  request: ChatRequest,
  onChunk: (token: string) => void,
  onMeta: (meta: MessageMetadata) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_URL}/chat/stream`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    onError('Cannot connect to Lyftr AI. Please check your connection.');
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let detail = `Server error (${response.status})`;
    try {
      const json = JSON.parse(text);
      detail = json.detail || detail;
    } catch { /* noop */ }
    onError(detail);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('Streaming not supported by browser or server.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.token !== undefined) {
            onChunk(parsed.token);
          } else if (parsed.metadata) {
            onMeta(parsed.metadata);
          } else if (parsed.error) {
            onError(parsed.error);
            return;
          }
        } catch { /* non-JSON SSE line, skip */ }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) return;
    onError('Stream was interrupted. Please try again.');
  } finally {
    reader.releaseLock();
  }
  onDone();
}

export async function getSessionMessages(sessionId: string): Promise<{
  session_id: string;
  messages: Array<{ role: string; content: string; metadata?: MessageMetadata }>;
}> {
  const encodedId = encodeURIComponent(sessionId);
  const response = await apiClient.get(`/sessions/${encodedId}/messages`);
  return response.data;
}

export async function checkHealth(): Promise<{
  status: string;
  keys_configured: number;
  cache_enabled: boolean;
}> {
  const response = await apiClient.get('/health');
  return response.data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isCancel(error)) return 'Request was canceled.';

  const isAxiosLike =
    axios.isAxiosError(error) ||
    (error !== null &&
      typeof error === 'object' &&
      ('response' in error || 'code' in error || 'isAxiosError' in error));

  if (isAxiosLike) {
    const err = error as AxiosError<any>;
    if (err.response?.status === 503) return 'All AI providers are currently unavailable. Please try again later.';
    if (err.response?.status === 404) return 'Conversation session not found.';
    if (err.response?.status === 422) {
      const detail = err.response.data?.detail;
      if (Array.isArray(detail)) return detail.map((d: any) => d?.msg || JSON.stringify(d)).join(', ');
      return detail || 'Invalid request. Please check your input.';
    }
    if (err.response?.status === 400) return err.response.data?.detail || 'Bad request. Please check your parameters.';
    if (err.response?.data?.detail) return String(err.response.data.detail);
    if (err.code === 'ECONNABORTED') return 'Request timed out. The AI is taking too long to respond. Please retry.';
    if (!err.response) return 'Cannot connect to the backend. Please check if the server is running.';
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}
