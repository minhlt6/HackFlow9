import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Crown,
  Search,
  Lightbulb,
} from 'lucide-react';
import type { Team } from '../../types';

export const AdminTeamsPage: React.FC = () => {
  const { teams, majorTopics, approveTeamRegistration, rejectTeamRegistration } = useMockStore();

  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [rejectingTeamId, setRejectingTeamId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Đội thi chưa đủ số lượng thành viên tối thiểu theo quy định (tối thiểu 3 thành viên).');
  const [alert, setAlert] = useState<string | null>(null);

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.leaderName || '').toLowerCase().includes(search.toLowerCase()) ||
      t.inviteCode.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApprove = (teamId: string, teamName: string) => {
    approveTeamRegistration(teamId);
    setAlert(`Đã phê duyệt đội thi ${teamName} thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTeamId) return;

    rejectTeamRegistration(rejectingTeamId, rejectReason);
    setRejectingTeamId(null);
    setAlert('Đã từ chối đăng ký của đội thi.');
    setTimeout(() => setAlert(null), 3000);
  };

  const getSubTopicTitle = (subTopicId?: string) => {
    if (!subTopicId) return 'Chưa đăng ký';
    for (const mt of majorTopics) {
      const sub = mt.subTopics.find((s) => s.id === subTopicId);
      if (sub) return sub.title;
    }
    return 'Chưa đăng ký';
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
            Quản Lý Danh Sách Đội Thi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Phê duyệt tư cách hợp lệ của các đội thi, quản lý danh sách thành viên và đề tài đăng ký.
          </p>
        </div>

        <Badge variant="indigo">{teams.length} đội đăng ký</Badge>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên đội, đội trưởng, mã mời..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-[#0F172A] border border-[#334155] text-white text-xs placeholder-slate-400 focus:border-[#6366F1] focus:outline-none"
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Đội Thi</th>
                <th className="py-3.5 px-4">Đội Trưởng</th>
                <th className="py-3.5 px-4 text-center">Số Thành Viên</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Đề Tài Đăng Ký</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <Users className="mx-auto mb-2 opacity-30 text-slate-400" size={32} />
                    Chưa có đội thi nào trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((t) => (
                <tr key={t.id} className="hover:bg-[#1E293B]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white block">{t.name}</span>
                    <span className="text-[11px] font-mono text-[#818CF8]">Mã: {t.inviteCode}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-white font-medium">
                      <Crown size={13} className="text-amber-400" />
                      <span>{t.leaderName}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] border border-[#334155] text-xs font-semibold text-slate-200">
                      {t.members.length} / 4
                    </span>
                  </td>

                  <td className="py-3.5 px-4 hidden md:table-cell text-slate-300 max-w-xs truncate">
                    {getSubTopicTitle(t.subTopicId)}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={
                        t.status === 'approved'
                          ? 'success'
                          : t.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {t.status === 'approved'
                        ? 'Đã duyệt'
                        : t.status === 'rejected'
                        ? 'Bị từ chối'
                        : 'Chờ duyệt'}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTeam(t)}
                        className="p-1.5 rounded-md hover:bg-[#334155] text-[#818CF8] hover:text-white transition-colors"
                        title="Xem chi tiết thành viên"
                      >
                        <Eye size={16} />
                      </button>

                      {t.status !== 'approved' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(t.id, t.name)}
                          className="px-2.5 py-1 text-xs"
                        >
                          Duyệt
                        </Button>
                      )}

                      {t.status !== 'rejected' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectingTeamId(t.id)}
                          className="px-2.5 py-1 text-xs"
                        >
                          Từ chối
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Team Details Modal */}
      <Modal
        isOpen={Boolean(selectedTeam)}
        onClose={() => setSelectedTeam(null)}
        title={`Chi Tiết Đội: ${selectedTeam?.name || ''}`}
        maxWidth="lg"
      >
        {selectedTeam && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-[10px] bg-[#0F172A] border border-[#334155] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Mô tả đội:</span>
                <span className="text-white font-medium">{selectedTeam.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã mời:</span>
                <span className="font-mono text-[#818CF8] font-bold">{selectedTeam.inviteCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đề tài nhánh:</span>
                <span className="text-emerald-400 font-semibold">{getSubTopicTitle(selectedTeam.subTopicId)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-white uppercase text-[11px] tracking-wider block">
                Danh sách thành viên ({selectedTeam.members.length} người)
              </span>

              <div className="space-y-2">
                {selectedTeam.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-[8px] bg-[#0F172A] border border-[#334155] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{m.fullName}</span>
                        {m.id === selectedTeam.leaderId && (
                          <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 rounded border border-amber-500/30">
                            Đội Trưởng
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px]">{m.email}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[#818CF8] block">@{m.githubUsername || 'user'}</span>
                      <span className="text-[11px] text-slate-400">{m.university || 'ĐH Bách Khoa'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="secondary" onClick={() => setSelectedTeam(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectingTeamId)}
        onClose={() => setRejectingTeamId(null)}
        title="Từ Chối Đăng Ký Đội Thi"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Lý do từ chối *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setRejectingTeamId(null)}>
              Hủy
            </Button>
            <Button variant="danger" type="submit">
              Xác nhận từ chối
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
