import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Megaphone,
  Plus,
  Send,
  Bell,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const AdminAnnouncementsPage: React.FC = () => {
  const { announcements, broadcastAnnouncement } = useMockStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'candidates' | 'judges' | 'mentors'>('all');
  const [alert, setAlert] = useState<string | null>(null);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    broadcastAnnouncement(title.trim(), content.trim(), targetRole);
    setIsAddOpen(false);
    setTitle('');
    setContent('');
    setAlert('Đã phát thông báo mới tới toàn hệ thống!');
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
            Phát Thông Báo Cuộc Thi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gửi thông điệp khẩn cấp hoặc cập nhật thời hạn tới tất cả thí sinh, giám khảo và cố vấn.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Phát Thông Báo Mới</span>
        </Button>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <Megaphone size={18} className="text-[#818CF8]" />
                <h3 className="font-bold text-white text-base">{ann.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={13} />
                <span>{ann.createdAt}</span>
                <Badge variant="indigo">
                  {ann.targetRole === 'all'
                    ? 'Tất cả mọi người'
                    : ann.targetRole === 'candidates'
                    ? 'Thí sinh'
                    : 'Giám khảo'}
                </Badge>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{ann.content}</p>

            <div className="text-[11px] text-[#818CF8] font-medium pt-1">
              Phát bởi: {ann.sender}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Broadcast */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Phát Thông Báo Mới">
        <form onSubmit={handleBroadcast} className="space-y-4">
          <Input
            label="Tiêu đề thông báo *"
            placeholder="Ví dụ: Gia hạn nộp Checkpoint 3 thêm 2 tiếng..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Đối tượng nhận thông báo *</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
            >
              <option value="all">Toàn bộ cuộc thi (Tất cả vai trò)</option>
              <option value="candidates">Chỉ Thí sinh</option>
              <option value="judges">Chỉ Ban Giám Khảo</option>
              <option value="mentors">Chỉ Cố Vấn</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Nội dung chi tiết *</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Nhập thông tin hướng dẫn hoặc quy chế..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" className="gap-1.5">
              <Send size={15} />
              <span>Phát thông báo ngay</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
