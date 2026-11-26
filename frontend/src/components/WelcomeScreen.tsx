import React from 'react';
import { Zap, Code2, BookOpen, MessageCircle, Lightbulb, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onSuggestedPrompt: (prompt: string) => void;
}

const PROMPT_CARDS = [
  {
    icon: Code2,
    title: 'Write code',
    description: 'Get clean, well-explained code in any language',
    prompt: 'Write a Python function that finds all prime numbers up to n using the Sieve of Eratosthenes',
    color: 'from-blue-600/20 to-indigo-600/10 border-blue-600/20 hover:border-blue-500/40',
    iconColor: 'text-blue-400',
  },
  {
    icon: BookOpen,
    title: 'Explain concepts',
    description: 'Understand complex topics with clear explanations',
    prompt: 'Explain how transformers work in machine learning — from attention to GPT',
    color: 'from-purple-600/20 to-violet-600/10 border-purple-600/20 hover:border-purple-500/40',
    iconColor: 'text-purple-400',
  },
  {
    icon: MessageCircle,
    title: 'Brainstorm ideas',
    description: 'Get creative suggestions and explore possibilities',
    prompt: 'Give me 10 unique startup ideas that solve real problems in education',
    color: 'from-indigo-600/20 to-blue-600/10 border-indigo-600/20 hover:border-indigo-500/40',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Lightbulb,
    title: 'Solve problems',
    description: 'Think through challenges with step-by-step analysis',
    prompt: 'Help me debug my React component — it re-renders infinitely and I cannot figure out why',
    color: 'from-amber-600/20 to-orange-600/10 border-amber-600/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
];

const QUICK_SUGGESTIONS = [
  'What is the capital of France?',
  'Explain quantum computing in simple terms',
  'Write a Python function to reverse a string',
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestedPrompt }) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-10 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-900/60">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0f1117] flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Lyftr <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
      </h1>
      <p className="text-slate-400 text-sm mb-1">{greeting}! How can I help you today?</p>
      <p className="text-xs text-slate-600 mb-10 text-center max-w-xs">
        Powered by Google Gemini · Markdown rendering · Multi-turn memory · Streaming
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-4">
        {PROMPT_CARDS.map(({ icon: Icon, title, description, prompt, color, iconColor }) => (
          <button
            key={title}
            onClick={() => onSuggestedPrompt(prompt)}
            className={`text-left p-4 bg-gradient-to-br ${color} border rounded-2xl transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/30`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-xl bg-[var(--surface-3)] ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mb-4">
        {QUICK_SUGGESTIONS.map((qs) => (
          <button
            key={qs}
            onClick={() => onSuggestedPrompt(qs)}
            className="px-3 py-1.5 rounded-full text-xs text-slate-400 hover:text-indigo-300 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] transition-colors"
          >
            {qs}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-700 mt-8 text-center max-w-sm">
        Type a message below or click any card to get started.
        Your conversation is preserved across sessions.
      </p>
    </div>
  );
};
