import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'indigo'
  | 'purple'
  | 'cyan'
  | 'pending'
  | 'approved';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const variants: Record<BadgeVariant, string> = {
    primary: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/40',
    indigo: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/40',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    neutral: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border tracking-wide transition-colors ${sizeClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};