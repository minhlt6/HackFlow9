import React from 'react';
import { Button as ShadcnButton } from './ui/button';

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
  className = '',
  ...props
}) => {
  return (
    <ShadcnButton
      variant={variant}
      size={size}
      isLoading={isLoading}
      className={className}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
};