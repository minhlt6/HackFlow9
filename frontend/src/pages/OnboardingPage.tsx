import React from 'react';
import { Button } from '../components/Button';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#080D18] flex items-center justify-center p-4 font-['Roboto']">
      <div className="w-full max-w-xl rounded-[16px] border border-[#334155] bg-[#1E293B] p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <Clock size={40} />
        </div>

        <div className="space-y-2">
          <h2
            className="font-['Righteous'] text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Hồ Sơ Đang Chờ Phê Duyệt
          </h2>
          <p className="text-sm text-slate-300">
            Cảm ơn bạn đã xác thực tài khoản qua GitHub OAuth. Ban Tổ Chức Hackathon đang đối soát với danh sách sinh viên hợp lệ.
          </p>
        </div>

        <div className="rounded-[12px] bg-[#0F172A] border border-[#334155] p-5 text-left text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
            <span className="text-slate-400">Họ và tên:</span>
            <span className="font-semibold text-white">{user?.fullName || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
            <span className="text-slate-400">Email GitHub:</span>
            <span className="font-mono text-slate-200">{user?.email || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
            <span className="text-slate-400">GitHub Username:</span>
            <span className="font-mono text-[#818CF8]">Đang chờ đồng bộ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Trạng thái:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              Đang chờ Admin duyệt
            </span>
          </div>
        </div>

        <div className="rounded-[10px] bg-[#0B1120] border border-[#334155] p-4 text-xs text-slate-400 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-[#818CF8] font-semibold">
            <ShieldAlert size={14} />
            <span>Chính sách phê duyệt:</span>
          </div>
          <p>
            Mỗi tài khoản GitHub tham gia phải nằm trong danh mục Whitelist của cuộc thi. Quá trình kiểm tra tự động diễn ra trong 5 - 15 phút.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="flex-1 gap-2"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </Button>

        </div>
      </div>
    </div>
  );
};