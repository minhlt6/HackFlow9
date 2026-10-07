import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Custom hook to intercept route navigation and browser close/refresh when there are unsaved changes.
 * @param isDirty Boolean flag indicating if form has unsaved modifications
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  // 1. Intercept React Router in-app route changes (sidebar clicks, back/forward button, navigate calls)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // 2. Intercept browser tab close / reload
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return blocker;
}
