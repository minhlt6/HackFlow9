import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

export interface CountdownTimerProps {
  /**
   * Thời điểm kết thúc theo chuẩn ISO 8601 (ví dụ: "2026-10-15T18:00:00.000Z")
   */
  endTime: string;

  /**
   * Hàm callback được kích hoạt 1 lần khi đồng hồ đếm ngược về 0
   */
  onExpire?: () => void;

  /**
   * Tuỳ biến class CSS bên ngoài (Tailwind CSS)
   */
  className?: string;

  /**
   * Hiển thị kèm icon đồng hồ (mặc định: true)
   */
  showIcon?: boolean;

  /**
   * Văn bản hiển thị khi đã hết thời gian (mặc định: "Đã hết thời gian")
   */
  expiredText?: string;

  /**
   * Luôn hiển thị chữ '0 ngày' ngay cả khi thời gian còn lại dưới 1 ngày (mặc định: false)
   */
  alwaysShowDays?: boolean;
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formattedText: string;
}

/**
 * Tính toán thời gian còn lại và định dạng chuỗi theo yêu cầu HF-29:
 * Format: "Còn 2 ngày 04:12:59" hoặc "Còn 04:12:59"
 */
function calculateTimeRemaining(
  endTimeIso: string,
  expiredText = 'Đã hết thời gian',
  alwaysShowDays = false
): TimeRemaining {
  const targetTime = new Date(endTimeIso).getTime();

  if (isNaN(targetTime)) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedText: 'Thời gian không hợp lệ',
    };
  }

  const now = Date.now();
  const total = Math.max(0, targetTime - now);
  const isExpired = total <= 0;

  if (isExpired) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedText: expiredText,
    };
  }

  const totalSeconds = Math.floor(total / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  const formattedText =
    days > 0 || alwaysShowDays
      ? `Còn ${days} ngày ${hh}:${mm}:${ss}`
      : `Còn ${hh}:${mm}:${ss}`;

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formattedText,
  };
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  onExpire,
  className = '',
  showIcon = true,
  expiredText = 'Đã hết thời gian',
  alwaysShowDays = false,
}) => {
  const [prevConfig, setPrevConfig] = useState({ endTime, expiredText, alwaysShowDays });
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(endTime, expiredText, alwaysShowDays)
  );

  // Cập nhật state an toàn trong render khi props cấu hình thay đổi (React pattern)
  if (
    prevConfig.endTime !== endTime ||
    prevConfig.expiredText !== expiredText ||
    prevConfig.alwaysShowDays !== alwaysShowDays
  ) {
    setPrevConfig({ endTime, expiredText, alwaysShowDays });
    setTimeRemaining(calculateTimeRemaining(endTime, expiredText, alwaysShowDays));
  }

  // Lưu callback ref trong effect để tránh lỗi accessing/updating ref during render
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let triggered = false;
    const initial = calculateTimeRemaining(endTime, expiredText, alwaysShowDays);

    if (initial.isExpired) {
      onExpireRef.current?.();
      return;
    }

    // Sử dụng setInterval để cập nhật mỗi giây (AC: sử dụng setInterval hoặc requestAnimationFrame)
    const intervalId = window.setInterval(() => {
      const updated = calculateTimeRemaining(endTime, expiredText, alwaysShowDays);
      setTimeRemaining(updated);

      if (updated.isExpired) {
        window.clearInterval(intervalId);
        if (!triggered) {
          triggered = true;
          onExpireRef.current?.();
        }
      }
    }, 1000);

    // Cleanup khi unmount hoặc dependencies thay đổi tránh memory leak
    return () => {
      window.clearInterval(intervalId);
    };
  }, [endTime, expiredText, alwaysShowDays]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium text-sm transition-colors border px-2.5 py-1 rounded-[10px] ${
        timeRemaining.isExpired
          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
          : timeRemaining.days === 0 && timeRemaining.hours < 1
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 animate-pulse'
          : 'bg-[#6366F1]/15 text-primary border-[#6366F1]/40'
      } ${className}`}
      title={timeRemaining.formattedText}
      data-testid="countdown-timer"
    >
      {showIcon && (
        <Clock
          size={15}
          className={`shrink-0 ${
            timeRemaining.isExpired
              ? 'text-rose-700 dark:text-rose-400'
              : timeRemaining.days === 0 && timeRemaining.hours < 1
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-primary'
          }`}
        />
      )}
      <span>{timeRemaining.formattedText}</span>
    </span>
  );
};
