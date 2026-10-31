import { axiosClient } from './axiosClient';

export const candidateApprovalsApi = {
  approve: async (id: string) => {
    await axiosClient.post(`/admin/candidates/${encodeURIComponent(id)}/approval`, {
      action: 'approve', note: 'Phê duyệt bởi BTC trên giao diện Admin',
    });
  },
  approveAll: async (candidateIds: string[]) => {
    const response = await axiosClient.post<{ data: {
      approved_ids: string[]; approved_count: number; skipped_count: number;
    }; message: string }>('/admin/candidates/approve-all', { candidate_ids: candidateIds });
    return response.data;
  },
};
