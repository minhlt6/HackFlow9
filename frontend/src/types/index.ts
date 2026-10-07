export type UserRole = 'admin' | 'judge' | 'mentor' | 'candidate';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  avatarUrl?: string;
  studentId?: string;
  school?: string;
  phone?: string;
  skills?: string[];
  specialty?: string;
  teamId?: string;
  roleInTeam?: 'leader' | 'member';
  rejectionReason?: string;
  organization?: string; // for mentor/judge
  position?: string;     // for mentor/judge
  bio?: string;
}

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  roleInTeam: 'leader' | 'member';
  studentId?: string;
  school?: string;
  skills?: string[];
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  leaderId: string;
  topicId: string | null;
  status: 'INCOMPLETE' | 'VALID' | 'APPROVED' | 'REJECTED' | 'pending';
  memberCount: number;
  members: TeamMember[];
  rejectionReason?: string;
  createdAt: string;
}

export interface SubTopic {
  id: string;
  majorTopicId: string;
  title: string;
  description: string;
  requirements?: string;
  sampleDataUrl?: string;
  referenceDocsUrl?: string;
  maxTeamsQuota: number;
  currentTeams: number;
  mentorId?: string;
  mentorName?: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface MajorTopic {
  id: string;
  title: string;
  description: string;
  domain: string;
  mentorIds: string[];
  subTopics: SubTopic[];
}

export interface CheckpointSubmission {
  id: string;
  checkpointId: string;
  teamId: string;
  repoUrl: string;
  demoUrl?: string;
  slideUrl?: string;
  description?: string;
  commitSha: string;
  submittedAt: string;
  isAfterDeadline?: boolean;
  score?: number;
  penaltyApplied?: number;
  status: 'submitted' | 'late' | 'reviewed';
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  startTime: string;
  deadline: string;
  points: number;
  penaltyPerDay?: number;
  status: 'upcoming' | 'open' | 'closed';
  blockConsecutiveMissing?: boolean;
}

export interface FinalSubmission {
  teamId: string;
  repoUrl: string;
  demoVideoUrl: string;
  slideUrl: string;
  summary: string;
  commitSha: string;
  submittedAt: string;
  isLate: boolean;
  status: 'submitted' | 'scored';
}

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number; // Percentage, sum of all weights must be 100
  displayOrder: number;
}

export interface EvaluationDetail {
  criteriaId: string;
  score: number;
  comment?: string;
}

export interface TeamEvaluation {
  id: string;
  teamId: string;
  judgeId: string;
  judgeName: string;
  totalScore: number; // weighted sum
  generalComment: string;
  isDraft: boolean;
  confirmedAt?: string;
  details: EvaluationDetail[];
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  sentAt: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string; // e.g. TK-01
  teamId: string;
  teamName: string;
  senderId: string;
  senderName: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  mentorId?: string;
  mentorName?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface WhitelistEntry {
  id: string;
  email: string;
  note: string;
  isActive: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  isPinned: boolean;
}

export interface HackathonConfig {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  rules: string;
  prizes: Array<{ rank: string; reward: string; description?: string }>;
  channels: {
    fanpage?: string;
    discord?: string;
    email?: string;
  };
  minTeamSize: number;
  maxTeamSize: number;
  blindJudging: boolean;
  resultsPublished: boolean;
  ticketsEnabled: boolean;
  registrationStart: string;
  registrationEnd: string;
  contestStart: string;
  contestEnd: string;
  topicSelectionDeadline: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}