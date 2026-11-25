import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, MessageMetadata } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function sendMessage(request: ChatRequest, simulateFailure?: string): Promise<ChatResponse> {
  const headers: Record<string, string> = {};
  if (simulateFailure) {
    headers['X-Simulate-Failure'] = simulateFailure;
  }
  const response = await apiClient.post<ChatResponse>('/chat', request, { headers });
  return response.data;
}

export async function getSessionMessages(sessionId: string): Promise<{ session_id: string; messages: Array<{ role: string; content: string; metadata?: MessageMetadata }> }> {
  const response = await apiClient.get(`/sessions/${sessionId}/messages`);
  return response.data;
}

export async function checkHealth(): Promise<{ status: string; keys_configured: number; cache_enabled: boolean }> {
  const response = await apiClient.get('/health');
  return response.data;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 503) {
      return 'All AI providers are currently unavailable. Please try again later.';
    }
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail;
      if (Array.isArray(detail)) {
        return detail.map((d: { msg: string }) => d.msg).join(', ');
      }
      return detail || 'Invalid request. Please check your input.';
    }
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The AI is taking too long to respond.';
    }
    if (!error.response) {
      return 'Cannot connect to the backend. Please check if the server is running.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
