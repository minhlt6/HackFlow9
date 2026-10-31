import { useActionConfirmation } from '../../hooks/useActionConfirmation';
import { candidateApprovalsApi } from '../../api/candidateApprovalsApi';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { axiosClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import type { User } from '../../types';
import {
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
} from 'lucide-react';

interface BackendPendingCandidate {
  id: string;
  email: string;
  full_name: string;
  github_username?: string | null;
  avatar_url?: string | null;
  student_id?: string | null;
  school?: string | null;
  phone?: string | null;
  skills?: string[] | null;
  created_at?: string | null;
}

export const AdminApprovalsPage: React.FC = () => {
  const { confirm, confirmationDialog } = useActionConfirmation();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [alertIsError, setAlertIsError] = useState(false);
  const { approveCandidate, rejectCandidate } = useMockStore();
  const [backendPending, setBackendPending] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingCandidateId, setRejectingCandidateId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(
    'Email không thuộc danh sách Whitelist sinh viên hoặc chưa nộp thẻ sinh viên xác thực.',
  );
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchBackendPending = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await axiosClient.get<{ data?: BackendPendingCandidate[] }>('/admin/candidates/pending');
      const list = res.data?.data;
      if (!Array.isArray(list)) throw new Error("Danh sách chờ duyệt không hợp lệ");
      setLoadFailed(false);
      if (Array.isArray(list)) {
        useMockStore.setState({
          pendingCandidates: list.map((c) => ({
            id: c.id,
            email: c.email,
            fullName: c.full_name || c.github_username || c.email,
            role: 'candidate',
            approvalStatus: 'pending',
            githubUsername: c.github_username || undefined,
            avatarUrl: c.avatar_url || undefined,
            studentId: c.student_id || undefined,
            university: c.school || undefined,
            school: c.school || undefined,
            phone: c.phone || undefined,
            skills: Array.isArray(c.skills) ? c.skills : undefined,
          })),
        });
        setBackendPending(
          list.map((c) => ({
            id: c.id,
            email: c.email,
            fullName: c.full_name || c.github_username || c.email,
            role: 'candidate',
            approvalStatus: 'pending',
            githubUsername: c.github_username || undefined,
            avatarUrl: c.avatar_url || undefined,
            studentId: c.student_id || undefined,
            university: c.school || undefined,
            school: c.school || undefined,
            phone: c.phone || undefined,
            skills: Array.isArray(c.skills) ? c.skills : undefined,
          })),
        );
      }
      return true;
    } catch {
      setLoadFailed(true);
      setAlertIsError(true);
      setAlertMsg("Không thể tải danh sách chờ duyệt. Vui lòng làm mới trước khi duyệt.");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBackendPending();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBackendPending]);

  // Merge real backend pending candidates with mock pending candidates (deduplicating by email)
  const combinedCandidates: User[] = backendPending;

  const filteredCandidates = combinedCandidates.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.githubUsername && c.githubUsername.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleApprove = async (id: string, name: string) => {
    if (busyRef.current || loadFailed) return;
    busyRef.current = true; setBusy(true);
    try {
      if (!await confirm({title: 'Duyệt tài khoản thí sinh?', description: `Duyệt ${name} và thêm email vào Whitelist để được tham gia hệ thống?`, confirmLabel: 'Xác nhận duyệt', variant: 'primary'})) return;
      await candidateApprovalsApi.approve(id);
      approveCandidate(id);
      setBackendPending((previous) => previous.filter((candidate) => candidate.id !== id));
      setAlertIsError(false);
      setAlertMsg(`Đã phê duyệt tài khoản của thí sinh ${name}!`);
    } catch {
      setAlertIsError(true); setAlertMsg('Không thể lưu phê duyệt. Vui lòng làm mới và thử lại.');
    } finally {busyRef.current = false; setBusy(false);}
  };

  const handleApproveAll = async () => {
    if (busyRef.current || loadFailed || isRefreshing || !backendPending.length) return;
    const ids = backendPending.map((candidate) => candidate.id);
    busyRef.current = true; setBusy(true);
    try {
      if (!await confirm({title: `Duyệt tất cả ${ids.length} tài khoản đang chờ?`,
        description: `Duyệt toàn bộ ${ids.length} thí sinh trong danh sách đã tải, không phụ thuộc ô tìm kiếm, và thêm email vào Whitelist. Tài khoản mới xuất hiện sau đó không nằm trong lần duyệt này; tài khoản đã đổi trạng thái sẽ được bỏ qua.`,
        confirmLabel: `Xác nhận duyệt ${ids.length} tài khoản`, variant: 'warning'})) return;
      const result = await candidateApprovalsApi.approveAll(ids);
      const approved = new Set(result.data.approved_ids);
      setBackendPending((previous) => previous.filter((candidate) => !approved.has(candidate.id)));
      useMockStore.setState((state) => ({pendingCandidates: state.pendingCandidates.filter((candidate) => !approved.has(candidate.id))}));
      const refreshed = await fetchBackendPending();
      setAlertIsError(!refreshed); setAlertMsg(result.message + (refreshed ? "" : " Không tải lại được danh sách; vui lòng làm mới."));
    } catch {
      setAlertIsError(true); setAlertMsg('Không thể duyệt tất cả tài khoản. Dữ liệu chưa được xác nhận lưu; vui lòng làm mới và thử lại.');
    } finally {busyRef.current = false; setBusy(false);}
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCandidateId || busyRef.current) return;
    busyRef.current = true; setBusy(true);

    const targetId = rejectingCandidateId;

    try {
      await axiosClient.post(`/admin/candidates/${targetId}/approval`, {
        action: 'reject',
        note: rejectReason,
      });
    } catch {
      setAlertIsError(true); setAlertMsg('Không thể lưu phê duyệt. Vui lòng thử lại.');
      busyRef.current = false; setBusy(false);
      return;
    }

    busyRef.current = false; setBusy(false);
    setAlertIsError(false);
    rejectCandidate(targetId, rejectReason);
    setBackendPending((prev) => prev.filter((c) => c.id !== targetId));
    setRejectingCandidateId(null);
    setAlertMsg('Đã từ chối tài khoản thí sinh.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  return (
    <div className="space-y-6 ">
      {confirmationDialog}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Phê Duyệt Tài Khoản Thí Sinh
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Xác thực danh sách sinh viên đăng nhập lần đầu qua GitHub OAuth trước khi cấp quyền truy cập hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="primary" disabled={busy || isRefreshing || loadFailed || !backendPending.length} onClick={() => void handleApproveAll()}>Duyệt tất cả ({backendPending.length})</Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || isRefreshing}
            onClick={() => void fetchBackendPending()}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </Button>
          <Badge variant="warning">{combinedCandidates.length} tài khoản đang chờ</Badge>
        </div>
      </div>

      {alertMsg && (
        <div role="alert" className={`p-3.5 rounded-[10px] border text-xs flex items-center gap-2 ${alertIsError ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"}`}>
          <CheckCircle size={15} />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-[14px] border border-border bg-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, GitHub username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:border-[#6366F1] focus:outline-none"
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Thí sinh</th>
                <th className="py-3.5 px-4">GitHub Account</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Đơn vị / Trường & MSSV</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs italic">
                    Không có tài khoản nào đang chờ phê duyệt.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-accent transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {cand.avatarUrl ? (
                          <img
                            src={cand.avatarUrl}
                            alt={cand.fullName}
                            className="h-9 w-9 rounded-full object-cover border border-[#6366F1]/30"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6366F1]/20 text-primary font-bold text-xs">
                            {cand.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-foreground block">{cand.fullName}</span>
                          <span className="text-[11px] text-muted-foreground">{cand.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-primary">
                      @{cand.githubUsername || cand.email.split('@')[0] || 'github_user'}
                    </td>

                    <td className="py-3.5 px-4 hidden md:table-cell text-muted-foreground">
                      <div>{cand.university || cand.school || 'Chưa cập nhật trường'}</div>
                      {cand.studentId && (
                        <div className="text-[11px] text-muted-foreground">
                          MSSV: {cand.studentId} {cand.phone ? `• SĐT: ${cand.phone}` : ''}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="warning">Chờ Duyệt</Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          disabled={busy || isRefreshing || loadFailed}
                          onClick={() => void handleApprove(cand.id, cand.fullName)}
                          className="gap-1 px-3 cursor-pointer"
                        >
                          <CheckCircle size={14} />
                          <span>Duyệt</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => setRejectingCandidateId(cand.id)}
                          className="gap-1 px-3 cursor-pointer"
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
          <p className="text-xs text-muted-foreground">
            Vui lòng nhập lý do từ chối. Thí sinh sẽ nhìn thấy thông báo này khi đăng nhập vào hệ thống.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Lý do từ chối *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setRejectingCandidateId(null)}>
              Hủy
            </Button>
            <Button variant="danger" type="submit" disabled={busy}>
              Xác nhận từ chối
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
