/** A received row is not necessarily a completed checkpoint. */
export function isCompletedSubmission(status?: string | null): boolean {
  return ['submitted', 'evaluated', 'late'].includes((status || '').toLowerCase());
}

export function isUnassignedTicket(ticket: { status: string; assignedMentorId?: string | null }): boolean {
  return ticket.status === 'open' && !ticket.assignedMentorId;
}
