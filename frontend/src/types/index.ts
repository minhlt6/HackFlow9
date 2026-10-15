export type UserRole = 'admin' | 'judge' | 'mentor' | 'candidate';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  githubUsername?: string;
  avatarUrl?: string;
  university?: string;
  school?: string;
  studentId?: string;
  phone?: string;
  skills?: string[];
  specialization?: string;
  specialty?: string;
  teamId?: string;
  teamRole?: 'leader' | 'member';
  team_role?: 'TEAM_LEADER' | 'MEMBER' | 'leader' | 'member';
  roleInTeam?: 'leader' | 'member';
  rejectionReason?: string;
  organization?: string;
  position?: string;
  bio?: string;
}

export interface TeamMember {
  id?: string;
  userId?: string;
  fullName: string;
  email: string;
  role?: 'leader' | 'member';
  roleInTeam?: 'leader' | 'member';
  githubUsername?: string;
  studentId?: string;
  university?: string;
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
  leaderName?: string;
  subTopicId?: string;
  topicId?: string | null;
  status: 'approved' | 'pending' | 'rejected' | 'INCOMPLETE' | 'VALID' | 'APPROVED' | 'REJECTED';
  members: TeamMember[];
  memberCount?: number;
  rejectionReason?: string;
  createdAt: string;
}

export interface SubTopic {
  id: string;
  majorTopicId?: string;
  title: string;
  description: string;
  requirements?: string;
  sampleDataUrl?: string;
  referenceDocsUrl?: string;
  quota?: number;
  maxTeamsQuota?: number;
  registeredTeamsCount?: number;
  currentTeams?: number;
  mentorName?: string;
  mentorId?: string;
  status?: 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface MajorTopic {
  id: string;
  name?: string;
  title?: string;
  description: string;
  domain?: string;
  mentorIds?: string[];
  subTopics: SubTopic[];
}

export type SubmissionFieldType =
  | 'repoUrl'
  | 'demoUrl'
  | 'videoUrl'
  | 'slideUrl'
  | 'figmaUrl'
  | 'description'
  | 'custom';

export interface SubmissionFieldConfig {
  id: string;
  type: SubmissionFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  description?: string;
}

export interface CheckpointSubmission {
  id: string;
  checkpointId: string;
  teamId: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  slideUrl?: string;
  figmaUrl?: string;
  description?: string;
  customFields?: Record<string, string>;
  commitSha: string;
  submittedAt: string;
  isAfterDeadline?: boolean;
  score?: number;
  penaltyApplied?: number;
  status?: 'submitted' | 'late' | 'reviewed';
}

export interface Checkpoint {
  id: string;
  title?: string;
  name?: string;
  description: string;
  requirements?: string[];
  submissionFields?: SubmissionFieldConfig[];
  startTime?: string;
  deadline: string;
  durationMinutes?: number;
  weight?: number;
  points?: number;
  penaltyPerDay?: number;
  status?: 'upcoming' | 'open' | 'closed';
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
  isLate?: boolean;
  status?: 'submitted' | 'scored';
}

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
  displayOrder?: number;
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
  totalScore: number;
  scores?: Record<string, number>;
  generalComment: string;
  isDraft: boolean;
  confirmedAt?: string;
  details?: EvaluationDetail[];
}

export interface TicketReply {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
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
  ticketCode?: string;
  teamId: string;
  teamName: string;
  creatorId?: string;
  creatorName?: string;
  senderId?: string;
  senderName?: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedMentorId?: string;
  assignedMentorName?: string;
  mentorId?: string;
  mentorName?: string;
  createdAt: string;
  updatedAt?: string;
  replies?: TicketReply[];
  messages?: TicketMessage[];
}

export interface WhitelistEntry {
  id: string;
  email: string;
  note?: string;
  isActive: boolean;
  addedAt?: string;
  createdAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  sender?: string;
  author?: string;
  targetRole?: 'all' | 'candidates' | 'judges' | 'mentors';
  createdAt?: string;
  publishedAt?: string;
  isPinned?: boolean;
}

export interface HackathonConfig {
  name: string;
  currentPhase: string;
  finalSubmissionDeadline: string;
  maxTeamMembers: number;
  blindJudgingMode?: boolean;
  blindJudging?: boolean;
  resultsPublished: boolean;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  rules?: string;
  prizes?: Array<{ rank: string; reward: string; description?: string }>;
  channels?: {
    fanpage?: string;
    discord?: string;
    email?: string;
  };
  minTeamSize?: number;
  maxTeamSize?: number;
  ticketsEnabled?: boolean;
  registrationStart?: string;
  registrationEnd?: string;
  contestStart?: string;
  contestEnd?: string;
  topicSelectionDeadline?: string;
  isContestStarted?: boolean;
  contestStartedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export * from './checkpoint';
export * from './topic';
export * from './notification';
export type { TeamDetails, CreateTeamPayload, JoinTeamPayload } from './team';
