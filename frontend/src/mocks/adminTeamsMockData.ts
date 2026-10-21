import type { Team } from '../types';

export interface EnrichedAdminTeam extends Team {
  university: string;
  leaderEmail: string;
  majorTopicId: string;
  repoUrl?: string;
  latestCommitSha?: string;
  checkpointsCompleted: number;
  totalCheckpoints: number;
  averageScore?: number | null;
}

export const ADMIN_TEAMS_MOCK_DATA: EnrichedAdminTeam[] = [];
