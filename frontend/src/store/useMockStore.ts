import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/axiosClient';
import { notificationsApi } from '../api/notificationsApi';
import { useAuthStore } from './useAuthStore';
import type {
  User,
  Team,
  TeamMember,
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
const initialHackathonConfig: HackathonConfig = {
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
  minTeamMembers: 3,
  maxTeamSize: 5,
  maxTeamMembers: 5,
  currentPhase: 'Giai đoạn 3: Thực thi dự án và Nộp bài các chặng',
  finalSubmissionDeadline: '',
  blindJudging: false,
  blindJudgingMode: false,
  resultsPublished: false,
  ticketsEnabled: true,
  registrationStart: '',
  registrationEnd: '',
  topicSelectionDeadline: '',
  contestStart: '',
  contestEnd: '',
  isContestStarted: false,
};

const initialWhitelist: WhitelistEntry[] = [];
const initialPendingCandidates: User[] = [];
const initialMajorTopics: MajorTopic[] = [];
const initialTeams: Team[] = [];
const initialCheckpoints: Checkpoint[] = [];
const initialSubmissions: CheckpointSubmission[] = [];
const initialFinalSubmissions: FinalSubmission[] = [];
const initialRubricCriteria: RubricCriteria[] = [];
const initialEvaluations: TeamEvaluation[] = [];
const initialSupportTickets: SupportTicket[] = [];
const initialAnnouncements: Announcement[] = [];

/**
 * Standard utility to ensure any score is strictly normalized to the 100-point rubric scale.
 * If scores map and criteria are present, computes: sum((clampedScore / maxScore) * weight) / totalWeight * 100.
 * Also defensively catches legacy cached values > 100 (e.g. 229.5) and restores them to 100-point scale.
 */
export const normalizeScoreTo100 = (
  totalScore?: number,
  scores?: Record<string, number>,
  criteria?: RubricCriteria[]
): number => {
  if (scores && criteria && criteria.length > 0) {
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0) || 100;
    let weightedSum = 0;
    for (const c of criteria) {
      const raw = scores[c.id] ?? 0;
      const max = c.maxScore > 0 ? c.maxScore : 10;
      const clamped = Math.max(0, Math.min(raw, max));
      weightedSum += (clamped / max) * (c.weight || 0);
    }
    return Math.round(((weightedSum / totalWeight) * 100) * 10) / 10;
  }
  if (totalScore !== undefined && totalScore >= 0 && totalScore <= 100) {
    return Math.round(totalScore * 10) / 10;
  }
  if (totalScore !== undefined && totalScore > 100) {
    return Math.min(100, Math.round((totalScore / 10) * 10) / 10);
  }
  return totalScore ?? 0;
};

interface MockStoreState {
  // Current user & authentication
  currentUser: User;
  activeRolePersona: 'admin' | 'leader' | 'member' | 'pending' | 'rejected' | 'mentor' | 'judge';
  isAuthenticated: boolean;
  switchPersona: (persona: 'admin' | 'leader' | 'member' | 'pending' | 'rejected' | 'mentor' | 'judge') => void;
  logout: () => void;
  updateCurrentUserProfile: (profile: Partial<User>, skipBackendSync?: boolean) => void;

  // Hackathon Configuration
  config: HackathonConfig;
  updateConfig: (newConfig: Partial<HackathonConfig>) => Promise<void>;
  toggleBlindJudging: () => Promise<void>;
  toggleResultsPublished: () => Promise<void>;
  toggleContestStarted: () => Promise<void>;

  // Whitelist
  whitelist: WhitelistEntry[];
  addWhitelistEntry: (email: string, note?: string) => void;
  bulkImportWhitelist: (emails: string[], note?: string) => number;
  toggleWhitelistActive: (id: string, email?: string) => void;
  removeWhitelistEntry: (id: string, email?: string) => void;

  // Pending Candidates
  pendingCandidates: User[];
  approveCandidate: (userId: string, note?: string) => void;
  rejectCandidate: (userId: string, reason: string) => void;

  // Teams
  teams: Team[];
  approveTeamRegistration: (teamId: string) => void;
  rejectTeamRegistration: (teamId: string, reason: string) => void;

  // Topics
  majorTopics: MajorTopic[];
  addMajorTopic: (title: string, description: string) => void;
  deleteMajorTopic: (id: string) => void;
  selectTopicForTeam: (teamId: string, subTopicId: string) => { success: boolean; message: string };
  cancelTopicForTeam: (teamId: string) => { success: boolean; message: string };
  addSubTopic: (majorTopicId: string, subTopic: { title: string; description: string; quota: number; mentorName?: string }) => void;
  updateSubTopicQuota: (subTopicId: string, newQuota: number) => void;

  // Checkpoints & Submissions
  checkpoints: Checkpoint[];
  submissions: CheckpointSubmission[];
  finalSubmissions: FinalSubmission[];
  addCheckpoint: (cp: Omit<Checkpoint, 'id'>, insertIndex?: number) => void;
  updateCheckpoint: (id: string, updates: Partial<Checkpoint>) => void;
  deleteCheckpoint: (id: string) => void;
  reorderCheckpoints: (fromIndex: number, toIndex: number) => void;
  sortCheckpointsByDeadline: () => void;
  submitCheckpoint: (
    checkpointId: string,
    teamId: string,
    dataOrRepoUrl: string | Partial<CheckpointSubmission>,
    demoUrl?: string
  ) => { success: boolean; commitSha: string };
  submitFinalProject: (
    teamId: string,
    repoUrl: string,
    demoVideoUrl: string,
    slideUrl: string,
    summary: string
  ) => { success: boolean; commitSha: string };

  // Rubrics & Evaluations
  rubricCriteria: RubricCriteria[];
  evaluations: TeamEvaluation[];
  addRubricCriterion: (
    name: string,
    description: string,
    maxScore: number,
    weight: number,
    rebalanceMode?: 'none' | 'proportional' | 'equal'
  ) => void;
  rebalanceRubricWeights: (mode: 'equal' | 'proportional') => void;
  updateRubricCriterion: (id: string, updates: Partial<RubricCriteria>) => void;
  deleteRubricCriterion: (id: string) => void;
  saveEvaluation: (
    teamId: string,
    judgeId: string,
    judgeName: string,
    scores: Record<string, number>,
    generalComment: string,
    isDraft: boolean,
    criteriaComments?: Record<string, string>,
    skipBackendSync?: boolean,
  ) => void;

  // Support Tickets
  tickets: SupportTicket[];
  createTicket: (
    title: string,
    description: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' | 'medium',
    category?: string,
  ) => { success: boolean; ticket?: SupportTicket };
  claimTicket: (ticketId: string) => void;
  replyTicket: (ticketId: string, content: string) => void;
  resolveTicket: (ticketId: string, responseText?: string) => void;
  closeTicket: (ticketId: string) => void;
  reopenTicket: (ticketId: string) => void;
  cancelTicket: (ticketId: string) => void;

  // Announcements
  announcements: Announcement[];
  addAnnouncement: (title: string, content: string, isPinned?: boolean) => void;
  broadcastAnnouncement: (
    title: string,
    content: string,
    targetRole?: 'all' | 'candidates' | 'judges' | 'mentors',
    priority?: 'info' | 'warning' | 'urgent',
    skipBackendSync?: boolean,
  ) => void;
  deleteAnnouncement: (id: string) => void;

  // Reset & Sync
  resetAllMockData: () => void;
  syncFromBackend?: () => Promise<void>;

  // Onboarding Wizard & Guided Setup
  isWizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
  wizardStep: number;
  openWizardAtStep: (step: number) => void;
  onboardingCompletedUsers: Record<string, boolean>;
  pledgedUsers: Record<string, boolean>;
  finishUserOnboarding: (userId: string) => void;
  resetUserOnboarding: (userId: string) => void;
  setUserPledge: (userId: string, pledged: boolean) => void;
}

const mergeUserWithAuthStore = (baseUser: User): User => {
  try {
    let authUser = useAuthStore.getState?.()?.user;
    if (!authUser && typeof window !== 'undefined') {
      const rawAuth = localStorage.getItem('auth-storage');
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth) as { state?: { user?: User } };
        authUser = parsed?.state?.user ?? null;
      }
    }
    if (
      authUser &&
      authUser.role === baseUser.role &&
      (!authUser.email ||
        !baseUser.email ||
        authUser.email.toLowerCase() === baseUser.email.toLowerCase())
    ) {
      return {
        ...baseUser,
        ...authUser,
        university: authUser.university ?? authUser.school ?? baseUser.university,
        school: authUser.school ?? authUser.university ?? baseUser.school,
      };
    }
  } catch {
    // ignore
  }
  return baseUser;
};

const emptyUser: User = { id: '', email: '', fullName: '', role: 'candidate', approvalStatus: 'pending' };
const getInitialTabSession = () => ({
  currentUser: useAuthStore.getState().user || emptyUser,
  activeRolePersona: 'pending' as const,
  isAuthenticated: useAuthStore.getState().isAuthenticated,
});

