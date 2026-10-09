import type { ApprovalStatus } from './index';

export interface ProfileForm {
  fullName: string;
  studentId: string;
  university: string;
  phone: string;
  skills: string[];
}

export interface ProfilePayload {
  full_name: string;
  student_id: string;
  school: string;
  phone: string;
  skills: string[];
}

export interface ProfileResponse {
  approvalStatus?: ApprovalStatus;
  approval_status?: ApprovalStatus;
  rejectionReason?: string;
  rejection_reason?: string;
  reason?: string;
  message?: string;
  role?: string;
  user?: {
    approvalStatus?: ApprovalStatus;
    approval_status?: ApprovalStatus;
    role?: string;
  };
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileForm, string>>;
