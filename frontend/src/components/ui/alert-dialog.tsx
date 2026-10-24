import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button, type ButtonProps } from './button';
import { cn } from '../../lib/utils';

export const AlertDialog = Dialog;

export const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    role="alertdialog"
    className={cn('max-w-md', className)}
    {...props}
  />
));
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;

export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, ...props }, ref) => (
  <Button ref={ref} className={cn(className)} {...props} />
));
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant = 'outline', ...props }, ref) => (
  <Button ref={ref} variant={variant} className={cn(className)} {...props} />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
