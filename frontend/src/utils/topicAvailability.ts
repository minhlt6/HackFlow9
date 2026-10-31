import type { Topic, Subtopic } from '../types/topic';

export function topicUnavailableReason(topic: Topic, sub?: Subtopic): string | null {
  if (topic.can_select === false) return topic.unavailable_reason || 'Đề tài chưa mở đăng ký.';
  if (topic.is_active === false) return 'Đề tài đã đóng đăng ký.';
  if (topic.remaining_slots <= 0) return 'Đề tài đã hết chỗ.';
  if (sub) {
    if (sub.can_select === false) return sub.unavailable_reason || 'Đề tài nhánh không khả dụng.';
    if (sub.is_active === false) return 'Đề tài nhánh đã đóng đăng ký.';
    if (sub.remaining_slots <= 0) return 'Đề tài nhánh đã hết chỗ.';
  } else if (topic.subtopics?.length && topic.subtopics.every((s) => Boolean(topicUnavailableReason(topic, s)))) {
    return 'Không còn đề tài nhánh có thể đăng ký.';
  }
  return null;
}
