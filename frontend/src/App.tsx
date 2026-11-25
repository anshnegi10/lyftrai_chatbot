import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { ErrorNotification } from './components/ErrorNotification';
import { sendMessage, getErrorMessage } from './api/client';
import { Menu, X } from 'lucide-react';

function generateSessionId(): string {
  return `s-${uuidv4().slice(0, 8)}`;
}

function App() {
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleNewChat = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setInputValue('');
    setError(null);
  }, []);

  const handleSend = useCallback(async (message: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage({
        session_id: sessionId,
        message: message,
        system_prompt: systemPrompt || undefined,
      });

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.reply,
        metadata: response.metadata,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.filter((m) => !m.isLoading), assistantMessage]);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      
      // Add error message inline in chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `❌ ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, systemPrompt, isLoading]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 z-20 md:z-auto transition-transform duration-300 h-full`}>
        <Sidebar
          sessionId={sessionId}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 p-3 border-b border-slate-800 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-white font-semibold">Lyftr AI</span>
        </div>

        {/* Chat area */}
        <ChatWindow
          messages={messages}
          onSuggestedPrompt={handleSuggestedPrompt}
        />

        {/* Input */}
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>

      {/* Error notification */}
      {error && (
        <ErrorNotification
          message={error}
          onDismiss={() => setError(null)}
        />
      )}
    </div>
  );
}

export default App;
