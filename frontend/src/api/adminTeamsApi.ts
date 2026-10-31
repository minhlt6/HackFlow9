import { axiosClient } from './axiosClient';
import type { ApiResponse, Team, TeamMember } from '../types';

export interface TeamReview {
  decision: string;
  reason: string | null;
  reviewed_at: string;
  reviewed_by: string;
  member_count: number;
  min_members: number;
  max_members: number;
}

export interface EnrichedAdminTeam extends Team {
  lastReview?: TeamReview;
  university: string;
  leaderEmail: string;
  majorTopicId: string;
  repoUrl?: string;
  latestCommitSha?: string;
  checkpointsCompleted: number;
  totalCheckpoints: number;
  averageScore?: number | null;
}

export interface CandidateDirectoryEntry {
  id: string;
  email: string;
  fullName: string;
  full_name: string;
  school: string;
  university: string;
  studentId: string;
  student_id: string;
  github_username: string;
  skills: string[];
  approval_status: string;
  hasTeam: boolean;
  has_team: boolean;
  teamId?: string | null;
  team_id?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  role_in_team?: string | null;
}

export interface AdminTeamUpsertPayload {
  name: string;
  inviteCode: string;
  leaderName?: string;
  leaderEmail: string;
  university?: string;
  majorTopicId: string;
  subTopicId: string;
  memberCount: number;
  memberEmails?: string[];
  member_emails?: string[];
  repoUrl?: string;
  description: string;
}

export interface AdminAutoMatchResult {
  remaining_candidates_count: number;
  matched_candidates_count: number;
  created_teams_count: number;
  filled_teams_count: number;
  teams: EnrichedAdminTeam[];
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
    '';

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
        ? []
        : [];

    return {
      id: uid,
      userId: uid,
      user_id: uid,
      fullName,
      full_name: fullName,
      email,
      role: roleVal,
      roleInTeam: roleVal,
      studentId: String(m.studentId || m.student_id || ''),
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
  const inviteCode = String(raw.inviteCode || raw.invite_code || '').toUpperCase();
  const leaderId = String(raw.leaderId || raw.leader_id || leaderMember?.userId || '');
  const leaderName = String(
    raw.leaderName || raw.leader_name || leaderMember?.fullName || 'Đội trưởng',
  );
  const leaderEmail = String(
    raw.leaderEmail || raw.leader_email || leaderMember?.email || '',
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
    members.length > 0
      ? members.length
      : typeof raw.memberCount === 'number'
        ? raw.memberCount
        : typeof raw.member_count === 'number'
          ? raw.member_count
          : 1;

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
    minMembers: Number(raw.min_members ?? 3),
    maxMembers: Number(raw.max_members ?? 5),
    lastReview: raw.last_review ? raw.last_review as TeamReview : undefined,
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

export const adminTeamsApi = {
  getAllTeams: async (_storeTeams: Team[] = []): Promise<EnrichedAdminTeam[]> => {
    void _storeTeams;
    const res = await axiosClient.get<ApiResponse<unknown[]>>('/admin/teams');
    return res.data.data.map(normalizeAdminTeam);
  },
  getCandidateDirectory: async (options?: {
    unassignedOnly?: boolean;
    approvedOnly?: boolean;
  }): Promise<CandidateDirectoryEntry[]> => {
    const res = await axiosClient.get<ApiResponse<CandidateDirectoryEntry[]>>(
      '/admin/candidates/directory',
      {
        params: {
          unassigned_only: options?.unassignedOnly ?? false,
          approved_only: options?.approvedOnly ?? false,
        },
      },
    );
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },
  autoMatchTeams: async (options?: {
    target_team_size?: number;
    fill_incomplete_teams?: boolean;
    auto_assign_topics?: boolean;
    auto_approve?: boolean;
  }): Promise<{ message: string; result: AdminAutoMatchResult }> => {
    const res = await axiosClient.post<
      ApiResponse<{
        matched_candidates_count: number;
        created_teams_count: number;
        filled_teams_count: number;
        remaining_candidates_count: number;
        teams: unknown[];
      }>
    >('/admin/teams/auto-match', {
      target_team_size: options?.target_team_size ?? 4,
      fill_incomplete_teams: options?.fill_incomplete_teams ?? true,
      auto_assign_topics: options?.auto_assign_topics ?? true,
      auto_approve: options?.auto_approve ?? true,
    });
    const rawData = res.data.data;
    return {
      message: res.data.message || 'Đã ghép đội ngẫu nhiên thành công.',
      result: {
        remaining_candidates_count: rawData?.remaining_candidates_count ?? 0,
        matched_candidates_count: rawData?.matched_candidates_count ?? 0,
        created_teams_count: rawData?.created_teams_count ?? 0,
        filled_teams_count: rawData?.filled_teams_count ?? 0,
        teams: Array.isArray(rawData?.teams)
          ? rawData.teams.map(normalizeAdminTeam)
          : [],
      },
    };
  },
  createTeam: async (payload: AdminTeamUpsertPayload): Promise<EnrichedAdminTeam> => {
    const res = await axiosClient.post<ApiResponse<unknown>>('/admin/teams', payload);
    return normalizeAdminTeam(res.data.data);
  },
  updateTeam: async (id: string, payload: AdminTeamUpsertPayload): Promise<EnrichedAdminTeam> => {
    const res = await axiosClient.put<ApiResponse<unknown>>(`/admin/teams/${id}`, payload);
    return normalizeAdminTeam(res.data.data);
  },
  approveTeam: async (id: string): Promise<EnrichedAdminTeam> => {
    const res = await axiosClient.patch<ApiResponse<unknown>>(`/admin/teams/${id}/approve`);
    return normalizeAdminTeam(res.data.data);
  },
  bulkApproveTeams: async (teamIds: string[]): Promise<EnrichedAdminTeam[]> => {
    const res = await axiosClient.post<ApiResponse<{ teams: unknown[] }>>('/admin/teams/bulk-approve', { team_ids: teamIds });
    return res.data.data.teams.map(normalizeAdminTeam);
  },
  rejectTeam: async (id: string, reason: string): Promise<EnrichedAdminTeam> => {
    const res = await axiosClient.patch<ApiResponse<unknown>>(`/admin/teams/${id}/reject`, { reason });
    return normalizeAdminTeam(res.data.data);
  },
  deleteTeam: async (id: string): Promise<void> => { await axiosClient.delete(`/admin/teams/${id}`); },
  resetMockTeams: async (): Promise<EnrichedAdminTeam[]> => adminTeamsApi.getAllTeams(),
};
