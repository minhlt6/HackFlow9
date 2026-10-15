import React from 'react';
import { Badge as ShadcnBadge } from './ui/badge';

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
  return (
    <ShadcnBadge variant={variant} size={size} className={className}>
      {children}
    </ShadcnBadge>
  );
};