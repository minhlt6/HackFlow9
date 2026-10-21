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
const INITIAL_MOCK_CHECKPOINTS: CheckpointWithSubmission[] = [];

const USE_DEV_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock lịch sử nộp bài chỉ dùng khi bật cờ dev mock
export const INITIAL_MOCK_SUBMISSION_HISTORY: Submission[] = [];

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'hackflow_checkpoint_submissions_clean_v1';
const LOCAL_STORAGE_HISTORY_KEY = 'hackflow_checkpoint_submission_history_clean_v1';

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
      if (response.data && Array.isArray(response.data.data)) {
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
