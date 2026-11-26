import React, { useRef, useEffect, useCallback } from 'react';
import { Send, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend, onStop, isLoading, disabled, value, onChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 4000;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled || trimmed.length > MAX_CHARS) return;
    onSend(trimmed);
  }, [value, isLoading, disabled, onSend]);

  const remaining = MAX_CHARS - value.length;
  const nearLimit = remaining < 300;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[#0f1117] px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div
          className={`flex items-end gap-2 rounded-2xl border px-4 py-3 transition-all duration-200 ${
            isLoading
              ? 'border-[rgba(99,102,241,0.3)] bg-[var(--surface-2)]'
              : 'border-[rgba(99,102,241,0.15)] bg-[var(--surface-2)] focus-within:border-[rgba(99,102,241,0.5)] focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
          }`}
        >
          <textarea
            ref={textareaRef}
            data-testid="chat-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Generating response…' : 'Ask Lyftr AI anything…'}
            disabled={isLoading || disabled}
            maxLength={MAX_CHARS}
            className="flex-1 bg-transparent text-[0.9rem] text-slate-200 placeholder-slate-500 resize-none focus:outline-none disabled:opacity-40 min-h-[26px] max-h-40 leading-relaxed"
            rows={1}
          />

          <div className="flex items-center gap-2 flex-shrink-0 self-end pb-0.5">
            {nearLimit && value.length > 0 && (
              <span className={`text-xs font-mono ${remaining < 50 ? 'text-red-400' : 'text-slate-500'}`}>
                {remaining}
              </span>
            )}

            {isLoading ? (
              <button
                onClick={onStop}
                title="Stop generation"
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                data-testid="send-button"
                onClick={handleSend}
                disabled={!value.trim() || disabled || value.length > MAX_CHARS}
                title="Send message (Enter)"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:text-slate-600 text-white transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-[0.68rem] text-slate-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for newline · Lyftr AI can make mistakes — verify important info.
        </p>
      </div>
    </div>
  );
};
