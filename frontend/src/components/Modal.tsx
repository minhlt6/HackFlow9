import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#080D18]/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidthClass} max-h-[92vh] flex flex-col rounded-[16px] border border-[#334155] bg-[#1E293B] shadow-2xl transition-all duration-200 my-auto`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]/80 shrink-0 bg-[#1E293B] rounded-t-[16px]">
          <h3 className="font-['Righteous'] text-lg sm:text-xl tracking-wide text-white truncate pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#334155]/60 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0 text-slate-200 font-['Roboto']">{children}</div>
      </div>
    </div>
  );
};