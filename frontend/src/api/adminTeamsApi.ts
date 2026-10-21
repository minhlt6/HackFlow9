import { axiosClient } from './axiosClient';
import {
  ADMIN_TEAMS_MOCK_DATA,
  type EnrichedAdminTeam,
} from '../mocks/adminTeamsMockData';
import type { ApiResponse, Team } from '../types';

const STORAGE_KEY = 'hackflow_admin_teams_v2';

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function loadPersistedAdminTeams(): EnrichedAdminTeam[] {
  if (typeof window === 'undefined') return ADMIN_TEAMS_MOCK_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EnrichedAdminTeam[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
    await delay(180);

    try {
      const res = await axiosClient.get<ApiResponse<EnrichedAdminTeam[]>>(
        '/admin/teams',
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch {
      // Fallback to persisted mock data when backend is offline
    }

    const persisted = loadPersistedAdminTeams();
    const merged: EnrichedAdminTeam[] = [...persisted];

    for (const st of storeTeams) {
      const existingIndex = merged.findIndex((m) => m.id === st.id);
      if (existingIndex === -1) {
        merged.unshift({
          ...st,
          university:
            st.members[0]?.school ||
            st.members[0]?.university ||
            'ĐH Bách Khoa Hà Nội (HUST)',
          leaderEmail:
            st.members[0]?.email || 'leader@hackflow.dev',
          majorTopicId: st.subTopicId?.startsWith('sub-iot')
            ? 'major-iot'
            : st.subTopicId?.startsWith('sub-fin')
            ? 'major-fintech'
            : st.subTopicId?.startsWith('sub-hlt')
            ? 'major-health'
            : 'major-ai',
          checkpointsCompleted: 1,
          totalCheckpoints: 3,
        });
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
    await delay(320);

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
    await delay(280);

    const current = loadPersistedAdminTeams();
    const index = current.findIndex((t) => t.id === teamId);
    if (index === -1) {
      throw new Error('Không tìm thấy đội thi cần cập nhật.');
    }

    const duplicateName = current.some(
      (t) =>
        t.id !== teamId &&
        t.name.toLowerCase() === payload.name.trim().toLowerCase(),
    );
    if (duplicateName) {
      throw new Error(`Tên đội thi "${payload.name}" đã bị trùng với đội khác.`);
    }

    const existing = current[index];
    const updatedMembers = [...existing.members];
    if (updatedMembers.length > 0) {
      updatedMembers[0] = {
        ...updatedMembers[0],
        fullName: payload.leaderName.trim(),
        email: payload.leaderEmail.trim(),
        school: payload.university.trim(),
      };
    }
    while (updatedMembers.length < payload.memberCount) {
      const nextIdx = updatedMembers.length + 1;
      updatedMembers.push({
        userId: `user-mem-${Date.now()}-${nextIdx}`,
        fullName: `Thành viên #${nextIdx} (${payload.name.trim()})`,
        email: `member${nextIdx}.${payload.inviteCode.toLowerCase()}@student.edu.vn`,
        roleInTeam: 'member',
        studentId: `2022${1000 + nextIdx}`,
        school: payload.university.trim(),
        skills: ['Software Engineering'],
        joinedAt: existing.createdAt,
      });
    }
    if (updatedMembers.length > payload.memberCount) {
      updatedMembers.length = payload.memberCount;
    }

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
      members: updatedMembers,
    };

    current[index] = updatedTeam;
    savePersistedAdminTeams(current);
    return updatedTeam;
  },

  /**
   * Approve a single team registration.
   */
  approveTeam: async (teamId: string): Promise<EnrichedAdminTeam> => {
    await delay(200);
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
    await delay(280);
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
    await delay(240);
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
    await delay(240);
    const current = loadPersistedAdminTeams();
    const filtered = current.filter((t) => t.id !== teamId);
    savePersistedAdminTeams(filtered);
  },

  /**
   * Reset persisted teams back to the default 12-team mock dataset.
   */
  resetMockTeams: async (): Promise<EnrichedAdminTeam[]> => {
    await delay(150);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    savePersistedAdminTeams(ADMIN_TEAMS_MOCK_DATA);
    return ADMIN_TEAMS_MOCK_DATA;
  },
};
