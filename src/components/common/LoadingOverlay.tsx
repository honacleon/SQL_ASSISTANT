/**
 * LoadingOverlay - Full-screen loading indicator
 */

import { Loader2 } from 'lucide-react';

export function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
