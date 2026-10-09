import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] border border-[#334155] bg-[#1E293B] p-6 text-slate-100 shadow-md transition-all duration-200 ${
        hoverEffect ? 'hover:border-[#6366F1]/60 hover:shadow-lg hover:shadow-[#6366F1]/5 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};