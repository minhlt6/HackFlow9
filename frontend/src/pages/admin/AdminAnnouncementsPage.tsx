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
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const AdminAnnouncementsPage: React.FC = () => {
  const { announcements, broadcastAnnouncement, deleteAnnouncement } = useMockStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'candidates' | 'judges' | 'mentors'>('all');
  const [alert, setAlert] = useState<string | null>(null);

  const handleDelete = (id: string, annTitle: string) => {
    if (window.confirm(`Xác nhận xóa thông báo "${annTitle}"?`)) {
      deleteAnnouncement(id);
      setAlert(`Đã xóa thông báo "${annTitle}"`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

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
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Phát Thông Báo Cuộc Thi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gửi thông điệp khẩn cấp hoặc cập nhật thời hạn tới tất cả thí sinh, giám khảo và cố vấn.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Phát Thông Báo Mới</span>
        </Button>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-card">
            <Megaphone size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground mb-1">Chưa Có Thông Báo Nào</h3>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
              Ban tổ chức chưa phát đi thông báo nào tới thí sinh và hội đồng. Hãy tạo thông báo mới khi có thông tin cần truyền tải.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
              <Plus size={14} />
              <span>Phát Thông Báo Mới</span>
            </Button>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="rounded-[16px] border border-border bg-card p-6 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <Megaphone size={18} className="text-primary" />
                  <h3 className="font-bold text-foreground text-base">{ann.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <button
                    type="button"
                    onClick={() => handleDelete(ann.id, ann.title)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa thông báo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{ann.content}</p>

              <div className="text-[11px] text-primary font-medium pt-1">
                Phát bởi: {ann.sender}
              </div>
            </div>
          ))
        )}
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
            <label className="text-muted-foreground font-medium text-xs">Đối tượng nhận thông báo *</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="p-2.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
            >
              <option value="all">Toàn bộ cuộc thi (Tất cả vai trò)</option>
              <option value="candidates">Chỉ Thí sinh</option>
              <option value="judges">Chỉ Ban Giám Khảo</option>
              <option value="mentors">Chỉ Cố Vấn</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Nội dung chi tiết *</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
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
