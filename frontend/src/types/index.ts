export type UserRole = 'admin' | 'judge' | 'mentor' | 'candidate';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  team_role?: 'TEAM_LEADER' | 'MEMBER' | 'leader' | 'member';
}

export interface Team {
  id: string;
  team_name: string;
  invite_code: string;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export * from './team';
export * from './checkpoint';