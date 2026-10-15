import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../Badge';

interface CountdownTimerProps {
  targetDate: string; // ISO string
  title?: string;
  subtitle?: string;
  isStarted?: boolean; // Optional override; defaults to config.isContestStarted
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  title = 'Thời gian còn lại đến hạn nộp bài',
  subtitle,
  isStarted,
  className = '',
}) => {
  const { config } = useMockStore();

  // If isStarted is not explicitly passed as prop, use global config state
  const contestActive = isStarted !== undefined ? isStarted : Boolean(config.isContestStarted);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (!contestActive) return;

    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, contestActive]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // WHEN CONTEST HAS NOT STARTED YET
  if (!contestActive) {
    return (
      <div
        className={`rounded-[16px] border border-amber-500/30 bg-gradient-to-r from-[#1E293B] via-[#1E293B]/95 to-[#162033] p-5 lg:p-6 shadow-xl relative overflow-hidden font-['Roboto'] ${className}`}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-['Righteous'] text-lg sm:text-xl text-white tracking-wide">
                  Cuộc Thi Chưa Bắt Đầu
                </h4>
                <Badge variant="warning" className="text-[10px]">
                  Chờ phát lệnh
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Đồng hồ đếm ngược đến hạn chót nộp bài sẽ <strong>chính thức bắt đầu chạy</strong> khi Ban Quản Trị phát lệnh mở màn cuộc thi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 opacity-60 self-center sm:self-auto">
            {[
              { label: 'NGÀY', value: '--' },
              { label: 'GIỜ', value: '--' },
              { label: 'PHÚT', value: '--' },
              { label: 'GIÂY', value: '--' },
            ].map((item, index) => (
              <React.Fragment key={item.label}>
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-[10px] bg-[#0F172A] border border-[#334155] text-lg sm:text-xl font-bold font-mono text-slate-400 shadow-inner">
                    {item.value}
                  </div>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-400">
                    {item.label}
                  </span>
                </div>
                {index < 3 && <span className="text-xl font-bold text-slate-600 -mt-4">:</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // WHEN CONTEST IS ACTIVE (COUNTDOWN RUNNING)
  return (
    <div
      className={`rounded-[16px] border border-emerald-500/40 bg-gradient-to-r from-[#1E293B] via-[#1E293B]/95 to-[#162033] p-5 lg:p-6 shadow-xl relative overflow-hidden font-['Roboto'] ${className}`}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Clock size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-['Righteous'] text-lg sm:text-xl text-white tracking-wide">
                {title}
              </h4>
              <Badge variant="success" className="text-[10px]">
                Đang diễn ra
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {subtitle || `Hạn nộp chính thức: ${new Date(targetDate).toLocaleString('vi-VN')}`}
            </p>
          </div>
        </div>

        {timeLeft.isExpired ? (
          <div className="rounded-full bg-rose-500/20 border border-rose-500/40 px-5 py-2 text-xs font-bold text-rose-300">
            ĐÃ KẾT THÚC HẠN NỘP
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 self-center sm:self-auto">
            {[
              { label: 'NGÀY', value: pad(timeLeft.days) },
              { label: 'GIỜ', value: pad(timeLeft.hours) },
              { label: 'PHÚT', value: pad(timeLeft.minutes) },
              { label: 'GIÂY', value: pad(timeLeft.seconds) },
            ].map((item, index) => (
              <React.Fragment key={item.label}>
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-[10px] bg-[#0F172A] border border-[#334155] text-xl sm:text-2xl font-bold font-mono text-emerald-400 shadow-inner">
                    {item.value}
                  </div>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-400">
                    {item.label}
                  </span>
                </div>
                {index < 3 && <span className="text-xl font-bold text-emerald-500 -mt-4">:</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
