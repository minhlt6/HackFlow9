import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  CheckpointWithSubmission,
  CheckpointSubmissionPayload,
  Submission,
} from '../types/checkpoint';

// Mock data ban đầu nếu backend chưa triển khai endpoint Checkpoint
const INITIAL_MOCK_CHECKPOINTS: CheckpointWithSubmission[] = [
  {
    id: 'cp-01',
    order: 1,
    title: 'Checkpoint 1: Đăng ký Ý tưởng & Wireframe Kiến trúc',
    description: 'Nộp tài liệu đặc tả ý tưởng sản phẩm, phân tích yêu cầu BA và sơ đồ Wireframe Figma.',
    start_time: '2026-10-01T00:00:00.000Z',
    deadline: '2026-10-08T23:59:59.000Z',
    requirements: 'Repository chứa tài liệu PRD/SRS và link Figma hoặc Wireframe sơ bộ.',
    is_active: false,
    status: 'closed',
    latest_submission: {
      id: 'sub-01',
      checkpoint_id: 'cp-01',
      team_id: 'team-01',
      repo_url: 'https://github.com/cyber-samurai/hackflow-project',
      demo_url: 'https://figma.com/@cybersamurai/hackflow',
      commit_sha: 'a1b2c3d4e5f67890123456789abcdef012345678',
      status: 'evaluated',
      submitted_at: '2026-10-08T21:15:30.000Z',
      feedback: 'Ý tưởng rõ ràng, wireframe đáp ứng đầy đủ luồng người dùng chính.',
      note: 'Bản nộp tài liệu giai đoạn 1',
    },
  },
  {
    id: 'cp-02',
    order: 2,
    title: 'Checkpoint 2: Prototype & System Architecture (Đang mở)',
    description: 'Nộp mã nguồn khung hệ thống (Frontend + Backend skeleton), Dockerfile và API documentation.',
    // Hạn chót: 2 ngày tới
    start_time: '2026-10-09T00:00:00.000Z',
    deadline: new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600) * 1000).toISOString(),
    requirements: 'Repository GitHub public có mã nguồn chạy được, kèm Dockerfile hoặc hướng dẫn cài đặt trong README.md.',
    is_active: true,
    status: 'open',
    latest_submission: null,
  },
  {
    id: 'cp-03',
    order: 3,
    title: 'Checkpoint 3: MVP Hoàn chỉnh & Video Pitch Deck',
    description: 'Nộp phiên bản sản phẩm hoàn thiện, đường dẫn Live Demo và Slide thuyết trình trước Hội đồng.',
    start_time: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    requirements: 'Mã nguồn đầy đủ các tính năng cam kết, link trang web hoặc ứng dụng đã deploy và slide PDF.',
    is_active: true,
    status: 'upcoming',
    latest_submission: null,
  },
];

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'hackflow_checkpoint_submissions';

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

function generateRandomCommitSha(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 40; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const checkpointApi = {
  /**
   * Lấy danh sách các checkpoint của cuộc thi kèm bài nộp gần nhất (nếu có)
   */
  getCheckpoints: async (): Promise<CheckpointWithSubmission[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<CheckpointWithSubmission[]>>('/checkpoints');
      if (response.data && response.data.data) {
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
   * Nộp bài cho một Checkpoint (HF-30)
   * Gửi repo_url, demo_url và note lên hệ thống.
   * Backend sẽ kiểm tra repo và đóng băng Commit SHA tại thời điểm nộp.
   */
  submitCheckpoint: async (
    checkpointId: string,
    payload: CheckpointSubmissionPayload
  ): Promise<Submission> => {
    try {
      const response = await axiosClient.post<ApiResponse<Submission>>(
        `/checkpoints/${checkpointId}/submissions`,
        payload
      );
      if (response.data && response.data.data) {
        saveStoredSubmission(response.data.data);
        return response.data.data;
      }
    } catch (err: unknown) {
      // Nếu là lỗi 404 (endpoint chưa mở trên backend) thì mô phỏng quá trình backend gọi GitHub API freeze commit SHA
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status !== 404 && axiosErr?.response?.status) {
        throw err;
      }
    }

    // Giả lập network latency khi backend gọi GitHub API để lấy HEAD commit SHA
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const simulatedCommitSha = generateRandomCommitSha();
    const newSubmission: Submission = {
      id: `sub-${Date.now()}`,
      checkpoint_id: checkpointId,
      team_id: 'team-me',
      repo_url: payload.repo_url,
      demo_url: payload.demo_url || null,
      commit_sha: simulatedCommitSha,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      feedback: null,
      note: payload.note || null,
    };

    saveStoredSubmission(newSubmission);
    return newSubmission;
  },

  /**
   * Lấy lịch sử bài nộp của một checkpoint
   */
  getSubmissionHistory: async (checkpointId: string): Promise<Submission[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<Submission[]>>(
        `/checkpoints/${checkpointId}/submissions`
      );
      if (response.data && response.data.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }

    const stored = getStoredSubmissions();
    if (stored[checkpointId]) {
      return [stored[checkpointId]];
    }
    const defaultCp = INITIAL_MOCK_CHECKPOINTS.find((c) => c.id === checkpointId);
    return defaultCp?.latest_submission ? [defaultCp.latest_submission] : [];
  },
};
