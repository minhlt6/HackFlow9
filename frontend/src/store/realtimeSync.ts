import { useMockStore } from './useMockStore';

const CHANNEL_NAME = 'hackflow_live_sync_v3';
let broadcastChannel: BroadcastChannel | null = null;
let isApplyingRemoteUpdate = false;
let isInitialized = false;

// Safe BroadcastChannel initialization
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('[RealtimeSync] BroadcastChannel not supported in this environment:', e);
  }
}

/**
 * Broadcasts a lightweight sync notification to all other tabs/windows.
 */
export const broadcastSyncEvent = (type: string = 'STATE_CHANGED', meta?: any) => {
  if (isApplyingRemoteUpdate) return;
  try {
    const payload = { type, meta, timestamp: Date.now() };
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
  } catch (e) {
    console.warn('[RealtimeSync] Failed to broadcast event:', e);
  }
};

/**
 * Re-reads latest shared contest database from localStorage and merges into the local Zustand store.
 * Preserves the current tab's user session (currentUser, activeRolePersona, isAuthenticated).
 */
export const syncFromLocalStorage = (source: string = 'channel') => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('hackflow-full-setup-v3');
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const remote = parsed.state || parsed;
    if (!remote) return;

    isApplyingRemoteUpdate = true;

    // Merge shared contest state only
    useMockStore.setState((current) => ({
      tickets: remote.tickets || current.tickets,
      evaluations: remote.evaluations || current.evaluations,
      submissions: remote.submissions || current.submissions,
      finalSubmissions: remote.finalSubmissions || current.finalSubmissions,
      teams: remote.teams || current.teams,
      checkpoints: remote.checkpoints || current.checkpoints,
      majorTopics: remote.majorTopics || current.majorTopics,
      rubricCriteria: remote.rubricCriteria || current.rubricCriteria,
      whitelist: remote.whitelist || current.whitelist,
      pendingCandidates: remote.pendingCandidates || current.pendingCandidates,
      config: remote.config ? { ...current.config, ...remote.config } : current.config,
      announcements: remote.announcements || current.announcements,
      onboardingCompletedUsers: remote.onboardingCompletedUsers || current.onboardingCompletedUsers,
      pledgedUsers: remote.pledgedUsers || current.pledgedUsers,
    }));

    // Dispatch window event so components can show toasts if desired
    window.dispatchEvent(
      new CustomEvent('hackflow:realtime_synced', {
        detail: { source, timestamp: Date.now() },
      })
    );

    setTimeout(() => {
      isApplyingRemoteUpdate = false;
    }, 60);
  } catch (err) {
    isApplyingRemoteUpdate = false;
    console.error('[RealtimeSync] Error syncing from localStorage:', err);
  }
};

/**
 * Initializes listeners for cross-tab real-time synchronization:
 * 1. BroadcastChannel (instant push across tabs)
 * 2. Window 'storage' event (standard browser multi-tab fallback)
 * 3. Window 'focus' & 'visibilitychange' (sync when user clicks/focuses a tab)
 * 4. Zustand state change subscription (auto-broadcast on any mutation)
 */
export const initRealtimeSync = () => {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Listen for BroadcastChannel messages
  if (broadcastChannel) {
    broadcastChannel.onmessage = () => {
      syncFromLocalStorage('broadcast-channel');
    };
  }

  // 2. Listen for native storage events
  window.addEventListener('storage', (event) => {
    if (event.key === 'hackflow-full-setup-v3' && event.newValue) {
      syncFromLocalStorage('storage-event');
    }
  });

  // 3. Listen for tab focus / visibility change
  window.addEventListener('focus', () => {
    syncFromLocalStorage('tab-focus');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncFromLocalStorage('visibility-change');
    }
  });

  // 4. Hook into useMockStore mutations to automatically broadcast to other tabs
  let broadcastTimer: any = null;
  useMockStore.subscribe((state, prevState) => {
    if (isApplyingRemoteUpdate) return;

    // Only broadcast if shared contest fields changed
    const ticketsChanged = state.tickets !== prevState.tickets;
    const evaluationsChanged = state.evaluations !== prevState.evaluations;
    const submissionsChanged = state.submissions !== prevState.submissions;
    const finalsChanged = state.finalSubmissions !== prevState.finalSubmissions;
    const teamsChanged = state.teams !== prevState.teams;
    const configChanged = state.config !== prevState.config;
    const announcementsChanged = state.announcements !== prevState.announcements;
    const checkpointsChanged = state.checkpoints !== prevState.checkpoints;
    const criteriaChanged = state.rubricCriteria !== prevState.rubricCriteria;
    const whitelistChanged = state.whitelist !== prevState.whitelist;
    const pendingChanged = state.pendingCandidates !== prevState.pendingCandidates;

    if (
      ticketsChanged ||
      evaluationsChanged ||
      submissionsChanged ||
      finalsChanged ||
      teamsChanged ||
      configChanged ||
      announcementsChanged ||
      checkpointsChanged ||
      criteriaChanged ||
      whitelistChanged ||
      pendingChanged
    ) {
      clearTimeout(broadcastTimer);
      broadcastTimer = setTimeout(() => {
        broadcastSyncEvent('MUTATION', {
          ticketsChanged,
          evaluationsChanged,
          announcementsChanged,
        });
      }, 40);
    }
  });
};
