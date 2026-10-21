import React from 'react';
import { Input as ShadcnInput } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      labelClassName,
      error,
      helperText,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col w-full gap-1.5">
        {label && (
          <Label
            htmlFor={inputId}
            className={cn('text-xs font-medium text-foreground', labelClassName)}
          >
            {label}
          </Label>
        )}
        <ShadcnInput
          id={inputId}
          ref={ref}
          hasError={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={className}
          {...props}
        />
        {error && (
          <span id={errorId} role="alert" className="text-xs font-medium text-destructive">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';