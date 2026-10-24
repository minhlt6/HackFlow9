import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface DropdownContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) {
    throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  }
  return ctx;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen: React.Dispatch<React.SetStateAction<boolean>> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(open) : updater;
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange, open],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, onClick, children, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useDropdownContext();

  const setRefs = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <button
      ref={setRefs}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((prev) => !prev);
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'center';
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align = 'end', children, ...props }, ref) => {
  const { open } = useDropdownContext();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      );
      firstItem?.focus();
    }
  }, [open]);

  if (!open) return null;

  const alignClass =
    align === 'start'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      ),
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={(node) => {
        menuRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
      className={cn(
        'absolute z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-elevated focus:outline-none',
        alignClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, destructive, onClick, disabled, children, ...props }, ref) => {
  const { setOpen } = useDropdownContext();

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 text-left',
        destructive &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn(
      'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
      className,
    )}
    {...props}
  />
);

export const DropdownMenuSeparator: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    role="separator"
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
);
