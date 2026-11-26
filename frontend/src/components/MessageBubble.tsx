import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';
import { MetadataBadge } from './MetadataBadge';
import {
  Bot, User, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown,
  ChevronRight
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onFollowUp?: (prompt: string) => void;
  isLast?: boolean;
}

// ── Typing indicator ──────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-1 py-2.5">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
  </div>
);

// ── Code block with copy ──────────────────────────────────
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="lang-label">{language || 'code'}</span>
        <button onClick={copy} className="code-copy-btn">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 10px 10px',
          border: '1px solid rgba(99,102,241,0.2)',
          borderTop: 'none',
          fontSize: '0.83rem',
          lineHeight: 1.6,
        }}
        showLineNumbers={code.split('\n').length > 5}
        lineNumberStyle={{ color: '#374151', fontSize: '0.72rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// ── Markdown renderer ─────────────────────────────────────
const MarkdownContent: React.FC<{ content: string; isStreaming?: boolean }> = ({
  content, isStreaming,
}) => (
  <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const inline = !match;
          if (inline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return (
            <CodeBlock
              language={match[1]}
              code={String(children).replace(/\n$/, '')}
            />
          );
        },
        a({ href, children }) {
          const isSafe =
            !href ||
            href.startsWith('https://') ||
            href.startsWith('http://') ||
            href.startsWith('/') ||
            href.startsWith('#');
          if (!isSafe) return <span>{children}</span>;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

// ── Follow-up suggestions ─────────────────────────────────
const GENERIC_FOLLOWUPS = [
  'Explain this in simpler terms',
  'Show me a practical example',
  'Go deeper into this topic',
];

function deriveFollowUps(content: string): string[] {
  const lower = content.toLowerCase();
  if (lower.includes('```') || lower.includes('function') || lower.includes('def ') || lower.includes('class ')) {
    return ['Explain this code', 'Show me how to use this', 'What could go wrong here?'];
  }
  if (lower.includes('step') || lower.includes('first') || lower.includes('then')) {
    return ['Summarize these steps', 'What are common mistakes?', 'Show me an example'];
  }
  if (lower.includes('?') && content.length < 300) {
    return ['Tell me more', 'Give me an example', 'Why does this matter?'];
  }
  return GENERIC_FOLLOWUPS;
}

// ── Message copy ──────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copied, copy };
}

// ── Main component ────────────────────────────────────────
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, onRegenerate, onFollowUp, isLast,
}) => {
  const isUser = message.role === 'user';
  const { copied, copy } = useCopy();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [showMeta, setShowMeta] = useState(false);

  const showFollowUps =
    !isUser && !message.isLoading && !message.isStreaming && isLast &&
    message.content.length > 60 && onFollowUp;

  // ── User bubble ───────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end mb-5 animate-fadeInUp group">
        <div className="flex items-start gap-2.5 max-w-[78%]">
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-indigo-900/30">
            <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center mt-1 shadow-md">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // ── Assistant bubble ──────────────────────────────────
  return (
    <div className="flex justify-start mb-5 animate-fadeInUp group" data-testid="assistant-message">
      <div className="flex items-start gap-2.5 max-w-[90%] w-full">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center mt-1 shadow-md shadow-indigo-900/40">
          <Bot className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="bg-[var(--surface-2)] border border-[var(--border-subtle)] px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-sm">
            {message.isLoading ? (
              <TypingIndicator />
            ) : (
              <MarkdownContent
                content={message.content}
                isStreaming={message.isStreaming}
              />
            )}
          </div>

          {/* Action bar — only once generation finishes */}
          {!message.isLoading && !message.isStreaming && message.content && !message.isError && (
            <div className="flex items-center flex-wrap gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => copy(message.content)}
                className="msg-action-btn"
                title="Copy response"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              {onRegenerate && isLast && (
                <button onClick={onRegenerate} className="msg-action-btn" title="Regenerate response">
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              )}

              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`msg-action-btn ${feedback === 'up' ? 'active' : ''}`}
                title="Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`msg-action-btn ${feedback === 'down' ? 'active' : ''}`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>

              {message.metadata && (
                <button
                  onClick={() => setShowMeta(!showMeta)}
                  className="msg-action-btn ml-auto"
                  title="View details"
                >
                  Details
                  <ChevronRight className={`w-3 h-3 transition-transform ${showMeta ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Collapsible metadata */}
          {showMeta && message.metadata && (
            <div className="mt-2 animate-fadeInUp">
              <MetadataBadge metadata={message.metadata} />
            </div>
          )}

          {/* Follow-up suggestions */}
          {showFollowUps && (
            <div className="mt-3 flex flex-wrap gap-2 animate-fadeInUp">
              {deriveFollowUps(message.content).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onFollowUp?.(prompt)}
                  className="followup-pill"
                >
                  <ChevronRight className="w-3 h-3" />
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
