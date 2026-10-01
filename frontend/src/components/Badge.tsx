import React from 'react';

interface BadgeProps {
  variant?: 'pending' | 'approved' | 'danger';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'pending', children }) => {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
};