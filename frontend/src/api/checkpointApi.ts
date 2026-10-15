import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  CheckpointWithSubmission,
  CheckpointSubmissionPayload,
  Submission,
} from '../types/checkpoint';

// Mock data ban đầu nếu backend chưa triển khai endpoint Checkpoint (theo chuẩn SRS HF-23)
const INITIAL_MOCK_CHECKPOINTS: CheckpointWithSubmission[] = [
  {
    id: 'cp-01',
    order: 1,
    title: 'Checkpoint 1: Đăng ký Ý tưởng & Wireframe Kiến trúc',
    description: 'Nộp tài liệu đặc tả ý tưởng sản phẩm, phân tích yêu cầu BA và sơ đồ Wireframe Figma.',
    start_time: '2026-10-01T00:00:00.000Z',
    deadline: '2026-10-08T23:59:59.000Z',
    requirements: 'Tài liệu PRD/SRS và link Figma hoặc Wireframe sơ bộ.',
    is_active: false,
    is_final_checkpoint: false, // Chặng tiến độ trung gian: không bắt buộc repo, không đóng băng SHA
    grace_period_seconds: 5,
    status: 'closed',
    is_open: false,
    can_submit: false,
    submission_fields: [
      {
        field_key: 'demo_url',
        field_label: 'Link Tài liệu PRD/SRS & Wireframe Figma',
        required: true,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: {
      id: 'sub-01-v2',
      checkpoint_id: 'cp-01',
      team_id: 'team-01',
      repo_url: null,
      demo_url: 'https://figma.com/@cybersamurai/hackflow',
      commit_sha: null, // Chặng trung gian không đóng băng SHA
      status: 'evaluated',
      grace_period_applied: false,
      submitted_at: '2026-10-08T21:15:30.000Z',
      feedback: 'Ý tưởng rõ ràng, wireframe đáp ứng đầy đủ luồng người dùng chính.',
      note: 'Bản cập nhật bổ sung User Flow và sơ đồ cấu trúc dữ liệu',
    },
  },
  {
    id: 'cp-02',
    order: 2,
    title: 'Checkpoint 2: Prototype & System Architecture (Đang mở)',
    description: 'Nộp báo cáo tiến độ khung hệ thống (Frontend + Backend skeleton), tài liệu API hoặc Prototype.',
    start_time: '2026-10-09T00:00:00.000Z',
    deadline: new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600) * 1000).toISOString(),
    requirements: 'Link báo cáo tiến độ, tài liệu kiến trúc hoặc link demo (Không bắt buộc GitHub và không đóng băng SHA).',
    is_active: true,
    is_final_checkpoint: false, // Chặng tiến độ trung gian: ẩn ô GitHub Repo nếu không yêu cầu
    grace_period_seconds: 5,
    status: 'open',
    is_open: true,
    can_submit: true,
    submission_fields: [
      {
        field_key: 'demo_url',
        field_label: 'Link Báo cáo tiến độ / Kiến trúc hệ thống / Prototype',
        required: true,
        apply_sha_freeze: false,
      },
      {
        field_key: 'presentation_pdf',
        field_label: 'Link Slide thuyết trình tiến độ (PDF / Google Slides)',
        required: false,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: null,
  },
  {
    id: 'cp-03',
    order: 3,
    title: 'Checkpoint 3: MVP Hoàn chỉnh & Video Pitch Deck (Chặng cuối)',
    description: 'Nộp phiên bản sản phẩm hoàn thiện, đường dẫn Live Demo và Slide thuyết trình. Hệ thống sẽ khóa và đóng băng Commit SHA tại thời điểm nộp.',
    start_time: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    requirements: 'Mã nguồn đầy đủ các tính năng cam kết trên GitHub repository public. Hệ thống sẽ ghi nhận Commit HEAD tại thời điểm nộp bài.',
    is_active: true,
    is_final_checkpoint: true, // Chặng cuối cùng: Bắt buộc GitHub repo & đóng băng Commit SHA
    grace_period_seconds: 5,
    status: 'upcoming',
    is_open: false,
    can_submit: false,
    submission_fields: [
      {
        field_key: 'repo_url',
        field_label: 'GitHub Repository URL',
        required: true,
        apply_sha_freeze: true,
      },
      {
        field_key: 'demo_url',
        field_label: 'Link Live Demo / Video Pitch Deck',
        required: false,
        apply_sha_freeze: false,
      },
    ],
    latest_submission: null,
  },
];

// Cờ môi trường dev mock: Chỉ kích hoạt mock khi có cờ VITE_USE_MOCK=true (HF-31 Lỗi 1)
const USE_DEV_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock lịch sử nộp bài chỉ dùng khi bật cờ dev mock
export const INITIAL_MOCK_SUBMISSION_HISTORY: Submission[] = [
  {
    id: 'sub-01-v2',
    checkpoint_id: 'cp-01',
    team_id: 'team-01',
    repo_url: null,
    demo_url: 'https://figma.com/@cybersamurai/hackflow',
    commit_sha: null,
    status: 'evaluated',
    grace_period_applied: false,
    submitted_at: '2026-10-08T21:15:30.000Z',
    feedback: 'Ý tưởng rõ ràng, wireframe đáp ứng đầy đủ luồng người dùng chính.',
    note: 'Bản cập nhật bổ sung User Flow và sơ đồ cấu trúc dữ liệu',
  },
  {
    id: 'sub-01-v1',
    checkpoint_id: 'cp-01',
    team_id: 'team-01',
    repo_url: null,
    demo_url: 'https://figma.com/@cybersamurai/hackflow-draft',
    commit_sha: null,
    status: 'submitted',
    grace_period_applied: false,
    submitted_at: '2026-10-05T14:20:00.000Z',
    note: 'Bản thảo ý tưởng sơ bộ và khung sườn Wireframe',
  },
];

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'hackflow_checkpoint_submissions';
const LOCAL_STORAGE_HISTORY_KEY = 'hackflow_checkpoint_submission_history';

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
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
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
