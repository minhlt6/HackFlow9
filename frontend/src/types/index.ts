export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'judge' | 'candidate' | 'mentor';
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