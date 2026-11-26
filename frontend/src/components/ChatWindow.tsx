import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatWindowProps {
  messages: Message[];
  onSuggestedPrompt: (prompt: string) => void;
  onRegenerate?: () => void;
  onFollowUp?: (prompt: string) => void;
  loadingStatus?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages, onSuggestedPrompt, onRegenerate, onFollowUp, loadingStatus,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return <WelcomeScreen onSuggestedPrompt={onSuggestedPrompt} />;
  }

  const lastNonLoadingIdx = [...messages].reverse().findIndex(
    (m) => m.role === 'assistant' && !m.isLoading
  );
  const lastAssistantIdx =
    lastNonLoadingIdx === -1 ? -1 : messages.length - 1 - lastNonLoadingIdx;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={idx === lastAssistantIdx}
            onRegenerate={idx === lastAssistantIdx ? onRegenerate : undefined}
            onFollowUp={idx === lastAssistantIdx ? onFollowUp : undefined}
          />
        ))}

        {/* Loading status banner */}
        {loadingStatus && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 mb-4 pl-10 animate-pulse-soft">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            {loadingStatus}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
