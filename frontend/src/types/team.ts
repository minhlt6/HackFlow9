export type TeamMemberRole = 'leader' | 'member';

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: TeamMemberRole;
  avatar_url?: string | null;
  github_username?: string | null;
  joined_at: string;
  skills?: string[];
  university?: string;
}

export interface TeamDetails {
  id: string;
  team_name: string;
  description?: string;
  invite_code: string;
  status: 'INCOMPLETE' | 'VALID' | 'LOCKED' | 'REJECTED';
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  is_locked: boolean;
  member_count: number;
  min_members: number;
  max_members: number;
  leader_id: string;
  topic_id?: string | null;
  topic_name?: string | null;
  subtopic_id?: string | null;
  members: TeamMember[];
  created_at?: string;
}

export interface CreateTeamPayload {
  description?: string;
  team_name: string;
}

export interface JoinTeamPayload {
  invite_code: string;
}
