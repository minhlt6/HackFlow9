export type CheckpointStatus = 'upcoming' | 'open' | 'closed';

export type SubmissionStatus = 'submitted' | 'evaluated' | 'late' | 'invalid';

export interface Checkpoint {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  deadline: string;
  requirements?: string | null;
  is_active: boolean;
  is_final_checkpoint?: boolean; // HF-23: true nếu là chặng chốt sản phẩm cuối cùng (bắt buộc repo & freeze SHA), false nếu là chặng tiến độ trung gian
  order?: number;
  status?: CheckpointStatus;
}

export interface Submission {
  id: string;
  checkpoint_id: string;
  team_id: string;
  repo_url?: string | null;
  demo_url?: string | null;
  commit_sha?: string | null;
  status: SubmissionStatus;
  submitted_at: string;
  feedback?: string | null;
  note?: string | null;
}

export interface CheckpointSubmissionPayload {
  repo_url?: string;
  demo_url?: string;
  note?: string;
}

export interface CheckpointWithSubmission extends Checkpoint {
  latest_submission?: Submission | null;
}
