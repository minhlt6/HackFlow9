import React from 'react';

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
      labelClassName = 'text-slate-300 font-medium text-sm mb-1.5',
      error,
      helperText,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <div className="flex flex-col w-full font-['Roboto']">
        {label && <label className={labelClassName}>{label}</label>}
        <input
          ref={ref}
          className={`h-11 px-4 py-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] disabled:opacity-50 disabled:bg-[#0B1120] ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-rose-400 mt-1">{error}</span>}
        {helperText && !error && <span className="text-xs text-slate-400 mt-1">{helperText}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';