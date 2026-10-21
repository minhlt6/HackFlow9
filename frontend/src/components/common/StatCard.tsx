import React from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'indigo',
  trend,
  onClick,
}) => {
  const iconColorMap = {
    indigo:
      'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30',
    emerald:
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    amber:
      'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    rose:
      'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    purple:
      'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
    cyan:
      'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 sm:p-5 transition-colors duration-150',
        onClick &&
          'hover:border-primary/50 hover:bg-accent/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <h3 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
            iconColorMap[iconColor],
          )}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'font-semibold tabular-nums',
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {trend.value}
          </span>
          <span className="text-muted-foreground">so với giai đoạn trước</span>
        </div>
      )}
    </Card>
  );
};
