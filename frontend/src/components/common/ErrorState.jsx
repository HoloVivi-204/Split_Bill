import { AlertTriangle } from 'lucide-react';

export function ErrorState({
  message,
  onRetry,
  actionLabel = 'Thử lại',
  className = '',
}) {
  return (
    <div
      className={[
        'flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-relaxed text-rose-700',
        className,
      ].join(' ')}
    >
      <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-rose-500" />
      <div>
        <p>{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-button border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
