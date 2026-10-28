import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  CheckpointWithSubmission,
  CheckpointSubmissionPayload,
  Submission,
} from '../types/checkpoint';

export interface CheckpointCreatePayload {
  weight?: number;
  display_order?: number;
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
  weight?: number;
  display_order?: number;
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

export const checkpointApi = {
  /**
   * Lấy danh sách các checkpoint của cuộc thi kèm bài nộp gần nhất (nếu có)
   */
  getCheckpoints: async (onlyActive = false): Promise<CheckpointWithSubmission[]> => {
    const response = await axiosClient.get<ApiResponse<CheckpointWithSubmission[]>>('/checkpoints', { params: { only_active: onlyActive } });
    const rawList = Array.isArray(response.data.data) ? response.data.data : [];
    return rawList.map((cp, idx) => ({
      ...cp,
      order:
        typeof cp.order === 'number' && cp.order > 0
          ? cp.order
          : typeof cp.checkpoint_number === 'number' && cp.checkpoint_number > 0
            ? cp.checkpoint_number
            : typeof cp.display_order === 'number'
              ? cp.display_order + 1
              : idx + 1,
    }));
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
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Không nhận được dữ liệu phản hồi hợp lệ từ máy chủ.');
  },

  /**
   * Tích hợp API GET /submissions để hiển thị table lịch sử nộp bài (HF-31 AC-1)
   */
  getSubmissions: async (checkpointId?: string): Promise<Submission[]> => {
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
    await axiosClient.delete(`/checkpoints/${id}`);
  },
};
