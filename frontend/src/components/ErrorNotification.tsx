import React, { useEffect } from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, onDismiss, onRetry }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 9000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 right-4 max-w-md bg-red-950/90 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slideInRight z-50">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-red-300">Request Error</p>
        <p className="text-xs text-red-200/90 mt-0.5 leading-relaxed break-words">{message}</p>
        {onRetry && (
          <button
            onClick={() => {
              onDismiss();
              onRetry();
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800/80 border border-red-700/50 text-[0.75rem] font-medium text-red-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-200 p-1 -mr-1 rounded-lg hover:bg-red-900/40 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
