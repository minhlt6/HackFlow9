import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import { InitialRoleTodoBanner } from '../../components/common/InitialRoleTodoBanner';
import {
  Users,
  ShieldCheck,
  CheckSquare,
  HelpCircle,
  EyeOff,
  Eye,
  Trophy,
  Megaphone,
  ArrowRight,
  Settings,
  Scale,
  ListOrdered,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const {
    teams,
    whitelist,
    pendingCandidates,
    checkpoints,
    submissions,
    tickets,
    config,
    toggleBlindJudging,
    toggleResultsPublished,
    announcements,
  } = useMockStore();

  const navigate = useNavigate();

  const approvedTeamsCount = teams.filter((t) => t.status === 'approved').length;
  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#818CF8]">
                Bảng Điều Khiển Quản Trị Hệ Thống
              </span>
              <span className="text-slate-500">•</span>
              <Badge variant="indigo">HackFlow Core v2.4</Badge>
            </div>
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl lg:text-4xl tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Tổng Quan Cuộc Thi: {config.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Theo dõi tình trạng xác thực tài khoản, tiến độ nộp bài các chặng, xử lý hỗ trợ trực tuyến và vận hành Chế độ chấm ẩn danh.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={toggleBlindJudging}
              className={`gap-2 ${
                config.blindJudgingMode
                  ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                  : 'text-slate-200'
              }`}
            >
              {config.blindJudgingMode ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>
                {config.blindJudgingMode ? 'Chấm Ẩn Danh: ĐANG BẬT' : 'Bật Chế Độ Chấm Ẩn Danh'}
              </span>
            </Button>

            <Button
              variant="primary"
              onClick={toggleResultsPublished}
              className="gap-2 shadow-lg shadow-[#6366F1]/20"
            >
              <Trophy size={16} />
              <span>
                {config.resultsPublished ? 'Ẩn Kết Quả Cuộc Thi' : 'Công Bố Bảng Xếp Hạng'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Checklist nhiệm vụ thiết lập ban đầu cho Ban Quản Trị */}
      <InitialRoleTodoBanner role="admin" />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tài khoản chờ xét duyệt"
          value={pendingCandidates.length}
          subtitle="Sinh viên đăng ký cần phê duyệt"
          icon={<ShieldCheck size={24} />}
          iconColor="amber"
          onClick={() => navigate('/admin/approvals')}
        />

        <StatCard
          title="Tổng số Đội thi"
          value={`${approvedTeamsCount} / ${teams.length}`}
          subtitle={`${approvedTeamsCount} đội đã phê duyệt hợp lệ`}
          icon={<Users size={24} />}
          iconColor="indigo"
          onClick={() => navigate('/admin/teams')}
        />

        <StatCard
          title="Bài nộp các chặng"
          value={submissions.length}
          subtitle={`Tổng số commit SHA đã chốt`}
          icon={<CheckSquare size={24} />}
          iconColor="emerald"
          onClick={() => navigate('/admin/checkpoints')}
        />

        <StatCard
          title="Yêu cầu hỗ trợ đang mở"
          value={openTicketsCount}
          subtitle="Cần Cố vấn chuyên môn hỗ trợ"
          icon={<HelpCircle size={24} />}
          iconColor="rose"
          onClick={() => navigate('/mentor/tickets')}
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Management Shortcuts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <h3 className="font-['Righteous'] text-lg text-white">
              Lối Tắt Vận Hành Trọng Tâm
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                onClick={() => navigate('/admin/approvals')}
                className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] hover:border-[#6366F1] cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Duyệt Tài Khoản OAuth</span>
                  <Badge variant="warning">{pendingCandidates.length} chờ</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Đối soát sinh viên đăng nhập GitHub với Whitelist trường đại học.
                </p>
              </div>

              <div
                onClick={() => navigate('/admin/whitelist')}
                className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] hover:border-[#6366F1] cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Danh Mục Whitelist</span>
                  <Badge variant="indigo">{whitelist.length} email</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Import danh sách sinh viên hợp lệ qua CSV / danh sách văn bản.
                </p>
              </div>

              <div
                onClick={() => navigate('/admin/criteria')}
                className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] hover:border-[#6366F1] cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Ma Trận Tiêu Chí Rubric</span>
                  <Badge variant="cyan">Tổng 100%</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Thiết lập trọng số và thang điểm cho Hội đồng Giám khảo chấm thi.
                </p>
              </div>

              <div
                onClick={() => navigate('/admin/results')}
                className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] hover:border-[#6366F1] cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Tổng Hợp & Bảng Điểm</span>
                  <Badge variant={config.resultsPublished ? 'success' : 'neutral'}>
                    {config.resultsPublished ? 'Đã công bố' : 'Bảo mật'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Tính toán điểm số có trọng số và xuất biên bản kết quả cuộc thi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timeline & Announcements */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <h3 className="font-['Righteous'] text-lg text-white">Giai Đoạn Hiện Tại</h3>
              <Badge variant="indigo">{config.currentPhase}</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Mở đăng ký:</span>
                <span className="font-semibold text-white">10/10/2026</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Khóa chọn đề tài:</span>
                <span className="font-semibold text-white">20/10/2026</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Hạn nộp chung cuộc:</span>
                <span className="font-semibold text-white">15/11/2026 23:59</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Chế độ chấm mù:</span>
                <span className="font-semibold text-amber-400">
                  {config.blindJudgingMode ? 'ĐANG KÍCH HOẠT' : 'TẮT'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/admin/config')}
              className="w-full text-xs justify-center gap-1.5 mt-2"
            >
              <Settings size={14} />
              <span>Chỉnh sửa cấu hình Hackathon</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
