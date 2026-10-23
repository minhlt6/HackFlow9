import { axiosClient } from '../api/axiosClient';

export interface RubricCriterionInput {
  title: string;
  description?: string;
  max_score?: number;
  weight: number;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface RubricConfigurePayload {
  name?: string;
  criteria: RubricCriterionInput[];
}

export interface EvaluationCriteriaScore {
  criteria_id: string;
  score: number;
  comment?: string;
}

export interface EvaluationPayload {
  submission_id: string;
  status: 'draft' | 'submitted';
  evaluations: EvaluationCriteriaScore[];
  general_comment?: string;
  team_id?: string;
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

export interface PublishLeaderboardPayload {
  is_result_published: boolean;
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
   * Cấu hình toàn bộ danh mục tiêu chí Rubric (Admin only)
   * POST /api/v1/rubrics
   */
  configureRubrics: async (payload: RubricConfigurePayload) => {
    const response = await axiosClient.post('/rubrics', payload);
    return response.data;
  },

  /**
   * Cập nhật danh mục tiêu chí Rubric (Admin only)
   * PUT /api/v1/rubrics
   */
  updateRubrics: async (payload: RubricConfigurePayload) => {
    try {
      const response = await axiosClient.put('/rubrics', payload);
      return response.data;
    } catch {
      return evaluationService.configureRubrics(payload);
    }
  },

  /**
   * Xóa tiêu chí Rubric (Admin only)
   * DELETE /api/v1/rubrics/{id}
   */
  deleteRubrics: async (id?: string) => {
    const url = id ? `/rubrics/${id}` : '/rubrics';
    const response = await axiosClient.delete(url);
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
   * Payload theo SRS HF-36: { submission_id, status: "draft" | "submitted", evaluations: [{ criteria_id, score, comment }], general_comment }
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
   * Admin công bố hoặc thu hồi bảng xếp hạng chính thức cho toàn bộ thí sinh
   * PATCH /api/v1/admin/leaderboard/publish
   * Body theo SRS HF-36: { is_result_published: boolean }
   */
  publishLeaderboard: async (payload: PublishLeaderboardPayload = { is_result_published: true }) => {
    const response = await axiosClient.patch('/admin/leaderboard/publish', payload);
    return response.data;
  },
};

export const {
  getRubrics,
  configureRubrics,
  updateRubrics,
  deleteRubrics,
  getAnonymousSubmissions,
  submitEvaluation,
  getLeaderboard,
  publishLeaderboard,
} = evaluationService;
