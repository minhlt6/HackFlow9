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
  Trash2,
  Clock,
  GitBranch,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import type { Checkpoint } from '../../types';

export const AdminCheckpointsPage: React.FC = () => {
  const {
    config,
    checkpoints,
    submissions,
    teams,
    updateCheckpoint,
    addCheckpoint,
    deleteCheckpoint,
    reorderCheckpoints,
    sortCheckpointsByDeadline,
  } = useMockStore();

  const [editingCp, setEditingCp] = useState<Checkpoint | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState(180);
  const [editWeight, setEditWeight] = useState(25);
  const [alert, setAlert] = useState<string | null>(null);

  // New Checkpoint modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState(180);
  const [newWeight, setNewWeight] = useState(25);
  const [insertPosition, setInsertPosition] = useState<string>('end');

  const durationPresets = [
    { label: '60 phút (1h)', value: 60 },
    { label: '120 phút (2h)', value: 120 },
    { label: '180 phút (3h)', value: 180 },
    { label: '240 phút (4h)', value: 240 },
    { label: '360 phút (6h)', value: 360 },
    { label: '720 phút (12h)', value: 720 },
    { label: '1440 phút (24h)', value: 1440 },
  ];

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '0 phút';
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours} giờ ${rem} phút` : `${hours} giờ`;
  };

  const handleEdit = (cp: Checkpoint) => {
    setEditingCp(cp);
    setEditTitle(cp.title || cp.name || '');
    setEditDescription(cp.description || '');
    setEditDurationMinutes(cp.durationMinutes || 180);
    setEditWeight(cp.weight || 25);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;

    updateCheckpoint(editingCp.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      durationMinutes: Number(editDurationMinutes),
      weight: Number(editWeight),
    });

    setEditingCp(null);
    setAlert(`Đã cập nhật chặng nộp với thời lượng ${editDurationMinutes} phút thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const insertIndex = insertPosition === 'end' ? undefined : Number(insertPosition);

    addCheckpoint(
      {
        title: newTitle.trim(),
        description: newDescription.trim(),
        durationMinutes: Number(newDurationMinutes),
        weight: Number(newWeight),
        deadline: new Date(Date.now() + Number(newDurationMinutes) * 60 * 1000).toISOString(),
      },
      insertIndex,
    );

    setIsAddOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setInsertPosition('end');
    setAlert(`Đã thêm chặng nộp "${newTitle}" vào đúng vị trí thứ tự thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDelete = (id: string, title?: string) => {
    const displayTitle = title || 'chặng nộp này';
    if (window.confirm(`Bạn có chắc muốn xóa chặng nộp "${displayTitle}"?`)) {
      deleteCheckpoint(id);
      setAlert(`Đã xóa chặng nộp "${displayTitle}".`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  return (
    <div className="space-y-6 font-['Roboto'] w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8]">
              <CheckSquare size={20} />
            </div>
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Cấu Hình Chặng Nộp & Thời Lượng
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Quản lý các mốc nộp bài bắt buộc, thời lượng làm bài (tính theo số phút) và trọng số điểm chung cuộc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={config.isContestStarted ? 'success' : 'warning'} className="gap-1.5 py-1 px-3">
            <span
              className={`w-2 h-2 rounded-full ${
                config.isContestStarted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{config.isContestStarted ? 'Cuộc thi đang diễn ra' : 'Cuộc thi chưa bắt đầu'}</span>
          </Badge>

          <Badge variant="indigo">{checkpoints.length} Chặng nộp</Badge>

          {checkpoints.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => {
                sortCheckpointsByDeadline();
                setAlert('Đã tự động sắp xếp lại các chặng theo mốc thời hạn (Deadline từ sớm đến muộn)!');
                setTimeout(() => setAlert(null), 3000);
              }}
              className="gap-2 text-xs"
              title="Tự động sắp xếp các chặng theo thời hạn deadline từ sớm đến muộn"
            >
              <ArrowUpDown size={14} />
              <span>Sắp xếp theo Deadline</span>
            </Button>
          )}

          <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus size={16} />
            <span>Thêm Chặng Nộp Mới</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-500/40 text-xs sm:text-sm text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{alert}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Checkpoints Cards */}
      <div className="space-y-4">
        {checkpoints.length === 0 ? (
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-10 text-center space-y-3">
            <CheckSquare size={36} className="mx-auto text-slate-500" />
            <h3 className="font-bold text-white text-base">Chưa có chặng nộp bài nào</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Hệ thống hiện đang ở trạng thái sạch. Hãy bấm nút "Thêm Chặng Nộp Mới" để thiết lập các mốc nộp bài cho cuộc thi.
            </p>
            <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2 mt-2">
              <Plus size={16} />
              <span>Tạo Chặng Nộp Đầu Tiên</span>
            </Button>
          </div>
        ) : (
          checkpoints.map((cp, idx) => {
            const cpSubmissions = submissions.filter((s) => s.checkpointId === cp.id);
            const approvedTeamsCount = teams.filter((t) => t.status === 'approved').length;
            const duration = cp.durationMinutes || 180;

            return (
              <div
                key={cp.id}
                className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                  <div className="flex items-center gap-3">
                    {/* Order & Re-ordering buttons */}
                    <div className="flex items-center gap-0.5 bg-[#0F172A] border border-[#334155] rounded-[8px] p-0.5 shadow-sm">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          reorderCheckpoints(idx, idx - 1);
                          setAlert(`Đã chuyển chặng "${cp.title}" lên vị trí #${idx}!`);
                          setTimeout(() => setAlert(null), 2500);
                        }}
                        className="p-1 rounded-[6px] text-slate-400 hover:text-white hover:bg-[#1E293B] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title={idx === 0 ? 'Đã ở vị trí đầu tiên' : `Di chuyển lên vị trí #${idx}`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <div className="flex h-7 px-2 items-center justify-center text-[#818CF8] font-bold text-xs font-mono">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        disabled={idx === checkpoints.length - 1}
                        onClick={() => {
                          reorderCheckpoints(idx, idx + 1);
                          setAlert(`Đã chuyển chặng "${cp.title}" xuống vị trí #${idx + 2}!`);
                          setTimeout(() => setAlert(null), 2500);
                        }}
                        className="p-1 rounded-[6px] text-slate-400 hover:text-white hover:bg-[#1E293B] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title={idx === checkpoints.length - 1 ? 'Đã ở vị trí cuối cùng' : `Di chuyển xuống vị trí #${idx + 2}`}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <h3 className="font-['Righteous'] text-lg sm:text-xl text-white">{cp.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="indigo" className="gap-1.5 py-1 px-3">
                      <Clock size={12} />
                      <span>{duration} phút ({formatDuration(duration)})</span>
                    </Badge>
                    <Badge variant="indigo">Trọng số {cp.weight || 20}%</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(cp)}
                      className="gap-1.5"
                    >
                      <Edit2 size={13} />
                      <span>Cấu hình</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(cp.id, cp.title)}
                      className="gap-1.5"
                      title="Xóa chặng này"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  {cp.description}
                </p>

                <div className="flex flex-col md:flex-row md:items-center justify-between pt-3 border-t border-[#334155]/60 text-xs text-slate-400 gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#818CF8]" />
                      <span>Thời lượng chặng:</span>
                      <span className="font-semibold text-white">
                        {duration} phút ({formatDuration(duration)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>•</span>
                      {config.isContestStarted ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>
                            Đang đếm ngược • Hạn chót: {new Date(cp.deadline).toLocaleTimeString('vi-VN')} {new Date(cp.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <span>Chưa kích hoạt • Tự động tính sau khi phát lệnh bắt đầu</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <GitBranch size={14} className="text-emerald-400" />
                    <span>Tỷ lệ hoàn thành:</span>
                    <span className="font-bold text-emerald-400">
                      {cpSubmissions.length} / {approvedTeamsCount} đội ({Math.round((cpSubmissions.length / (approvedTeamsCount || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm Chặng Nộp Mới (Cấu Hình Theo Số Phút)"
      >
        <form onSubmit={handleAdd} className="space-y-4 font-['Roboto']">
          <Input
            label="Tiêu đề chặng nộp *"
            placeholder="Ví dụ: Chặng 1: Nộp Báo cáo Khảo sát & Thiết kế"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Mô tả yêu cầu chặng *</label>
            <textarea
              rows={3}
              placeholder="Yêu cầu các đội hoàn thiện Repo GitHub, nộp tài liệu kiến trúc..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          {/* Duration in Minutes with Quick Presets */}
          <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Clock size={15} className="text-[#818CF8]" />
                <span>Thời lượng nộp bài (Điền số phút) *</span>
              </label>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ⏱️ {newDurationMinutes} phút = {formatDuration(newDurationMinutes)}
              </span>
            </div>

            <Input
              type="number"
              min={15}
              max={10080}
              step={15}
              value={newDurationMinutes}
              onChange={(e) => setNewDurationMinutes(Math.max(15, Number(e.target.value)))}
              placeholder="Ví dụ: 120, 180, 360..."
              required
            />

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Chọn nhanh các mốc phổ biến:</span>
              <div className="flex flex-wrap gap-1.5">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewDurationMinutes(preset.value)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors cursor-pointer border ${
                      newDurationMinutes === preset.value
                        ? 'bg-[#6366F1] text-white border-[#6366F1]'
                        : 'bg-[#1E293B] text-slate-300 border-[#334155] hover:border-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-[#334155]/60">
              💡 Hạn chót đóng cổng nộp bài sẽ tự động tính đúng <strong>{newDurationMinutes} phút</strong> kể từ thời điểm Ban Quản Trị phát lệnh bắt đầu cuộc thi.
            </p>
          </div>

          <Input
            label="Trọng số (% điểm tổng) *"
            type="number"
            min={5}
            max={100}
            value={newWeight}
            onChange={(e) => setNewWeight(Number(e.target.value))}
            required
          />

          {/* Position Selector */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155]">
            <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#818CF8]" />
              <span>Vị trí chèn chặng nộp *</span>
            </label>
            <select
              value={insertPosition}
              onChange={(e) => setInsertPosition(e.target.value)}
              className="p-2.5 rounded-[10px] bg-[#1E293B] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
            >
              <option value="end">Chèn vào cuối cùng (Mặc định)</option>
              <option value="0">Chèn lên đầu tiên (Trước Chặng 1)</option>
              {checkpoints.map((cp, idx) => (
                <option key={cp.id} value={String(idx + 1)}>
                  Chèn vào sau Chặng {idx + 1}: {cp.title || cp.name}
                  {idx === 0 && checkpoints.length > 1 ? ' (ở giữa Chặng 1 và Chặng 2)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Cách chèn vào giữa Chặng 1 và Chặng 2:</strong> Chọn tùy chọn <em>"Chèn vào sau Chặng 1 (ở giữa Chặng 1 và Chặng 2)"</em>. Chặng mới sẽ được đặt ở vị trí số 2, và Chặng 2 cũ sẽ tự động lùi thành Chặng 3.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Tạo Chặng Nộp
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingCp)}
        onClose={() => setEditingCp(null)}
        title={`Chỉnh Sửa Chặng: ${editingCp?.title || ''}`}
      >
        <form onSubmit={handleSave} className="space-y-4 font-['Roboto']">
          <Input
            label="Tiêu đề chặng nộp *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Mô tả yêu cầu chặng *</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          {/* Duration in Minutes with Quick Presets */}
          <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Clock size={15} className="text-[#818CF8]" />
                <span>Thời lượng nộp bài (Điền số phút) *</span>
              </label>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ⏱️ {editDurationMinutes} phút = {formatDuration(editDurationMinutes)}
              </span>
            </div>

            <Input
              type="number"
              min={15}
              max={10080}
              step={15}
              value={editDurationMinutes}
              onChange={(e) => setEditDurationMinutes(Math.max(15, Number(e.target.value)))}
              required
            />

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Chọn nhanh các mốc phổ biến:</span>
              <div className="flex flex-wrap gap-1.5">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setEditDurationMinutes(preset.value)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors cursor-pointer border ${
                      editDurationMinutes === preset.value
                        ? 'bg-[#6366F1] text-white border-[#6366F1]'
                        : 'bg-[#1E293B] text-slate-300 border-[#334155] hover:border-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-[#334155]/60">
              💡 Hạn chót đóng cổng nộp bài sẽ tự động cập nhật đúng <strong>{editDurationMinutes} phút</strong> kể từ khi cuộc thi bắt đầu.
            </p>
          </div>

          <Input
            label="Trọng số đánh giá (% tổng điểm) *"
            type="number"
            min={5}
            max={100}
            value={editWeight}
            onChange={(e) => setEditWeight(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]">
            <Button variant="ghost" type="button" onClick={() => setEditingCp(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu Thay Đổi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
