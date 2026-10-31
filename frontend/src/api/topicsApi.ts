import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  Topic,
  TopicSelectPayload,
  TopicCancelPayload,
  TopicSelectResponse,
  TopicCancelResponse,
} from '../types/topic';

export interface ApiErrorDetail {
  message: string;
  errorCode?: string;
  statusCode?: number;
}

export const extractApiErrorMessage = (error: unknown, defaultMsg: string): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          error_code?: string;
          detail?: string | { message?: string; error_code?: string };
        };
      };
    };

    const status = err.response?.status;
    const resData = err.response?.data;

    if (resData) {
      if (resData.error_code === 'TOPIC_FULL') {
        return 'Đề tài đã đủ số lượng đội thi đăng ký tối đa. Vui lòng chọn đề tài khác!';
      }
      if (resData.error_code === 'TEAM_TOPIC_ALREADY_SELECTED') {
        return 'Đội thi của bạn đã chọn đề tài rồi, không thể chọn thêm đề tài khác.';
      }
      if (resData.error_code === 'TEAM_NOT_VALID') {
        return 'Đội thi chưa đủ điều kiện (cần tối thiểu 3 thành viên để đăng ký đề tài).';
      }
      if (resData.error_code === 'FORBIDDEN_ROLE') {
        return 'Chỉ Đội trưởng (Team Leader) mới có quyền đăng ký hoặc hủy chọn đề tài.';
      }
      if (resData.error_code === 'TEAM_ACCESS_DENIED') {
        return 'Bạn chưa tham gia đội thi nào hoặc không có quyền thao tác trên đội thi này.';
      }
      if (resData.error_code === 'TOPIC_SELECTION_CLOSED') {
        return resData.message || 'Thời gian đăng ký chọn đề tài đã đóng hoặc chưa bắt đầu.';
      }
      if (resData.message) {
        return resData.message;
      }
      if (typeof resData.detail === 'string') {
        return resData.detail;
      }
      if (typeof resData.detail === 'object' && resData.detail?.message) {
        return resData.detail.message;
      }
    }

    if (status === 409) {
      return 'Đã xảy ra xung đột khi đăng ký đề tài (có thể đã hết slot). Vui lòng thử lại!';
    }
    if (status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này (chỉ Đội trưởng được thao tác).';
    }
    if (status === 404) {
      return 'Không tìm thấy thông tin đề tài yêu cầu.';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return defaultMsg;
};

export const topicsApi = {
  /**
   * Lấy danh sách toàn bộ đề tài kèm quota và subtopics (GET /api/v1/topics)
   */
  getTopics: async (): Promise<Topic[]> => {
    const response = await axiosClient.get<ApiResponse<Topic[]>>('/topics');
    return response.data.data;
  },

  /**
   * Đăng ký chọn đề tài cho đội thi (POST /api/v1/topics/select)
   */
  selectTopic: async (payload: TopicSelectPayload): Promise<TopicSelectResponse> => {
    const response = await axiosClient.post<ApiResponse<TopicSelectResponse>>(
      '/topics/select',
      payload
    );
    return response.data.data;
  },

  /**
   * Hủy chọn đề tài đã đăng ký (POST /api/v1/topics/cancel)
   */
  cancelTopic: async (payload: TopicCancelPayload = {}): Promise<TopicCancelResponse> => {
    const response = await axiosClient.post<ApiResponse<TopicCancelResponse>>(
      '/topics/cancel',
      payload
    );
    return response.data.data;
  },

  /**
   * Tạo đề tài mới (Admin only)
   * POST /api/v1/topics
   */
  createTopic: async (payload: {
    title: string;
    description?: string;
    max_teams?: number;
    subtopics?: Array<{
      title: string;
      description?: string;
      max_teams?: number;
    }>;
  }): Promise<Topic> => {
    const response = await axiosClient.post<ApiResponse<Topic>>('/topics', payload);
    return response.data.data;
  },

  /**
   * Cập nhật thông tin/quota đề tài (Admin only)
   * PUT /api/v1/topics/{id}
   */
  updateTopic: async (
    id: string,
    payload: {
      title?: string;
      description?: string;
      max_teams?: number;
      is_active?: boolean;
    }
  ): Promise<Topic> => {
    const response = await axiosClient.put<ApiResponse<Topic>>(`/topics/${id}`, payload);
    return response.data.data;
  },

  /**
   * Thêm đề tài nhánh (subtopic) vào lĩnh vực lớn (Admin only)
   * POST /api/v1/topics/{topicId}/subtopics
   */
  createSubtopic: async (
    topicId: string,
    payload: {
      title: string;
      description?: string;
      max_teams?: number;
      is_active?: boolean;
      mentor_id?: string | null;
    }
  ): Promise<Topic> => {
    const response = await axiosClient.post<ApiResponse<Topic>>(
      `/topics/${topicId}/subtopics`,
      payload
    );
    return response.data.data;
  },

  /**
   * Cập nhật thông tin/quota đề tài nhánh (Admin only)
   * PATCH /api/v1/topics/subtopics/{subtopicId}
   */
  updateSubtopic: async (
    subtopicId: string,
    payload: {
      title?: string;
      description?: string;
      max_teams?: number;
      is_active?: boolean;
      mentor_id?: string | null;
    }
  ): Promise<unknown> => {
    const response = await axiosClient.patch<ApiResponse<unknown>>(
      `/topics/subtopics/${subtopicId}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Xóa đề tài nhánh (Admin only)
   * DELETE /api/v1/topics/subtopics/{subtopicId}
   */
  deleteSubtopic: async (subtopicId: string): Promise<void> => {
    await axiosClient.delete(`/topics/subtopics/${subtopicId}`);
  },

  /**
   * Xóa đề tài (Admin only)
   * DELETE /api/v1/topics/{id}
   */
  deleteTopic: async (id: string): Promise<void> => {
    await axiosClient.delete(`/topics/${id}`);
  },
};
