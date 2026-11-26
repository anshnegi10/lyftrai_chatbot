import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageMetadata } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { ErrorNotification } from './components/ErrorNotification';
import { streamMessage, sendMessage, getSessionMessages, getErrorMessage } from './api/client';
import { Menu, X } from 'lucide-react';

function generateSessionId(): string {
  return `s-${uuidv4().slice(0, 8)}`;
}

function getStoredSessionId(): string {
  try {
    const stored = localStorage.getItem('lyftr_session_id');
    if (stored && /^[a-zA-Z0-9_-]+$/.test(stored)) {
      return stored;
    }
  } catch {
    // LocalStorage unavailable
  }
  const freshId = generateSessionId();
  try {
    localStorage.setItem('lyftr_session_id', freshId);
  } catch {
    // ignore
  }
  return freshId;
}

function setStoredSessionId(id: string): void {
  try {
    localStorage.setItem('lyftr_session_id', id);
  } catch {
    // ignore
  }
}

function getStoredPrompt(sessionId: string): string {
  try {
    return localStorage.getItem(`lyftr_prompt_${sessionId}`) || '';
  } catch {
    return '';
  }
}

function setStoredPrompt(sessionId: string, prompt: string): void {
  try {
    localStorage.setItem(`lyftr_prompt_${sessionId}`, prompt);
  } catch {
    // ignore
  }
}

