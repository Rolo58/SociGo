import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';

/** Blocks private manager pages until the server confirms the stored session. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, authenticated } = useStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-[13px]">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
