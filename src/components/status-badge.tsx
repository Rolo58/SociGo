import { cn } from '@/lib/utils';
import type { Platform, PostStatus } from '@/lib/types';
import { PLATFORM_META, statusMeta } from '@/lib/status';

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        meta.badgeVariant === 'neutral' && 'bg-slate-100 text-slate-700',
        meta.badgeVariant === 'warning' && 'bg-amber-50 text-amber-700',
        meta.badgeVariant === 'success' && 'bg-emerald-50 text-emerald-700',
        meta.badgeVariant === 'destructive' && 'bg-rose-50 text-rose-700',
        meta.badgeVariant === 'default' && 'bg-primary/10 text-primary',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dotClass)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PlatformChip({ platform, className }: { platform: Platform; className?: string }) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        meta.chipClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function StatusDot({ status, className }: { status: PostStatus; className?: string }) {
  return <span className={cn('size-2 shrink-0 rounded-full', statusMeta(status).dotClass, className)} aria-hidden />;
}
