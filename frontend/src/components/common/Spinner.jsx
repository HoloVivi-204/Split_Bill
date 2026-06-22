import { Loader2 } from 'lucide-react';

export function Spinner({ size = 18, className = '' }) {
  return (
    <Loader2
      size={size}
      strokeWidth={2}
      className={`animate-spin-slow ${className}`}
    />
  );
}
