import type {
  User,
  Team,
  MajorTopic,
  Checkpoint,
  CheckpointSubmission,
  FinalSubmission,
  RubricCriteria,
  TeamEvaluation,
  SupportTicket,
  WhitelistEntry,
  Announcement,
  HackathonConfig,
} from '../types';

export const mockUsers: Record<string, User> = {
  admin: {
    id: 'user-admin-1',
    email: 'admin@hackflow.dev',
    fullName: 'BTC HackFlow Administrator',
    role: 'admin',
    approvalStatus: 'approved',
    specialty: 'Ban Tổ Chức • Điều phối Hệ thống',
  },
  leader: {
    id: 'user-leader-1',
    email: 'leader@cybersamurai.team',
    fullName: 'Nguyễn Văn Minh',
    role: 'candidate',
    approvalStatus: 'approved',
  },
  member: {
    id: 'user-member-2',
    email: 'member@cybersamurai.team',
    fullName: 'Trần Thị Thảo',
    role: 'candidate',
    approvalStatus: 'approved',
  },
  pending: {
    id: 'user-pending-1',
    email: 'pending@hust.edu.vn',
    fullName: 'Thí sinh Chờ duyệt',
    role: 'candidate',
    approvalStatus: 'pending',
  },
  rejected: {
    id: 'user-rejected-1',
    email: 'rejected@fpt.edu.vn',
    fullName: 'Thí sinh Bị từ chối',
    role: 'candidate',
    approvalStatus: 'rejected',
    rejectionReason: 'Tài khoản không thuộc danh sách hợp lệ của cuộc thi.',
  },
  mentor: {
    id: 'user-mentor-1',
    email: 'mentor.ai@ailab.org.vn',
    fullName: 'ThS. Phạm Cố Vấn AI',
    role: 'mentor',
    approvalStatus: 'approved',
    organization: 'Ban Cố Vấn Chuyên Môn HackFlow',
    position: 'Cố vấn Kỹ thuật',
    specialty: 'AI, Cloud & System Architecture',
  },
  judge: {
    id: 'user-judge-1',
    email: 'judge.tech@hackathon.org',
    fullName: 'TS. Nguyễn Hoàng Giám Khảo',
    role: 'judge',
    approvalStatus: 'approved',
    organization: 'Hội đồng Giám khảo HackFlow',
    position: 'Thành viên Hội đồng Giám khảo',
    specialty: 'AI Architecture & System Evaluation',
  },
};

export const initialHackathonConfig: HackathonConfig = {
  name: 'HackFlow AI và DeepTech Hackathon 2026',
  description: 'Hệ thống quản lý và tổ chức thi đấu Hackathon trực tuyến.',
  logoUrl: '/hackflow-logo.svg',
  bannerUrl: '/login-background.png',
  rules: '1. Mỗi đội thi có từ 3 đến 5 thành viên.\n2. Mỗi đề tài con có giới hạn số lượng đội tối đa (quota).\n3. Mã commit SHA được hệ thống đóng băng tự động tại thời điểm kết thúc hạn nộp.',
  prizes: [],
  channels: {
    fanpage: '',
    discord: '',
    email: 'btc@hackflow.dev',
  },
  minTeamSize: 3,
  maxTeamSize: 5,
  maxTeamMembers: 5,
  currentPhase: 'Giai đoạn 1: Mở đăng ký & Thành lập Đội thi',
  finalSubmissionDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  blindJudging: true,
  blindJudgingMode: false,
  resultsPublished: false,
  ticketsEnabled: true,
  registrationStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  topicSelectionDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  contestStart: new Date(Date.now()).toISOString(),
  contestEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  isContestStarted: true,
};

export const initialWhitelist: WhitelistEntry[] = [];
export const initialPendingCandidates: User[] = [];
export const initialMajorTopics: MajorTopic[] = [];
export const initialTeams: Team[] = [];
export const initialCheckpoints: Checkpoint[] = [];
export const initialSubmissions: CheckpointSubmission[] = [];
export const initialFinalSubmissions: FinalSubmission[] = [];
export const initialRubricCriteria: RubricCriteria[] = [];
export const initialEvaluations: TeamEvaluation[] = [];
export const initialSupportTickets: SupportTicket[] = [];
export const initialAnnouncements: Announcement[] = [];
