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
  fetchMockTeam,
  mockCreateTeamApi,
  mockJoinTeamApi,
} from '../mocks/mockTeams';
import { teamsApi } from '../api/teamsApi';
import apiClient from '../api/axiosClient';
import type { TeamDetails, TeamMember } from '../types/team';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';

type PreviewMode = 'no_team' | 'in_team' | 'full' | 'loading' | 'error';

const TEAM_STORAGE_KEY = 'hackflow_team_details_clean_v1';

const loadInitialTeam = (): TeamDetails | null => {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TeamDetails | null;
      if (parsed && Array.isArray(parsed.members)) {
        const hasLeader = parsed.members.some((m) => m.role === 'leader');
        if (!hasLeader && parsed.members.length > 0) {
          parsed.members = parsed.members.map((m, idx) => ({
            ...m,
            role: m.user_id === parsed.leader_id || idx === 0 ? 'leader' : 'member',
          }));
        }
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
};

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const transferTeamLeaderInStore = useMockStore((state) => state.transferTeamLeader);
  const removeTeamMemberInStore = useMockStore((state) => state.removeTeamMember);

  // State dữ liệu đội thi
const [team, setTeamState] = useState<TeamDetails | null>(loadInitialTeam);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('no_team');
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);

  // Thành viên đang đăng nhập / đóng vai xem trang (mặc định khớp email user hoặc Nguyễn Văn Minh)
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    const initial = loadInitialTeam();
    if (initial && currentUser?.email) {
      const matched = initial.members.find(
        (m) => m.email.toLowerCase() === currentUser.email.toLowerCase(),
      );
      if (matched) return matched.id;
    }
    return initial?.members[0]?.id || 'tm-01';
  });

  const setTeam = (nextTeam: TeamDetails | null) => {
    setTeamState(nextTeam);
    try {
      if (nextTeam) {
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeam));
      } else {
        localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  // Đồng bộ thông tin đội thi khi mở trang hoặc khi có cập nhật đề tài
  useEffect(() => {
    let isMounted = true;
    const loadTeam = async () => {
      try {
        const remoteTeam = await teamsApi.getMyTeam();
        if (isMounted) {
          setTeam(remoteTeam ?? null);
          setPreviewMode(remoteTeam ? 'in_team' : 'no_team');
          if (remoteTeam && currentUser?.email) {
            const matched = remoteTeam.members.find(
              (m) => m.email.toLowerCase() === currentUser.email.toLowerCase(),
            );
            if (matched) setActiveMemberId(matched.id);
          }
          useMockStore.getState().syncFromBackend?.();
          return;
        }
      } catch {
        // Fallback local
      }
    };
    void loadTeam();

    const handleTeamUpdate = () => {
      setTeam(loadInitialTeam());
    };
    window.addEventListener('hackflow_team_updated', handleTeamUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('hackflow_team_updated', handleTeamUpdate);
    };
  }, [currentUser?.email]);


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

  // Modal Chuyển giao quyền Đội Trưởng & Mời thành viên rời đội & Rời đội
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [isLeaveOpen, setIsLeaveOpen] = useState<boolean>(false);

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

  // Xác định thành viên hiện tại (Bạn) và người đang cầm quyền Đội Trưởng
  const selfMember: TeamMember | null = team
    ? team.members.find((m) => m.id === activeMemberId) ||
      team.members.find(
        (m) => currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase(),
      ) ||
      team.members[0] ||
      null
    : null;

  const isMemberLeader = (m: TeamMember): boolean => {
    if (!team) return false;
    const explicitLeader = team.members.find((mem) => mem.role === 'leader');
    if (explicitLeader) {
      return explicitLeader.id === m.id;
    }
    return team.leader_id === m.user_id || team.leader_id === m.id;
  };

  // Chỉ người đang cầm quyền Đội Trưởng mới có isLeader = true
  const isLeader: boolean = Boolean(selfMember && isMemberLeader(selfMember));
  const currentLeaderMember: TeamMember | null =
    team?.members.find((m) => isMemberLeader(m)) || null;

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
      setTeamState(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchMockTeam(mode, 300);
      setTeam(result);
      if (result && result.members.length > 0) {
        setActiveMemberId(result.members[0].id);
      }
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
      let created: TeamDetails;
      try {
        created = await teamsApi.createTeam({ team_name: trimmed });
      } catch (apiErr: unknown) {
        const apiMsg = (apiErr as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (apiMsg) throw new Error(apiMsg, { cause: apiErr });
        created = await mockCreateTeamApi({ team_name: trimmed });
      }
      if (newTeamDesc.trim()) {
        created.description = newTeamDesc.trim();
      }
      setTeam(created);
      if (created.members[0]) {
        setActiveMemberId(created.members[0].id);
      }
      setPreviewMode('in_team');
      setIsCreateOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      useMockStore.getState().syncFromBackend?.();
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
      let joined: TeamDetails;
      try {
        joined = await teamsApi.joinTeam({ invite_code: cleaned });
      } catch (apiErr: unknown) {
        const apiMsg = (apiErr as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (apiMsg) throw new Error(apiMsg, { cause: apiErr });
        joined = await mockJoinTeamApi({ invite_code: cleaned });
      }
      setTeam(joined);
      if (currentUser?.email) {
        const matched = joined.members.find(
          (m) => m.email.toLowerCase() === currentUser.email.toLowerCase(),
        );
        if (matched) setActiveMemberId(matched.id);
      }
      setPreviewMode('in_team');
      setIsJoinOpen(false);
      setJoinCode('');
      useMockStore.getState().syncFromBackend?.();
      showToast(`Gia nhập thành công đội thi "${joined.team_name}"!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gia nhập đội thất bại.';
      setJoinError(msg);
      showToast(msg, 'error');
    } finally {
      setIsJoining(false);
    }
  };

  // Cập nhật mô tả đội (chỉ Đội Trưởng)
  const handleUpdateTeamInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !isLeader) {
      showToast('Chỉ Đội Trưởng mới có quyền chỉnh sửa thông tin đội thi.', 'error');
      return;
    }
    setTeam({
      ...team,
      description: editDesc,
    });
    setIsEditOpen(false);
    showToast('Đã cập nhật thông tin giới thiệu đội thi!', 'success');
  };

  // Mở modal xác nhận chuyển quyền Đội Trưởng (chỉ Đội Trưởng hiện tại mới gọi được)
  const handleOpenTransferModal = (member: TeamMember) => {
    if (!team || !isLeader) {
      showToast('Chỉ Đội Trưởng hiện tại mới có quyền chuyển nhượng vai trò Đội Trưởng.', 'error');
      return;
    }
    if (isMemberLeader(member)) return;
    setTransferTarget(member);
  };

  // Xác nhận chuyển giao quyền Đội Trưởng
  const handleConfirmTransfer = async () => {
    if (!team || !isLeader || !transferTarget) return;

    try {
      const res = await apiClient.patch('/teams/leader', {
        new_leader_id: transferTarget.user_id,
      });
      if (res.data?.data) {
        setTeam(res.data.data);
      }
    } catch {
      const updatedMembers = team.members.map((m) => ({
        ...m,
        role: (m.id === transferTarget.id ? 'leader' : 'member') as 'leader' | 'member',
      }));

      setTeam({
        ...team,
        leader_id: transferTarget.user_id,
        members: updatedMembers,
      });
    }

    transferTeamLeaderInStore(team.id, transferTarget.user_id);
    useMockStore.getState().syncFromBackend?.();

    const newLeaderName = transferTarget.full_name;
    setTransferTarget(null);
    showToast(
      `Đã chuyển quyền Đội Trưởng cho ${newLeaderName}. Bạn hiện là Thành viên của đội.`,
      'success',
    );
  };

  // Mở modal xác nhận mời thành viên ra khỏi đội (chỉ Đội Trưởng hiện tại mới gọi được)
  const handleOpenRemoveModal = (member: TeamMember) => {
    if (!team || !isLeader) {
      showToast('Chỉ Đội Trưởng mới có quyền mời thành viên rời khỏi đội.', 'error');
      return;
    }
    if (isMemberLeader(member)) return;
    setRemoveTarget(member);
  };

  // Xác nhận mời thành viên ra khỏi đội
  const handleConfirmRemove = async () => {
    if (!team || !isLeader || !removeTarget) return;

    try {
      const res = await apiClient.delete(`/teams/members/${removeTarget.user_id}`);
      if (res.data?.data) {
        setTeam(res.data.data);
      }
    } catch {
      const updatedMembers = team.members.filter((m) => m.id !== removeTarget.id);
      setTeam({
        ...team,
        member_count: updatedMembers.length,
        members: updatedMembers,
      });
    }

    removeTeamMemberInStore(team.id, removeTarget.user_id);
    useMockStore.getState().syncFromBackend?.();

    const removedName = removeTarget.full_name;
    setRemoveTarget(null);
    showToast(`Đã mời thành viên ${removedName} rời khỏi đội.`, 'info');
  };

  // Rời khỏi đội thi
  const handleConfirmLeave = async () => {
    if (!team) return;
    if (isLeader && team.members.length > 1) {
      showToast(
        'Bạn đang là Đội Trưởng. Vui lòng chuyển quyền Đội Trưởng cho thành viên khác trước khi rời đội!',
        'error',
      );
      setIsLeaveOpen(false);
      return;
    }
    try {
      await apiClient.post('/teams/leave');
    } catch {
      // ignore if offline
    }
    setTeam(null);
    setPreviewMode('no_team');
    setIsLeaveOpen(false);
    useMockStore.getState().syncFromBackend?.();
    showToast('Bạn đã rời khỏi đội thi.', 'info');
  };

  return (
    <div className="space-y-6  max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-foreground font-medium border text-sm animate-in fade-in slide-in-from-top-3 duration-200 ${
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 dark:bg-slate-900/60 hover:bg-accent border border-border text-muted-foreground hover:text-foreground text-xs shadow-xl transition-all cursor-pointer group"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-primary">DoD Switcher</span>
            <ChevronUp size={13} className="text-muted-foreground group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 backdrop-blur-md p-3 shadow-2xl space-y-2 w-72 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-border">
              <span className="text-[11px] font-bold text-primary font-mono flex items-center gap-1.5">
                <Sliders size={13} />
                <span>HF-16 DoD State Switcher</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDevOpen(false)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
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
                    : 'bg-card text-muted-foreground hover:bg-accent'
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
                    : 'bg-card text-muted-foreground hover:bg-accent'
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
                    : 'bg-card text-muted-foreground hover:bg-accent'
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
                    : 'bg-card text-muted-foreground hover:bg-accent'
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
                    : 'bg-card text-muted-foreground hover:bg-accent'
                }`}
              >
                5. Lỗi kết nối API (500)
              </button>
            </div>

            {team && team.members.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block">
                  Góc nhìn thành viên (Ai là &quot;Bạn&quot;):
                </span>
                <div className="space-y-1">
                  {team.members.map((m) => {
                    const active = selfMember?.id === m.id;
                    const memberIsLeader = isMemberLeader(m);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveMemberId(m.id);
                          showToast(
                            `Đang xem với tư cách: ${m.full_name} (${memberIsLeader ? 'Đội Trưởng' : 'Thành viên'})`,
                            'info',
                          );
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#6366F1]/25 border border-[#6366F1]/50 text-foreground font-semibold'
                            : 'bg-card text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <span className="truncate">{m.full_name}</span>
                        {memberIsLeader ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                            <Crown size={10} />
                            <span>Đội Trưởng</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground shrink-0">Thành viên</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Quản Lý Đội Thi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
        <Card className="bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 className="font-semibold text-rose-700 dark:text-rose-400">Đã xảy ra sự cố khi tải dữ liệu</h4>
                <p className="text-sm text-rose-700 dark:text-rose-400">{errorMessage}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchPreviewMode('in_team')}
              className="border-rose-400 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 shrink-0 cursor-pointer"
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
            <div className="h-32 rounded-2xl bg-card animate-pulse border border-border" />
            <div className="h-72 rounded-2xl bg-card animate-pulse border border-border" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 rounded-2xl bg-card animate-pulse border border-border" />
            <div className="h-44 rounded-2xl bg-card animate-pulse border border-border" />
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
            <div className="rounded-[16px] border border-border bg-card p-6 lg:p-8 space-y-6 shadow-xl">
              {/* Header Card Đội thi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl text-foreground">
                      {team.team_name}
                    </h2>
                    <Badge variant="success">
                      Đã Phê Duyệt
                    </Badge>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6366F1]/15 text-primary border border-[#6366F1]/30 font-mono">
                      {team.members.length}/{team.max_members} Thành viên
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {team.description || 'Chưa cập nhật mô tả định hướng nghiên cứu.'}
                  </p>
                </div>
              </div>

              {/* BOX MÃ MỜI THAM GIA ĐỘI - THIẾT KẾ NỔI BẬT HÀI HÒA (FEEDBACK 5) */}
              <div className="rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block font-mono flex items-center gap-1.5">
                    <Share2 size={13} className="text-primary" />
                    Mã mời tham gia đội (Invite Code)
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-primary">
                      {team.invite_code}
                    </span>
                    <span className="text-xs text-muted-foreground">
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
                  {copied ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </Button>
              </div>

              {/* BẢNG THÀNH VIÊN - BỔ SUNG CỘT CHUYÊN MÔN & TRẠNG THÁI & TOOLTIP (FEEDBACK 5) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground">
                      Danh Sách Thành Viên ({team.members.length}/{team.max_members})
                    </h3>
                    {isLeader ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <Crown size={12} />
                        <span>Bạn đang là Đội Trưởng</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                        <span>Bạn đang là Thành viên</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {team.max_members - team.members.length > 0
                      ? `Còn thiếu ${team.max_members - team.members.length} thành viên để đạt tối đa`
                      : 'Đã đủ số lượng tối đa'}
                  </span>
                </div>

                {/* Thông báo phân quyền khi người dùng hiện tại KHÔNG phải là Đội Trưởng */}
                {!isLeader && currentLeaderMember && (
                  <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-400">
                    <div className="flex items-start sm:items-center gap-2">
                      <Crown size={15} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        Quyền <strong>Chuyển nhượng Đội Trưởng</strong> và <strong>Mời thành viên ra khỏi đội</strong> hiện thuộc về Đội Trưởng{' '}
                        <strong className="text-foreground">{currentLeaderMember.full_name}</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMemberId(currentLeaderMember.id);
                        showToast(
                          `Đã chuyển góc nhìn sang Đội Trưởng: ${currentLeaderMember.full_name}`,
                          'info',
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-700 dark:text-amber-400 font-medium text-[11px] shrink-0 transition-colors cursor-pointer"
                    >
                      Xem góc nhìn Đội Trưởng ({currentLeaderMember.full_name})
                    </button>
                  </div>
                )}

                <div className="overflow-hidden rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3 w-[38%]">Thành viên &amp; Đơn vị</th>
                        <th className="py-3 px-2.5 w-[20%]">Vai trò &amp; Trạng thái</th>
                        <th className="py-3 px-2.5 w-[24%]">Chuyên môn</th>
                        <th className="py-3 px-3 w-[18%] text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {team.members.map((m) => {
                        const isSelf = Boolean(selfMember && m.id === selfMember.id);
                        const isLeaderOfTeam = isMemberLeader(m);

                        return (
                          <tr key={m.id} className="hover:bg-accent transition-colors align-middle">
                            {/* Cột 1: Thông tin thành viên + Email + Trường/Đơn vị */}
                            <td className="py-3 px-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 text-primary font-bold text-xs shrink-0 mt-0.5">
                                  {m.full_name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="font-semibold text-foreground truncate">
                                    {m.full_name}{' '}
                                    {isSelf && <span className="text-primary font-normal">(Bạn)</span>}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate" title={m.email}>
                                    {m.email}
                                  </div>
                                  <div
                                    className="text-[11px] text-muted-foreground truncate"
                                    title={m.university || 'Đại học Bách Khoa Hà Nội'}
                                  >
                                    {m.university || 'Đại học Bách Khoa Hà Nội'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Vai trò & Xác thực */}
                            <td className="py-3 px-2.5">
                              <div className="flex flex-col items-start gap-1">
                                {isLeaderOfTeam ? (
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 text-[11px] whitespace-nowrap">
                                    <Crown size={11} className="shrink-0" />
                                    <span>Đội Trưởng</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border text-[11px] whitespace-nowrap">
                                    Thành viên
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                                  <ShieldCheck size={11} className="shrink-0" />
                                  <span>Đã duyệt</span>
                                </span>
                              </div>
                            </td>

                            {/* Cột 3: Chuyên môn (Skill Tags) */}
                            <td className="py-3 px-2.5">
                              <div className="flex flex-wrap gap-1">
                                {m.skills && m.skills.length > 0 ? (
                                  m.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-card text-primary border border-border"
                                    >
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">Chưa gắn tag</span>
                                )}
                              </div>
                            </td>

                            {/* Cột 4: Thao tác - CHỈ ĐỘI TRƯỞNG HIỆN TẠI MỚI ĐƯỢC HIỂN THỊ NÚT CHUYỂN QUYỀN & MỜI RA KHỎI ĐỘI */}
                            <td className="py-3 px-3 text-right">
                              {isLeader && !isSelf && !isLeaderOfTeam && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTransferModal(m)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:text-amber-200 transition-colors cursor-pointer text-[11px] font-medium"
                                    title="Chuyển giao vai trò Đội Trưởng cho thành viên này"
                                  >
                                    <Crown size={13} className="shrink-0" />
                                    <span className="hidden xl:inline">Chuyển quyền</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRemoveModal(m)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                    title="Mời thành viên rời khỏi đội"
                                  >
                                    <UserX size={13} />
                                  </button>
                                </div>
                              )}
                              {!isLeader && !isSelf && (
                                <span
                                  className="text-[11px] text-slate-600 select-none"
                                  title="Chỉ Đội Trưởng mới có quyền thao tác"
                                >
                                  —
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[11px] text-muted-foreground italic">Hiện tại</span>
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
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsLeaveOpen(true)}
                  className="w-full sm:w-auto gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Rời khỏi đội thi</span>
                </Button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {isLeader && (
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
                  )}

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
            <div className="rounded-[16px] border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <CheckSquare size={16} className="text-primary" />
                  <span>Tiến Độ &amp; Hạn Nộp Bài</span>
                </h4>
                <span className="text-[10px] font-mono bg-[#6366F1]/15 text-primary px-2 py-0.5 rounded-full border border-[#6366F1]/30">
                  Chặng 2/4
                </span>
              </div>

              {/* Timeline Stages */}
              <div className="space-y-3 text-xs">
                {/* Chặng 1 */}
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Chặng 1: Hồ sơ &amp; Đăng ký đội</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">Đã hoàn thành</p>
                  </div>
                </div>

                {/* Chặng 2 (Hiện tại) */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30">
                  <div className="h-5 w-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-primary">Chặng 2: Nộp Báo cáo kiến trúc</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                      <Clock size={12} />
                      <span>Hạn: 23:59 15/10/2026</span>
                    </div>
                    <span className="inline-block text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-medium">
                      Còn 5 ngày nộp bài
                    </span>
                  </div>
                </div>

                {/* Chặng 3 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Chặng 3: Nộp Sản phẩm MVP</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Mở ngày 20/10/2026</p>
                  </div>
                </div>

                {/* Chặng 4 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Chặng 4: Chung kết Pitching</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">10/11/2026</p>
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
            <div className="rounded-[16px] border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-700 dark:text-amber-400" />
                  <span>Đề Tài Thi Đấu</span>
                </h4>
                {team?.topic_id || team?.topic_name ? (
                  <Badge variant="primary" size="sm">
                    Đã Đăng Ký
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Chưa Đăng Ký
                  </Badge>
                )}
              </div>

              {team?.topic_id || team?.topic_name ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                      Đề tài nghiên cứu
                    </span>
                    <p className="font-semibold text-foreground text-sm mt-0.5">
                      {team.topic_name}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                      Lĩnh vực dự thi
                    </span>
                    <p className="text-muted-foreground mt-0.5">Trí Tuệ Nhân Tạo &amp; Tự Động Hóa Doanh Nghiệp</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                      Trạng thái chỉ tiêu
                    </span>
                    <p className="text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">Hợp lệ • Đã giữ slot thành công</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs py-1">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400">
                    <p className="font-semibold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <AlertCircle size={14} className="text-amber-700 dark:text-amber-400" />
                      <span>Chưa đăng ký đề tài thi đấu</span>
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                      Đội của bạn hiện chưa chọn đề tài. Hãy truy cập danh mục để chọn đề tài nghiên cứu phù hợp trước khi hết slot.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant={team?.topic_id || team?.topic_name ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => navigate('/topics')}
                  className="w-full justify-center text-xs gap-1.5 cursor-pointer"
                >
                  <span>
                    {team?.topic_id || team?.topic_name
                      ? 'Xem tài liệu & Đổi đề tài'
                      : 'Chọn đề tài ngay'}
                  </span>
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>

            {/* WIDGET 3: QUY CHẾ & LƯU Ý ĐỘI THI */}
            <div className="rounded-[16px] border border-border bg-card p-5 sm:p-6 shadow-xl space-y-3.5 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-2 pb-2 border-b border-border font-semibold text-foreground">
                <Info size={16} className="text-primary" />
                <span>Quy Chế &amp; Lưu Ý Đội Thi</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                <li>
                  Quy mô hợp lệ: <strong className="text-foreground">Từ 3 đến 5 thành viên</strong>.
                </li>
                <li>
                  Mỗi thí sinh chỉ được tham gia <strong className="text-foreground">duy nhất 01 đội thi</strong>.
                </li>
                <li>
                  Hạn chốt thay đổi nhân sự: <strong className="text-amber-700 dark:text-amber-400">23:59 ngày 12/10/2026</strong>.
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
          <div className="lg:col-span-8 rounded-[16px] border border-border bg-card p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-primary">
              <Users size={40} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl text-foreground">
                Bạn Chưa Thuộc Đội Thi Nào
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
            <div className="rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-4">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                <span>Lịch Trình Ghép Đội</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Giai đoạn đăng ký và ghép đội đang diễn ra. Hãy hoàn tất thành lập đội thi trước thời hạn chốt của Ban Tổ Chức:
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-mono">
                Deadline chốt đội: 23:59 12/10/2026
              </div>
            </div>

            <div className="rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-3 text-xs text-muted-foreground">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700 dark:text-emerald-400" />
                <span>Lưu Ý Cho Thí Sinh</span>
              </h4>
              <p className="text-muted-foreground leading-relaxed">
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
            <label className="text-muted-foreground font-medium text-sm">
              Mô tả ngắn gọn &amp; Lĩnh vực quan tâm
            </label>
            <textarea
              rows={3}
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              placeholder="Giới thiệu về mục tiêu và định hướng đề tài của đội..."
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="rounded-[10px] bg-muted/40 dark:bg-slate-900/60 p-3 text-xs text-muted-foreground flex items-start gap-2 border border-border">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
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

          <p className="text-xs text-muted-foreground leading-relaxed">
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
            <label className="text-muted-foreground font-medium text-sm">
              Mô tả &amp; Định hướng đề tài
            </label>
            <textarea
              rows={4}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Cập nhật giới thiệu về giải pháp của đội..."
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-[#6366F1] focus:outline-none"
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

      {/* Modal: Xác nhận Chuyển giao quyền Đội Trưởng */}
      <Modal
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        title="Xác Nhận Chuyển Quyền Đội Trưởng"
      >
        {transferTarget && (
          <div className="space-y-4">
            <div className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Đội Trưởng hiện tại (Bạn):</span>
                <span className="font-semibold text-foreground">
                  {selfMember?.full_name} → <span className="text-muted-foreground">Thành viên</span>
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Đội Trưởng mới:</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                  <Crown size={14} />
                  <span>{transferTarget.full_name}</span>
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Email: <span className="text-muted-foreground font-mono">{transferTarget.email}</span>
              </div>
            </div>

            <div className="rounded-[10px] bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle size={16} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Sau khi xác nhận, <strong>{transferTarget.full_name}</strong> sẽ nắm quyền Đội Trưởng. Bạn sẽ trở thành{' '}
                <strong>Thành viên</strong> và không còn hiển thị các chức năng chuyển quyền Đội Trưởng hay mời thành viên khác ra khỏi đội.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setTransferTarget(null)}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleConfirmTransfer}
                className="gap-1.5 cursor-pointer"
              >
                <Crown size={15} />
                <span>Xác nhận chuyển quyền</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Xác nhận Mời thành viên rời khỏi đội */}
      <Modal
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Mời Thành Viên Rời Khỏi Đội"
      >
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn mời thành viên{' '}
              <strong className="text-foreground">{removeTarget.full_name}</strong> ({removeTarget.email}) rời khỏi đội thi{' '}
              <strong className="text-primary">{team?.team_name}</strong>?
            </p>

            {team && team.members.length - 1 < team.min_members && (
              <div className="rounded-[10px] bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle size={15} className="text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Lưu ý: Sau khi xóa thành viên này, đội sẽ còn {team.members.length - 1}/{team.min_members} thành viên tối thiểu theo quy định.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleConfirmRemove}
                className="gap-1.5 cursor-pointer"
              >
                <UserX size={15} />
                <span>Xác nhận mời rời đội</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Xác nhận Rời khỏi đội thi */}
      <Modal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        title="Xác Nhận Rời Khỏi Đội Thi"
      >
        <div className="space-y-4">
          {isLeader && team && team.members.length > 1 ? (
            <div className="rounded-[10px] bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5 leading-relaxed">
              <Crown size={16} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Bạn đang giữ vai trò <strong>Đội Trưởng</strong> của đội <strong>{team.team_name}</strong>. Vui lòng{' '}
                <strong>chuyển quyền Đội Trưởng</strong> cho một thành viên khác trong danh sách trước khi rời khỏi đội.
              </span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn rời khỏi đội thi <strong className="text-foreground">{team?.team_name}</strong>?
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsLeaveOpen(false)}
              className="cursor-pointer"
            >
              Đóng
            </Button>
            {(!isLeader || (team && team.members.length <= 1)) && (
              <Button
                variant="danger"
                type="button"
                onClick={handleConfirmLeave}
                className="gap-1.5 cursor-pointer"
              >
                <LogOut size={15} />
                <span>Xác nhận rời đội</span>
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};