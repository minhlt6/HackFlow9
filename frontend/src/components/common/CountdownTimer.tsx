import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string; // ISO string
  title?: string;
  subtitle?: string;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  title = 'Thời gian còn lại đến hạn nộp bài',
  subtitle,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
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
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={`rounded-[14px] border border-[#334155] bg-[#1E293B] p-5 shadow-lg relative overflow-hidden font-['Roboto'] ${className}`}
    >
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#6366F1]/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
            <Clock size={22} />
          </div>
          <div>
            <h4 className="font-['Righteous'] text-lg text-white tracking-wide">
              {title}
            </h4>
            <p className="text-xs text-slate-400">
              {subtitle || `Hạn chót: ${new Date(targetDate).toLocaleString('vi-VN')}`}
            </p>
          </div>
        </div>

        {timeLeft.isExpired ? (
          <div className="rounded-full bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300">
            ĐÃ KẾT THÚC HẠN NỘP
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {[
              { label: 'NGÀY', value: pad(timeLeft.days) },
              { label: 'GIỜ', value: pad(timeLeft.hours) },
              { label: 'PHÚT', value: pad(timeLeft.minutes) },
              { label: 'GIÂY', value: pad(timeLeft.seconds) },
            ].map((item, index) => (
              <React.Fragment key={item.label}>
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-[10px] bg-[#0F172A] border border-[#334155] text-xl sm:text-2xl font-bold font-mono text-white shadow-inner">
                    {item.value}
                  </div>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-400">
                    {item.label}
                  </span>
                </div>
                {index < 3 && <span className="text-xl font-bold text-[#6366F1] -mt-4">:</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
