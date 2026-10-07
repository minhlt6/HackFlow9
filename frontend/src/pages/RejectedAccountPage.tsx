import React from 'react';
import { useMockStore } from '../store/useMockStore';
import { Button } from '../components/Button';
import { ShieldX, Mail, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RejectedAccountPage: React.FC = () => {
  const { currentUser, switchPersona, logout } = useMockStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTryLeader = () => {
    switchPersona('leader');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#080D18] flex items-center justify-center p-4 font-['Roboto']">
      <div className="w-full max-w-lg rounded-[16px] border border-[#334155] bg-[#1E293B] p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
          <ShieldX size={44} />
        </div>

        <div className="space-y-2">
          <h2
            className="font-['Righteous'] text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #F43F5E 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tài Khoản Không Được Phê Duyệt
          </h2>
          <p className="text-sm text-slate-300">
            Hồ sơ đăng ký của bạn không đáp ứng điều kiện tiếp cận cổng Hackathon khép kín.
          </p>
        </div>

        <div className="rounded-[12px] bg-[#0F172A] border border-[#334155] p-4 text-left text-xs space-y-2">
          <div className="text-slate-400">Lý do từ chối:</div>
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-200 font-medium">
            Email &quot;{currentUser.email}&quot; không thuộc danh sách Whitelist sinh viên chính thức hoặc chưa hoàn thành hồ sơ đăng ký hợp lệ trước thời hạn.
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Mail size={14} className="text-[#818CF8]" />
          <span>Mọi thắc mắc vui lòng liên hệ: contact@hackflow.io</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="secondary" onClick={handleLogout} className="flex-1">
            Quay lại trang Đăng nhập
          </Button>
          <Button variant="primary" onClick={handleTryLeader} className="flex-1 gap-1.5">
            <RotateCcw size={16} />
            <span>Thử Đội trưởng hợp lệ</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
