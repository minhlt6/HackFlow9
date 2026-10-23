import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  CheckpointWithSubmission,
  CheckpointSubmissionPayload,
  Submission,
} from '../types/checkpoint';

export interface CheckpointCreatePayload {
  title: string;
  description?: string;
  start_time: string;
  deadline: string;
  requirements?: string;
  is_active?: boolean;
  is_final_checkpoint?: boolean;
  grace_period_seconds?: number;
  submission_fields?: Record<string, unknown>[];
}

export interface CheckpointUpdatePayload {
  title?: string;
  description?: string;
  start_time?: string;
  deadline?: string;
  requirements?: string;
  is_active?: boolean;
  is_final_checkpoint?: boolean;
  grace_period_seconds?: number;
  submission_fields?: Record<string, unknown>[];
}

// Mock data ban đầu nếu backend chưa triển khai endpoint Checkpoint (theo chuẩn SRS HF-23)
const INITIAL_MOCK_CHECKPOINTS: CheckpointWithSubmission[] = [
  {
    id: 'cp-01',
    order: 1,
    title: 'Checkpoint 1: Đăng ký Ý tưởng & Wireframe Kiến trúc',
    description: 'Nộp tài liệu đặc tả ý tưởng sản phẩm, phân tích yêu cầu BA và sơ đồ Wireframe Figma.',
    start_time: '2026-10-01T00:00:00.000Z',
    deadline: '2026-10-08T23:59:59.000Z',
    requirements: 'Tài liệu PRD/SRS và link Figma hoặc Wireframe sơ bộ.',
    is_active: false,
    is_final_checkpoint: false,
    grace_period_seconds: 5,
    status: 'closed',
    is_open: false,
    can_submit: false,
    submission_fields: [
      {
        field_key: 'demo_url',
        field_label: 'Link Tài liệu PRD/SRS & Wireframe Figma',
        required: true,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: {
      id: 'sub-01-v2',
      checkpoint_id: 'cp-01',
      team_id: 'team-01',
      repo_url: null,
      demo_url: 'https://figma.com/@cybersamurai/hackflow',
      commit_sha: null,
      status: 'evaluated',
      grace_period_applied: false,
      submitted_at: '2026-10-08T21:15:30.000Z',
      feedback: 'Ý tưởng rõ ràng, wireframe đáp ứng đầy đủ luồng người dùng chính.',
      note: 'Bản cập nhật bổ sung User Flow và sơ đồ cấu trúc dữ liệu',
    },
  },
  {
    id: 'cp-02',
    order: 2,
    title: 'Checkpoint 2: Prototype & System Architecture (Đang mở)',
    description: 'Nộp báo cáo tiến độ khung hệ thống (Frontend + Backend skeleton), tài liệu API hoặc Prototype.',
    start_time: '2026-10-09T00:00:00.000Z',
    deadline: new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600) * 1000).toISOString(),
    requirements: 'Link báo cáo tiến độ, tài liệu kiến trúc hoặc link demo (Không bắt buộc GitHub và không đóng băng SHA).',
    is_active: true,
    is_final_checkpoint: false,
    grace_period_seconds: 5,
    status: 'open',
    is_open: true,
    can_submit: true,
    submission_fields: [
      {
        field_key: 'demo_url',
        field_label: 'Link Báo cáo tiến độ / Kiến trúc hệ thống / Prototype',
        required: true,
        apply_sha_freeze: false,
      },
      {
        field_key: 'presentation_pdf',
        field_label: 'Link Slide thuyết trình tiến độ (PDF / Google Slides)',
        required: false,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: null,
  },
  {
    id: 'cp-03',
    order: 3,
    title: 'Checkpoint 3: MVP Hoàn chỉnh & Video Pitch Deck (Chặng cuối)',
    description: 'Nộp phiên bản sản phẩm hoàn thiện, đường dẫn Live Demo và Slide thuyết trình. Hệ thống sẽ khóa và đóng băng Commit SHA tại thời điểm nộp.',
    start_time: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    requirements: 'Mã nguồn đầy đủ các tính năng cam kết trên GitHub repository public. Hệ thống sẽ ghi nhận Commit HEAD tại thời điểm nộp bài.',
    is_active: true,
    is_final_checkpoint: true,
    grace_period_seconds: 5,
    status: 'upcoming',
    is_open: false,
    can_submit: false,
    submission_fields: [
      {
        field_key: 'repo_url',
        field_label: 'GitHub Repository URL',
        required: true,
        apply_sha_freeze: true,
      },
      {
        field_key: 'demo_url',
        field_label: 'Link Live Demo / Video Pitch Deck',
        required: false,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: null,
  },
];

const USE_DEV_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const INITIAL_MOCK_SUBMISSION_HISTORY: Submission[] = [
  {
    id: 'sub-01-v2',
    checkpoint_id: 'cp-01',
    team_id: 'team-01',
    repo_url: null,
    demo_url: 'https://figma.com/@cybersamurai/hackflow',
    commit_sha: null,
    status: 'evaluated',
    grace_period_applied: false,
    submitted_at: '2026-10-08T21:15:30.000Z',
    feedback: 'Ý tưởng rõ ràng, wireframe đáp ứng đầy đủ luồng người dùng chính.',
    note: 'Bản cập nhật bổ sung User Flow và sơ đồ cấu trúc dữ liệu',
  },
  {
    id: 'sub-01-v1',
    checkpoint_id: 'cp-01',
    team_id: 'team-01',
    repo_url: null,
    demo_url: 'https://figma.com/@cybersamurai/hackflow-draft',
    commit_sha: null,
    status: 'submitted',
    grace_period_applied: false,
    submitted_at: '2026-10-05T14:20:00.000Z',
    note: 'Bản thảo ý tưởng sơ bộ và khung sườn Wireframe',
  },
];

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'hackflow_checkpoint_submissions';
const LOCAL_STORAGE_HISTORY_KEY = 'hackflow_checkpoint_submission_history';

function getStoredSubmissions(): Record<string, Submission> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredSubmission(submission: Submission) {
  const all = getStoredSubmissions();
  all[submission.checkpoint_id] = submission;
  localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(all));
}

function getStoredHistory(): Submission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredHistory(submission: Submission) {
  try {
    const current = getStoredHistory();
    const updated = [submission, ...current.filter((s) => s.id !== submission.id)];
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export const checkpointApi = {
  /**
   * Lấy danh sách các checkpoint của cuộc thi kèm bài nộp gần nhất (nếu có)
   */
  getCheckpoints: async (onlyActive = false): Promise<CheckpointWithSubmission[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<CheckpointWithSubmission[]>>(
        `/checkpoints${onlyActive ? '?only_active=true' : ''}`
      );
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch {
      // Backend chưa có endpoint -> dùng local mock data
    }

    const storedSubmissions = getStoredSubmissions();
    return INITIAL_MOCK_CHECKPOINTS.map((cp) => {
      if (storedSubmissions[cp.id]) {
        return {
          ...cp,
          latest_submission: storedSubmissions[cp.id],
        };
      }
      return cp;
    });
  },

  /**
   * Nộp bài cho một Checkpoint (HF-30 & SRS HF-23)
   */
  submitCheckpoint: async (
    checkpointId: string,
    payload: CheckpointSubmissionPayload
  ): Promise<Submission> => {
    const response = await axiosClient.post<ApiResponse<Submission>>(
      `/checkpoints/${checkpointId}/submissions`,
      payload
    );

    if (response.data && response.data.data) {
      saveStoredSubmission(response.data.data);
      saveStoredHistory(response.data.data);
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Không nhận được dữ liệu phản hồi hợp lệ từ máy chủ.');
  },

  /**
   * Tích hợp API GET /submissions để hiển thị table lịch sử nộp bài (HF-31 AC-1)
   */
  getSubmissions: async (checkpointId?: string): Promise<Submission[]> => {
    if (USE_DEV_MOCK) {
      const storedHistory = getStoredHistory();
      const allHistory = [...storedHistory];
      for (const mockItem of INITIAL_MOCK_SUBMISSION_HISTORY) {
        if (!allHistory.some((item) => item.id === mockItem.id)) {
          allHistory.push(mockItem);
        }
      }
      if (checkpointId) {
        return allHistory.filter((s) => s.checkpoint_id === checkpointId);
      }
      return allHistory;
    }

    try {
      const url = checkpointId ? `/submissions?checkpoint_id=${checkpointId}` : '/submissions';
      const response = await axiosClient.get<ApiResponse<Submission[]>>(url);
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      const status = errorObj.response?.status;
      if (status === 404) {
        return [];
      }

      throw new Error(
        errorObj.response?.data?.message ||
          errorObj.message ||
          'Không thể tải lịch sử nộp bài do sự cố kết nối máy chủ.',
        { cause: err }
      );
    }
  },

  /**
   * Lấy lịch sử bài nộp của một checkpoint (backward compatibility)
   */
  getSubmissionHistory: async (checkpointId: string): Promise<Submission[]> => {
    return checkpointApi.getSubmissions(checkpointId);
  },

  /**
   * Tạo mốc Checkpoint mới (Admin only)
   * POST /api/v1/checkpoints
   */
  createCheckpoint: async (payload: CheckpointCreatePayload): Promise<CheckpointWithSubmission> => {
    const response = await axiosClient.post<ApiResponse<CheckpointWithSubmission>>('/checkpoints', payload);
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể tạo mốc Checkpoint.');
  },

  /**
   * Cập nhật thông tin mốc Checkpoint (Admin only)
   * PUT /api/v1/checkpoints/{id}
   */
  updateCheckpoint: async (
    id: string,
    payload: CheckpointUpdatePayload
  ): Promise<CheckpointWithSubmission> => {
    const response = await axiosClient.put<ApiResponse<CheckpointWithSubmission>>(
      `/checkpoints/${id}`,
      payload
    );
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể cập nhật mốc Checkpoint.');
  },

  /**
   * Khóa hoặc mở kích hoạt Checkpoint (Admin only)
   * PATCH /api/v1/checkpoints/{id}/toggle-active
   */
  toggleActiveCheckpoint: async (
    id: string,
    is_active: boolean
  ): Promise<CheckpointWithSubmission> => {
    const response = await axiosClient.patch<ApiResponse<CheckpointWithSubmission>>(
      `/checkpoints/${id}/toggle-active`,
      { is_active }
    );
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể thay đổi trạng thái kích hoạt Checkpoint.');
  },

  /**
   * Xóa hoặc vô hiệu hóa Checkpoint (Admin only)
   */
  deleteCheckpoint: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`/checkpoints/${id}`);
    } catch {
      await axiosClient.patch(`/checkpoints/${id}/toggle-active`, { is_active: false });
    }
  },
};
