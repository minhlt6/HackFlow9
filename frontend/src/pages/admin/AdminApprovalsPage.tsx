import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';

export const AdminApprovalsPage: React.FC = () => {
  const { pendingCandidates, approveCandidate, rejectCandidate } = useMockStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingCandidateId, setRejectingCandidateId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(
    'Email không thuộc danh sách Whitelist sinh viên hoặc chưa nộp thẻ sinh viên xác thực.',
  );
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const filteredCandidates = pendingCandidates.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.githubUsername && c.githubUsername.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleApprove = (id: string, name: string) => {
    approveCandidate(id);
    setAlertMsg(`Đã phê duyệt tài khoản của thí sinh ${name}!`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCandidateId) return;

    rejectCandidate(rejectingCandidateId, rejectReason);
    setRejectingCandidateId(null);
    setAlertMsg('Đã từ chối tài khoản thí sinh.');
    setTimeout(() => setAlertMsg(null), 3000);
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
            Phê Duyệt Tài Khoản Thí Sinh (OAuth Approvals)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Xác thực danh sách sinh viên đăng nhập lần đầu qua GitHub OAuth trước khi cấp quyền truy cập hệ thống.
          </p>
        </div>

        <Badge variant="warning">{pendingCandidates.length} tài khoản đang chờ</Badge>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, GitHub username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-[#0F172A] border border-[#334155] text-white text-xs placeholder-slate-400 focus:border-[#6366F1] focus:outline-none"
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Thí sinh</th>
                <th className="py-3.5 px-4">GitHub Account</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Đơn vị / Trường</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                    Không có tài khoản nào đang chờ phê duyệt.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-xs">
                          {cand.fullName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{cand.fullName}</span>
                          <span className="text-[11px] text-slate-400">{cand.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#818CF8]">
                      @{cand.githubUsername || 'github_user'}
                    </td>

                    <td className="py-3.5 px-4 hidden md:table-cell text-slate-300">
                      {cand.university || 'Đại học Bách Khoa'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="warning">Chờ Duyệt</Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(cand.id, cand.fullName)}
                          className="gap-1 px-3"
                        >
                          <CheckCircle size={14} />
                          <span>Duyệt</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectingCandidateId(cand.id)}
                          className="gap-1 px-3"
                        >
                          <XCircle size={14} />
                          <span>Từ chối</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectingCandidateId)}
        onClose={() => setRejectingCandidateId(null)}
        title="Từ Chối Phê Duyệt Tài Khoản"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-xs text-slate-300">
            Vui lòng nhập lý do từ chối. Thí sinh sẽ nhìn thấy thông báo này khi đăng nhập vào hệ thống.
          </p>

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
            <Button variant="ghost" type="button" onClick={() => setRejectingCandidateId(null)}>
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
