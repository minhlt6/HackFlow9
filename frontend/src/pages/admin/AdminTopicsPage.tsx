import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const AdminTopicsPage: React.FC = () => {
  const { majorTopics, addMajorTopic, deleteMajorTopic, addSubTopic, updateSubTopicQuota } =
    useMockStore();

  // Major Topic Modal
  const [isAddMajorOpen, setIsAddMajorOpen] = useState(false);
  const [majorTitle, setMajorTitle] = useState('');
  const [majorDescription, setMajorDescription] = useState('');

  // Subtopic Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMajorId, setSelectedMajorId] = useState(majorTopics[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quota, setQuota] = useState(3);
  const [mentorName, setMentorName] = useState('Dr. Lê Quang');

  // Edit Quota Modal
  const [editingSubTopic, setEditingSubTopic] = useState<{ id: string; title: string; quota: number } | null>(null);
  const [newQuotaValue, setNewQuotaValue] = useState(3);
  const [alert, setAlert] = useState<string | null>(null);

  const handleAddMajor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!majorTitle.trim()) return;

    addMajorTopic(majorTitle.trim(), majorDescription.trim());
    setIsAddMajorOpen(false);
    setMajorTitle('');
    setMajorDescription('');
    setAlert(`Đã thêm lĩnh vực đề tài lớn "${majorTitle}" thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDeleteMajor = (id: string, name?: string) => {
    const displayName = name || 'lĩnh vực này';
    if (window.confirm(`Bạn có chắc muốn xóa lĩnh vực "${displayName}" cùng toàn bộ đề tài nhánh?`)) {
      deleteMajorTopic(id);
      setAlert(`Đã xóa lĩnh vực "${displayName}".`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleAddSubTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMajorId) return;

    addSubTopic(selectedMajorId, {
      title: title.trim(),
      description: description.trim(),
      quota,
      mentorName: mentorName.trim(),
    });

    setIsAddOpen(false);
    setTitle('');
    setDescription('');
    setAlert(`Đã thêm đề tài nhánh mới "${title}" thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubTopic) return;

    updateSubTopicQuota(editingSubTopic.id, newQuotaValue);
    setEditingSubTopic(null);
    setAlert('Đã cập nhật chỉ tiêu Quota thành công!');
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Quản Lý Đề Tài và Hạn Ngạch Đội
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Thiết lập danh mục lĩnh vực đề tài lớn, đề tài nhánh và giới hạn số lượng đội thi đăng ký tối đa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={() => setIsAddMajorOpen(true)} className="gap-2">
            <Plus size={16} />
            <span>Thêm Lĩnh Vực Lớn</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (majorTopics.length === 0) {
                setIsAddMajorOpen(true);
              } else {
                setSelectedMajorId(majorTopics[0]?.id || '');
                setIsAddOpen(true);
              }
            }}
            className="gap-2"
          >
            <Plus size={16} />
            <span>Thêm Đề Tài Nhánh</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Major Topics List */}
      <div className="space-y-6">
        {majorTopics.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-card p-10 text-center space-y-3">
            <Lightbulb size={36} className="mx-auto text-muted-foreground" />
            <h3 className="font-bold text-foreground text-base">Chưa có đề tài nào</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Hệ thống hiện đang trống. Hãy bấm nút "Thêm Lĩnh Vực Lớn" để tạo chủ đề và đề tài thi đấu từ đầu.
            </p>
            <Button variant="primary" onClick={() => setIsAddMajorOpen(true)} className="gap-2 mt-2">
              <Plus size={16} />
              <span>Tạo Lĩnh Vực Đề Tài Đầu Tiên</span>
            </Button>
          </div>
        ) : (
          majorTopics.map((major) => (
            <div
              key={major.id}
              className="rounded-[16px] border border-border bg-card p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/20 text-primary">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold tracking-tight text-foreground text-xl text-foreground">
                      {(major.title || major.name || '').replace(/\s*&\s*/g, ' và ')}
                    </h2>
                    <p className="text-xs text-muted-foreground">{major.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="indigo">{major.subTopics.length} đề tài con</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMajorId(major.id);
                      setIsAddOpen(true);
                    }}
                    className="text-primary hover:text-foreground"
                  >
                    + Thêm đề tài con
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteMajor(major.id, major.title)}
                    title="Xóa lĩnh vực này"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* SubTopics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {major.subTopics.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs text-muted-foreground italic">
                    Chưa có đề tài con nào trong lĩnh vực này.
                  </div>
                ) : (
                  major.subTopics.map((sub) => {
                    const currentTeams = sub.currentTeams ?? sub.registeredTeamsCount ?? 0;
                    const maxQuota = sub.maxTeamsQuota ?? sub.quota ?? 10;
                    const isFull = currentTeams >= maxQuota;

                    return (
                      <div
                        key={sub.id}
                        className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border p-4 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-foreground text-sm">{sub.title}</span>
                            <Badge variant={isFull ? 'danger' : 'success'}>
                              {isFull ? 'Đã Hết Chỗ' : 'Đang Mở'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {sub.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users size={13} className="text-primary" />
                            <span>
                              Đã đăng ký: <strong className="text-foreground font-mono">{currentTeams}/{maxQuota}</strong> đội
                            </span>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingSubTopic({
                                id: sub.id,
                                title: sub.title,
                                quota: maxQuota,
                              });
                              setNewQuotaValue(maxQuota);
                            }}
                            className="!py-1 !px-2.5 text-xs gap-1"
                          >
                            <Edit2 size={12} />
                            <span>Quota</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Major Topic */}
      <Modal
        isOpen={isAddMajorOpen}
        onClose={() => setIsAddMajorOpen(false)}
        title="Thêm Lĩnh Vực / Đề Tài Lớn"
      >
        <form onSubmit={handleAddMajor} className="space-y-4">
          <Input
            label="Tên lĩnh vực / Chủ đề lớn *"
            placeholder="Ví dụ: Trí tuệ Nhân tạo & Khoa học Dữ liệu"
            value={majorTitle}
            onChange={(e) => setMajorTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả lĩnh vực</label>
            <textarea
              rows={3}
              value={majorDescription}
              onChange={(e) => setMajorDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Định hướng nghiên cứu, công nghệ trọng tâm..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddMajorOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Tạo Lĩnh Vực
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add SubTopic */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm Đề Tài Nhánh Mới"
      >
        <form onSubmit={handleAddSubTopic} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Lĩnh vực lớn *</label>
            <select
              value={selectedMajorId}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              className="p-2.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              required
            >
              {majorTopics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tiêu đề Đề tài nhánh *"
            placeholder="Ví dụ: AI Phát Hiện Bệnh Võng Mạc..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả bài toán & Dữ liệu</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Yêu cầu kỹ thuật, tập dữ liệu cung cấp..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số lượng đội tối đa *"
              type="number"
              min={1}
              max={10}
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              required
            />

            <Input
              label="Cố vấn phụ trách"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu Đề Tài
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Quota */}
      <Modal
        isOpen={Boolean(editingSubTopic)}
        onClose={() => setEditingSubTopic(null)}
        title="Điều Chỉnh Hạn Ngạch Đề Tài"
      >
        <form onSubmit={handleSaveQuota} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Đề tài: <strong className="text-foreground">{editingSubTopic?.title}</strong>
          </p>

          <Input
            label="Chỉ tiêu số đội tối đa"
            type="number"
            min={1}
            max={20}
            value={newQuotaValue}
            onChange={(e) => setNewQuotaValue(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingSubTopic(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Cập nhật Quota
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
