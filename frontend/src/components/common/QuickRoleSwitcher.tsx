import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockStore } from '../../store/useMockStore';
import {
  Users,
  Eye,
  EyeOff,
  LogOut,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
} from 'lucide-react';

export const QuickRoleSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const {
    activeRolePersona,
    currentUser,
    switchPersona,
    logout,
    config,
    toggleBlindJudging,
    toggleResultsPublished,
  } = useMockStore();

  const personas = [
    {
      id: 'admin' as const,
      name: '👑 Quản trị viên (Admin)',
      desc: 'Quản trị hệ thống, duyệt đội, cài đặt',
      route: '/admin/dashboard',
      color: 'border-[#6366F1] text-[#818CF8]',
    },
    {
      id: 'leader' as const,
      name: '🚀 Đội trưởng (Candidate Leader)',
      desc: 'CyberSentinels - Nộp bài, chọn đề tài, quản lý đội',
      route: '/dashboard',
      color: 'border-emerald-500 text-emerald-400',
    },
    {
      id: 'member' as const,
      name: '💻 Thành viên (Candidate Member)',
      desc: 'EcoPulse - Xem đề tài, theo dõi bài nộp',
      route: '/dashboard',
      color: 'border-cyan-500 text-cyan-400',
    },
    {
      id: 'pending' as const,
      name: '⏳ Đang chờ duyệt (Pending Candidate)',
      desc: 'Tài khoản GitHub vừa đăng ký chờ duyệt',
      route: '/onboarding',
      color: 'border-amber-500 text-amber-300',
    },
    {
      id: 'rejected' as const,
      name: '❌ Bị từ chối (Rejected Account)',
      desc: 'Tài khoản không đạt điều kiện tham gia',
      route: '/rejected',
      color: 'border-rose-500 text-rose-400',
    },
    {
      id: 'mentor' as const,
      name: '🎓 Cố vấn (Mentor)',
      desc: 'Dr. Le Quang - Nhận ticket, hỗ trợ kỹ thuật',
      route: '/mentor/dashboard',
      color: 'border-purple-500 text-purple-300',
    },
    {
      id: 'judge' as const,
      name: '⚖️ Giám khảo (Judge)',
      desc: 'Dr. Alan Vance - Chấm điểm 2 màn hình, rubric',
      route: '/judge/dashboard',
      color: 'border-blue-400 text-blue-300',
    },
  ];

  const handleSelect = (p: (typeof personas)[0]) => {
    switchPersona(p.id);
    navigate(p.route);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const handleResetData = () => {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mock về trạng thái ban đầu?')) {
      localStorage.removeItem('hackflow-mock-state-v2');
      window.location.reload();
    }
  };

  return (
    <aside aria-label="Demo Role Switcher" className="fixed bottom-5 right-5 z-50 font-['Roboto']">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[#6366F1]/50 bg-[#1E293B] px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-[#6366F1]/15 hover:bg-[#27354f] hover:border-[#6366F1] transition-all"
        >
          <Sparkles size={16} className="text-[#818CF8] animate-pulse" />
          <span>Demo Role:</span>
          <span className="rounded-full bg-[#6366F1]/20 px-2 py-0.5 text-xs text-[#818CF8] border border-[#6366F1]/30 uppercase">
            {activeRolePersona}
          </span>
          <ChevronUp size={16} className="text-slate-400" />
        </button>
      ) : (
        <div className="w-[360px] rounded-[16px] border border-[#334155] bg-[#1E293B] p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
            <div className="flex items-center gap-2 text-white font-['Righteous'] text-base tracking-wide">
              <Sparkles size={18} className="text-[#6366F1]" />
              <span>Chuyển Vai Trò Trải Nghiệm (Demo)</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#334155]/60"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            Hiện tại: <span className="font-semibold text-white">{currentUser.fullName}</span> ({currentUser.email})
          </div>

          {/* Persona List */}
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {personas.map((p) => {
              const isSelected = activeRolePersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left p-2.5 rounded-[10px] border transition-all ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#6366F1] shadow-sm'
                      : 'bg-[#0F172A]/40 border-transparent hover:border-[#334155] hover:bg-[#0F172A]/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${p.color}`}>{p.name}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-[#6366F1] text-white px-1.5 py-0.2 rounded font-mono">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{p.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Quick Mock Toggles */}
          <div className="mt-3 pt-3 border-t border-[#334155] space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Công Tắc Tính Năng Mô Phỏng
            </div>

            <div className="flex items-center justify-between rounded-[8px] bg-[#0F172A] p-2 border border-[#334155]">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                {config.blindJudgingMode ? (
                  <EyeOff size={14} className="text-amber-400" />
                ) : (
                  <Eye size={14} className="text-slate-400" />
                )}
                <span>Chế độ chấm mù (Blind)</span>
              </div>
              <button
                onClick={toggleBlindJudging}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  config.blindJudgingMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {config.blindJudgingMode ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-[8px] bg-[#0F172A] p-2 border border-[#334155]">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Trophy size={14} className={config.resultsPublished ? 'text-emerald-400' : 'text-slate-400'} />
                <span>Công bố kết quả (Leaderboard)</span>
              </div>
              <button
                onClick={toggleResultsPublished}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  config.resultsPublished
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {config.resultsPublished ? 'CÔNG BỐ' : 'ẨN'}
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-3 pt-3 border-t border-[#334155] flex items-center justify-between text-xs">
            <button
              onClick={handleResetData}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Khôi phục trạng thái mock ban đầu"
            >
              <RotateCcw size={13} />
              <span>Reset Mock</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-medium"
            >
              <LogOut size={13} />
              <span>Đăng xuất ra Login</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
