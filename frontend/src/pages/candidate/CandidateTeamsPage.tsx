import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import {
  Users,
  Copy,
  Check,
  UserPlus,
  Shield,
  Crown,
  UserX,
  LogOut,
  Sparkles,
  Info,
} from 'lucide-react';

export const CandidateTeamsPage: React.FC = () => {
  const {
    currentUser,
    teams,
    createTeam,
    joinTeamWithCode,
    transferTeamLeader,
    removeTeamMember,
    leaveTeam,
  } = useMockStore();

  const [copied, setCopied] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const isLeader = currentUser.teamRole === 'leader' || myTeam?.leaderId === currentUser.id;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const res = createTeam(newTeamName.trim(), newTeamDesc.trim());
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setIsCreateOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    const res = joinTeamWithCode(joinCode.trim());
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setIsJoinOpen(false);
      setJoinCode('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleTransfer = (memberId: string) => {
    if (!myTeam) return;
    if (window.confirm('Bạn có chắc chắn muốn chuyển giao vị trí Đội Trưởng?')) {
      transferTeamLeader(myTeam.id, memberId);
      setActionMessage({ text: 'Đã chuyển giao vai trò Đội Trưởng thành công!', type: 'success' });
    }
  };

  const handleRemove = (memberId: string) => {
    if (!myTeam) return;
    if (window.confirm('Bạn có chắc chắn muốn mời thành viên này rời khỏi đội?')) {
      removeTeamMember(myTeam.id, memberId);
      setActionMessage({ text: 'Đã xóa thành viên khỏi đội.', type: 'success' });
    }
  };

  const handleLeave = () => {
    if (!myTeam) return;
    if (window.confirm('Bạn có chắc chắn muốn rời khỏi đội này?')) {
      leaveTeam(myTeam.id);
      setActionMessage({ text: 'Bạn đã rời đội thành công.', type: 'success' });
    }
  };

  return (
    <div className="space-y-6 font-['Roboto']">
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

        {!myTeam && (
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

      {actionMessage && (
        <div
          className={`p-3.5 rounded-[10px] text-xs font-medium border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {myTeam ? (
        /* Team Detail View */
        <div className="space-y-6">
          {/* Team Info Card */}
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#334155]">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Righteous'] text-2xl sm:text-3xl text-white">
                    {myTeam.name}
                  </h2>
                  <Badge
                    variant={
                      myTeam.status === 'approved'
                        ? 'success'
                        : myTeam.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {myTeam.status === 'approved'
                      ? 'Đã Phê Duyệt'
                      : myTeam.status === 'rejected'
                      ? 'Bị Từ Chối'
                      : 'Chờ Phê Duyệt'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300">{myTeam.description}</p>
              </div>

              {/* Invite Code Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-[12px] bg-[#0F172A] border border-[#334155]">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Mã mời tham gia đội
                  </span>
                  <span className="font-mono text-xl font-bold tracking-widest text-[#818CF8]">
                    {myTeam.inviteCode}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(myTeam.inviteCode)}
                  className="gap-1.5"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </Button>
              </div>
            </div>

            {/* Member List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-['Righteous'] text-lg text-white">
                  Danh Sách Thành Viên ({myTeam.members.length}/4)
                </h3>
                <span className="text-xs text-slate-400">
                  {4 - myTeam.members.length > 0
                    ? `Còn thiếu ${4 - myTeam.members.length} thành viên để đạt tối đa`
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
                    {myTeam.members.map((m) => {
                      const isSelf = m.id === currentUser.id;
                      const isLeaderOfTeam = m.id === myTeam.leaderId;

                      return (
                        <tr key={m.id} className="hover:bg-[#1E293B]/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#818CF8] font-bold text-xs">
                                {m.fullName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-white block">
                                  {m.fullName} {isSelf && <span className="text-[#818CF8]">(Bạn)</span>}
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
                            @{m.githubUsername || 'github_user'}
                          </td>

                          <td className="py-3.5 px-4 hidden md:table-cell text-slate-300">
                            {m.university || 'Đại học Bách Khoa Hà Nội'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isLeader && !isLeaderOfTeam && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const memberId = m.id || m.userId;
                                    if (memberId) handleTransfer(memberId);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-[#334155] text-amber-300 hover:text-amber-200 transition-colors"
                                  title="Chuyển giao quyền Đội Trưởng"
                                >
                                  <Crown size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    const memberId = m.id || m.userId;
                                    if (memberId) handleRemove(memberId);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-[#334155] text-rose-400 hover:text-rose-300 transition-colors"
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

            {/* Bottom Actions */}
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
        /* Empty State: Create or Join */
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
      )}

      {/* Modal: Create Team */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Đăng Ký Đội Thi Mới"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Tên Đội Thi (Team Name)"
            placeholder="Ví dụ: AI Titans, GreenWave..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
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

          <div className="rounded-[10px] bg-[#0F172A] p-3 text-xs text-slate-400 flex items-start gap-2">
            <Info size={14} className="text-[#818CF8] shrink-0 mt-0.5" />
            <span>
              Người tạo đội sẽ tự động trở thành <strong>Đội Trưởng</strong> và nhận mã mời 6 ký tự để gửi cho các thành viên còn lại.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
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
            label="Mã mời tham gia đội"
            placeholder="Nhập 6 ký tự (ví dụ: CS8821)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
            <Button variant="primary" type="submit">
              Gia nhập đội
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
