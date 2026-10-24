import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
