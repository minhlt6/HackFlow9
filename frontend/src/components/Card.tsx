import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg ${className}`}>
      {children}
    </div>
  );
};