import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/patterns/ConfirmDialog';
import { Input } from '../../components/Input';
import {
  GraduationCap,
  Scale,
  Plus,
  Mail,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface JudgeRosterItem {
  id: string;
  name: string;
  email: string;
  specialization: string;
  assignedCount: number;
  avatar: string;
}

interface MentorRosterItem {
  id: string;
  name: string;
  email: string;
  topic: string;
  openTickets: number;
  avatar: string;
}

export const AdminMentorsJudgesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'judges' | 'mentors'>('judges');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Computer Vision & LLMs');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mutationRef = useRef(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [deletePersonnelTarget, setDeletePersonnelTarget] = useState<{ role: 'judge' | 'mentor'; id: string; name: string; email?: string } | null>(null);

  const [judges, setJudges] = useState<JudgeRosterItem[]>([]);
  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);

  const applyRoster = useCallback((rawList: unknown) => {
    if (!Array.isArray(rawList)) throw new Error('Danh sách tài khoản không hợp lệ.');
    const nextJudges: JudgeRosterItem[] = [];
    const nextMentors: MentorRosterItem[] = [];
    for (const item of rawList as Array<Record<string, unknown>>) {
      const role = String(item.role ?? '').toLowerCase();
      const fullName = String(item.full_name ?? item.name ?? 'Chuyên gia');
      const itemEmail = String(item.email ?? '');
      const spec = String(item.specialty ?? 'AI Architecture & System Evaluation');
      const assignedTeams = Array.isArray(item.assigned_team_ids)
        ? item.assigned_team_ids.length
        : 0;
      const avatarChar = fullName.trim().charAt(0).toUpperCase() || 'U';
      if (role === 'judge') {
        nextJudges.push({
          id: String(item.id),
          name: fullName,
          email: itemEmail,
          specialization: spec,
          assignedCount: assignedTeams,
          avatar: avatarChar,
        });
      } else if (role === 'mentor') {
        nextMentors.push({
          id: String(item.id),
          name: fullName,
          email: itemEmail,
          topic: spec,
          openTickets: 0,
          avatar: avatarChar,
        });
      }
    }
    setJudges(nextJudges);
    setMentors(nextMentors);

  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/personnel')
      .then((res) => { if (active) applyRoster(res.data.data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài khoản.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyRoster]);

  const handleDeleteJudge = (id: string, judgeName: string, judgeEmail?: string) => {
    setDeletePersonnelTarget({ role: 'judge', id, name: judgeName, email: judgeEmail });
  };

  const handleDeleteMentor = (id: string, mentorName: string, mentorEmail?: string) => {
    setDeletePersonnelTarget({ role: 'mentor', id, name: mentorName, email: mentorEmail });
  };

  const executeDeletePersonnel = async () => {
    if (!deletePersonnelTarget || mutationRef.current) return;
    const target = deletePersonnelTarget;
    mutationRef.current = true;
    setIsSaving(true); setError(null); setAlert(null);
    try {
      await apiClient.delete(`/admin/personnel/${encodeURIComponent(target.id)}`);
      setJudges((list) => list.filter((item) => item.id !== target.id));
      setMentors((list) => list.filter((item) => item.id !== target.id));
      setDeletePersonnelTarget(null);
      setAlert(`Đã xóa tài khoản ${target.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa tài khoản. Vui lòng thử lại.');
    } finally {
      mutationRef.current = false; setIsSaving(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || mutationRef.current) return;
    const cleanEmail = email.trim().toLowerCase();
    setError(null); setAlert(null);
    if ([...judges, ...mentors].some((item) => item.email.trim().toLowerCase() === cleanEmail)) {
      setError('Email này đã tồn tại trong danh sách chuyên gia.');
      return;
    }
    const role = activeTab === 'judges' ? 'judge' : 'mentor';
    mutationRef.current = true; setIsSaving(true);
    try {
      const response = await apiClient.post('/admin/personnel', {
        full_name: name.trim(), email: cleanEmail, role, specialty: specialization.trim(),
      });
      const created = response.data?.data;
      if (!created?.id || created.role !== role) throw new Error('Phản hồi tạo tài khoản không hợp lệ. Vui lòng tải lại danh sách.');
      const item = { id: String(created.id), name: String(created.full_name), email: String(created.email),
        avatar: String(created.full_name).charAt(0).toUpperCase() };
      if (role === 'judge') setJudges((list) => [...list, { ...item, specialization: String(created.specialty || ''),
        assignedCount: Array.isArray(created.assigned_team_ids) ? created.assigned_team_ids.length : 0 }]);
      else setMentors((list) => [...list, { ...item, topic: String(created.specialty || ''), openTickets: 0 }]);
      setIsCreateOpen(false); setName(''); setEmail('');
      setAlert(`Đã tạo tài khoản ${role === 'judge' ? 'giám khảo' : 'cố vấn'} ${created.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      mutationRef.current = false; setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Quản Lý Hội Đồng Giám Khảo và Cố Vấn
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Phân bổ chuyên gia chấm thi độc lập và cố vấn chuyên môn hỗ trợ giải đáp kỹ thuật.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Tạo Tài Khoản Chuyên Gia</span>
        </Button>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {error && !isCreateOpen && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {isLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải danh sách tài khoản…</p>}
      {/* Tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveTab('judges')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'judges'
              ? 'border-[#6366F1] text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale size={16} />
          <span>Hội Đồng Giám Khảo ({judges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mentors')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'mentors'
              ? 'border-[#6366F1] text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap size={16} />
          <span>Cố Vấn Chuyên Môn ({mentors.length})</span>
        </button>
      </div>

      {/* Empty States */}
      {!isLoading && !error && activeTab === 'judges' && judges.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-card">
          <Scale size={40} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground mb-1">Chưa Có Giám Khảo</h3>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
            Hội đồng giám khảo hiện chưa có thành viên. Hãy tạo tài khoản giám khảo để bắt đầu đánh giá bài nộp.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus size={14} />
            <span>Tạo Tài Khoản Giám Khảo</span>
          </Button>
        </div>
      )}

      {!isLoading && !error && activeTab === 'mentors' && mentors.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-card">
          <GraduationCap size={40} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground mb-1">Chưa Có Cố Vấn Chuyên Môn</h3>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
            Chưa có cố vấn nào trong danh sách. Hãy tạo tài khoản cố vấn theo từng chuyên môn để hỗ trợ thí sinh.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus size={14} />
            <span>Tạo Tài Khoản Cố Vấn</span>
          </Button>
        </div>
      )}

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === 'judges'
          ? judges.map((j) => (
              <div
                key={j.id}
                className="rounded-[16px] border border-border bg-card p-5 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 font-semibold tracking-tight text-foreground text-lg border border-blue-500/30">
                      {j.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-base">{j.name}</h4>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail size={12} />
                        <span>{j.email}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteJudge(j.id, j.name, j.email)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa giám khảo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-xs space-y-1">
                  <span className="text-muted-foreground block">Chuyên môn:</span>
                  <span className="text-foreground font-medium">{j.specialization}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span className="text-muted-foreground">Đội thi được phân công:</span>
                  <Badge variant="indigo">{j.assignedCount} đội</Badge>
                </div>
              </div>
            ))
          : mentors.map((m) => (
              <div
                key={m.id}
                className="rounded-[16px] border border-border bg-card p-5 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-400 font-semibold tracking-tight text-foreground text-lg border border-purple-500/30">
                      {m.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-base">{m.name}</h4>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail size={12} />
                        <span>{m.email}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteMentor(m.id, m.name, m.email)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa cố vấn"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-xs space-y-1">
                  <span className="text-muted-foreground block">Lĩnh vực phụ trách:</span>
                  <span className="text-purple-700 dark:text-purple-400 font-medium">{m.topic}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span className="text-muted-foreground">Tickets cần hỗ trợ:</span>
                  <Badge variant={m.openTickets > 0 ? 'warning' : 'success'}>
                    {m.openTickets} tickets
                  </Badge>
                </div>
              </div>
            ))}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { if (!isSaving) { setIsCreateOpen(false); setError(null); } }}
        title={activeTab === 'judges' ? 'Tạo Tài Khoản Giám Khảo' : 'Tạo Tài Khoản Cố Vấn'}
      >
        <form onSubmit={handleCreateAccount}>
          {error && <p role="alert" className="text-sm text-rose-600 mb-4">{error}</p>}
          <fieldset disabled={isSaving} className="space-y-4">
          <Input
            label="Họ và tên chuyên gia *"
            placeholder="Ví dụ: GS. TS. Nguyễn Văn A..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Địa chỉ Email *"
            type="email"
            placeholder="expert@university.edu.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={activeTab === 'judges' ? 'Chuyên môn đánh giá' : 'Lĩnh vực đề tài hỗ trợ'}
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Tạo tài khoản
            </Button>
          </div>
        </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletePersonnelTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletePersonnelTarget(null);
        }}
        title={`Xóa ${deletePersonnelTarget?.role === 'judge' ? 'Giám khảo' : 'Cố vấn'} "${deletePersonnelTarget?.name || ''}"?`}
        description="Nhân sự này sẽ bị thu hồi quyền truy cập Hội đồng Giám khảo / Cố vấn chuyên môn trên hệ thống."
        confirmLabel="Xác nhận xóa"
        variant="destructive"
        isLoading={isSaving}
        onConfirm={executeDeletePersonnel}
      />
    </div>
  );
};
