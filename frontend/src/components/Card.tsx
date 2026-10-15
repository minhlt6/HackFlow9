import React from 'react';
import { Card as ShadcnCard } from './ui/card';
import { cn } from '../lib/utils';

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
    <ShadcnCard
      onClick={onClick}
      className={cn(
        'p-5 transition-colors duration-150',
        hoverEffect && 'hover:border-primary/50 hover:shadow-card cursor-pointer',
        className,
      )}
    >
      {children}
    </ShadcnCard>
  );
};