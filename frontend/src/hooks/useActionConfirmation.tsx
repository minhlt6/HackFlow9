import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';

interface Confirmation {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'warning' | 'primary' | 'destructive';
}

/** Await an explicit decision before starting a write; cancellation performs no work. */
export function useActionConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  const confirm = useCallback((options: Confirmation): Promise<boolean> => {
    if (pending.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      pending.current = resolve;
      setRequest(options);
    });
  }, []);
  const finish = useCallback((accepted: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(accepted);
  }, []);
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);
  const confirmationDialog = request ? <ConfirmDialog
    open title={request.title} description={request.description}
    variant={request.variant || 'warning'} confirmLabel={request.confirmLabel || 'Xác nhận thay đổi'}
    onOpenChange={(open) => { if (!open) finish(false); }} onConfirm={() => finish(true)}
  /> : null;
  return { confirm, confirmationDialog };
}
