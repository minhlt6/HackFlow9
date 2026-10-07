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
  Users,
  GraduationCap,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const AdminTopicsPage: React.FC = () => {
  const { majorTopics, addSubTopic, updateSubTopicQuota } = useMockStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMajorId, setSelectedMajorId] = useState(majorTopics[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quota, setQuota] = useState(3);
  const [mentorName, setMentorName] = useState('Dr. Lê Quang');
  const [editingSubTopic, setEditingSubTopic] = useState<{ id: string; title: string; quota: number } | null>(null);
  const [newQuotaValue, setNewQuotaValue] = useState(3);
  const [alert, setAlert] = useState<string | null>(null);

  const handleAddSubTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
            Quản Lý Đề Tài & Hạn Ngạch Đội
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Thiết lập danh mục đề tài lớn, đề tài nhánh và giới hạn số lượng đội thi đăng ký tối đa.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Thêm Đề Tài Nhánh</span>
        </Button>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Major Topics List */}
      <div className="space-y-6">
        {majorTopics.map((major) => (
          <div
            key={major.id}
            className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/20 text-[#818CF8]">
                  <Lightbulb size={22} />
                </div>
                <div>
                  <h3 className="font-['Righteous'] text-xl text-white">{major.name}</h3>
                  <p className="text-xs text-slate-400">{major.description}</p>
                </div>
              </div>

              <Badge variant="indigo">{major.subTopics.length} đề tài nhánh</Badge>
            </div>

            {/* Subtopics Table */}
            <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tên Đề Tài Nhánh</th>
                    <th className="py-3 px-4">Cố Vấn Chuyên Môn</th>
                    <th className="py-3 px-4 text-center">Đã Đăng Ký / Quota</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Chỉnh Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-slate-200">
                  {major.subTopics.map((sub) => {
                    const registeredCount = sub.registeredTeamsCount ?? sub.currentTeams ?? 0;
                    const quotaCount = sub.quota ?? sub.maxTeamsQuota ?? 3;
                    const isFull = registeredCount >= quotaCount;
                    return (
                      <tr key={sub.id} className="hover:bg-[#1E293B]/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white max-w-sm">
                          <div>{sub.title}</div>
                          <div className="text-[11px] text-slate-400 font-normal line-clamp-1">
                            {sub.description}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <GraduationCap size={13} className="text-[#818CF8]" />
                            <span>{sub.mentorName || 'Chưa phân công'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono">
                          <span className={isFull ? 'text-rose-400' : 'text-emerald-400'}>
                            {registeredCount}
                          </span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-slate-300">{quotaCount} đội</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={isFull ? 'danger' : 'success'}>
                            {isFull ? 'Đã Hết Suất' : 'Còn Suất'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingSubTopic({ id: sub.id, title: sub.title, quota: quotaCount });
                              setNewQuotaValue(quotaCount);
                            }}
                            className="p-1.5 rounded-md hover:bg-[#334155] text-[#818CF8] hover:text-white transition-colors"
                            title="Điều chỉnh Quota"
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add SubTopic */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm Đề Tài Nhánh Mới">
        <form onSubmit={handleAddSubTopic} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Thuộc Đề Tài Lớn *</label>
            <select
              value={selectedMajorId}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              className="p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
            >
              {majorTopics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
            <label className="text-slate-300 font-medium text-xs">Mô tả bài toán & Dữ liệu</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
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
          <p className="text-xs text-slate-300">
            Đề tài: <strong className="text-white">{editingSubTopic?.title}</strong>
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
