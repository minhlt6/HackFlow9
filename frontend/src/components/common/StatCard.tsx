import React from 'react';

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
    indigo: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] border border-[#334155] bg-[#1E293B] p-5 shadow-md transition-all duration-200 ${
        onClick ? 'hover:border-[#6366F1]/60 hover:bg-[#1E293B]/90 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-400 font-['Roboto']">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight font-['Roboto']">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 font-['Roboto']">{subtitle}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl border ${iconColorMap[iconColor]}`}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-[#334155]/60 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-400">so với giai đoạn trước</span>
        </div>
      )}
    </div>
  );
};
