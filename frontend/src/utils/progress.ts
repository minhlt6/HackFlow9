/** A received row is not necessarily a completed checkpoint. */
export function isCompletedSubmission(status?: string | null): boolean {
  return ['submitted', 'evaluated', 'late'].includes((status || '').toLowerCase());
}

export function isUnassignedTicket(ticket: { status: string; assignedMentorId?: string | null }): boolean {
  return ticket.status === 'open' && !ticket.assignedMentorId;
}

export function getCheckpointCompletionStats(
  checkpointId: string,
  submissions: Array<{ checkpointId: string; teamId: string; status?: string | null }>,
  teams: Array<{ id: string; status?: string | null; approvalStatus?: string | null }>,
  checkpointStatus?: string | null
): { completedTeamsCount: number; approvedTeamsCount: number; completionPercent: number } {
  const approvedTeamIds = new Set(
    teams
      .filter(
        (t) =>
          String(t.status || '').toLowerCase() === 'approved' ||
          String(t.approvalStatus || '').toLowerCase() === 'approved'
      )
      .map((t) => String(t.id))
  );
  const approvedTeamsCount = approvedTeamIds.size;
  if (String(checkpointStatus || '').toLowerCase() === 'upcoming') {
    return { completedTeamsCount: 0, approvedTeamsCount, completionPercent: 0 };
  }
  const completedTeamsCount = new Set(
    submissions
      .filter(
        (s) =>
          String(s.checkpointId) === String(checkpointId) &&
          isCompletedSubmission(s.status) &&
          (approvedTeamsCount === 0 || approvedTeamIds.has(String(s.teamId)))
      )
      .map((s) => String(s.teamId))
  ).size;
  const completionPercent =
    approvedTeamsCount > 0
      ? Math.min(100, Math.round((completedTeamsCount / approvedTeamsCount) * 100))
      : 0;
  return { completedTeamsCount, approvedTeamsCount, completionPercent };
}

export function checkpointScheduleWarning(
  items: {
    start_time?: string;
    startTime?: string;
    deadline: string;
    status?: string;
    is_final_checkpoint?: boolean;
    isFinalCheckpoint?: boolean;
  }[]
): string | null {
  const progress = items
    .filter((cp) => !cp.is_final_checkpoint && !cp.isFinalCheckpoint)
    .map((cp) => Date.parse(cp.deadline))
    .filter(Number.isFinite);
  const lastProgress = Math.max(...progress);
  if (
    progress.length &&
    items.some(
      (cp) => (cp.is_final_checkpoint || cp.isFinalCheckpoint) && Date.parse(cp.deadline) < lastProgress
    )
  ) {
    return 'Lịch chặng cần BTC rà soát: hạn chung kết đang sớm hơn một chặng tiến độ. Hệ thống vẫn áp dụng đúng giờ mở/đóng đã cấu hình.';
  }

  for (let i = 1; i < items.length; i += 1) {
    const prevStartRaw = items[i - 1].start_time ?? items[i - 1].startTime;
    const currStartRaw = items[i].start_time ?? items[i].startTime;
    const prevStart = prevStartRaw ? Date.parse(prevStartRaw) : NaN;
    const currStart = currStartRaw ? Date.parse(currStartRaw) : NaN;
    const prevDeadline = Date.parse(items[i - 1].deadline);
    if (Number.isFinite(prevStart) && Number.isFinite(currStart) && currStart < prevStart) {
      return 'Lịch chặng cần BTC rà soát: có chặng phía sau đang cấu hình giờ mở cổng sớm hơn chặng đứng trước.';
    }
    if (Number.isFinite(prevDeadline) && Number.isFinite(currStart) && currStart < prevDeadline) {
      return 'Lịch chặng cần BTC rà soát: có chặng phía sau mở cổng trước khi chặng đứng trước kết thúc.';
    }
    if (items[i - 1].status === 'upcoming' && items[i].status === 'open') {
      return 'Lịch chặng cần BTC rà soát: chặng đứng trước chưa mở nhưng chặng phía sau đã mở nộp bài.';
    }
  }
  return null;
}
