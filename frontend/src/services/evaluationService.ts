import { axiosClient } from '../api/axiosClient';

export interface EvaluationPayload {
  team_id: string;
  judge_id?: string;
  scores: Record<string, number>;
  general_comment?: string;
  is_draft: boolean;
  status?: 'draft' | 'submitted';
}

export interface AnonymousSubmission {
  team_id: string;
  anonymous_team_code: string;
  topic_title: string;
  repo_url: string;
  demo_url?: string;
  slide_url?: string;
  commit_sha: string;
  summary?: string;
  status: 'unscored' | 'draft' | 'submitted';
}

export interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  topic_title: string;
  rank: number;
  final_score: number;
  eval_count: number;
  has_discrepancy?: boolean; // Lệch điểm cao (> 15đ) giữa các giám khảo
}

export const evaluationService = {
  /**
   * Lấy danh mục các tiêu chí Rubric đánh giá từ BTC
   * GET /api/v1/rubrics
   */
  getRubrics: async () => {
    const response = await axiosClient.get('/rubrics');
    return response.data;
  },

  /**
   * Lấy danh sách bài nộp ẩn danh (Blind Judging) dành cho Giám khảo
   * GET /api/v1/evaluations/submissions
   */
  getAnonymousSubmissions: async () => {
    const response = await axiosClient.get('/evaluations/submissions');
    return response.data;
  },

  /**
   * Gửi điểm đánh giá (Lưu bản nháp hoặc Khóa bảng điểm)
   * POST /api/v1/evaluations
   */
  submitEvaluation: async (payload: EvaluationPayload) => {
    const response = await axiosClient.post('/evaluations', payload);
    return response.data;
  },

  /**
   * Lấy Bảng xếp hạng chung cuộc (Leaderboard)
   * GET /api/v1/leaderboard
   */
  getLeaderboard: async () => {
    const response = await axiosClient.get('/leaderboard');
    return response.data;
  },

  /**
   * Admin công bố bảng xếp hạng chính thức cho toàn bộ thí sinh
   * PATCH /api/v1/admin/leaderboard/publish
   */
  publishLeaderboard: async () => {
    const response = await axiosClient.patch('/admin/leaderboard/publish');
    return response.data;
  },
};

export const {
  getRubrics,
  getAnonymousSubmissions,
  submitEvaluation,
  getLeaderboard,
  publishLeaderboard,
} = evaluationService;
