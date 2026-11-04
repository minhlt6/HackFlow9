import { apiClient } from '../api/axiosClient';
import type { BadgeVariant } from '../components/Badge';
import type {
  ConfigHistoryEntry,
  ConfigImpactPreview,
  ContestPhaseCode,
  ContestStateCode,
  HackathonConfig,
  TeamSizeEnforcementPolicy,
} from '../types';

export const CONTEST_PHASE_LABELS: Record<ContestPhaseCode, string> = {
  registration: 'Đăng ký tài khoản & Lập đội',
  team_formation: 'Lựa chọn đề tài & Giới hạn số lượng',
  hacking: 'Thực thi dự án & Nộp bài các chặng',
  judging: 'Hội đồng chấm thi độc lập',
  completed: 'Bế mạc & Công bố kết quả',
};

export function mapPhaseToCode(raw?: string | null): ContestPhaseCode {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'registration' || s.includes('giai đoạn 1') || s.includes('đăng ký')) {
    return 'registration';
  }
  if (s === 'team_formation' || s.includes('giai đoạn 2') || s.includes('lựa chọn đề tài') || s.includes('chọn đề tài')) {
    return 'team_formation';
  }
  if (s === 'hacking' || s.includes('giai đoạn 3') || s.includes('thực thi')) {
    return 'hacking';
  }
  if (s === 'judging' || s.includes('giai đoạn 4') || s.includes('chấm thi') || s.includes('chấm điểm')) {
    return 'judging';
  }
  if (s === 'completed' || s.includes('giai đoạn 5') || s.includes('bế mạc') || s.includes('công bố kết quả')) {
    return 'completed';
  }
  return 'hacking';
}

export function deriveContestRuntimeState(
  rawStatus?: string | null,
  rawPhase?: string | null,
  rawIsPaused?: unknown
): {
  status: ContestPhaseCode;
  isPaused: boolean;
  isContestStarted: boolean;
  contestState: ContestStateCode;
  contestStateLabel: string;
  badgeVariant: BadgeVariant;
} {
  const status = rawStatus ? mapPhaseToCode(rawStatus) : mapPhaseToCode(rawPhase);
  const isPaused = rawIsPaused === true;

  if (isPaused) {
    return {
      status,
      isPaused: true,
      isContestStarted: false,
      contestState: 'paused',
      contestStateLabel: 'Cuộc thi đang tạm dừng',
      badgeVariant: 'warning',
    };
  }
  if (status === 'hacking') {
    return {
      status,
      isPaused: false,
      isContestStarted: true,
      contestState: 'running',
      contestStateLabel: 'Cuộc thi đang diễn ra',
      badgeVariant: 'success',
    };
  }
  if (status === 'judging') {
    return {
      status,
      isPaused: false,
      isContestStarted: false,
      contestState: 'judging',
      contestStateLabel: 'Cuộc thi đang chấm điểm',
      badgeVariant: 'indigo',
    };
  }
  if (status === 'completed') {
    return {
      status,
      isPaused: false,
      isContestStarted: false,
      contestState: 'completed',
      contestStateLabel: 'Cuộc thi đã kết thúc',
      badgeVariant: 'neutral',
    };
  }
  return {
    status,
    isPaused: false,
    isContestStarted: false,
    contestState: 'not_started',
    contestStateLabel: 'Cuộc thi chưa bắt đầu',
    badgeVariant: 'warning',
  };
}

