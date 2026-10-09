import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type { TeamDetails, CreateTeamPayload, JoinTeamPayload } from '../types/team';

export const teamsApi = {
  /**
   * Lấy thông tin đội thi của tài khoản đang đăng nhập
   */
  getMyTeam: async (): Promise<TeamDetails | null> => {
    const response = await axiosClient.get<ApiResponse<TeamDetails | null>>('/teams/me');
    return response.data.data;
  },

  /**
   * Tạo đội thi mới (người tạo tự động làm Leader)
   */
  createTeam: async (payload: CreateTeamPayload): Promise<TeamDetails> => {
    const response = await axiosClient.post<ApiResponse<TeamDetails>>('/teams', payload);
    return response.data.data;
  },

  /**
   * Tham gia đội thi bằng mã mời 6 ký tự
   */
  joinTeam: async (payload: JoinTeamPayload): Promise<TeamDetails> => {
    const response = await axiosClient.post<ApiResponse<TeamDetails>>('/teams/join', payload);
    return response.data.data;
  },

  /**
   * Lấy chi tiết thông tin một đội thi theo ID
   */
  getTeamById: async (teamId: string): Promise<TeamDetails> => {
    const response = await axiosClient.get<ApiResponse<TeamDetails>>(`/teams/${teamId}`);
    return response.data.data;
  },
};
