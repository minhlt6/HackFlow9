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
        return 'Thời gian đăng ký chọn đề tài đã đóng hoặc chưa bắt đầu.';
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
};
