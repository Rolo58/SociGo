import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FieldError({ children, className }: { children?: string | null; className?: string }) {
  if (!children) return null;
  return (
    <p className={cn('flex items-start gap-1.5 text-xs font-medium text-destructive', className)} role="alert">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="label-text flex items-center gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="help-text">{hint}</p> : null}
    </div>
  );
}
