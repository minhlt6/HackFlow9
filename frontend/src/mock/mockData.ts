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
    fullName: 'Quản trị viên (Admin)',
    role: 'admin',
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    specialty: 'Ban Tổ Chức • Điều phối Hệ thống',
  },
  leader: {
    id: 'user-leader-1',
    email: 'leader@cybersamurai.team',
    fullName: 'Thí sinh (Đội trưởng)',
    role: 'candidate',
    approvalStatus: 'approved',
    studentId: '20210001',
    school: 'Đại học Bách Khoa Hà Nội',
    phone: '0912345678',
    skills: ['React', 'TypeScript', 'Node.js', 'System Architecture'],
    teamId: undefined,
    roleInTeam: undefined,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
  },
  member: {
    id: 'user-member-2',
    email: 'member@cybersamurai.team',
    fullName: 'Thí sinh (Thành viên)',
    role: 'candidate',
    approvalStatus: 'approved',
    studentId: '20210002',
    school: 'Đại học Bách Khoa Hà Nội',
    phone: '0987654321',
    skills: ['UI/UX', 'TailwindCSS', 'Figma'],
    teamId: undefined,
    roleInTeam: undefined,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  pending: {
    id: 'user-pending-1',
    email: 'newbie.candidate@hust.edu.vn',
    fullName: 'Thí sinh (Chờ duyệt)',
    role: 'candidate',
    approvalStatus: 'pending',
    studentId: '20224567',
    school: 'ĐH Bách Khoa Hà Nội (HUST)',
    phone: '0934567890',
    skills: ['Python', 'PyTorch', 'Data Analysis'],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  rejected: {
    id: 'user-rejected-1',
    email: 'spammer@random.com',
    fullName: 'Thí sinh (Bị từ chối)',
    role: 'candidate',
    approvalStatus: 'rejected',
    studentId: '99999999',
    school: 'Không xác định',
    rejectionReason: 'Email không thuộc danh sách sinh viên hợp lệ.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
  mentor: {
    id: 'user-mentor-1',
    email: 'mentor.ai@ailab.org.vn',
    fullName: 'Cố vấn chuyên môn',
    role: 'mentor',
    approvalStatus: 'approved',
    organization: 'Viện Nghiên cứu Trí tuệ Nhân tạo Quốc Gia',
    position: 'Senior Research Scientist',
    specialty: 'Computer Vision, Generative AI, LLM & RAG',
    bio: 'Tiến sĩ Khoa học Máy tính, cố vấn kỹ thuật giải đấu.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  },
  judge: {
    id: 'user-judge-1',
    email: 'judge.tech@hackathon.org',
    fullName: 'Giám khảo Hội đồng',
    role: 'judge',
    approvalStatus: 'approved',
    organization: 'Đại học Bách Khoa Hà Nội & Viện Công nghệ Tiên tiến',
    position: 'Trưởng bộ môn Khoa học Máy tính',
    specialty: 'AI Architecture, Algorithm Optimization, Production Readiness',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
  },
};

export const initialHackathonConfig: HackathonConfig = {
  name: 'HackFlow Hackathon 2026',
  description: 'Cuộc thi lập trình và sáng tạo công nghệ.',
  logoUrl: '/hackflow-logo.svg',
  bannerUrl: '/login-background.png',
  rules: '',
  prizes: [],
  channels: {
    fanpage: '',
    discord: '',
    email: '',
  },
  minTeamSize: 3,
  maxTeamSize: 5,
  maxTeamMembers: 4,
  currentPhase: 'Giai đoạn 1: Mở đăng ký & Lập đội',
  finalSubmissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  blindJudging: true,
  blindJudgingMode: false,
  resultsPublished: false,
  ticketsEnabled: true,
  registrationStart: new Date().toISOString(),
  registrationEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  topicSelectionDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  contestStart: new Date().toISOString(),
  contestEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isContestStarted: false,
};

// Dữ liệu trống hoàn toàn để Quản trị viên tự thiết lập từ đầu
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
