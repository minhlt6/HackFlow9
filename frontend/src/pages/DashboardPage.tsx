import React, { useState } from 'react';
import { Users, FileText, CheckSquare, Award, Flame, ArrowRight } from 'lucide-react';
import { CountdownTimer } from '../components/CountdownTimer';
import { Badge } from '../components/Badge';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  // Giả lập hạn chót checkpoint sắp tới sau 2 ngày 4 giờ 12 phút 59 giây
  const [checkpointDeadline] = useState<string>(() =>
    new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600 + 12 * 60 + 59) * 1000).toISOString()
  );

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-white">
            Tổng quan hệ thống Hackathon
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chào mừng bạn đến với bảng điều khiển chính của cuộc thi HackFlow 2026.
          </p>
        </div>
        <div>
          <Badge variant="indigo" size="md">
            Mùa giải 2026 • Sprint 3
          </Badge>
        </div>
      </div>

      {/* Banner Checkpoint Đếm ngược thời gian thực (HF-29) */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] border border-[#334155] shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Flame size={16} />
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">
                Chặng thi đua hiện tại: Checkpoint 2
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Nộp bản thiết kế hệ thống Architecture &amp; Prototype
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Vui lòng hoàn tất nộp bài và cập nhật link repository trước khi thời gian đếm ngược kết thúc.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                Thời hạn còn lại
              </span>
              <CountdownTimer endTime={checkpointDeadline} />
            </div>
            <Link
              to="/teams"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs sm:text-sm font-medium transition-all shadow-md hover:shadow-[#6366F1]/25"
            >
              <span>Xem đội thi</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Thẻ thống kê (Dark Mode) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0F172A] p-5 rounded-[14px] shadow-lg border border-[#334155] flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Tổng số đội thi</p>
            <h3 className="text-2xl font-bold text-white mt-1">24</h3>
          </div>
          <div className="w-12 h-12 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-xl flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <Link
          to="/topics"
          className="bg-[#0F172A] p-5 rounded-[14px] shadow-lg border border-[#334155] flex items-center justify-between transition-all hover:-translate-y-0.5 hover:border-[#6366F1]/50 group"
        >
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium group-hover:text-slate-300">Đề tài đăng ký</p>
            <h3 className="text-2xl font-bold text-white mt-1">18</h3>
            <span className="text-[11px] text-[#818CF8] mt-1 inline-block">Xem &amp; Chọn đề tài &rarr;</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText size={22} />
          </div>
        </Link>

        <div className="bg-[#0F172A] p-5 rounded-[14px] shadow-lg border border-[#334155] flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Checkpoint hoàn thành</p>
            <h3 className="text-2xl font-bold text-white mt-1">5/7</h3>
          </div>
          <div className="w-12 h-12 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <CheckSquare size={22} />
          </div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-[14px] shadow-lg border border-[#334155] flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Điểm trung bình</p>
            <h3 className="text-2xl font-bold text-white mt-1">86.5</h3>
          </div>
          <div className="w-12 h-12 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-xl flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>
      </div>
    </div>
  );
};