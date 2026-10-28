/** Convert a server timestamp to the browser's datetime-local value. */
export function toLocalDateTime(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Keep the original instant (including seconds) when the displayed minute is unchanged. */
export function configDeadlineToISO(localValue: string, savedValue: string): string {
  if (savedValue && localValue === toLocalDateTime(savedValue)) return new Date(savedValue).toISOString();
  const date = new Date(localValue);
  if (!localValue || Number.isNaN(date.getTime())) throw new Error('Vui lòng nhập hạn nộp bài hợp lệ.');
  return date.toISOString();
}
