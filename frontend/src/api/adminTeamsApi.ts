import { axiosClient } from './axiosClient';
import {
  ADMIN_TEAMS_MOCK_DATA,
  type EnrichedAdminTeam,
} from '../mocks/adminTeamsMockData';
import type { ApiResponse, Team, TeamMember } from '../types';

const STORAGE_KEY = 'hackflow_admin_teams_clean_v1';

export interface AdminTeamUpsertPayload {
  name: string;
  inviteCode: string;
  leaderName: string;
  leaderEmail: string;
  university: string;
  majorTopicId: string;
  subTopicId: string;
  memberCount: number;
  repoUrl?: string;
  description: string;
}

function normalizeAdminTeam(rawInput: unknown): EnrichedAdminTeam {
  const raw = (rawInput || {}) as Record<string, unknown>;
  const rawMembers = Array.isArray(raw.members)
    ? (raw.members as Array<Record<string, unknown>>)
    : [];

  const university =
    (typeof raw.university === 'string' && raw.university.trim()) ||
    (typeof rawMembers[0]?.school === 'string' && rawMembers[0].school) ||
    (typeof rawMembers[0]?.university === 'string' && rawMembers[0].university) ||
    'ĐH Bách Khoa Hà Nội (HUST)';

  const members: TeamMember[] = rawMembers.map((m, idx) => {
    const uid = String(m.userId || m.user_id || m.id || `mem-${idx}`);
    const fullName = String(m.fullName || m.full_name || `Thành viên #${idx + 1}`);
    const email = String(m.email || '');
    const roleVal =
      m.roleInTeam === 'leader' || m.role === 'leader' || idx === 0
        ? ('leader' as const)
        : ('member' as const);
    const joinedRaw = String(m.joinedAt || m.joined_at || new Date().toISOString());
    const skillsArr = Array.isArray(m.skills)
      ? (m.skills as string[])
      : roleVal === 'leader'
        ? ['Team Lead', 'System Design']
        : ['Full-Stack', 'AI/ML'];

    return {
      id: uid,
      userId: uid,
      user_id: uid,
      fullName,
      full_name: fullName,
      email,
      role: roleVal,
      roleInTeam: roleVal,
      studentId: String(m.studentId || m.github_username || `2022${1000 + idx}`),
      school: String(m.school || m.university || university),
      university: String(m.university || m.school || university),
      skills: skillsArr,
      joinedAt: joinedRaw.slice(0, 10),
    };
  });

  const leaderMember =
    members.find((m) => m.roleInTeam === 'leader' || m.role === 'leader') ||
    members[0];

  const id = String(raw.id || `team-${Date.now()}`);
  const name = String(raw.name || raw.team_name || 'Đội thi');
  const inviteCode = String(raw.inviteCode || raw.invite_code || 'HF2026').toUpperCase();
  const leaderId = String(raw.leaderId || raw.leader_id || leaderMember?.userId || '');
  const leaderName = String(
    raw.leaderName || raw.leader_name || leaderMember?.fullName || 'Đội trưởng',
  );
  const leaderEmail = String(
    raw.leaderEmail || raw.leader_email || leaderMember?.email || 'leader@hackflow.dev',
  );

  const subTopicId = String(
    raw.subTopicId ||
      raw.sub_topic_id ||
      raw.subtopic_id ||
      raw.selected_topic_id ||
      raw.topicId ||
      '',
  );
  const majorTopicId = String(
    raw.majorTopicId ||
      raw.major_topic_id ||
      raw.topic_id ||
      (subTopicId.startsWith('sub-iot')
        ? 'major-iot'
        : subTopicId.startsWith('sub-fin')
          ? 'major-fintech'
          : subTopicId.startsWith('sub-hlt')
            ? 'major-health'
            : subTopicId
              ? 'major-ai'
              : ''),
  );

  const rawStatus = String(
    raw.status || raw.approval_status || (raw.is_locked ? 'approved' : 'pending'),
  ).toLowerCase();
  const status: 'pending' | 'approved' | 'rejected' =
    rawStatus === 'approved'
      ? 'approved'
      : rawStatus === 'rejected'
        ? 'rejected'
        : 'pending';

  const memberCount =
    typeof raw.memberCount === 'number'
      ? raw.memberCount
      : typeof raw.member_count === 'number'
        ? raw.member_count
        : Math.max(1, members.length);

  const createdRaw = String(raw.createdAt || raw.created_at || new Date().toISOString());

  return {
    id,
    name,
    description: String(
      raw.description ||
        `Giải pháp kỹ thuật do đội thi ${name} phát triển tại Hackathon.`,
    ),
    inviteCode,
    leaderId,
    leaderName,
    leaderEmail,
    university,
    majorTopicId,
    subTopicId: subTopicId || undefined,
    topicId: subTopicId || undefined,
    status,
    rejectionReason:
      typeof raw.rejectionReason === 'string'
        ? raw.rejectionReason
        : typeof raw.rejection_reason === 'string'
          ? raw.rejection_reason
          : undefined,
    memberCount,
    repoUrl:
      typeof raw.repoUrl === 'string' && raw.repoUrl
        ? raw.repoUrl
        : typeof raw.repo_url === 'string' && raw.repo_url
          ? raw.repo_url
          : undefined,
    latestCommitSha:
      typeof raw.latestCommitSha === 'string' ? raw.latestCommitSha : undefined,
    checkpointsCompleted:
      typeof raw.checkpointsCompleted === 'number'
        ? raw.checkpointsCompleted
        : typeof raw.checkpoints_completed === 'number'
          ? raw.checkpoints_completed
          : 0,
    totalCheckpoints:
      typeof raw.totalCheckpoints === 'number'
        ? raw.totalCheckpoints
        : typeof raw.total_checkpoints === 'number'
          ? raw.total_checkpoints
          : 3,
    averageScore:
      typeof raw.averageScore === 'number' ? raw.averageScore : null,
    createdAt: createdRaw.slice(0, 10),
    members,
  };
}

