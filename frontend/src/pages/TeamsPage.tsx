import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Crown,
  UserX,
  LogOut,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  CheckSquare,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Share2,
  Sliders,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';
import {
  mockTeamInTeam,
  fetchMockTeam,
  mockCreateTeamApi,
  mockJoinTeamApi,
} from '../mocks/mockTeams';
import type { TeamDetails } from '../types/team';
import { useAuthStore } from '../store/useAuthStore';

type PreviewMode = 'no_team' | 'in_team' | 'full' | 'loading' | 'error';

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  // State dữ liệu đội thi
  const [team, setTeam] = useState<TeamDetails | null>(mockTeamInTeam);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('in_team');
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Trạng thái copy
  const [copied, setCopied] = useState<boolean>(false);

  // Modal Tạo đội
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamDesc, setNewTeamDesc] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Modal Gia nhập đội
  const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Modal Chỉnh sửa thông tin đội
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editDesc, setEditDesc] = useState<string>('');

  // Tự tắt Toast sau 3s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Đổi trạng thái kiểm thử (nếu cần gọi ngầm)
  const handleSwitchPreviewMode = async (mode: PreviewMode) => {
    setPreviewMode(mode);
    setErrorMessage(null);

    if (mode === 'loading') {
      setIsLoading(true);
      return;
    }

    if (mode === 'error') {
      setIsLoading(false);
      setErrorMessage('Không thể kết nối đến máy chủ API (Mã lỗi: 500 SERVER_ERROR). Vui lòng thử lại sau.');
      setTeam(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchMockTeam(mode, 300);
      setTeam(result);
    } catch {
      setErrorMessage('Đã xảy ra lỗi khi tải dữ liệu đội thi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sao chép mã mời
  const handleCopyCode = async (code: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast(`Đã sao chép mã mời "${code}" vào clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép vào bộ nhớ tạm.', 'error');
    }
  };

  // Nộp form Tạo đội
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTeamName.trim();

    if (!trimmed) {
      setCreateError('Vui lòng nhập tên đội thi.');
      return;
    }
    if (trimmed.length < 3) {
      setCreateError('Tên đội thi phải có ít nhất 3 ký tự.');
      return;
    }

    setCreateError('');
    setIsCreating(true);

    try {
      const created = await mockCreateTeamApi({ team_name: trimmed });
      if (newTeamDesc.trim()) {
        created.description = newTeamDesc.trim();
      }
      setTeam(created);
      setPreviewMode('in_team');
      setIsCreateOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      showToast(`Đăng ký thành công đội thi "${created.team_name}"!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo đội thất bại.';
      setCreateError(msg);
      showToast(msg, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Nộp form Gia nhập đội
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();

    if (!cleaned) {
      setJoinError('Vui lòng nhập mã mời tham gia.');
      return;
    }
    if (cleaned.length < 6) {
      setJoinError('Mã mời phải có đúng 6 ký tự.');
      return;
    }

    setJoinError('');
    setIsJoining(true);

    try {
      const joined = await mockJoinTeamApi({ invite_code: cleaned });
      setTeam(joined);
      setPreviewMode('in_team');
      setIsJoinOpen(false);
      setJoinCode('');
      showToast(`Gia nhập thành công đội thi "${joined.team_name}"!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gia nhập đội thất bại.';
      setJoinError(msg);
      showToast(msg, 'error');
    } finally {
      setIsJoining(false);
    }
  };

  // Cập nhật mô tả đội
  const handleUpdateTeamInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setTeam({
      ...team,
      description: editDesc,
    });
    setIsEditOpen(false);
    showToast('Đã cập nhật thông tin giới thiệu đội thi!', 'success');
  };

  // Chuyển giao quyền Leader
  const handleTransfer = (memberId: string, memberName: string) => {
    if (!team) return;
    if (window.confirm(`Bạn có chắc chắn muốn chuyển giao vị trí Đội Trưởng cho ${memberName}?`)) {
      const updatedMembers = team.members.map((m) => ({
        ...m,
        role: (m.id === memberId ? 'leader' : 'member') as 'leader' | 'member',
      }));
      setTeam({
        ...team,
        leader_id: memberId,
        members: updatedMembers,
      });
      showToast(`Đã chuyển giao vai trò Đội Trưởng cho ${memberName}!`, 'success');
    }
  };

  // Mời thành viên ra khỏi đội
  const handleRemove = (memberId: string, memberName: string) => {
    if (!team) return;
    if (window.confirm(`Bạn có chắc chắn muốn mời ${memberName} rời khỏi đội?`)) {
      const updatedMembers = team.members.filter((m) => m.id !== memberId);
      setTeam({
        ...team,
        member_count: updatedMembers.length,
        members: updatedMembers,
      });
      showToast(`Đã xóa thành viên ${memberName} khỏi đội.`, 'info');
    }
  };

  // Rời khỏi đội thi
  const handleLeave = () => {
    if (!team) return;
    if (window.confirm('Bạn có chắc chắn muốn rời khỏi đội này?')) {
      setTeam(null);
      setPreviewMode('no_team');
      showToast('Bạn đã rời khỏi đội thi.', 'info');
    }
  };

  const isLeader = true;

  return (
    <div className="space-y-6 font-['Roboto'] max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-medium border text-sm animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 border-emerald-400/40 shadow-emerald-950/40'
              : toast.type === 'error'
              ? 'bg-rose-600/95 border-rose-400/40 shadow-rose-950/40'
              : 'bg-indigo-600/95 border-indigo-400/40 shadow-indigo-950/40'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
          {toast.type === 'info' && <Info size={18} className="shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* FLOATING DEV TOOLBAR NHỎ GỌN Ở GÓC DƯỚI BÊN PHẢI (KHÔNG ĐÈ LÊN SIDEBAR VÀ NÚT ĐĂNG XUẤT) */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isDevOpen ? (
          <button
            type="button"
            onClick={() => setIsDevOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white text-xs shadow-xl transition-all cursor-pointer group"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[#818CF8]">DoD Switcher</span>
            <ChevronUp size={13} className="text-slate-400 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <div className="rounded-xl border border-[#334155] bg-[#0F172A]/95 backdrop-blur-md p-3 shadow-2xl space-y-2 w-72 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#334155]">
              <span className="text-[11px] font-bold text-[#818CF8] font-mono flex items-center gap-1.5">
                <Sliders size={13} />
                <span>HF-16 DoD State Switcher</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDevOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Thu nhỏ"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleSwitchPreviewMode('no_team')}
                className={`px-2 py-1 rounded text-left truncate cursor-pointer ${
                  previewMode === 'no_team' && !errorMessage
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f]'
                }`}
              >
                1. Chưa có đội
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewMode('in_team')}
                className={`px-2 py-1 rounded text-left truncate cursor-pointer ${
                  previewMode === 'in_team' && !errorMessage
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f]'
                }`}
              >
                2. Đã có đội (3/4)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewMode('full')}
                className={`px-2 py-1 rounded text-left truncate cursor-pointer ${
                  previewMode === 'full' && !errorMessage
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f]'
                }`}
              >
                3. Đủ 4 người
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewMode('loading')}
                className={`px-2 py-1 rounded text-left truncate cursor-pointer ${
                  previewMode === 'loading'
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f]'
                }`}
              >
                4. Loading
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewMode('error')}
                className={`col-span-2 px-2 py-1 rounded text-center cursor-pointer ${
                  errorMessage
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f]'
                }`}
              >
                5. Lỗi kết nối API (500)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Quản Lý Đội Thi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quy định đội thi từ 3 đến 5 thành viên. Mỗi thành viên chỉ thuộc duy nhất một đội.
          </p>
        </div>

        {!team && !isLoading && !errorMessage && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setIsJoinOpen(true)} className="gap-2 cursor-pointer">
              <UserPlus size={16} />
              <span>Gia nhập bằng mã mời</span>
            </Button>
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2 cursor-pointer">
              <Sparkles size={16} />
              <span>Tạo đội mới</span>
            </Button>
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {errorMessage && (
        <Card className="bg-rose-950/20 border-rose-800/40 text-rose-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 className="font-semibold text-rose-100">Đã xảy ra sự cố khi tải dữ liệu</h4>
                <p className="text-sm text-rose-300/80">{errorMessage}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchPreviewMode('in_team')}
              className="border-rose-400 text-rose-200 hover:bg-rose-500/20 shrink-0 cursor-pointer"
            >
              <RefreshCw size={14} className="mr-1" /> Thử kết nối lại
            </Button>
          </div>
        </Card>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-32 rounded-2xl bg-[#1E293B]/70 animate-pulse border border-[#334155]/60" />
            <div className="h-72 rounded-2xl bg-[#1E293B]/70 animate-pulse border border-[#334155]/60" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 rounded-2xl bg-[#1E293B]/70 animate-pulse border border-[#334155]/60" />
            <div className="h-44 rounded-2xl bg-[#1E293B]/70 animate-pulse border border-[#334155]/60" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRẠNG THÁI ĐÃ CÓ ĐỘI - LAYOUT 2 CỘT TỐI ƯU TOÀN DIỆN (ĐẠT 100% FEEDBACK MINH) */}
      {/* ========================================================================= */}
      {!isLoading && !errorMessage && team && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* CỘT CHÍNH (TRÁI ~70%): QUẢN LÝ ĐỘI THI & BẢNG THÀNH VIÊN */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8 space-y-6 shadow-xl">
              {/* Header Card Đội thi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#334155]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-['Righteous'] text-2xl sm:text-3xl text-white">
                      {team.team_name}
                    </h2>
                    <Badge variant="success">
                      Đã Phê Duyệt
                    </Badge>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-mono">
                      {team.members.length}/{team.max_members} Thành viên
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {team.description || 'Chưa cập nhật mô tả định hướng nghiên cứu.'}
                  </p>
                </div>
              </div>

              {/* BOX MÃ MỜI THAM GIA ĐỘI - THIẾT KẾ NỔI BẬT HÀI HÒA (FEEDBACK 5) */}
              <div className="rounded-[12px] border border-[#334155] bg-[#0F172A] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-mono flex items-center gap-1.5">
                    <Share2 size={13} className="text-[#818CF8]" />
                    Mã mời tham gia đội (Invite Code)
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[#818CF8]">
                      {team.invite_code}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Chỉ chia sẻ cho thành viên trong nhóm)
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(team.invite_code)}
                  className="gap-2 shrink-0 cursor-pointer"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </Button>
              </div>

              {/* BẢNG THÀNH VIÊN - BỔ SUNG CỘT CHUYÊN MÔN & TRẠNG THÁI & TOOLTIP (FEEDBACK 5) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Righteous'] text-lg text-white">
                    Danh Sách Thành Viên ({team.members.length}/{team.max_members})
                  </h3>
                  <span className="text-xs text-slate-400">
                    {team.max_members - team.members.length > 0
                      ? `Còn thiếu ${team.max_members - team.members.length} thành viên để đạt tối đa`
                      : 'Đã đủ số lượng tối đa'}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4">Thành viên</th>
                        <th className="py-3.5 px-4">Vai trò</th>
                        <th className="py-3.5 px-4">Chuyên môn</th>
                        <th className="py-3.5 px-4 hidden md:table-cell">Trường / Đơn vị</th>
                        <th className="py-3.5 px-4 hidden sm:table-cell">Xác thực</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/60 text-slate-200">
                      {team.members.map((m) => {
                        const isSelf = m.email === currentUser?.email || m.full_name === 'Nguyễn Văn Minh';
                        const isLeaderOfTeam = m.role === 'leader';

                        return (
                          <tr key={m.id} className="hover:bg-[#1E293B]/40 transition-colors">
                            {/* Cột 1: Thông tin thành viên */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#818CF8] font-bold text-xs shrink-0">
                                  {m.full_name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-white block truncate">
                                    {m.full_name} {isSelf && <span className="text-[#818CF8] font-normal">(Bạn)</span>}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block truncate">{m.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Vai trò */}
                            <td className="py-3.5 px-4">
                              {isLeaderOfTeam ? (
                                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 text-xs">
                                  <Crown size={12} />
                                  <span>Đội Trưởng</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">Thành viên</span>
                              )}
                            </td>

                            {/* Cột 3: Chuyên môn (Skill Tags - Mới bổ sung theo Feedback) */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1 max-w-[170px]">
                                {m.skills && m.skills.length > 0 ? (
                                  m.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#1E293B] text-[#818CF8] border border-[#334155] whitespace-nowrap"
                                    >
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-500">Chưa gắn tag</span>
                                )}
                              </div>
                            </td>

                            {/* Cột 4: Trường / Đơn vị */}
                            <td className="py-3.5 px-4 hidden md:table-cell text-slate-300 truncate max-w-[150px]">
                              {m.university || 'Đại học Bách Khoa Hà Nội'}
                            </td>

                            {/* Cột 5: Trạng thái xác thực */}
                            <td className="py-3.5 px-4 hidden sm:table-cell">
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <ShieldCheck size={12} />
                                <span>Đã duyệt</span>
                              </span>
                            </td>

                            {/* Cột 6: Thao tác có Tooltip */}
                            <td className="py-3.5 px-4 text-right">
                              {isLeader && !isSelf && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleTransfer(m.id, m.full_name)}
                                    className="p-1.5 rounded-lg hover:bg-[#334155] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                                    title="Chuyển giao vai trò Đội Trưởng"
                                  >
                                    <Crown size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(m.id, m.full_name)}
                                    className="p-1.5 rounded-lg hover:bg-[#334155] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                    title="Mời thành viên rời khỏi đội"
                                  >
                                    <UserX size={15} />
                                  </button>
                                </div>
                              )}
                              {isSelf && (
                                <span className="text-[11px] text-slate-500 italic pr-2">Hiện tại</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NHÓM NÚT QUẢN TRỊ CÂN ĐỐI (FEEDBACK 5) */}
              <div className="pt-4 border-t border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLeave}
                  className="w-full sm:w-auto gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Rời khỏi đội thi</span>
                </Button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditDesc(team.description || '');
                      setIsEditOpen(true);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Chỉnh sửa thông tin</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/topics')}
                    className="gap-2 cursor-pointer"
                  >
                    <Lightbulb size={14} />
                    <span>Lối tắt chọn đề tài</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHỤ (PHẢI ~30%): TIẾN ĐỘ CHẶNG THI, ĐỀ TÀI & QUY CHẾ (FEEDBACK 1) */}
          <div className="lg:col-span-4 space-y-6">
            {/* WIDGET 1: TIẾN ĐỘ CHẶNG THI & DEADLINE NỘP BÀI */}
            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-[#818CF8]" />
                  <span>Tiến Độ &amp; Hạn Nộp Bài</span>
                </h4>
                <span className="text-[10px] font-mono bg-[#6366F1]/15 text-[#818CF8] px-2 py-0.5 rounded-full border border-[#6366F1]/30">
                  Chặng 2/4
                </span>
              </div>

              {/* Timeline Stages */}
              <div className="space-y-3 text-xs">
                {/* Chặng 1 */}
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Chặng 1: Hồ sơ &amp; Đăng ký đội</p>
                    <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Đã hoàn thành</p>
                  </div>
                </div>

                {/* Chặng 2 (Hiện tại) */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30">
                  <div className="h-5 w-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-[#C7D2FE]">Chặng 2: Nộp Báo cáo kiến trúc</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono">
                      <Clock size={12} />
                      <span>Hạn: 23:59 15/10/2026</span>
                    </div>
                    <span className="inline-block text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-medium">
                      Còn 5 ngày nộp bài
                    </span>
                  </div>
                </div>

                {/* Chặng 3 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-300">Chặng 3: Nộp Sản phẩm MVP</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">Mở ngày 20/10/2026</p>
                  </div>
                </div>

                {/* Chặng 4 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-slate-300">Chặng 4: Chung kết Pitching</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">10/11/2026</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/checkpoints')}
                  className="w-full justify-center text-xs gap-1.5 cursor-pointer"
                >
                  <span>Xem chi tiết các chặng</span>
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>

            {/* WIDGET 2: ĐỀ TÀI & LỐI TẮT CHỌN ĐỀ TÀI (/topics) */}
            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-400" />
                  <span>Đề Tài Thi Đấu</span>
                </h4>
                <Badge variant="primary" size="sm">
                  Đã Đăng Ký
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Đề tài nghiên cứu
                  </span>
                  <p className="font-semibold text-white text-sm mt-0.5">
                    {team.topic_name || 'Ứng dụng LLM & RAG trong Y tế'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Lĩnh vực dự thi
                  </span>
                  <p className="text-slate-300 mt-0.5">Healthcare AI &amp; Big Data Analysis</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Mentor hướng dẫn
                  </span>
                  <p className="text-[#818CF8] font-medium mt-0.5">TS. Trần Hoàng Nam (AI Lab)</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/topics')}
                  className="w-full justify-center text-xs gap-1.5 cursor-pointer"
                >
                  <span>Xem tài liệu &amp; Đổi đề tài</span>
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>

            {/* WIDGET 3: QUY CHẾ & LƯU Ý ĐỘI THI */}
            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 sm:p-6 shadow-xl space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-center gap-2 pb-2 border-b border-[#334155] font-semibold text-white">
                <Info size={16} className="text-[#818CF8]" />
                <span>Quy Chế &amp; Lưu Ý Đội Thi</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-slate-400">
                <li>
                  Quy mô hợp lệ: <strong className="text-slate-200">Từ 3 đến 5 thành viên</strong>.
                </li>
                <li>
                  Mỗi thí sinh chỉ được tham gia <strong className="text-slate-200">duy nhất 01 đội thi</strong>.
                </li>
                <li>
                  Hạn chốt thay đổi nhân sự: <strong className="text-amber-300">23:59 ngày 12/10/2026</strong>.
                </li>
                <li>
                  Mã mời chỉ chia sẻ nội bộ. Đội trưởng có quyền loại hoặc chuyển nhượng vai trò.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMPTY STATE: KHI CHƯA CÓ ĐỘI THI */}
      {/* ========================================================================= */}
      {!isLoading && !errorMessage && !team && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 rounded-[16px] border border-[#334155] bg-[#1E293B] p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8]">
              <Users size={40} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-['Righteous'] text-2xl sm:text-3xl text-white">
                Bạn Chưa Thuộc Đội Thi Nào
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Để tham gia chọn đề tài và nộp các bài thi các chặng, bạn cần tạo một đội thi mới hoặc tham gia đội thi có sẵn qua mã mời 6 ký tự.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsJoinOpen(true)}
                className="w-full sm:w-auto gap-2 px-6 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Gia nhập bằng mã mời</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto gap-2 px-6 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Tạo đội thi mới</span>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 shadow-xl space-y-4">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <Calendar size={16} className="text-[#818CF8]" />
                <span>Lịch Trình Ghép Đội</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Giai đoạn đăng ký và ghép đội đang diễn ra. Hãy hoàn tất thành lập đội thi trước thời hạn chốt của Ban Tổ Chức:
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono">
                Deadline chốt đội: 23:59 12/10/2026
              </div>
            </div>

            <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 shadow-xl space-y-3 text-xs text-slate-300">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>Lưu Ý Cho Thí Sinh</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Nếu bạn chưa có nhóm, có thể tham gia nhóm Zalo / Discord của HackFlow để tìm kiếm đồng đội phù hợp với kỹ năng của mình.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Team */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Đăng Ký Đội Thi Mới"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Tên Đội Thi (Team Name) *"
            placeholder="Ví dụ: AI Titans, GreenWave..."
            value={newTeamName}
            onChange={(e) => {
              setNewTeamName(e.target.value);
              if (createError) setCreateError('');
            }}
            error={createError}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-sm">
              Mô tả ngắn gọn &amp; Lĩnh vực quan tâm
            </label>
            <textarea
              rows={3}
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              placeholder="Giới thiệu về mục tiêu và định hướng đề tài của đội..."
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="rounded-[10px] bg-[#0F172A] p-3 text-xs text-slate-400 flex items-start gap-2 border border-[#334155]">
            <Info size={14} className="text-[#818CF8] shrink-0 mt-0.5" />
            <span>
              Người tạo đội sẽ tự động trở thành <strong>Đội Trưởng</strong> và nhận mã mời 6 ký tự để gửi cho các thành viên còn lại.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)} className="cursor-pointer">
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isCreating}
              disabled={isCreating || !newTeamName.trim()}
              className="cursor-pointer"
            >
              Xác nhận tạo đội
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Team */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Tham Gia Đội Bằng Mã Mời"
      >
        <form onSubmit={handleJoinTeam} className="space-y-4">
          <Input
            label="Mã mời tham gia đội *"
            placeholder="Nhập 6 ký tự (ví dụ: CS8821)"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              if (joinError) setJoinError('');
            }}
            error={joinError}
            required
            className="font-mono uppercase tracking-widest text-center text-lg font-bold"
          />

          <p className="text-xs text-slate-400 leading-relaxed">
            Mã mời do Đội trưởng cung cấp. Khi nhập chính xác, bạn sẽ được tự động thêm vào danh sách thành viên của đội.
          </p>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsJoinOpen(false)} className="cursor-pointer">
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isJoining}
              disabled={isJoining || !joinCode.trim()}
              className="cursor-pointer"
            >
              Gia nhập đội
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Team Info */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Chỉnh Sửa Thông Tin Đội Thi"
      >
        <form onSubmit={handleUpdateTeamInfo} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-sm">
              Mô tả &amp; Định hướng đề tài
            </label>
            <textarea
              rows={4}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Cập nhật giới thiệu về giải pháp của đội..."
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)} className="cursor-pointer">
              Hủy
            </Button>
            <Button variant="primary" type="submit" className="cursor-pointer">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};