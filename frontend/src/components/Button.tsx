import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none font-["Roboto"]';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-full',
    md: 'px-5 py-2.5 text-sm rounded-full',
    lg: 'px-6 py-3 text-base rounded-full font-semibold',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[#6366F1] text-white hover:bg-[#5558d9] shadow-md shadow-[#6366F1]/20 active:scale-[0.98]',
    success: 'bg-[#16A34A] text-white hover:bg-[#12823b] shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    secondary: 'border border-[#475569] bg-[#334155]/80 text-slate-200 hover:bg-[#334155] active:scale-[0.98]',
    outline: 'border border-[#6366F1] text-[#818CF8] hover:bg-[#6366F1]/15 active:scale-[0.98]',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 active:scale-[0.98]',
    ghost: 'text-slate-300 hover:text-white hover:bg-[#334155]/60 active:scale-[0.98]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};