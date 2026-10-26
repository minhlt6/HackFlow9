import { useMockStore } from './useMockStore';
import { useAuthStore } from './useAuthStore';

let initialized = false;
let syncing = false;
export const syncFromLocalStorage = async (_source = 'refresh') => {
  void _source;
  if (syncing || !useAuthStore.getState().isAuthenticated) return;
  syncing = true;
  try { await useMockStore.getState().syncFromBackend?.(); }
  finally { syncing = false; }
};
export const broadcastSyncEvent = (_type = 'STATE_CHANGED', _meta?: Record<string, unknown>) => {
  void _type;
  void _meta;
  void syncFromLocalStorage();
};
export const initRealtimeSync = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('focus', () => { void syncFromLocalStorage(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncFromLocalStorage();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void syncFromLocalStorage();
  }, 30000);
};
