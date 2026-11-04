import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { checkpointApi } from '../api/checkpointApi';
import type { CheckpointWithSubmission } from '../types/checkpoint';

export function checkpointAtTime(cp: CheckpointWithSubmission, now: number): CheckpointWithSubmission {
  if (cp.availability_error) return {...cp, status:'closed', can_submit:false, is_open:false, is_late_window:false};
  const start = Date.parse(cp.start_time), end = Date.parse(cp.deadline);
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end)) return { ...cp, can_submit: false };
  const grace = end + (cp.grace_period_seconds ?? 5) * 1000;
  const status = !cp.is_active ? 'closed' : now < start ? 'upcoming' : now <= end ? 'open' : now <= grace ? 'grace_period' : 'late';
  const isWindowOpen = status === 'open' || status === 'grace_period' || status === 'late';
  const isLateWindow = status === 'late';
  const contestAllows = cp.contest_allows_submission !== false && !cp.submission_block_reason;
  return { ...cp, status, can_submit: isWindowOpen && contestAllows,
    is_open: isWindowOpen,
    is_late_window: isLateWindow,
    time_remaining_seconds: Math.max(0, Math.floor((end - now) / 1000)),
    time_until_start_seconds: Math.max(0, Math.floor((start - now) / 1000)) };
}

/** Anchor elapsed monotonic time to the server, not the user's wall clock. */
export function useLiveCheckpoints(raw: CheckpointWithSubmission[], setRaw?: Dispatch<SetStateAction<CheckpointWithSubmission[]>>) {
  const [clock, setClock] = useState<{source: CheckpointWithSubmission[]; now: number} | null>(null);
  useEffect(() => {
    if (!setRaw) return;
    let active = true;
    const refresh = async () => {
      try { const data = await checkpointApi.getCheckpoints(); if (active) setRaw(data); }
      catch { if (active) setRaw((items) => items.map((cp) => ({...cp, availability_error:'Không thể xác minh trạng thái chặng. Vui lòng tải lại.'}))); }
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh);};
  }, [setRaw]);
  useEffect(() => {
    let active = true;
    const server = Date.parse(raw.find((cp) => cp.server_time)?.server_time || '') || Date.now();
    const isContestPaused = raw.some(
      (cp) =>
        cp.contest_allows_submission === false &&
        String(cp.submission_block_reason || '').toLowerCase().includes('tạm dừng')
    );
    const local = performance.now();
    const update = () => {
      if (active) {
        setClock({
          source: raw,
          now: isContestPaused ? server : server + performance.now() - local,
        });
      }
    };
    void Promise.resolve().then(update);
    const timer = window.setInterval(update, 1000);
    return () => {active = false; window.clearInterval(timer);};
  }, [raw]);
  return useMemo(() => raw.map((cp) => checkpointAtTime(cp, clock?.source === raw ? clock.now : Date.parse(cp.server_time || ''))), [raw, clock]);
}
