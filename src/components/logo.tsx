import { cn } from '@/lib/utils';

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="relative flex size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-indigo-500 shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path d="M5 12.5 10 17.5 19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Soci<span className="text-primary"> Go</span>
        </span>
      )}
    </span>
  );
}
