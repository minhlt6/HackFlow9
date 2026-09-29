export type UserRole = 'admin' | 'judge' | 'mentor' | 'participant' | 'candidate';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approval_status: ApprovalStatus;
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