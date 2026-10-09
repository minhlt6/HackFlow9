import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type { ProfilePayload, ProfileResponse } from '../types/profile';

export const profileApi = {
  submit: async (payload: ProfilePayload): Promise<ProfileResponse> => {
    const response = await axiosClient.post<ApiResponse<ProfileResponse>>('/users/profile', payload);
    return response.data.data;
  },
};