if (typeof window !== 'undefined') {
  try {
    [
      'hackflow-full-setup-v3',
      'hackflow_admin_teams_v2',
      'hackflow_team_details_v2',
      'hackflow_notifications_v1',
      'hackflow_checkpoint_submissions',
      'hackflow_checkpoint_submission_history',
    ].forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

const initialSession = getInitialTabSession();

const syncRubricsToBackend = async (criteria: RubricCriteria[]) => {
  if (!criteria || criteria.length === 0) return;
  const totalRaw = criteria.reduce((s, c) => s + (c.weight > 0 ? c.weight : 1), 0) || 100;
  let running = 0;
  const normalized = criteria.map((c, idx) => {
    const rawW = c.weight > 0 ? c.weight : 1;
    let w: number;
    if (idx === criteria.length - 1) {
      w = Math.max(0.0001, Number((1 - running).toFixed(4)));
    } else {
      w = Math.max(0.0001, Number((rawW / totalRaw).toFixed(4)));
      running += w;
    }
    return {
      id: c.id,
      title: c.name,
      description: c.description || '',
      max_score: c.maxScore > 0 ? c.maxScore : 10,
      weight: w,
      is_required: true,
      display_order: c.displayOrder || idx + 1,
      is_active: true,
    };
  });
  try {
    await apiClient.post('/rubrics', {
      name: 'HackFlow Final Rubric',
      criteria: normalized,
    });
  } catch {
    // ignore if offline or locked
  }
};

export const useMockStore = create<MockStoreState>()(
  persist(
    (set, get) => ({
      currentUser: initialSession.currentUser,
      activeRolePersona: initialSession.activeRolePersona,
      isAuthenticated: initialSession.isAuthenticated,

      switchPersona: (persona) => {
        const baseMockUser = useAuthStore.getState().user || emptyUser;
        const curr = get().currentUser;
        const sameCurr =
          get().activeRolePersona === persona &&
          curr &&
          curr.role === baseMockUser.role &&
          (!curr.email ||
            !baseMockUser.email ||
            curr.email.toLowerCase() === baseMockUser.email.toLowerCase());
        const targetUser = mergeUserWithAuthStore(
          sameCurr ? { ...baseMockUser, ...curr } : baseMockUser,
        );
        const isDone = !!get().onboardingCompletedUsers[targetUser.id];
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('hackflow_session_persona', persona);
          sessionStorage.setItem('hackflow_session_auth', 'true');
          localStorage.setItem('hackflow_session_persona', persona);
          localStorage.setItem('hackflow_session_auth', 'true');
        }
        set({
          currentUser: targetUser,
          activeRolePersona: persona,
          isAuthenticated: true,
          isWizardOpen: sameCurr ? get().isWizardOpen : (isDone ? false : false),
          wizardStep: sameCurr ? get().wizardStep : 1,
        });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('hackflow_session_persona');
          sessionStorage.removeItem('hackflow_session_auth');
          localStorage.removeItem('hackflow_session_persona');
          localStorage.removeItem('hackflow_session_auth');
        }
        set({
          isAuthenticated: false,
          isWizardOpen: false,
        });
      },

      updateCurrentUserProfile: (profile, skipBackendSync = false) => {
        set((state) => {
          const nextUser = {
            ...state.currentUser,
            ...profile,
            university: profile.university ?? profile.school ?? state.currentUser.university,
            school: profile.school ?? profile.university ?? state.currentUser.school,
          };
          const nextTeams = state.teams.map((t) => ({
            ...t,
            leaderName:
              t.leaderId === nextUser.id && nextUser.fullName ? nextUser.fullName : t.leaderName,
            members: t.members.map((m) =>
              m.userId === nextUser.id || m.id === nextUser.id
                ? {
                    ...m,
                    fullName: nextUser.fullName || m.fullName,
                    studentId: nextUser.studentId ?? m.studentId,
                    university: nextUser.university ?? m.university,
                    school: nextUser.school ?? m.school,
                    skills: nextUser.skills ?? m.skills,
                  }
                : m
            ),
          }));
          return {
            currentUser: nextUser,
            teams: nextTeams,
          };
        });
        if (!skipBackendSync) {
          const curr = get().currentUser;
          useAuthStore.getState().updateUser({
            fullName: curr.fullName,
            studentId: curr.studentId,
            university: curr.university,
            school: curr.school,
            phone: curr.phone,
            skills: curr.skills,
            bio: curr.bio,
          });
          void apiClient
            .post('/users/profile', {
              full_name: profile.fullName || curr.fullName,
              student_id: profile.studentId ?? curr.studentId,
              school: profile.university || profile.school || curr.university || curr.school,
              phone: profile.phone ?? curr.phone,
              skills: profile.skills ?? curr.skills,
              bio: profile.bio ?? curr.bio,
            })
            .catch(() => {});
        }
      },

      // Onboarding Wizard & Guided Setup
      isWizardOpen: false,
      setWizardOpen: (open) => set({ isWizardOpen: open }),
      wizardStep: 1,
      openWizardAtStep: (step) => set({ isWizardOpen: true, wizardStep: step }),
      onboardingCompletedUsers: {},
      pledgedUsers: {},
      finishUserOnboarding: (userId) =>
        set((state) => ({
          onboardingCompletedUsers: (
            void apiClient.post('/users/onboarding', { onboarding_completed: true }).catch(() => {}),
            { ...state.onboardingCompletedUsers, [userId]: true }
          ),
          isWizardOpen: false,
        })),
      resetUserOnboarding: (userId) =>
        set((state) => ({
          onboardingCompletedUsers: { ...state.onboardingCompletedUsers, [userId]: false },
          pledgedUsers: { ...state.pledgedUsers, [userId]: false },
          isWizardOpen: true,
          wizardStep: 1,
        })),
      setUserPledge: (userId, pledged) =>
        set((state) => ({
          pledgedUsers: (
            void apiClient.post('/users/onboarding', { pledged }).catch(() => {}),
            { ...state.pledgedUsers, [userId]: pledged }
          ),
        })),

      // Config
      config: initialHackathonConfig,
      updateConfig: async (newConfig) => {
        const minVal = newConfig.minTeamMembers ?? newConfig.minTeamSize;
        const maxVal = newConfig.maxTeamMembers ?? newConfig.maxTeamSize;
        const response = await apiClient.patch('/admin/config', {
          name: newConfig.name,
          end_time: newConfig.finalSubmissionDeadline,
          minTeamSize: minVal,
          minTeamMembers: minVal,
          maxTeamSize: maxVal,
          maxTeamMembers: maxVal,
          currentPhase: newConfig.currentPhase,
          blindJudgingEnabled: newConfig.blindJudgingMode ?? newConfig.blindJudging,
          is_result_published: newConfig.resultsPublished,
        });
        const saved = response.data?.data;
        if (!saved?.id || !saved.end_time) throw new Error('Phản hồi cấu hình không hợp lệ. Vui lòng tải lại trang.');
        set((state) => ({
          config: {
            ...state.config,
            ...newConfig,
            name: String(saved.name), currentPhase: String(saved.currentPhase),
            finalSubmissionDeadline: String(saved.end_time),
            isContestStarted: saved.status === 'hacking',
            minTeamSize: Number(saved.minTeamSize), minTeamMembers: Number(saved.minTeamMembers),
            maxTeamSize: Number(saved.maxTeamSize), maxTeamMembers: Number(saved.maxTeamMembers),
          },
        }));
      },
      toggleBlindJudging: async () => {
        const next = !get().config.blindJudgingMode;
        await get().updateConfig({ blindJudging: next, blindJudgingMode: next });
      },
      toggleResultsPublished: async () => {
        const next = !get().config.resultsPublished;
        await apiClient.patch('/admin/leaderboard/publish', { is_result_published: next });
        set((state) => ({ config: { ...state.config, resultsPublished: next } }));
      },
      toggleContestStarted: async () => {
        const next = !get().config.isContestStarted;
        const response = await apiClient.patch('/admin/config', { status: next ? 'hacking' : 'registration' });
        const saved = response.data.data;
        set((state) => ({ config: { ...state.config, isContestStarted: saved.status === 'hacking', currentPhase: String(saved.currentPhase) } }));
      },

      // Whitelist
      whitelist: initialWhitelist,
      addWhitelistEntry: (email, note = 'Thêm thủ công từ Admin') => {
        const cleaned = email.trim().toLowerCase();
        if (!cleaned) return;
        const exists = get().whitelist.some((w) => w.email.toLowerCase() === cleaned);
        if (exists) return;

        const newEntry: WhitelistEntry = {
          id: `wl-${Date.now()}`,
          email: cleaned,
          note,
          isActive: true,
          addedAt: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
        };

        set((state) => ({ whitelist: [newEntry, ...state.whitelist] }));
      },

      bulkImportWhitelist: (emails, note = 'Import danh sách hàng loạt') => {
        const currentList = get().whitelist;
        const currentEmails = new Set(currentList.map((w) => w.email.toLowerCase()));

        const validEntries: WhitelistEntry[] = [];
        const dateStr = new Date().toISOString().split('T')[0];

        emails.forEach((raw) => {
          const email = raw.trim().toLowerCase();
          if (email && email.includes('@') && !currentEmails.has(email)) {
            currentEmails.add(email);
            validEntries.push({
              id: `wl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              email,
              note,
              isActive: true,
              addedAt: dateStr,
              createdAt: dateStr,
            });
          }
        });

        if (validEntries.length > 0) {
          set((state) => ({ whitelist: [...validEntries, ...state.whitelist] }));
        }

        return validEntries.length;
      },

      toggleWhitelistActive: (id, email) => {
        const emailLower = email?.trim().toLowerCase();
        set((state) => ({
          whitelist: state.whitelist.map((w) =>
            w.id === id || (emailLower && w.email.toLowerCase() === emailLower)
              ? { ...w, isActive: !w.isActive }
              : w,
          ),
        }));
      },

      removeWhitelistEntry: (id, email) => {
        const emailLower = email?.trim().toLowerCase();
        set((state) => ({
          whitelist: state.whitelist.filter(
            (w) => w.id !== id && (!emailLower || w.email.toLowerCase() !== emailLower),
          ),
        }));
      },

      // Candidates
      pendingCandidates: initialPendingCandidates,
      approveCandidate: (userId) => {
        set((state) => ({
          pendingCandidates: state.pendingCandidates.filter((c) => c.id !== userId),
        }));
      },

      rejectCandidate: (userId) => {
        set((state) => ({
          pendingCandidates: state.pendingCandidates.filter((c) => c.id !== userId),
        }));
      },

      // Teams
      teams: initialTeams,
      approveTeamRegistration: (teamId) => {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === teamId ? { ...t, status: 'approved', approvalStatus: 'approved' } : t)),
        }));
      },

      rejectTeamRegistration: (teamId, reason) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId ? { ...t, status: 'REJECTED', rejectionReason: reason } : t
          ),
        }));
      },

      // Topics Selection with Atomic Quota Tracking
      majorTopics: initialMajorTopics,

      addMajorTopic: (title, description) => {
        const tempId = `major-${Date.now()}`;
        const newMajor: MajorTopic = {
          id: tempId,
          name: title,
          title,
          domain: title,
          description,
          mentorIds: [],
          subTopics: [],
        };
        set((state) => ({ majorTopics: [...state.majorTopics, newMajor] }));

        void apiClient
          .post('/topics', { title, description, max_teams: 50 })
          .then((res) => {
            const created = res.data?.data;
            if (created?.id) {
              set((state) => ({
                majorTopics: state.majorTopics.map((m) =>
                  m.id === tempId ? { ...m, id: String(created.id) } : m
                ),
              }));
            }
          })
          .catch(() => {});
      },

      deleteMajorTopic: (id) => {
        set((state) => ({
          majorTopics: state.majorTopics.filter((m) => m.id !== id),
        }));
        void apiClient.delete(`/topics/${id}`).catch(() => {});
      },

      selectTopicForTeam: (teamId, subTopicId) => {
        const team = get().teams.find((t) => t.id === teamId);
        if (!team) return { success: false, message: 'Đội thi không tồn tại.' };

        // Find the subtopic
        let targetSubTopic: MockStoreState['majorTopics'][number]['subTopics'][number] | null = null;
        for (const major of get().majorTopics) {
          const sub = major.subTopics.find((s) => s.id === subTopicId);
          if (sub) {
            targetSubTopic = sub;
            break;
          }
        }

        if (!targetSubTopic) return { success: false, message: 'Đề tài không tồn tại.' };

        const targetCurTeams = targetSubTopic.currentTeams ?? targetSubTopic.registeredTeamsCount ?? 0;
        const targetMaxQuota = targetSubTopic.maxTeamsQuota ?? targetSubTopic.quota ?? 3;

        if (targetCurTeams >= targetMaxQuota) {
          return {
            success: false,
            message: `Đề tài "${targetSubTopic.title}" đã đạt giới hạn tối đa ${targetMaxQuota} đội. Vui lòng chọn đề tài khác.`,
          };
        }

        const oldTopicId = team.topicId;

        const updatedMajors = get().majorTopics.map((major) => ({
          ...major,
          subTopics: major.subTopics.map((sub) => {
            const curTeams = sub.currentTeams ?? sub.registeredTeamsCount ?? 0;
            const maxQuota = sub.maxTeamsQuota ?? sub.quota ?? 3;

            if (sub.id === oldTopicId && oldTopicId !== subTopicId) {
              const newCount = Math.max(0, curTeams - 1);
              return {
                ...sub,
                currentTeams: newCount,
                registeredTeamsCount: newCount,
                status: (newCount < maxQuota ? 'OPEN' : 'CLOSED') as 'OPEN' | 'CLOSED',
              };
            }
            if (sub.id === subTopicId) {
              const newCount = curTeams + 1;
              return {
                ...sub,
                currentTeams: newCount,
                registeredTeamsCount: newCount,
                status: (newCount >= maxQuota ? 'CLOSED' : 'OPEN') as 'OPEN' | 'CLOSED',
              };
            }
            return sub;
          }),
        }));

        set((state) => ({
          majorTopics: updatedMajors,
          teams: state.teams.map((t) => (t.id === teamId ? { ...t, topicId: subTopicId } : t)),
        }));

        void apiClient.post('/topics/select', { topic_id: subTopicId }).catch(() => {});

        return { success: true, message: `Chọn đề tài "${targetSubTopic.title}" thành công!` };
      },

      cancelTopicForTeam: (teamId) => {
        const team = get().teams.find((t) => t.id === teamId);
        if (!team || !team.topicId) return { success: false, message: 'Đội chưa đăng ký đề tài nào.' };

        const oldTopicId = team.topicId;
        const updatedMajors = get().majorTopics.map((major) => ({
          ...major,
          subTopics: major.subTopics.map((sub) => {
            if (sub.id === oldTopicId) {
              const curTeams = sub.currentTeams ?? sub.registeredTeamsCount ?? 0;
              const newCount = Math.max(0, curTeams - 1);
              return {
                ...sub,
                currentTeams: newCount,
                registeredTeamsCount: newCount,
                status: 'OPEN' as const,
              };
            }
            return sub;
          }),
        }));

        set((state) => ({
          majorTopics: updatedMajors,
          teams: state.teams.map((t) => (t.id === teamId ? { ...t, topicId: null } : t)),
        }));

        void apiClient.post('/topics/cancel', { team_id: teamId }).catch(() => {});

        return { success: true, message: 'Đã hủy đề tài thành công. Quota đã được giải phóng.' };
      },

      addSubTopic: (majorTopicId, newSub) => {
        const tempId = `sub-${Date.now()}`;
        set((state) => ({
          majorTopics: state.majorTopics.map((m) =>
            m.id === majorTopicId
              ? {
                  ...m,
                  subTopics: [
                    ...m.subTopics,
                    {
                      id: tempId,
                      majorTopicId,
                      title: newSub.title,
                      description: newSub.description,
                      maxTeamsQuota: newSub.quota,
                      currentTeams: 0,
                      quota: newSub.quota,
                      registeredTeamsCount: 0,
                      mentorName: newSub.mentorName || 'TS. Ban Cố Vấn',
                      status: 'OPEN',
                    },
                  ],
                }
              : m
          ),
        }));

        void apiClient
          .post(`/topics/${majorTopicId}/subtopics`, {
            title: newSub.title,
            description: newSub.description,
            max_teams: newSub.quota,
            quota_max: newSub.quota,
          })
          .then((res) => {
            const topicData = res.data?.data;
            const subs = topicData?.subtopics;
            if (Array.isArray(subs) && subs.length > 0) {
              const createdSub = subs[subs.length - 1];
              if (createdSub?.id) {
                set((state) => ({
                  majorTopics: state.majorTopics.map((m) =>
                    m.id === majorTopicId
                      ? {
                          ...m,
                          subTopics: m.subTopics.map((s) =>
                            s.id === tempId ? { ...s, id: String(createdSub.id) } : s
                          ),
                        }
                      : m
                  ),
                }));
              }
            }
          })
          .catch(() => {});
      },

      updateSubTopicQuota: (subTopicId, newQuota) => {
        set((state) => ({
          majorTopics: state.majorTopics.map((m) => ({
            ...m,
            subTopics: m.subTopics.map((s) => {
              if (s.id === subTopicId) {
                const cur = s.currentTeams ?? s.registeredTeamsCount ?? 0;
                return {
                  ...s,
                  maxTeamsQuota: newQuota,
                  quota: newQuota,
                  status: (cur >= newQuota ? 'CLOSED' : 'OPEN') as 'OPEN' | 'CLOSED',
                };
              }
              return s;
            }),
          })),
        }));
        void apiClient
          .patch(`/topics/subtopics/${subTopicId}`, {
            max_teams: newQuota,
            quota_max: newQuota,
          })
          .catch(() => {});
      },

      // Checkpoints
      checkpoints: initialCheckpoints,
      submissions: initialSubmissions,
      finalSubmissions: initialFinalSubmissions,

      addCheckpoint: (cp) => {
        const duration = cp.durationMinutes || 180;
        const startedAt = get().config.contestStartedAt;
        const baseTime = startedAt ? new Date(startedAt).getTime() : Date.now();
        const calculatedDeadline = cp.deadline || new Date(baseTime + duration * 60 * 1000).toISOString();
        const tempId = `cp-${Date.now()}`;

        const newCp: Checkpoint = {
          ...cp,
          durationMinutes: duration,
          deadline: calculatedDeadline,
          id: tempId,
        };
        set((state) => ({ checkpoints: [...state.checkpoints, newCp] }));

        void apiClient
          .post('/checkpoints', {
            title: cp.title || cp.name || 'Checkpoint mới',
            description: cp.description || '',
            deadline: calculatedDeadline,
            duration_minutes: duration,
            is_active: true,
          })
          .then((res) => {
            const created = res.data?.data;
            if (created?.id) {
              set((state) => ({
                checkpoints: state.checkpoints.map((c) =>
                  c.id === tempId ? { ...c, id: String(created.id) } : c
                ),
              }));
            }
          })
          .catch(() => {});
      },

      reorderCheckpoints: (fromIndex, toIndex) => {
        set((state) => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.checkpoints.length ||
            toIndex < 0 ||
            toIndex >= state.checkpoints.length
          ) {
            return state;
          }
          const updated = [...state.checkpoints];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          return { checkpoints: updated };
        });
      },

      sortCheckpointsByDeadline: () => {
        set((state) => ({
          checkpoints: [...state.checkpoints].sort(
            (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          ),
        }));
      },

      updateCheckpoint: (id, updates) => {
        let nextDeadline = updates.deadline;
        set((state) => ({
          checkpoints: state.checkpoints.map((c) => {
            if (c.id !== id) return c;
            const newDuration =
              updates.durationMinutes !== undefined ? updates.durationMinutes : c.durationMinutes || 180;
            const startedAt = state.config.contestStartedAt;
            const baseTime = startedAt ? new Date(startedAt).getTime() : Date.now();
            const calculatedDeadline =
              updates.deadline ||
              (updates.durationMinutes !== undefined
                ? new Date(baseTime + newDuration * 60 * 1000).toISOString()
                : c.deadline);
            nextDeadline = calculatedDeadline;

            return {
              ...c,
              ...updates,
              durationMinutes: newDuration,
              deadline: calculatedDeadline,
            };
          }),
        }));

        void apiClient
          .put(`/checkpoints/${id}`, {
            title: updates.title || updates.name,
            description: updates.description,
            deadline: nextDeadline,
          })
          .catch(() => {});
      },

      deleteCheckpoint: (id) => {
        set((state) => ({
          checkpoints: state.checkpoints.filter((c) => c.id !== id),
        }));
        void apiClient.delete(`/checkpoints/${id}`).catch(() => {});
      },

      submitCheckpoint: (checkpointId, teamId, dataOrRepoUrl, demoUrl) => {
        const commitSha = Math.random().toString(16).substring(2, 9);
        const dataObj: Partial<CheckpointSubmission> =
          typeof dataOrRepoUrl === 'string'
            ? { repoUrl: dataOrRepoUrl, demoUrl }
            : dataOrRepoUrl;

        const newSubm: CheckpointSubmission = {
          id: `subm-${Date.now()}`,
          checkpointId,
          teamId,
          commitSha,
          submittedAt: new Date().toISOString(),
          isAfterDeadline: false,
          status: 'submitted',
          ...dataObj,
        };

        set((state) => ({
          submissions: [
            ...state.submissions.filter((s) => !(s.checkpointId === checkpointId && s.teamId === teamId)),
            newSubm,
          ],
        }));

        void apiClient
          .post(`/checkpoints/${checkpointId}/submissions`, {
            checkpoint_id: checkpointId,
            repo_url: dataObj.repoUrl || '',
            demo_url: dataObj.demoUrl || '',
            note: dataObj.description || '',
          })
          .catch(() => {});

        return { success: true, commitSha };
      },

      submitFinalProject: (teamId, repoUrl, demoVideoUrl, slideUrl, summary) => {
        const commitSha = Math.random().toString(16).substring(2, 10);
        const newFinal: FinalSubmission = {
          teamId,
          repoUrl,
          demoVideoUrl,
          slideUrl,
          summary,
          commitSha,
          submittedAt: new Date().toISOString(),
          isLate: false,
          status: 'submitted',
        };

        set((state) => ({
          finalSubmissions: [
            ...state.finalSubmissions.filter((f) => f.teamId !== teamId),
            newFinal,
          ],
        }));

        void apiClient
          .post('/submissions/final', {
            team_id: teamId,
            github_url: repoUrl,
            demo_url: demoVideoUrl,
            slide_url: slideUrl,
            description: summary,
            commit_sha: commitSha,
          })
          .catch(() => {});

        return { success: true, commitSha };
      },

      // Rubrics & Evaluations
      rubricCriteria: initialRubricCriteria,
      evaluations: initialEvaluations,

      addRubricCriterion: (name, description, maxScore, weight, rebalanceMode = 'none') => {
        const existing = get().rubricCriteria;
        const newCrit: RubricCriteria = {
          id: `crit-${Date.now()}`,
          name,
          description,
          maxScore,
          weight,
          displayOrder: existing.length + 1,
        };

        if (rebalanceMode === 'equal') {
          const all = [...existing, newCrit];
          const n = all.length;
          const base = Math.floor(100 / n);
          const remainder = 100 - base * n;
          const updated = all.map((c, idx) => ({
            ...c,
            weight: idx < remainder ? base + 1 : base,
          }));
          set({ rubricCriteria: updated });
          syncRubricsToBackend(updated);
          return;
        }

        if (rebalanceMode === 'proportional' && existing.length > 0) {
          const clampedWeight = Math.min(100, Math.max(1, weight));
          newCrit.weight = clampedWeight;
          const remainingTarget = Math.max(0, 100 - clampedWeight);
          const currentSum = existing.reduce((sum, c) => sum + c.weight, 0);

          let updatedExisting: RubricCriteria[];
          if (currentSum === 0 || remainingTarget === 0) {
            updatedExisting = existing.map((c) => ({ ...c, weight: 0 }));
          } else {
            const rawWeights = existing.map((c) => (c.weight / currentSum) * remainingTarget);
            const floored = rawWeights.map((w) => Math.floor(w));
            const allocated = floored.reduce((a, b) => a + b, 0);
            const remainder = remainingTarget - allocated;

            const fractions = rawWeights.map((w, idx) => ({
              idx,
              fraction: w - floored[idx],
            }));
            fractions.sort((a, b) => b.fraction - a.fraction);

            const finalWeights = [...floored];
            for (let i = 0; i < remainder; i++) {
              finalWeights[fractions[i].idx] += 1;
            }

            updatedExisting = existing.map((c, idx) => ({
              ...c,
              weight: Math.max(1, finalWeights[idx]),
            }));
          }

          const updated = [...updatedExisting, newCrit];
          set({ rubricCriteria: updated });
          syncRubricsToBackend(updated);
          return;
        }

        // Default 'none': append directly
        const updated = [...existing, newCrit];
        set({ rubricCriteria: updated });
        syncRubricsToBackend(updated);
      },

      rebalanceRubricWeights: (mode: 'equal' | 'proportional') => {
        const criteria = get().rubricCriteria;
        const n = criteria.length;
        if (n === 0) return;

        if (mode === 'equal') {
          const base = Math.floor(100 / n);
          const remainder = 100 - base * n;
          const updated = criteria.map((c, idx) => ({
            ...c,
            weight: idx < remainder ? base + 1 : base,
          }));
          set({ rubricCriteria: updated });
          syncRubricsToBackend(updated);
          return;
        }

        // Proportional normalization to exactly 100%
        const currentSum = criteria.reduce((sum, c) => sum + c.weight, 0);
        if (currentSum === 0) {
          get().rebalanceRubricWeights('equal');
          return;
        }

        const rawWeights = criteria.map((c) => (c.weight / currentSum) * 100);
        const floored = rawWeights.map((w) => Math.floor(w));
        const allocated = floored.reduce((a, b) => a + b, 0);
        const remainder = 100 - allocated;

        const fractions = rawWeights.map((w, idx) => ({
          idx,
          fraction: w - floored[idx],
        }));
        fractions.sort((a, b) => b.fraction - a.fraction);

        const finalWeights = [...floored];
        for (let i = 0; i < remainder; i++) {
          finalWeights[fractions[i].idx] += 1;
        }

        const updated = criteria.map((c, idx) => ({
          ...c,
          weight: Math.max(1, finalWeights[idx]),
        }));
        set({ rubricCriteria: updated });
        syncRubricsToBackend(updated);
      },

      updateRubricCriterion: (id, updates) => {
        const updated = get().rubricCriteria.map((c) => (c.id === id ? { ...c, ...updates } : c));
        set({ rubricCriteria: updated });
        syncRubricsToBackend(updated);
      },

      deleteRubricCriterion: (id) => {
        const updated = get().rubricCriteria.filter((c) => c.id !== id);
        set({ rubricCriteria: updated });
        syncRubricsToBackend(updated);
      },

      saveEvaluation: (
        teamId,
        judgeId,
        judgeName,
        scoresMap,
        generalComment,
        isDraft,
        criteriaComments,
        skipBackendSync,
      ) => {
        const criteria = get().rubricCriteria;
        const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0) || 100;
        let weightedSum = 0;

        const details = criteria.map((c) => {
          const rawScore = scoresMap[c.id] !== undefined ? scoresMap[c.id] : 0;
          const max = c.maxScore > 0 ? c.maxScore : 10;
          const clamped = Math.max(0, Math.min(rawScore, max));
          // Normalized weighted contribution: (clamped / max) * weight
          const weightedContrib = (clamped / max) * c.weight;
          weightedSum += weightedContrib;
          return {
            criteriaId: c.id,
            score: clamped,
            comment: criteriaComments?.[c.id] || undefined,
          };
        });

        // Exact 100-point scale: (weightedSum / totalWeight) * 100
        const totalScore = Math.round(((weightedSum / totalWeight) * 100) * 10) / 10;

        const evalRecord: TeamEvaluation = {
          id: `eval-${teamId}-${judgeId}`,
          teamId,
          judgeId,
          judgeName,
          totalScore,
          scores: scoresMap,
          generalComment,
          isDraft,
          confirmedAt: isDraft ? undefined : new Date().toISOString(),
          details,
        };

        set((state) => ({
          evaluations: [
            ...state.evaluations.filter((e) => !(e.teamId === teamId && e.judgeId === judgeId)),
            evalRecord,
          ],
        }));

        if (!skipBackendSync) {
          void apiClient
            .post('/evaluations', {
              submission_id: teamId,
              team_id: teamId,
              status: isDraft ? 'draft' : 'submitted',
              general_comment: generalComment,
              evaluations: details.map((d) => ({
                criteria_id: d.criteriaId,
                score: d.score,
                comment: d.comment || '',
              })),
            })
            .catch(() => {});
        }
      },

      // Tickets
      tickets: initialSupportTickets,
      createTicket: (title, description, priority, category) => {
        const user = get().currentUser;
        const team = get().teams.find((t) => t.id === user.teamId) || get().teams[0];
        const nextNum = get().tickets.length + 1;
        const ticketCode = `TK-${String(nextNum).padStart(2, '0')}`;

        const newTicket: SupportTicket = {
          id: `tk-${Date.now()}`,
          ticketCode,
          teamId: team.id,
          teamName: team.name,
          creatorId: user.id,
          creatorName: user.fullName,
          senderId: user.id,
          senderName: user.fullName,
          title,
          description,
          content: description,
          category: category || 'technical',
          priority: priority || 'normal',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          replies: [],
          messages: [
            {
              id: `msg-${Date.now()}`,
              senderId: user.id,
              senderName: user.fullName,
              senderRole: user.role,
              content: description,
              sentAt: new Date().toISOString(),
            },
          ],
        };

        set((state) => ({ tickets: [newTicket, ...state.tickets] }));
        return { success: true, ticket: newTicket };
      },

      claimTicket: (ticketId) => {
        const mentor = get().currentUser;
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'in_progress',
                  mentorId: mentor.id,
                  mentorName: mentor.fullName,
                  assignedMentorId: mentor.id,
                  assignedMentorName: mentor.fullName,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      replyTicket: (ticketId, content) => {
        const user = get().currentUser;
        const newMsg = {
          id: `msg-${Date.now()}`,
          senderId: user.id,
          senderName: user.fullName,
          senderRole: user.role,
          content,
          sentAt: new Date().toISOString(),
        };
        const newReply = {
          id: `rep-${Date.now()}`,
          authorName: user.fullName,
          authorRole: user.role,
          content,
          createdAt: new Date().toLocaleTimeString('vi-VN'),
        };

        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: [...(t.messages || []), newMsg],
                  replies: [...(t.replies || []), newReply],
                }
              : t
          ),
        }));
      },

      resolveTicket: (ticketId, responseText) => {
        const finalResp =
          responseText || 'Vấn đề đã được hỗ trợ và giải quyết hoàn tất.';
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'resolved',
                  response: responseText || t.response || finalResp,
                  resolvedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      closeTicket: (ticketId) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'closed',
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      reopenTicket: (ticketId) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'in_progress',
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      cancelTicket: (ticketId) => {
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== ticketId),
        }));
      },

      // Announcements
      announcements: initialAnnouncements,
      addAnnouncement: (title, content, isPinned = false) => {
        const tempId = `ann-${Date.now()}`;
        const newAnn: Announcement = {
          id: tempId,
          title,
          content,
          sender: get().currentUser.fullName,
          author: get().currentUser.fullName,
          createdAt: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'),
          publishedAt: new Date().toISOString(),
          isPinned,
        };
        set((state) => ({ announcements: [newAnn, ...state.announcements] }));
        void apiClient
          .post('/announcements', {
            title,
            content,
            is_pinned: isPinned,
            priority: 'info',
            target_audience: 'all',
          })
          .then((res) => {
            const payload = (res.data as { data?: { id?: string }; id?: string })?.data ?? res.data;
            const realId = (payload as { id?: string })?.id;
            if (realId) {
              set((state) => ({
                announcements: state.announcements.map((a) => (a.id === tempId ? { ...a, id: String(realId) } : a)),
              }));
            }
          })
          .catch(() => {});
      },

      broadcastAnnouncement: (
        title,
        content,
        targetRole = 'all',
        priority = 'info',
        skipBackendSync = false,
      ) => {
        const tempId = `ann-${Date.now()}`;
        const newAnn: Announcement = {
          id: tempId,
          title,
          content,
          sender: get().currentUser.fullName,
          author: get().currentUser.fullName,
          targetRole,
          createdAt: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'),
          publishedAt: new Date().toISOString(),
          isPinned: false,
        };
        set((state) => ({ announcements: [newAnn, ...state.announcements] }));
        if (!skipBackendSync) {
          void apiClient
            .post('/announcements', {
              title,
              content,
              is_pinned: false,
              priority,
              target_audience: targetRole || 'all',
            })
            .then((res) => {
              const payload = (res.data as { data?: { id?: string }; id?: string })?.data ?? res.data;
              const realId = (payload as { id?: string })?.id;
              if (realId) {
                set((state) => ({
                  announcements: state.announcements.map((a) => (a.id === tempId ? { ...a, id: String(realId) } : a)),
                }));
              }
            })
            .catch(() => {});
        }
      },

      deleteAnnouncement: (id) => {
        set((state) => ({ announcements: state.announcements.filter((a) => a.id !== id) }));
        void apiClient.delete(`/announcements/${id}`).catch(() => {});
      },

      syncFromBackend: async () => {
        const unwrap = (raw: unknown): unknown =>
          raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
            ? (raw as { data: unknown }).data
            : raw;

        const authUserNow = useAuthStore.getState?.()?.user;
        const roleNow: string = authUserNow?.role || get().currentUser.role || get().activeRolePersona;
        const approvalNow = authUserNow?.approvalStatus || get().currentUser.approvalStatus;
        const [
          topicsRes,
          checkpointsRes,
          rubricsRes,
          annRes,
          teamsRes,
          ticketsRes,
          submissionsRes,
          judgeSubmRes,
          configRes,
          meRes,
          pendingCandidatesRes,
          whitelistRes,
        ] = await Promise.allSettled([
          apiClient.get('/topics'),
          apiClient.get('/checkpoints'),
          apiClient.get('/rubrics'),
          notificationsApi.listAllAnnouncements().then((items) => ({ data: { data: items } })),
          roleNow === 'judge' ? Promise.resolve({ data: null }) : apiClient.get('/teams'),
          roleNow === 'admin' || roleNow === 'mentor'
            ? apiClient.get('/tickets')
            : (roleNow === 'candidate' || roleNow === 'leader' || roleNow === 'member') &&
                approvalNow === 'approved'
              ? apiClient.get('/tickets/me')
              : Promise.resolve({ data: null }),
          roleNow === 'judge' ? Promise.resolve({ data: null }) : apiClient.get('/submissions'),
          roleNow === 'judge' || roleNow === 'admin'
            ? apiClient.get('/evaluations/submissions')
            : Promise.resolve({ data: null }),
          apiClient.get('/config'),
          apiClient.get('/auth/me'),
          roleNow === 'admin'
            ? apiClient.get('/admin/candidates/pending')
            : Promise.resolve({ data: null }),
          roleNow === 'admin'
            ? apiClient.get('/admin/whitelist?include_inactive=true')
            : Promise.resolve({ data: null }),
        ]);

        if (useAuthStore.getState().user?.id !== authUserNow?.id) return;
        const updates: Partial<MockStoreState> = {};

        if (topicsRes.status === 'fulfilled') {
          const topicsArr = unwrap(topicsRes.value.data);
          if (Array.isArray(topicsArr)) {
            updates.majorTopics = (topicsArr as Array<Record<string, unknown>>).map((t) => ({
              id: String(t.id),
              name: String(t.title ?? t.name ?? ''),
              description: String(t.description ?? ''),
              subTopics: Array.isArray(t.subtopics)
                ? (t.subtopics as Array<Record<string, unknown>>).map((s) => ({
                    id: String(s.id),
                    majorTopicId: String(t.id),
                    title: String(s.title ?? s.name ?? ''),
                    name: String(s.title ?? s.name ?? ''),
                    mentorId: s.mentor_id ? String(s.mentor_id) : undefined,
                    mentorName: s.mentor_name ? String(s.mentor_name) : undefined,
                    description: String(s.description ?? ''),
                    maxTeamsQuota: Number(s.max_teams ?? s.maxTeamsQuota ?? 5),
                    currentTeams: Number(s.current_teams ?? s.currentTeams ?? 0),
                  }))
                : [],
            }));
          }
        }

        if (checkpointsRes.status === 'fulfilled') {
          const cpArr = unwrap(checkpointsRes.value.data);
          if (Array.isArray(cpArr)) {
            const now = Date.now();
            updates.checkpoints = (cpArr as Array<Record<string, unknown>>).map((cp, idx) => {
              const deadlineStr = String(cp.deadline ?? new Date().toISOString());
              const startStr = String(cp.start_time ?? deadlineStr);
              const deadlineMs = new Date(deadlineStr).getTime();
              const startMs = new Date(startStr).getTime();
              let status: 'upcoming' | 'open' | 'closed' = 'open';
              if (now > deadlineMs) status = 'closed';
              else if (now < startMs) status = 'upcoming';

              return {
                id: String(cp.id),
                checkpointNumber: Number(
                  cp.checkpoint_number ??
                    cp.order ??
                    (typeof cp.display_order === 'number' ? Number(cp.display_order) + 1 : idx + 1)
                ),
                isFinalCheckpoint: Boolean(cp.is_final_checkpoint),
                title: String(cp.title ?? ''),
                description: String(cp.description ?? ''),
                deadline: deadlineStr,
                durationMinutes: Math.max(1, Math.round((deadlineMs - startMs) / 60000)),
                weight: Number(cp.weight ?? 0),
                startTime: startStr,
                status,
              };
            });
          }
        }

        if (rubricsRes.status === 'fulfilled') {
          const rubricsObj = unwrap(rubricsRes.value.data) as { criteria?: Array<Record<string, unknown>> } | null;
          if (Array.isArray(rubricsObj?.criteria)) {
            updates.rubricCriteria = rubricsObj.criteria.map((c, idx) => {
              const rawWeight = Number(c.weight ?? 25);
              return {
                id: String(c.id),
                name: String(c.name ?? c.title ?? ''),
                description: String(c.description ?? ''),
                maxScore: Number(c.max_score ?? c.maxScore ?? 10),
                weight: rawWeight > 0 && rawWeight <= 1 ? Math.round(rawWeight * 100) : rawWeight,
                displayOrder: Number(c.display_order ?? c.displayOrder ?? idx + 1),
              };
            });
          }
        }

        if (annRes.status === 'fulfilled') {
          const annArr = unwrap(annRes.value.data);
          if (Array.isArray(annArr)) {
            updates.announcements = (annArr as Array<Record<string, unknown>>).map((a) => ({
              id: String(a.id),
              title: String(a.title ?? ''),
              content: String(a.content ?? ''),
              sender: String(a.sender_name ?? 'Ban Tổ Chức'),
              author: String(a.sender_name ?? 'Ban Tổ Chức'),
              targetRole: (String(a.targetRole ?? 'all') as Announcement['targetRole']),
              priority: String(a.priority ?? 'info') as Announcement['priority'],
              createdAt: a.created_at
                ? new Date(String(a.created_at)).toLocaleTimeString('vi-VN') +
                  ' - ' +
                  new Date(String(a.created_at)).toLocaleDateString('vi-VN')
                : '',
              publishedAt: String(a.created_at ?? new Date().toISOString()),
              isPinned: Boolean(a.is_pinned),
            }));
          }
        }

        if (teamsRes.status === 'fulfilled') {
          const teamsArr = unwrap(teamsRes.value.data);
          if (Array.isArray(teamsArr)) {
            const mappedTeams: Team[] = (teamsArr as Array<Record<string, unknown>>).map((t) => {
              const membersRaw = Array.isArray(t.members) ? (t.members as Array<Record<string, unknown>>) : [];
              const members: TeamMember[] = membersRaw.map((m) => {
                const uid = String(m.user_id ?? m.userId ?? m.id ?? '');
                return {
                  id: uid,
                  userId: uid,
                  fullName: String(m.full_name ?? m.fullName ?? ''),
                  email: String(m.email ?? ''),
                  roleInTeam: (String(m.role ?? m.role_in_team ?? '').toLowerCase() === 'leader'
                    ? 'leader'
                    : 'member') as 'leader' | 'member',
                  githubUsername: m.github_username ? String(m.github_username) : undefined,
                  joinedAt: String(m.joined_at ?? new Date().toISOString()),
                };
              });
              const leaderMem =
                members.find((m) => m.roleInTeam === 'leader') || members[0];
              const rawApproval = String(t.approval_status ?? '').toLowerCase();
              const rawStatus = String(rawApproval || t.status || 'approved').toLowerCase();
              const status: Team['status'] =
                rawStatus === 'rejected'
                  ? 'rejected'
                  : rawStatus === 'approved' || rawStatus === 'valid' || rawStatus === 'locked'
                    ? 'approved'
                    : 'pending';
              const approvalStatus: Team['approvalStatus'] =
                rawStatus === 'rejected'
                  ? 'rejected'
                  : rawStatus === 'approved' || rawStatus === 'valid' || rawStatus === 'locked'
                    ? 'approved'
                    : 'pending';
              const resolvedSubOrTopicId =
                t.subtopic_id ?? t.selected_subtopic_id ?? t.topic_id ?? t.selected_topic_id;
              const resolvedTopicName =
                t.topic_name ?? t.selected_subtopic_title ?? t.selected_topic_title;
              return {
                id: String(t.id),
                name: String(t.team_name ?? t.name ?? ''),
                description: String(t.description ?? ''),
                inviteCode: String(t.invite_code ?? ''),
                leaderId: String(t.leader_id ?? t.created_by ?? leaderMem?.userId ?? ''),
                leaderName: String(t.leader_name ?? t.leaderName ?? leaderMem?.fullName ?? 'Đội trưởng'),
                subTopicId: resolvedSubOrTopicId ? String(resolvedSubOrTopicId) : undefined,
                topicId: resolvedSubOrTopicId ? String(resolvedSubOrTopicId) : undefined,
                topicName: resolvedTopicName ? String(resolvedTopicName) : undefined,
                status,
                approvalStatus,
                rejectionReason: t.rejection_reason ? String(t.rejection_reason) : undefined,
                memberCount: Number(t.member_count ?? members.length),
                maxMembers: Number(t.max_members),
                minMembers: Number(t.min_members),
                createdAt: String(t.created_at ?? new Date().toISOString()),
                members,
              };
            });
            updates.teams = mappedTeams;

            const currUser = get().currentUser;
            const matchedTeam = mappedTeams.find((t) =>
              t.members.some(
                (m) =>
                  m.userId === currUser.id ||
                  (currUser.email && m.email.toLowerCase() === currUser.email.toLowerCase())
              )
            );
            if (!matchedTeam) {
              updates.currentUser = { ...currUser, teamId: undefined, roleInTeam: undefined };
            }
            if (matchedTeam) {
              const matchedMember = matchedTeam.members.find(
                (m) =>
                  m.userId === currUser.id ||
                  (currUser.email && m.email.toLowerCase() === currUser.email.toLowerCase())
              );
              updates.currentUser = {
                ...currUser,
                id: matchedMember?.userId || currUser.id,
                teamId: matchedTeam.id,
                roleInTeam: matchedMember?.roleInTeam || 'member',
              };
            }
          }
        }

        if (ticketsRes.status === 'fulfilled') {
          const tkRaw = unwrap(ticketsRes.value.data);
          const tkArr = Array.isArray(tkRaw)
            ? tkRaw
            : tkRaw && typeof tkRaw === 'object' && Array.isArray((tkRaw as { items?: unknown[] }).items)
              ? (tkRaw as { items: unknown[] }).items
              : null;
          if (Array.isArray(tkArr)) {
            const knownTeams = updates.teams || get().teams;
            updates.tickets = (tkArr as Array<Record<string, unknown>>).map((tk, idx) => {
              const teamId = String(tk.team_id ?? tk.teamId ?? '');
              const creatorId = String(tk.created_by ?? tk.user_id ?? tk.creatorId ?? '');
              const matchedTeam = knownTeams.find((t) => t.id === teamId);
              const matchedMember = matchedTeam?.members.find(
                (m) => m.userId === creatorId || m.id === creatorId
              );
              const resolvedTeamName = String(
                tk.team_name ?? tk.teamName ?? matchedTeam?.name ?? 'Đội thi'
              );
              const resolvedCreatorName = String(
                tk.creator_name ??
                  tk.creatorName ??
                  tk.sender_name ??
                  matchedMember?.fullName ??
                  matchedTeam?.leaderName ??
                  'Thí sinh'
              );
              return {
              id: String(tk.id),
              ticketCode: String(tk.ticket_code ?? `TK-${String(idx + 1).padStart(2, '0')}`),
              teamId,
              teamName: resolvedTeamName,
              creatorId,
              creatorName: resolvedCreatorName,
              senderId: creatorId,
              senderName: resolvedCreatorName,
              title: String(tk.title ?? ''),
              description: String(tk.description ?? tk.content ?? ''),
              content: String(tk.description ?? tk.content ?? ''),
              category: (String(tk.category ?? 'technical') as SupportTicket['category']) || 'technical',
              priority: (String(tk.priority ?? 'normal') as SupportTicket['priority']) || 'normal',
              status: (String(tk.status ?? 'open') as SupportTicket['status']) || 'open',
              mentorId: tk.assigned_to ? String(tk.assigned_to) : undefined,
              mentorName: tk.assignee_name ? String(tk.assignee_name) : undefined,
              assignedMentorId: tk.assigned_to ? String(tk.assigned_to) : undefined,
              assignedMentorName: tk.assignee_name ? String(tk.assignee_name) : undefined,
              response: (tk.response ?? tk.resolution_note) ? String(tk.response ?? tk.resolution_note) : undefined,
              createdAt: String(tk.created_at ?? new Date().toISOString()),
              resolvedAt: tk.resolved_at ? String(tk.resolved_at) : undefined,
                updatedAt: String(tk.updated_at ?? tk.created_at ?? new Date().toISOString()),
              replies: Array.isArray(tk.messages)
                ? (tk.messages as Array<Record<string, unknown>>).map((m, mIdx) => ({
                    id: String(m.id ?? `rep-${mIdx}`),
                    authorName: String(m.senderName ?? m.sender_name ?? 'Thành viên'),
                    authorRole: (String(m.senderRole ?? m.sender_role ?? 'candidate') as NonNullable<SupportTicket['replies']>[number]['authorRole']),
                    content: String(m.content ?? ''),
                    createdAt: String(m.sentAt ?? m.created_at ?? ''),
                  }))
                : [],
              messages: Array.isArray(tk.messages)
                ? (tk.messages as Array<Record<string, unknown>>).map((m, mIdx) => ({
                    id: String(m.id ?? `msg-${mIdx}`),
                    senderId: String(m.senderId ?? m.sender_id ?? ''),
                    senderName: String(m.senderName ?? m.sender_name ?? 'Thành viên'),
                    senderRole: (String(m.senderRole ?? m.sender_role ?? 'candidate') as NonNullable<SupportTicket['messages']>[number]['senderRole']),
                    content: String(m.content ?? ''),
                    sentAt: String(m.sentAt ?? m.created_at ?? new Date().toISOString()),
                  }))
                : [],
              };
            });
          }
        }

        if (submissionsRes.status === 'fulfilled') {
          const subArr = unwrap(submissionsRes.value.data);
          if (Array.isArray(subArr)) {
            const mappedSubs: CheckpointSubmission[] = [];
            const mappedFinals: FinalSubmission[] = [];
            for (const raw of subArr as Array<Record<string, unknown>>) {
              const subData =
                raw.submission_data && typeof raw.submission_data === 'object'
                  ? (raw.submission_data as Record<string, unknown>)
                  : {};
              const repoUrl = String(raw.repo_url ?? subData.repo_url ?? subData.github_url ?? '');
              const demoUrl = String(raw.demo_url ?? subData.demo_url ?? '');
              const slideUrl = String(subData.slide_url ?? subData.presentation_url ?? '');
              const note = String(raw.note ?? subData.note ?? subData.description ?? '');
              const teamId = String(raw.team_id ?? '');
              const cpId = String(raw.checkpoint_id ?? '');
              const submittedAt = String(raw.submitted_at ?? new Date().toISOString());
              const commitSha = String(raw.commit_sha ?? '');

              mappedSubs.push({
                id: String(raw.id),
                checkpointId: cpId,
                teamId,
                repoUrl,
                demoUrl,
                description: note,
                commitSha,
                submittedAt,
                isAfterDeadline: Boolean(raw.grace_period_applied),
                status: 'submitted',
              });

              if ((updates.checkpoints || get().checkpoints).some((cp) => cp.id === cpId && cp.isFinalCheckpoint) && raw.status === 'submitted') {
                mappedFinals.push({
                  teamId,
                  repoUrl,
                  demoVideoUrl: demoUrl,
                  slideUrl,
                  summary: note,
                  commitSha,
                  submittedAt,
                  isLate: Boolean(raw.grace_period_applied),
                  status: 'submitted',
                });
              }
            }
            updates.submissions = mappedSubs;
            updates.finalSubmissions = mappedFinals;
          }
        }

        if (judgeSubmRes.status === 'fulfilled' && judgeSubmRes.value.data) {
          const jRaw = unwrap(judgeSubmRes.value.data) as { submissions?: Array<Record<string, unknown>> } | null;
          if (Array.isArray(jRaw?.submissions)) {
            if (roleNow === 'judge') {
              updates.teams = jRaw.submissions.map((sub) => ({
                id: String(sub.submission_id), name: String(sub.team_name ?? sub.anonymous_team_code),
                description: String(sub.topic_title ?? ''), inviteCode: '', leaderId: '',
                status: 'approved', members: [], createdAt: String(sub.submitted_at ?? ''),
              }));
              updates.finalSubmissions = jRaw.submissions.map((sub) => ({
                teamId: String(sub.submission_id), repoUrl: String(sub.repo_url ?? ''),
                demoVideoUrl: String(sub.demo_url ?? ''), slideUrl: String(sub.slide_url ?? ''),
                summary: String(sub.note ?? ''), commitSha: String(sub.commit_sha ?? ''),
                submittedAt: String(sub.submitted_at ?? ''), status: 'submitted',
              }));
              updates.submissions = [];
            }
            const currJudge = get().currentUser;
            const knownSubs = updates.submissions || get().submissions;
            const mappedEvals: TeamEvaluation[] = [];
            for (const js of jRaw.submissions) {
              const evalStatus = String(js.evaluation_status ?? 'not_started');
              if (evalStatus === 'not_started') continue;
              const subId = String(js.submission_id ?? '');
              const matchedSub = knownSubs.find(
                (s) => s.id === subId || (js.repo_url && s.repoUrl === String(js.repo_url))
              );
              const resolvedTeamId = roleNow === 'judge' ? subId : matchedSub?.teamId || subId;
              const rawEvals = Array.isArray(js.my_evaluations)
                ? (js.my_evaluations as Array<Record<string, unknown>>)
                : [];
              const scoresMap: Record<string, number> = {};
              const details: Array<{ criteriaId: string; score: number; comment?: string }> = [];
              for (const ev of rawEvals) {
                const cid = String(ev.criteria_id ?? '');
                const sc = Number(ev.score ?? 0);
                if (cid) {
                  scoresMap[cid] = sc;
                  details.push({
                    criteriaId: cid,
                    score: sc,
                    comment: ev.comment ? String(ev.comment) : undefined,
                  });
                }
              }
              const generalComment = String(
                js.my_general_comment ??
                  rawEvals.find((ev) => ev.general_comment)?.general_comment ??
                  rawEvals.find((ev) => ev.comment)?.comment ??
                  js.note ??
                  ''
              );
              mappedEvals.push({
                id: `eval-${resolvedTeamId}-${currJudge.id}`,
                teamId: resolvedTeamId,
                judgeId: currJudge.id,
                judgeName: currJudge.fullName,
                totalScore: Number(js.my_total_score ?? 0),
                scores: scoresMap,
                generalComment,
                isDraft: evalStatus === 'draft',
                confirmedAt: evalStatus === 'submitted' ? String(js.submitted_at ?? new Date().toISOString()) : undefined,
                details,
              });
            }
            if (roleNow === 'judge') {
              updates.evaluations = mappedEvals;
            } else if (mappedEvals.length > 0) {
              const existingOtherEvals = get().evaluations.filter(
                (e) =>
                  !mappedEvals.some(
                    (me) => me.teamId === e.teamId && me.judgeId === e.judgeId
                  )
              );
              updates.evaluations = [...existingOtherEvals, ...mappedEvals];
            }
          }
        }

        if (meRes.status === 'fulfilled' && meRes.value.data) {
          const meObj = unwrap(meRes.value.data) as Record<string, unknown> | null;
          if (meObj && typeof meObj === 'object' && meObj.email) {
            const baseUser = updates.currentUser || get().currentUser;
            if (
              !baseUser.email ||
              String(meObj.email).toLowerCase() === baseUser.email.toLowerCase()
            ) {
              const syncedUser: User = {
                ...baseUser,
                id: String(meObj.id ?? baseUser.id),
                role: (meObj.role as User['role']) || baseUser.role,
                approvalStatus: (meObj.approval_status as User['approvalStatus']) || baseUser.approvalStatus,
                fullName: String(meObj.full_name ?? baseUser.fullName),
                studentId: meObj.student_id ? String(meObj.student_id) : baseUser.studentId,
                university: meObj.school ? String(meObj.school) : baseUser.university,
                school: meObj.school ? String(meObj.school) : baseUser.school,
                phone: meObj.phone ? String(meObj.phone) : baseUser.phone,
                skills: Array.isArray(meObj.skills)
                  ? (meObj.skills as string[])
                  : baseUser.skills,
                bio: meObj.bio ? String(meObj.bio) : baseUser.bio,
                githubUsername: meObj.github_username
                  ? String(meObj.github_username)
                  : baseUser.githubUsername,
              };
              updates.currentUser = syncedUser;
              if (typeof meObj.onboarding_completed === 'boolean') {
                updates.onboardingCompletedUsers = {
                  ...get().onboardingCompletedUsers,
                  [syncedUser.id]: meObj.onboarding_completed,
                };
              }
              if (typeof meObj.pledged === 'boolean') {
                updates.pledgedUsers = {
                  ...get().pledgedUsers,
                  [syncedUser.id]: meObj.pledged,
                };
              }
              const authPatch = {
                id: syncedUser.id,
                fullName: syncedUser.fullName,
                studentId: syncedUser.studentId,
                university: syncedUser.university,
                school: syncedUser.school,
                phone: syncedUser.phone,
                skills: syncedUser.skills,
                bio: syncedUser.bio,
                githubUsername: syncedUser.githubUsername,
              };
              const auth = useAuthStore.getState();
              if (auth.user && Object.entries(authPatch).some(([key, value]) => JSON.stringify(auth.user?.[key as keyof User]) !== JSON.stringify(value))) {
                auth.updateUser(authPatch);
              }
            }
          }
        }

        if (configRes.status === 'fulfilled' && configRes.value.data) {
          const cfgObj = unwrap(configRes.value.data) as Record<string, unknown> | null;
          if (cfgObj && typeof cfgObj === 'object') {
            const currCfg = get().config;
            const phaseMap: Record<string, string> = {
              registration: 'Giai đoạn 1: Mở đăng ký & Thành lập Đội thi',
              team_formation: 'Giai đoạn 2: Thành lập Đội thi & Chọn Đề tài',
              hacking: 'Giai đoạn 3: Thực thi dự án và Nộp bài các chặng',
              judging: 'Giai đoạn 4: Chấm điểm Độc lập & Bảo vệ Chung kết',
              completed: 'Giai đoạn 5: Công bố Kết quả & Vinh danh Chung cuộc',
            };
            const rawPhaseStr = String(cfgObj.currentPhase ?? cfgObj.status ?? currCfg.currentPhase);
            const mappedPhase = phaseMap[rawPhaseStr.toLowerCase()] || rawPhaseStr;
            const minMembersVal = Math.max(
              1,
              Number(cfgObj.minTeamMembers ?? cfgObj.minTeamSize ?? currCfg.minTeamMembers ?? currCfg.minTeamSize ?? 3),
            );
            const maxMembersVal = Math.max(
              minMembersVal,
              Number(cfgObj.maxTeamMembers ?? cfgObj.maxTeamSize ?? currCfg.maxTeamMembers ?? currCfg.maxTeamSize ?? 5),
            );
            updates.config = {
              ...currCfg,
              name: String(cfgObj.name ?? cfgObj.eventName ?? currCfg.name),
              currentPhase: mappedPhase,
              isContestStarted: cfgObj.status === 'hacking' || mappedPhase.includes('Giai đoạn 3'),
              contestStart: String(cfgObj.start_time ?? ''),
              contestEnd: String(cfgObj.end_time ?? ''),
              blindJudging: Boolean(cfgObj.blindJudgingEnabled ?? currCfg.blindJudging),
              blindJudgingMode: Boolean(cfgObj.blindJudgingEnabled ?? currCfg.blindJudgingMode),
              resultsPublished: Boolean(cfgObj.is_result_published ?? cfgObj.leaderboardPublished ?? currCfg.resultsPublished),
              minTeamSize: minMembersVal,
              minTeamMembers: minMembersVal,
              maxTeamSize: maxMembersVal,
              maxTeamMembers: maxMembersVal,
              finalSubmissionDeadline: String(cfgObj.end_time ?? cfgObj.endAt ?? currCfg.finalSubmissionDeadline),
            };
          }
        }

        if (pendingCandidatesRes.status === 'fulfilled' && pendingCandidatesRes.value.data) {
          const pendingList = unwrap(pendingCandidatesRes.value.data);
          if (Array.isArray(pendingList)) {
            updates.pendingCandidates = (pendingList as Array<Record<string, unknown>>).map((c) => ({
              id: String(c.id ?? ''),
              email: String(c.email ?? ''),
              fullName: String(c.full_name ?? c.github_username ?? c.email ?? ''),
              role: 'candidate' as const,
              approvalStatus: 'pending' as const,
              githubUsername: c.github_username ? String(c.github_username) : undefined,
              avatarUrl: c.avatar_url ? String(c.avatar_url) : undefined,
              studentId: c.student_id ? String(c.student_id) : undefined,
              university: c.school ? String(c.school) : undefined,
              school: c.school ? String(c.school) : undefined,
              phone: c.phone ? String(c.phone) : undefined,
              skills: Array.isArray(c.skills) ? (c.skills as string[]) : undefined,
            }));
          }
        }

        if (whitelistRes.status === 'fulfilled' && whitelistRes.value.data) {
          const wlList = unwrap(whitelistRes.value.data);
          if (Array.isArray(wlList)) {
            updates.whitelist = (wlList as Array<Record<string, unknown>>).map((w) => ({
              id: String(w.id ?? ''),
              email: String(w.email ?? ''),
              note: w.note ? String(w.note) : undefined,
              isActive: Boolean(w.is_active ?? true),
              addedAt: typeof w.created_at === 'string' && w.created_at.length >= 10
                ? w.created_at.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            }));
          }
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },

      // Reset
      resetAllMockData: () => {
        set({
          currentUser: useAuthStore.getState().user || emptyUser,
          activeRolePersona: 'admin',
          isAuthenticated: false,
          config: initialHackathonConfig,
          whitelist: initialWhitelist,
          pendingCandidates: initialPendingCandidates,
          majorTopics: initialMajorTopics,
          teams: initialTeams,
          checkpoints: initialCheckpoints,
          submissions: initialSubmissions,
          finalSubmissions: initialFinalSubmissions,
          rubricCriteria: initialRubricCriteria,
          evaluations: initialEvaluations,
          tickets: initialSupportTickets,
          announcements: initialAnnouncements,
          isWizardOpen: false,
          wizardStep: 1,
          onboardingCompletedUsers: {},
          pledgedUsers: {},
        });
      },
    }),
    {
      name: 'hackflow-ui-preferences-v2',
      partialize: (state) => ({ onboardingCompletedUsers: state.onboardingCompletedUsers, pledgedUsers: state.pledgedUsers }),
      merge: (saved, current) => ({ ...current, ...(saved as Pick<MockStoreState, 'onboardingCompletedUsers' | 'pledgedUsers'>) }),
    }
  )
);

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) {
    useMockStore.setState({
      currentUser: state.user || emptyUser,
      isAuthenticated: state.isAuthenticated,
      teams: [], submissions: [], finalSubmissions: [], evaluations: [], tickets: [],
      announcements: [], whitelist: [], pendingCandidates: [],
    });
  }
});
