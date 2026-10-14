import type { TeamDetails, CreateTeamPayload, JoinTeamPayload } from '../types/team';

/**
 * Mock trạng thái 1: Chưa vào đội thi nào
 */
export const mockTeamNoTeam: TeamDetails | null = null;

/**
 * Mock trạng thái 2: Đã vào đội thi (Khớp 100% demo Leader: CyberSamurai - CS2026 - 3 thành viên)
 */
export const mockTeamInTeam: TeamDetails = {
  id: 'team-cs-01',
  team_name: 'CyberSamurai',
  invite_code: 'CS2026',
  description: 'Ứng dụng LLM và RAG bảo mật cao tra cứu hồ sơ bệnh án y khoa.',
  status: 'active',
  is_locked: false,
  member_count: 3,
  min_members: 3,
  max_members: 4,
  leader_id: 'usr-minh-01',
  topic_id: 'TOPIC_HEALTHCARE_AI',
  topic_name: 'Ứng dụng LLM & RAG trong Y tế',
  created_at: '2026-10-05T08:30:00Z',
  members: [
    {
      id: 'tm-01',
      user_id: 'usr-minh-01',
      full_name: 'Nguyễn Văn Minh',
      email: 'leader@cybersamurai.team',
      role: 'leader',
      github_username: 'github_user',
      university: 'Đại học Bách Khoa Hà Nội',
      joined_at: '2026-10-05T08:30:00Z',
      skills: ['Python', 'FastAPI', 'RAG'],
    },
    {
      id: 'tm-02',
      user_id: 'usr-thao-02',
      full_name: 'Trần Thị Thảo',
      email: 'member@cybersamurai.team',
      role: 'member',
      github_username: 'github_user',
      university: 'Đại học Bách Khoa Hà Nội',
      joined_at: '2026-10-05T09:15:00Z',
      skills: ['React', 'TypeScript', 'Tailwind'],
    },
    {
      id: 'tm-03',
      user_id: 'usr-viet-03',
      full_name: 'Hoàng Quốc Việt',
      email: 'member2@cybersamurai.team',
      role: 'member',
      github_username: 'github_user',
      university: 'Đại học Bách Khoa Hà Nội',
      joined_at: '2026-10-05T10:00:00Z',
      skills: ['Machine Learning', 'PyTorch'],
    },
  ],
};

/**
 * Mock trạng thái 3: Đội đã đủ 4/4 thành viên tối đa
 */
export const mockTeamFull: TeamDetails = {
  ...mockTeamInTeam,
  id: 'team-cs-full',
  member_count: 4,
  members: [
    ...mockTeamInTeam.members,
    {
      id: 'tm-04',
      user_id: 'usr-lan-04',
      full_name: 'Phạm Thị Lan',
      email: 'member3@cybersamurai.team',
      role: 'member',
      github_username: 'github_user',
      university: 'Đại học Bách Khoa Hà Nội',
      joined_at: '2026-10-05T11:30:00Z',
      skills: ['DevOps', 'Docker'],
    },
  ],
};

/**
 * Helper mô phỏng lấy dữ liệu
 */
export const fetchMockTeam = async (
  mode: 'no_team' | 'in_team' | 'full' | 'error',
  delayMs = 350,
): Promise<TeamDetails | null> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (mode === 'error') {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
  }
  if (mode === 'in_team') {
    return mockTeamInTeam;
  }
  if (mode === 'full') {
    return mockTeamFull;
  }
  return mockTeamNoTeam;
};

/**
 * Helper mô phỏng tạo đội
 */
export const mockCreateTeamApi = async (
  payload: CreateTeamPayload,
  delayMs = 600,
): Promise<TeamDetails> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const trimmed = payload.team_name.trim();
  if (trimmed.length < 3) {
    throw new Error('Tên đội phải có ít nhất 3 ký tự.');
  }

  return {
    id: `team-${Date.now()}`,
    team_name: trimmed,
    invite_code: 'CS2026',
    description: 'Ứng dụng LLM và RAG bảo mật cao tra cứu hồ sơ bệnh án y khoa.',
    status: 'active',
    is_locked: false,
    member_count: 1,
    min_members: 3,
    max_members: 4,
    leader_id: 'usr-minh-01',
    created_at: new Date().toISOString(),
    members: [
      {
        id: `tm-${Date.now()}`,
        user_id: 'usr-minh-01',
        full_name: 'Nguyễn Văn Minh',
        email: 'leader@cybersamurai.team',
        role: 'leader',
        github_username: 'github_user',
        university: 'Đại học Bách Khoa Hà Nội',
        joined_at: new Date().toISOString(),
        skills: ['Python', 'FastAPI'],
      },
    ],
  };
};

/**
 * Helper mô phỏng tham gia đội
 */
export const mockJoinTeamApi = async (
  payload: JoinTeamPayload,
  delayMs = 600,
): Promise<TeamDetails> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const code = payload.invite_code.trim().toUpperCase();

  if (code.length < 6) {
    throw new Error('Mã mời phải gồm đúng 6 ký tự.');
  }
  if (code === 'ERR404') {
    throw new Error('Mã mời không tồn tại.');
  }
  if (code === 'FULL99') {
    throw new Error('Đội thi đã đủ số lượng thành viên tối đa.');
  }

  return {
    ...mockTeamInTeam,
    invite_code: code,
  };
};
