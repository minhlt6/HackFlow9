import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelClassName = 'text-slate-700', error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className={`text-sm font-medium ${labelClassName}`}>{label}</label>}
        <input
          ref={ref}
          className={`px-3 py-2 border rounded-lg outline-none transition-all duration-200 
            ${error ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'} 
            ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';