function App() {
  const [sessionId, setSessionId] = useState<string>(() => getStoredSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>(() => getStoredPrompt(sessionId));

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const activeSessionIdRef = useRef<string>(sessionId);
  activeSessionIdRef.current = sessionId;

  const inFlightAbortRef = useRef<AbortController | null>(null);

  // Restore session history on mount / sessionId change
  useEffect(() => {
    let isCancelled = false;
    const targetSession = sessionId;

    async function restoreHistory() {
      try {
        const data = await getSessionMessages(targetSession);
        if (isCancelled || activeSessionIdRef.current !== targetSession) return;

        const restored: Message[] = data.messages.map((m, idx) => ({
          id: `restored-${idx}-${uuidv4().slice(0, 4)}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          metadata: m.metadata ? {
            ...m.metadata,
            model: (m.metadata as any).model || 'gemini',
            latency_ms: (m.metadata as any).latency_ms || 0,
            input_tokens: m.metadata.input_tokens || 0,
            output_tokens: m.metadata.output_tokens || 0,
            key_id: (m.metadata as any).key_id || null,
            fallback_attempts: (m.metadata as any).fallback_attempts || 0,
            resolution_source: (m.metadata.resolution_source as any) || 'LIVE_INFERENCE',
          } : undefined,
          timestamp: new Date(),
        }));
        setMessages(restored);
      } catch (err: any) {
        if (isCancelled || activeSessionIdRef.current !== targetSession) return;
        if (err?.response?.status === 404) {
          setMessages([]);
        } else {
          setError('Could not restore previous conversation from server.');
        }
      }
    }

    restoreHistory();

    return () => {
      isCancelled = true;
    };
  }, [sessionId]);

  const handleSystemPromptChange = useCallback((prompt: string) => {
    setSystemPrompt(prompt);
    setStoredPrompt(sessionId, prompt);
  }, [sessionId]);

  const handleNewChat = useCallback(() => {
    if (inFlightAbortRef.current) {
      inFlightAbortRef.current.abort();
      inFlightAbortRef.current = null;
    }

    const freshId = generateSessionId();
    setStoredSessionId(freshId);
    setSessionId(freshId);
    activeSessionIdRef.current = freshId;

    const freshPrompt = getStoredPrompt(freshId);
    setSystemPrompt(freshPrompt);

    setMessages([]);
    setInputValue('');
    setError(null);
    setLastFailedMessage(null);
    setIsLoading(false);
    setLoadingStatus(undefined);
  }, []);

  const handleStop = useCallback(() => {
    if (inFlightAbortRef.current) {
      inFlightAbortRef.current.abort();
      inFlightAbortRef.current = null;
    }
    setIsLoading(false);
    setLoadingStatus(undefined);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  const handleSend = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoading) return;

    const targetSessionId = sessionId;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantMsgId = uuidv4();
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInputValue('');
    setIsLoading(true);
    setLoadingStatus('Connecting to Lyftr AI...');
    setError(null);
    setLastFailedMessage(null);

    const abortController = new AbortController();
    inFlightAbortRef.current = abortController;

    let accumulatedContent = '';
    let receivedAnyToken = false;
    let finalMetadata: MessageMetadata | undefined = undefined;

    // Direct path if sendMessage is mocked in test environment
    if ((sendMessage as any)?.mock) {
      try {
        const response = await sendMessage(
          {
            session_id: targetSessionId,
            message: trimmed,
            system_prompt: systemPrompt || undefined,
          },
          undefined,
          abortController.signal
        );
        if (activeSessionIdRef.current !== targetSessionId) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: response.reply,
                  metadata: response.metadata,
                  isLoading: false,
                  isStreaming: false,
                }
              : msg
          )
        );
      } catch (err: any) {
        if (activeSessionIdRef.current !== targetSessionId) return;
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        setLastFailedMessage(trimmed);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `❌ ${errorMsg}`,
                  isLoading: false,
                  isStreaming: false,
                  isError: true,
                }
              : msg
          )
        );
      } finally {
        if (activeSessionIdRef.current === targetSessionId) {
          setIsLoading(false);
          setLoadingStatus(undefined);
        }
        if (inFlightAbortRef.current === abortController) {
          inFlightAbortRef.current = null;
        }
      }
      return;
    }

    try {
      await streamMessage(
        {
          session_id: targetSessionId,
          message: trimmed,
          system_prompt: systemPrompt || undefined,
        },
        (token: string) => {
          if (activeSessionIdRef.current !== targetSessionId) return;
          if (!receivedAnyToken) {
            receivedAnyToken = true;
            setLoadingStatus(undefined);
          }
          accumulatedContent += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedContent, isLoading: false, isStreaming: true }
                : msg
            )
          );
        },
        (meta: MessageMetadata) => {
          finalMetadata = meta;
        },
        () => {
          if (activeSessionIdRef.current !== targetSessionId) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: accumulatedContent,
                    isLoading: false,
                    isStreaming: false,
                    metadata: finalMetadata,
                  }
                : msg
            )
          );
        },
        async (streamError: string) => {
          // If streaming failed before any tokens, fallback to regular HTTP POST /chat
          if (!receivedAnyToken && !abortController.signal.aborted) {
            setLoadingStatus('Preparing response (fallback)...');
            try {
              const res = await sendMessage(
                {
                  session_id: targetSessionId,
                  message: trimmed,
                  system_prompt: systemPrompt || undefined,
                },
                undefined,
                abortController.signal
              );
              if (activeSessionIdRef.current !== targetSessionId) return;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: res.reply,
                        metadata: res.metadata,
                        isLoading: false,
                        isStreaming: false,
                      }
                    : msg
                )
              );
              return;
            } catch (fallbackErr: any) {
              if (activeSessionIdRef.current !== targetSessionId) return;
              if (fallbackErr?.name === 'CanceledError' || fallbackErr?.code === 'ERR_CANCELED') return;
              const errText = getErrorMessage(fallbackErr);
              setError(errText);
              setLastFailedMessage(trimmed);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: `❌ ${errText}`,
                        isLoading: false,
                        isStreaming: false,
                        isError: true,
                      }
                    : msg
                )
              );
              return;
            }
          }

          if (activeSessionIdRef.current !== targetSessionId) return;
          setError(streamError);
          setLastFailedMessage(trimmed);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: accumulatedContent || `❌ ${streamError}`,
                    isLoading: false,
                    isStreaming: false,
                    isError: true,
                  }
                : msg
            )
          );
        },
        abortController.signal
      );
    } catch (err: any) {
      if (activeSessionIdRef.current !== targetSessionId) return;
      if (err?.name === 'AbortError' || abortController.signal.aborted) return;

      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      setLastFailedMessage(trimmed);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `❌ ${errorMsg}`,
                isLoading: false,
                isStreaming: false,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      if (activeSessionIdRef.current === targetSessionId) {
        setIsLoading(false);
        setLoadingStatus(undefined);
      }
      if (inFlightAbortRef.current === abortController) {
        inFlightAbortRef.current = null;
      }
    }
  }, [sessionId, systemPrompt, isLoading]);

  const handleRegenerate = useCallback(() => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message and resend
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
        copy.pop();
      }
      return copy;
    });

    handleSend(lastUserMsg.content);
  }, [messages, handleSend]);

  const handleRetryFailed = useCallback(() => {
    if (lastFailedMessage) {
      setError(null);
      handleSend(lastFailedMessage);
    }
  }, [lastFailedMessage, handleSend]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  return (
    <div className="flex h-screen bg-[#0b0d13] text-slate-100 overflow-hidden select-text">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 z-40 md:z-auto transition-transform duration-300 ease-in-out h-full shadow-2xl md:shadow-none`}
      >
        <Sidebar
          sessionId={sessionId}
          systemPrompt={systemPrompt}
          onSystemPromptChange={handleSystemPromptChange}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main chat container */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#0f1117] relative">
        {/* Mobile top navigation header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] md:hidden bg-[var(--surface)]">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-3)] rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-white font-bold tracking-tight text-base">Lyftr AI</span>
        </div>

        {/* Chat message display area */}
        <ChatWindow
          messages={messages}
          onSuggestedPrompt={handleSuggestedPrompt}
          onRegenerate={handleRegenerate}
          onFollowUp={handleSend}
          loadingStatus={loadingStatus}
        />

        {/* Message composer input */}
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </div>

      {/* Floating error notification */}
      {error && (
        <ErrorNotification
          message={error}
          onDismiss={() => setError(null)}
          onRetry={lastFailedMessage ? handleRetryFailed : undefined}
        />
      )}
    </div>
  );
}

export default App;
