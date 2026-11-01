/** A received row is not necessarily a completed checkpoint. */
export function isCompletedSubmission(status?: string | null): boolean {
  return ['submitted', 'evaluated', 'late'].includes((status || '').toLowerCase());
}

export function isUnassignedTicket(ticket: { status: string; assignedMentorId?: string | null }): boolean {
  return ticket.status === 'open' && !ticket.assignedMentorId;
}

export function checkpointScheduleWarning(items: {deadline: string; is_final_checkpoint?: boolean; isFinalCheckpoint?: boolean}[]): string | null {
  const progress = items.filter((cp) => !cp.is_final_checkpoint && !cp.isFinalCheckpoint).map((cp) => Date.parse(cp.deadline)).filter(Number.isFinite);
  const lastProgress = Math.max(...progress);
  return progress.length && items.some((cp) => (cp.is_final_checkpoint || cp.isFinalCheckpoint) && Date.parse(cp.deadline) < lastProgress)
    ? 'Lịch chặng cần BTC rà soát: hạn chung kết đang sớm hơn một chặng tiến độ. Hệ thống vẫn áp dụng đúng giờ mở/đóng đã cấu hình.' : null;
}
