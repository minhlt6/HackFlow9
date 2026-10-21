import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  CheckpointWithSubmission,
  CheckpointSubmissionPayload,
  Submission,
} from '../types/checkpoint';

// Mock data ban đầu nếu backend chưa triển khai endpoint Checkpoint (theo chuẩn SRS HF-23)
const INITIAL_MOCK_CHECKPOINTS: CheckpointWithSubmission[] = [];

// Cờ môi trường dev mock: Chỉ kích hoạt mock khi có cờ VITE_USE_MOCK=true (HF-31 Lỗi 1)
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
    // Đẩy bản nộp mới lên đầu danh sách lịch sử
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
  getCheckpoints: async (): Promise<CheckpointWithSubmission[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<CheckpointWithSubmission[]>>('/checkpoints');
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
   * Gửi repo_url (bắt buộc nếu là chặng cuối), demo_url, submission_data và note lên hệ thống.
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
   * - Tuyệt đối không nuốt lỗi để trả mock giả khi chạy môi trường thật (Review Lỗi 1)
   * - Nếu lỗi 404 (chưa có bản nộp): trả về mảng rỗng [] để UI hiển thị Empty State
   * - Nếu lỗi mạng / 500: Ném lỗi để UI hiển thị thông báo lỗi kèm nút Tải lại
   */
  getSubmissions: async (checkpointId?: string): Promise<Submission[]> => {
    // 1. Nếu cờ dev mock được bật rõ ràng qua VITE_USE_MOCK=true
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

    // 2. Môi trường thật: Gọi API GET /submissions theo chuẩn REST
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

      // 404: Đội thi chưa có bài nộp nào cho checkpoint này -> Trả về mảng rỗng [] để hiển thị Empty State
      if (status === 404) {
        return [];
      }

      // Các lỗi khác (500 Server Error, Network Error, 401 Unauthorized...):
      // Ném lỗi để UI hiển thị trạng thái lỗi kèm nút Retry (Lỗi 1)
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
};