export function normalizeBackendConfig(
  data: Record<string, unknown>,
  fallback: HackathonConfig
): HackathonConfig {
  const runtime = deriveContestRuntimeState(
    (data.status as string | undefined) ?? fallback.status,
    (data.currentPhase as string | undefined) ?? fallback.currentPhase,
    data.is_paused ?? data.isPaused ?? fallback.isPaused
  );
  const minTeam = Math.max(
    1,
    Number(data.minTeamMembers ?? data.minTeamSize ?? fallback.minTeamMembers ?? fallback.minTeamSize ?? 3)
  );
  const maxTeam = Math.max(
    minTeam,
    Number(data.maxTeamMembers ?? data.maxTeamSize ?? fallback.maxTeamMembers ?? fallback.maxTeamSize ?? 5)
  );
  const nextEnd = String(data.end_time ?? data.endAt ?? fallback.finalSubmissionDeadline);
  const nextPhase = String(data.currentPhase ?? CONTEST_PHASE_LABELS[runtime.status] ?? fallback.currentPhase);
  const rawPolicy = String(data.teamSizeEnforcementPolicy ?? fallback.teamSizeEnforcementPolicy ?? 'grandfathered_approved');
  const enforcementPolicy: TeamSizeEnforcementPolicy =
    rawPolicy === 'strict_all' || rawPolicy === 'before_lock_only'
      ? rawPolicy
      : 'grandfathered_approved';

  return {
    ...fallback,
    name: String(data.name ?? data.eventName ?? fallback.name),
    status: runtime.status,
    currentPhase: nextPhase,
    version: typeof data.version === 'number' ? data.version : (fallback.version ?? 1),
    isPaused: runtime.isPaused,
    pauseReason: (data.pause_reason ?? data.pauseReason ?? null) as string | null,
    pausedAt: (data.paused_at ?? data.pausedAt ?? null) as string | null,
    contestState: (data.contest_state as ContestStateCode | undefined) ?? runtime.contestState,
    contestStateLabel: String(data.contest_state_label ?? data.contestStateLabel ?? runtime.contestStateLabel),
    isContestStarted:
      typeof data.isContestStarted === 'boolean' ? data.isContestStarted : runtime.isContestStarted,
    teamSizeEnforcementPolicy: enforcementPolicy,
    submissionFreezeEnabled: true,
    configHistory: Array.isArray(data.configHistory)
      ? (data.configHistory as ConfigHistoryEntry[])
      : fallback.configHistory,
    impactPreview:
      data.impactPreview && typeof data.impactPreview === 'object'
        ? (data.impactPreview as ConfigImpactPreview)
        : fallback.impactPreview,
    currentPolicy:
      data.currentPolicy && typeof data.currentPolicy === 'object'
        ? (data.currentPolicy as Record<string, unknown>)
        : fallback.currentPolicy,
    phasePolicies:
      data.phasePolicies && typeof data.phasePolicies === 'object'
        ? (data.phasePolicies as Record<string, Record<string, unknown>>)
        : fallback.phasePolicies,
    minTeamSize: minTeam,
    minTeamMembers: minTeam,
    maxTeamSize: maxTeam,
    maxTeamMembers: maxTeam,
    finalSubmissionDeadline: nextEnd,
    contestStart: String(data.start_time ?? fallback.contestStart ?? ''),
    contestEnd: nextEnd,
    registrationEnd: String(data.registrationDeadline ?? fallback.registrationEnd ?? ''),
    blindJudging: Boolean(data.blindJudgingEnabled ?? fallback.blindJudging),
    blindJudgingMode: Boolean(data.blindJudgingEnabled ?? fallback.blindJudgingMode),
    resultsPublished: Boolean(data.is_result_published ?? data.leaderboardPublished ?? fallback.resultsPublished),
    discrepancyThreshold: Number(data.discrepancyThreshold ?? fallback.discrepancyThreshold ?? 15),
    expectedResultPublishAt:
      data.expectedResultPublishAt !== undefined
        ? (data.expectedResultPublishAt as string | null)
        : fallback.expectedResultPublishAt,
  };
}

export function buildConfigPatchPayload(
  newConfig: Partial<HackathonConfig>,
  currentConfig?: HackathonConfig
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (typeof newConfig.version === 'number') {
    payload.expected_version = newConfig.version;
  } else if (typeof currentConfig?.version === 'number') {
    payload.expected_version = currentConfig.version;
  }

  if (newConfig.name !== undefined) {
    payload.name = newConfig.name;
  }
  if (newConfig.finalSubmissionDeadline !== undefined) {
    payload.end_time = newConfig.finalSubmissionDeadline;
  }
  const minVal = newConfig.minTeamMembers ?? newConfig.minTeamSize;
  if (minVal !== undefined) {
    payload.minTeamSize = minVal;
    payload.minTeamMembers = minVal;
  }
  const maxVal = newConfig.maxTeamMembers ?? newConfig.maxTeamSize;
  if (maxVal !== undefined) {
    payload.maxTeamSize = maxVal;
    payload.maxTeamMembers = maxVal;
  }
  if (newConfig.status !== undefined) {
    payload.status = newConfig.status;
  } else if (newConfig.currentPhase !== undefined) {
    payload.status = mapPhaseToCode(newConfig.currentPhase);
    payload.currentPhase = newConfig.currentPhase;
  }
  if (newConfig.isPaused !== undefined) {
    payload.is_paused = Boolean(newConfig.isPaused);
  }
  if (newConfig.pauseReason !== undefined) {
    payload.pause_reason = newConfig.pauseReason;
  }
  if (newConfig.teamSizeEnforcementPolicy !== undefined) {
    payload.teamSizeEnforcementPolicy = newConfig.teamSizeEnforcementPolicy;
  }
  const blindVal = newConfig.blindJudgingMode ?? newConfig.blindJudging;
  if (blindVal !== undefined) {
    payload.blindJudgingEnabled = Boolean(blindVal);
  }
  if (newConfig.resultsPublished !== undefined) {
    payload.is_result_published = Boolean(newConfig.resultsPublished);
  }
  if (newConfig.expectedResultPublishAt !== undefined) {
    payload.expectedResultPublishAt = newConfig.expectedResultPublishAt;
  }
  if (newConfig.discrepancyThreshold !== undefined) {
    payload.discrepancyThreshold = newConfig.discrepancyThreshold;
  }
  return payload;
}

export const contestConfigService = {
  async fetchAdminConfig(): Promise<Record<string, unknown>> {
    const res = await apiClient.get('/admin/config');
    const data = res.data?.data ?? res.data;
    if (!data?.id || !data.end_time) {
      throw new Error('Phản hồi cấu hình không hợp lệ.');
    }
    return data as Record<string, unknown>;
  },

  async patchAdminConfig(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiClient.patch('/admin/config', payload);
    const saved = res.data?.data ?? res.data;
    if (!saved?.id || !saved.end_time) {
      throw new Error('Phản hồi cấu hình không hợp lệ. Vui lòng tải lại trang.');
    }
    return saved as Record<string, unknown>;
  },

  async previewAdminConfigImpact(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiClient.post('/admin/config/preview', payload);
    return (res.data?.data ?? res.data) as Record<string, unknown>;
  },
};
