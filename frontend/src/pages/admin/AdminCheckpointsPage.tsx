import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  CheckSquare,
  Plus,
  Edit2,
  Clock,
  GitBranch,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { Checkpoint } from '../../types';

export const AdminCheckpointsPage: React.FC = () => {
  const { checkpoints, submissions, teams, updateCheckpoint } = useMockStore();

  const [editingCp, setEditingCp] = useState<Checkpoint | null>(null);
  const [deadline, setDeadline] = useState('');
  const [weight, setWeight] = useState(25);
  const [alert, setAlert] = useState<string | null>(null);

  const handleEdit = (cp: Checkpoint) => {
    setEditingCp(cp);
    setDeadline(cp.deadline.slice(0, 16));
    setWeight(cp.weight || 25);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;

    updateCheckpoint(editingCp.id, {
      deadline: new Date(deadline).toISOString(),
      weight,
    });

    setEditingCp(null);
    setAlert('Đã cập nhật thời hạn & trọng số Checkpoint thành công!');
    setTimeout(() => setAlert(null), 3000);
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
            Cấu Hình Chặng Nộp & Thời Hạn
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quản lý các mốc nộp bài bắt buộc, trọng số đóng góp vào điểm chung cuộc và thời điểm đóng cổng nộp.
          </p>
        </div>

        <Badge variant="indigo">{checkpoints.length} Chặng nộp</Badge>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Checkpoints Cards */}
      <div className="space-y-4">
        {checkpoints.map((cp, idx) => {
          const cpSubmissions = submissions.filter((s) => s.checkpointId === cp.id);
          const approvedTeamsCount = teams.filter((t) => t.status === 'approved').length;

          return (
            <div
              key={cp.id}
              className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-xs">
                    #{idx + 1}
                  </div>
                  <h3 className="font-['Righteous'] text-xl text-white">{cp.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="indigo">Trọng số {cp.weight}%</Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(cp)}
                    className="gap-1.5"
                  >
                    <Edit2 size={13} />
                    <span>Cấu hình</span>
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {cp.description}
              </p>

              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-[#334155]/60 text-xs text-slate-400 gap-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[#818CF8]" />
                  <span>Hạn chót đóng cổng:</span>
                  <span className="font-semibold text-white">
                    {new Date(cp.deadline).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-emerald-400" />
                  <span>Tỷ lệ hoàn thành:</span>
                  <span className="font-bold text-emerald-400">
                    {cpSubmissions.length} / {approvedTeamsCount} đội ({Math.round((cpSubmissions.length / (approvedTeamsCount || 1)) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingCp)}
        onClose={() => setEditingCp(null)}
        title={`Chỉnh Sửa Chặng: ${editingCp?.title || ''}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Thời hạn nộp bài *"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />

          <Input
            label="Trọng số đánh giá (% tổng điểm) *"
            type="number"
            min={5}
            max={50}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setEditingCp(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
