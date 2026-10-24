import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { ShieldX, Mail, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RejectedAccountPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-slate-900/60 flex items-center justify-center p-4 ">
      <div className="w-full max-w-lg rounded-[16px] border border-border bg-card p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400">
          <ShieldX size={44} />
        </div>

        <div className="space-y-2">
          <h2
            className="font-semibold tracking-tight text-foreground text-3xl tracking-wide"
          >
            Tài Khoản Không Được Phê Duyệt
          </h2>
          <p className="text-sm text-muted-foreground">
            Hồ sơ đăng ký của bạn không đáp ứng điều kiện tiếp cận cổng Hackathon khép kín.
          </p>
        </div>

        <div className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border p-4 text-left text-xs space-y-2">
          <div className="text-muted-foreground">Lý do từ chối:</div>
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-medium">
            Email &quot;{user?.email || 'tài khoản của bạn'}&quot; không thuộc danh sách Whitelist sinh viên chính thức hoặc chưa hoàn thành hồ sơ đăng ký hợp lệ trước thời hạn.
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Mail size={14} className="text-primary" />
          <span>Mọi thắc mắc vui lòng liên hệ: contact@hackflow.io</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="secondary" onClick={handleLogout} className="flex-1">
            Quay lại trang Đăng nhập
          </Button>
          <Button variant="primary" onClick={() => navigate('/onboarding')} className="flex-1 gap-1.5">
            <RotateCcw size={16} />
            <span>Cập nhật hồ sơ</span>
          </Button>
        </div>
      </div>
    </div>
  );
};