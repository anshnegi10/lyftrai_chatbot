import React from 'react';
import { MessageMetadata } from '../types';
import { Zap, Brain, Clock, Hash, AlertTriangle } from 'lucide-react';

interface MetadataBadgeProps {
  metadata: MessageMetadata;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const MetadataBadge: React.FC<MetadataBadgeProps> = ({ metadata }) => {
  const isCache = metadata.resolution_source === 'LLM_CACHE';
  const modelShort = metadata.model.replace('gemini/', '').replace('google/', '');

  return (
    <div className="flex flex-wrap gap-1.5 text-xs mt-1">
      {/* Source */}
      <span
        data-testid="meta-source"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
          isCache
            ? 'bg-green-900/40 text-green-400 border border-green-800/40'
            : 'bg-blue-900/40 text-blue-400 border border-blue-800/40'
        }`}
      >
        <Zap className="w-2.5 h-2.5" />
        {isCache ? 'Cached' : 'Live'}
      </span>

      {/* Model */}
      <span
        data-testid="meta-model"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-slate-400 border border-[var(--border-subtle)]"
      >
        <Brain className="w-2.5 h-2.5" />
        {modelShort}
      </span>

      {/* Latency */}
      <span
        data-testid="meta-latency"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-slate-400 border border-[var(--border-subtle)]"
      >
        <Clock className="w-2.5 h-2.5" />
        {formatMs(metadata.latency_ms)}
      </span>

      {/* Tokens */}
      <span
        data-testid="meta-input-tokens"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-slate-400 border border-[var(--border-subtle)]"
      >
        <Hash className="w-2.5 h-2.5" />
        {metadata.input_tokens}↑ {metadata.output_tokens}↓
      </span>

      {/* Fallback indicator */}
      {metadata.fallback_attempts > 0 && (
        <span
          data-testid="meta-output-tokens"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-400 border border-orange-800/40"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          Fallback used
        </span>
      )}
    </div>
  );
};