function loadPersistedAdminTeams(): EnrichedAdminTeam[] {
  if (typeof window === 'undefined') return ADMIN_TEAMS_MOCK_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeAdminTeam);
      }
    }
  } catch {
    // fallback to default mock dataset
  }
  return ADMIN_TEAMS_MOCK_DATA;
}

function savePersistedAdminTeams(teams: EnrichedAdminTeam[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  } catch {
    // ignore storage errors
  }
}

export const adminTeamsApi = {
  /**
   * Fetch all registered teams for the Administration Portal.
   * Merges any newly created teams from useMockStore with the enriched dataset.
   */
  getAllTeams: async (
    storeTeams: Team[] = [],
  ): Promise<EnrichedAdminTeam[]> => {
    try {
      const res = await axiosClient.get<ApiResponse<unknown[]>>(
        '/admin/teams',
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        const normalized = res.data.data.map(normalizeAdminTeam);
        savePersistedAdminTeams(normalized);
        return normalized;
      }
    } catch {
      // Fallback to persisted mock data when backend is offline
    }

    const persisted = loadPersistedAdminTeams();
    const merged: EnrichedAdminTeam[] = [...persisted];

    for (const st of storeTeams) {
      const existingIndex = merged.findIndex((m) => m.id === st.id);
      if (existingIndex === -1) {
        merged.unshift(normalizeAdminTeam(st));
      }
    }

    savePersistedAdminTeams(merged);
    return merged;
  },

  /**
   * Create a new team from the Administration Portal.
   */
  createTeam: async (
    payload: AdminTeamUpsertPayload,
  ): Promise<EnrichedAdminTeam> => {
    try {
      const res = await axiosClient.post<ApiResponse<unknown>>(
        '/admin/teams',
        {
          name: payload.name.trim(),
          inviteCode: payload.inviteCode.trim().toUpperCase(),
          invite_code: payload.inviteCode.trim().toUpperCase(),
          leaderName: payload.leaderName.trim(),
          leader_name: payload.leaderName.trim(),
          leaderEmail: payload.leaderEmail.trim(),
          leader_email: payload.leaderEmail.trim(),
          university: payload.university.trim(),
          majorTopicId: payload.majorTopicId,
          major_topic_id: payload.majorTopicId,
          subTopicId: payload.subTopicId,
          sub_topic_id: payload.subTopicId,
          selected_topic_id: payload.subTopicId,
          memberCount: payload.memberCount,
          member_count: payload.memberCount,
          repoUrl: payload.repoUrl?.trim() || undefined,
          repo_url: payload.repoUrl?.trim() || undefined,
          description: payload.description.trim(),
        },
      );
      if (res.data?.data) {
        const created = normalizeAdminTeam(res.data.data);
        const current = loadPersistedAdminTeams();
        savePersistedAdminTeams([created, ...current.filter((t) => t.id !== created.id)]);
        return created;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg = e?.response?.data?.message || e?.response?.data?.detail;
      if (msg) {
        throw new Error(msg, { cause: err });
      }
    }

    const current = loadPersistedAdminTeams();
    const duplicateName = current.some(
      (t) => t.name.toLowerCase() === payload.name.trim().toLowerCase(),
    );
    if (duplicateName) {
      throw new Error(`Tên đội thi "${payload.name}" đã tồn tại trong hệ thống.`);
    }

    const duplicateCode = current.some(
      (t) =>
        t.inviteCode.toUpperCase() === payload.inviteCode.trim().toUpperCase(),
    );
    if (duplicateCode) {
      throw new Error(`Mã mời "${payload.inviteCode}" đã được cấp cho đội khác.`);
    }

    const nowIso = new Date().toISOString().slice(0, 10);
    const leaderId = `user-leader-${Date.now()}`;

    const generatedMembers = Array.from(
      { length: payload.memberCount },
      (_, idx) => ({
        userId: idx === 0 ? leaderId : `user-mem-${Date.now()}-${idx}`,
        fullName:
          idx === 0
            ? payload.leaderName.trim()
            : `Thành viên #${idx + 1} (${payload.name.trim()})`,
        email:
          idx === 0
            ? payload.leaderEmail.trim()
            : `member${idx + 1}.${payload.inviteCode.toLowerCase()}@student.edu.vn`,
        roleInTeam: (idx === 0 ? 'leader' : 'member') as 'leader' | 'member',
        studentId: `2022${1000 + idx}`,
        school: payload.university.trim(),
        skills: idx === 0 ? ['Team Lead', 'System Design'] : ['Fullstack', 'AI/ML'],
        joinedAt: nowIso,
      }),
    );

    const newTeam: EnrichedAdminTeam = {
      id: `team-${Date.now()}`,
      name: payload.name.trim(),
      description: payload.description.trim(),
      inviteCode: payload.inviteCode.trim().toUpperCase(),
      leaderId,
      leaderName: payload.leaderName.trim(),
      leaderEmail: payload.leaderEmail.trim(),
      university: payload.university.trim(),
      majorTopicId: payload.majorTopicId,
      subTopicId: payload.subTopicId,
      topicId: payload.subTopicId,
      status: 'approved',
      memberCount: payload.memberCount,
      repoUrl: payload.repoUrl?.trim() || undefined,
      checkpointsCompleted: 0,
      totalCheckpoints: 3,
      createdAt: nowIso,
      members: generatedMembers,
    };

    const updated = [newTeam, ...current];
    savePersistedAdminTeams(updated);
    return newTeam;
  },

  /**
   * Update an existing team's metadata and topic assignment.
   */
  updateTeam: async (
    teamId: string,
    payload: AdminTeamUpsertPayload,
  ): Promise<EnrichedAdminTeam> => {
    try {
      const res = await axiosClient.put<ApiResponse<unknown>>(
        `/admin/teams/${teamId}`,
        {
          name: payload.name.trim(),
          inviteCode: payload.inviteCode.trim().toUpperCase(),
          invite_code: payload.inviteCode.trim().toUpperCase(),
          leaderName: payload.leaderName.trim(),
          leader_name: payload.leaderName.trim(),
          leaderEmail: payload.leaderEmail.trim(),
          leader_email: payload.leaderEmail.trim(),
          university: payload.university.trim(),
          majorTopicId: payload.majorTopicId,
          major_topic_id: payload.majorTopicId,
          subTopicId: payload.subTopicId,
          sub_topic_id: payload.subTopicId,
          selected_topic_id: payload.subTopicId,
          memberCount: payload.memberCount,
          member_count: payload.memberCount,
          repoUrl: payload.repoUrl?.trim() || undefined,
          repo_url: payload.repoUrl?.trim() || undefined,
          description: payload.description.trim(),
        },
      );
      if (res.data?.data) {
        const updatedTeam = normalizeAdminTeam(res.data.data);
        const current = loadPersistedAdminTeams();
        savePersistedAdminTeams(
          current.map((t) => (t.id === teamId ? updatedTeam : t)),
        );
        return updatedTeam;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg = e?.response?.data?.message || e?.response?.data?.detail;
      if (msg) {
        throw new Error(msg, { cause: err });
      }
    }

    const current = loadPersistedAdminTeams();
    const index = current.findIndex((t) => t.id === teamId);
    if (index === -1) {
      throw new Error('Không tìm thấy đội thi cần cập nhật.');
    }

    const existing = current[index];
    const updatedTeam: EnrichedAdminTeam = {
      ...existing,
      name: payload.name.trim(),
      inviteCode: payload.inviteCode.trim().toUpperCase(),
      leaderName: payload.leaderName.trim(),
      leaderEmail: payload.leaderEmail.trim(),
      university: payload.university.trim(),
      majorTopicId: payload.majorTopicId,
      subTopicId: payload.subTopicId,
      topicId: payload.subTopicId,
      memberCount: payload.memberCount,
      repoUrl: payload.repoUrl?.trim() || undefined,
      description: payload.description.trim(),
    };

    current[index] = updatedTeam;
    savePersistedAdminTeams(current);
    return updatedTeam;
  },

  /**
   * Approve a single team registration.
   */
  approveTeam: async (teamId: string): Promise<EnrichedAdminTeam> => {
    try {
      const res = await axiosClient.patch<ApiResponse<unknown>>(
        `/admin/teams/${teamId}/approve`,
      );
      if (res.data?.data) {
        const updated = normalizeAdminTeam(res.data.data);
        const current = loadPersistedAdminTeams();
        savePersistedAdminTeams(
          current.map((t) => (t.id === teamId ? updated : t)),
        );
        return updated;
      }
    } catch {
      // Fallback below
    }

    const current = loadPersistedAdminTeams();
    const index = current.findIndex((t) => t.id === teamId);
    if (index === -1) throw new Error('Không tìm thấy đội thi.');

    const updated: EnrichedAdminTeam = {
      ...current[index],
      status: 'approved',
      rejectionReason: undefined,
    };
    current[index] = updated;
    savePersistedAdminTeams(current);
    return updated;
  },

  /**
   * Bulk approve multiple teams.
   */
  bulkApproveTeams: async (teamIds: string[]): Promise<EnrichedAdminTeam[]> => {
    try {
      await axiosClient.post('/admin/teams/bulk-approve', { team_ids: teamIds });
      const res = await axiosClient.get<ApiResponse<unknown[]>>(
        '/admin/teams',
      );
      if (res.data?.data && Array.isArray(res.data.data)) {
        const normalized = res.data.data.map(normalizeAdminTeam);
        savePersistedAdminTeams(normalized);
        return normalized;
      }
    } catch {
      // Fallback below
    }

    const current = loadPersistedAdminTeams();
    const updated = current.map((t) =>
      teamIds.includes(t.id)
        ? { ...t, status: 'approved' as const, rejectionReason: undefined }
        : t,
    );
    savePersistedAdminTeams(updated);
    return updated;
  },

  /**
   * Reject a team registration with a mandatory audit reason.
   */
  rejectTeam: async (
    teamId: string,
    reason: string,
  ): Promise<EnrichedAdminTeam> => {
    try {
      const res = await axiosClient.patch<ApiResponse<unknown>>(
        `/admin/teams/${teamId}/reject`,
        { reason },
      );
      if (res.data?.data) {
        const updated = normalizeAdminTeam(res.data.data);
        const current = loadPersistedAdminTeams();
        savePersistedAdminTeams(
          current.map((t) => (t.id === teamId ? updated : t)),
        );
        return updated;
      }
    } catch {
      // Fallback below
    }

    const current = loadPersistedAdminTeams();
    const index = current.findIndex((t) => t.id === teamId);
    if (index === -1) throw new Error('Không tìm thấy đội thi.');

    const updated: EnrichedAdminTeam = {
      ...current[index],
      status: 'rejected',
      rejectionReason: reason.trim(),
    };
    current[index] = updated;
    savePersistedAdminTeams(current);
    return updated;
  },

  /**
   * Remove a team registration from the competition.
   */
  deleteTeam: async (teamId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/admin/teams/${teamId}`);
    } catch {
      // Fallback below
    }
    const current = loadPersistedAdminTeams();
    const filtered = current.filter((t) => t.id !== teamId);
    savePersistedAdminTeams(filtered);
  },

  /**
   * Reset persisted teams and reload from backend.
   */
  resetMockTeams: async (): Promise<EnrichedAdminTeam[]> => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    try {
      const res = await axiosClient.get<ApiResponse<unknown[]>>('/admin/teams');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const normalized = res.data.data.map(normalizeAdminTeam);
        savePersistedAdminTeams(normalized);
        return normalized;
      }
    } catch {
      // ignore offline
    }
    savePersistedAdminTeams(ADMIN_TEAMS_MOCK_DATA);
    return ADMIN_TEAMS_MOCK_DATA;
  },
};
