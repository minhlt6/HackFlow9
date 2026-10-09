import React, { useState, useEffect } from 'react';
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
  const currentUser = useAuthStore((state) => state.user);

  // State dữ liệu đội thi
  const [team, setTeam] = useState<TeamDetails | null>(mockTeamInTeam);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('in_team');

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

  // Đổi trạng thái kiểm thử (Dev Preview Mode theo DoD)
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

  const isLeader = true; // Cho phép tương tác như leader trên demo

  return (
    <div className="space-y-6 font-['Roboto'] max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-medium border text-sm animate-in fade-in slide-in-from-bottom-5 duration-200 ${
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

      {/* DEV PREVIEW CONTROLS BAR (Kiểm thử DoD: Chưa có đội, Đã có đội, Loading, Lỗi) */}
      <div className="bg-[#131B2E] border border-[#243049] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
          <span className="font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-['Poppins']">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            HF-16 Trình chọn trạng thái:
          </span>
          <span className="text-slate-400 hidden lg:inline">
            (Chuyển đổi nhanh đối chiếu giao diện)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleSwitchPreviewMode('no_team')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              previewMode === 'no_team' && !errorMessage
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f] border border-[#334155]'
            }`}
          >
            1. Chưa có đội
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPreviewMode('in_team')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              previewMode === 'in_team' && !errorMessage
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f] border border-[#334155]'
            }`}
          >
            2. Đã có đội (3/4)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPreviewMode('full')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              previewMode === 'full' && !errorMessage
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                : 'bg-[#1E293B] text-slate-300 hover:bg-[#28374f] border border-[#334155]'
            }`}
          >
            3. Đội đủ 4 người
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPreviewMode('loading')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              previewMode === 'loading'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-[#1E293B] text-slate-400 hover:bg-[#28374f] border border-[#334155]'
            }`}
          >
            Loading
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPreviewMode('error')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              errorMessage
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'bg-[#1E293B] text-slate-400 hover:bg-[#28374f] border border-[#334155]'
            }`}
          >
            Lỗi kết nối
          </button>
        </div>
      </div>

      {/* Top Header (Khớp 100% Demo) */}
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
            <Button variant="secondary" onClick={() => setIsJoinOpen(true)} className="gap-2">
              <UserPlus size={16} />
              <span>Gia nhập bằng mã mời</span>
            </Button>
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
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
              className="border-rose-400 text-rose-200 hover:bg-rose-500/20 shrink-0"
            >
              <RefreshCw size={14} className="mr-1" /> Thử kết nối lại
            </Button>
          </div>
        </Card>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-28 rounded-[16px] bg-[#1E293B]/70 animate-pulse border border-[#334155]/60"></div>
          <div className="h-64 rounded-[16px] bg-[#1E293B]/70 animate-pulse border border-[#334155]/60"></div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRẠNG THÁI ĐÃ CÓ ĐỘI (KHỚP 100% DEMO VÀ SCREENSHOT CỦA USER) */}
      {/* ========================================================================= */}
      {!isLoading && !errorMessage && team ? (
        <div className="space-y-6">
          {/* Team Info Card */}
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#334155]">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Righteous'] text-2xl sm:text-3xl text-white">
                    {team.team_name}
                  </h2>
                  <Badge variant="success">
                    Đã Phê Duyệt
                  </Badge>
                </div>
                <p className="text-sm text-slate-300">{team.description}</p>
              </div>

              {/* Invite Code Section (Khớp 100% Demo) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-[12px] bg-[#0F172A] border border-[#334155]">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-['Poppins']">
                    Mã mời tham gia đội
                  </span>
                  <span className="font-mono text-xl font-bold tracking-widest text-[#818CF8]">
                    {team.invite_code}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(team.invite_code)}
                  className="gap-1.5"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </Button>
              </div>
            </div>

            {/* Member List (Khớp 100% Demo) */}
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
                      <th className="py-3.5 px-4 hidden sm:table-cell">GitHub</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">Trường / Đơn vị</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60 text-slate-200">
                    {team.members.map((m) => {
                      const isSelf = m.email === currentUser?.email || m.full_name === 'Nguyễn Văn Minh';
                      const isLeaderOfTeam = m.role === 'leader';

                      return (
                        <tr key={m.id} className="hover:bg-[#1E293B]/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#818CF8] font-bold text-xs">
                                {m.full_name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-white block">
                                  {m.full_name} {isSelf && <span className="text-[#818CF8] font-normal">(Bạn)</span>}
                                </span>
                                <span className="text-[11px] text-slate-400">{m.email}</span>
                              </div>
                            </div>
                          </td>

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

                          <td className="py-3.5 px-4 hidden sm:table-cell font-mono text-slate-300">
                            @{m.github_username || 'github_user'}
                          </td>

                          <td className="py-3.5 px-4 hidden md:table-cell text-slate-300">
                            {m.university || 'Đại học Bách Khoa Hà Nội'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isLeader && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTransfer(m.id, m.full_name)}
                                  className="p-1.5 rounded-md hover:bg-[#334155] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                                  title="Chuyển giao quyền Đội Trưởng"
                                >
                                  <Crown size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(m.id, m.full_name)}
                                  className="p-1.5 rounded-md hover:bg-[#334155] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  title="Xóa thành viên"
                                >
                                  <UserX size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions (Khớp nút đỏ Rời khỏi đội thi trong screenshot) */}
            <div className="pt-4 border-t border-[#334155] flex justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={handleLeave}
                className="gap-2"
              >
                <LogOut size={14} />
                <span>Rời khỏi đội thi</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Create or Join (Khớp 100% Demo) */
        !isLoading &&
        !errorMessage && (
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-12 text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8]">
              <Users size={38} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-['Righteous'] text-2xl text-white">Bạn Chưa Thuộc Đội Thi Nào</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Để tham gia chọn đề tài và nộp các bài thi, bạn cần tạo một đội thi mới hoặc tham gia đội có sẵn thông qua mã mời.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsJoinOpen(true)}
                className="w-full sm:w-auto gap-2 px-6"
              >
                <UserPlus size={16} />
                <span>Gia nhập bằng mã mời</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto gap-2 px-6"
              >
                <Sparkles size={16} />
                <span>Tạo đội thi mới</span>
              </Button>
            </div>
          </div>
        )
      )}

      {/* Modal: Create Team (Khớp 100% Demo) */}
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
              Mô tả ngắn gọn & Lĩnh vực quan tâm
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
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isCreating}
              disabled={isCreating || !newTeamName.trim()}
            >
              Xác nhận tạo đội
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Team (Khớp 100% Demo) */}
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
            <Button variant="ghost" type="button" onClick={() => setIsJoinOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isJoining}
              disabled={isJoining || !joinCode.trim()}
            >
              Gia nhập đội
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};