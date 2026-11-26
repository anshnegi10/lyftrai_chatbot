import React from 'react';
import { Plus, Settings, ChevronDown, ChevronUp, Zap, MessageSquare } from 'lucide-react';

interface SidebarProps {
  sessionId: string;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onNewChat: () => void;
  isOpen?: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Concise mode', value: 'Answer concisely and directly. Avoid unnecessary preamble.' },
  { label: 'Step-by-step', value: 'Walk me through solutions step by step with clear explanations.' },
  { label: 'Code expert', value: 'You are an expert software engineer. Provide clean, well-commented code with best practices.' },
  { label: 'Teacher mode', value: 'Explain concepts progressively from basics to advanced, using real-world analogies.' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  sessionId, systemPrompt, onSystemPromptChange, onNewChat,
}) => {
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);

  const sessionShort = sessionId.slice(0, 12);

  return (
    <div className="w-64 bg-[var(--surface)] border-r border-[var(--border-subtle)] flex flex-col h-full">
      {/* ── Brand ───────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">Lyftr AI</span>
          <p className="text-[0.65rem] text-indigo-400 font-medium -mt-0.5">Powered by Gemini</p>
        </div>
      </div>

      {/* ── New Chat ─────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl transition-all font-semibold text-sm shadow-md shadow-indigo-900/40"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* ── Current session ──────────────────────── */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-600/20">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-indigo-300 font-medium">Current session</p>
            <p className="text-[0.68rem] text-slate-500 font-mono truncate">{sessionShort}…</p>
          </div>
        </div>
      </div>

      {/* ── System Prompt ────────────────────────── */}
      <div className="px-3 py-2 flex-1 overflow-y-auto scrollbar-thin">
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            <span className="font-medium">System Prompt</span>
          </div>
          {showSystemPrompt
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>

        {showSystemPrompt && (
          <div className="mt-2 space-y-2">
            <textarea
              data-testid="system-prompt-input"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful assistant…"
              className="w-full bg-[var(--surface-3)] border border-[var(--border-subtle)] text-slate-200 text-xs rounded-xl p-3 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-slate-600 leading-relaxed"
              rows={4}
            />
            {/* Quick presets */}
            <div className="space-y-1">
              <p className="text-[0.65rem] text-slate-600 uppercase font-semibold tracking-wider px-1">
                Quick Presets
              </p>
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => onSystemPromptChange(qp.value)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/10 rounded-lg transition-colors truncate"
                >
                  {qp.label}
                </button>
              ))}
              {systemPrompt && (
                <button
                  onClick={() => onSystemPromptChange('')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                >
                  Clear prompt
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        <p className="text-[0.65rem] text-slate-600 text-center">
          Lyftr AI 2.0 · Session <span className="font-mono">{sessionShort}</span>
        </p>
      </div>
    </div>
  );
};
