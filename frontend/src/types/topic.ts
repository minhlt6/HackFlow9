export type TopicStatus = 'AVAILABLE' | 'FULL' | 'CLOSED';

export interface Subtopic {
  id: string;
  topic_id: string;
  mentor_id?: string | null;
  mentor_name?: string | null;
  title: string;
  description?: string | null;
  max_teams: number;
  current_teams: number;
  remaining_slots: number;
  is_active: boolean;
}

export interface Topic {
  id: string;
  title: string;
  description?: string | null;
  max_teams: number;
  current_teams: number;
  remaining_slots: number;
  is_active: boolean;
  status: TopicStatus | string;
  subtopics: Subtopic[];
}

export interface TopicSelectPayload {
  topic_id: string;
  subtopic_id?: string | null;
}

export interface TopicCancelPayload {
  team_id?: string | null;
}

export interface TopicSelectResponse {
  team_id: string;
  topic_id: string;
  subtopic_id?: string | null;
  topic_title: string;
  remaining_slots: number;
}

export interface TopicCancelResponse {
  team_id: string;
  cancelled: boolean;
}
