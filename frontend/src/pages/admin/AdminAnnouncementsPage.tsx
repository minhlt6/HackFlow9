import React, { useState, useEffect, useCallback } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  notificationsApi,
  type AnnouncementItem,
} from '../../api/notificationsApi';
import { Button } from '../../components/Button';
import { Badge, type BadgeVariant } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Megaphone,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Trash2,
  Pencil,
  AlertTriangle,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

const PRIORITY_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
  urgent: { label: 'Khẩn cấp', variant: 'danger' },
  warning: { label: 'Cảnh báo', variant: 'warning' },
  info: { label: 'Thông tin', variant: 'primary' },
};

export const AdminAnnouncementsPage: React.FC = () => {
  const {
    announcements: mockAnnouncements,
    broadcastAnnouncement,
    deleteAnnouncement: storeDeleteAnnouncement,
  } = useMockStore();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State for Add & Edit
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'info' | 'warning' | 'urgent'>('info');
  const [targetRole, setTargetRole] = useState<'all' | 'candidates' | 'judges' | 'mentors'>('all');

  const showAlert = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }, []);

  /**
   * Tải danh sách thông báo từ API thật (GET /api/v1/announcements)
   */
  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await notificationsApi.listAnnouncements(1, 100);
      if (res && Array.isArray(res.items)) {
        setAnnouncements(res.items);
        return;
      }
    } catch {
      // Fallback to local mock announcements if backend is offline / mock mode
      const fallbackList: AnnouncementItem[] = mockAnnouncements.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        priority: 'info',
        created_at: m.createdAt || new Date().toISOString(),
        sender: m.sender || m.author || 'Ban Tổ Chức',
        targetRole: m.targetRole || 'all',
      }));
      setAnnouncements(fallbackList);
    } finally {
      setIsLoading(false);
    }
  }, [mockAnnouncements]);

  useEffect(() => {
    let ignore = false;
    notificationsApi
      .listAnnouncements(1, 100)
      .then((res) => {
        if (!ignore && res && Array.isArray(res.items)) {
          setAnnouncements(res.items);
        }
      })
      .catch(() => {
        if (!ignore) {
          const fallbackList: AnnouncementItem[] = mockAnnouncements.map((m) => ({
            id: m.id,
            title: m.title,
            content: m.content,
            priority: 'info',
            created_at: m.createdAt || new Date().toISOString(),
            sender: m.sender || m.author || 'Ban Tổ Chức',
            targetRole: m.targetRole || 'all',
          }));
          setAnnouncements(fallbackList);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [mockAnnouncements]);

  // Reset form
  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('info');
    setTargetRole('all');
    setEditingItem(null);
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    resetForm();
    setIsAddOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setPriority(item.priority || 'info');
    setTargetRole(item.targetRole || 'all');
    setIsAddOpen(true);
  };

  // Xử lý Thêm mới hoặc Cập nhật (POST / PUT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSubmitting(true);

      if (editingItem) {
        // Cập nhật thông báo: PUT /api/v1/announcements/{id}
        await notificationsApi.updateAnnouncement(editingItem.id, {
          title: title.trim(),
          content: content.trim(),
          priority,
        });

        showAlert(`Đã cập nhật thông báo "${title.trim()}" thành công!`);
      } else {
        // Tạo mới thông báo: POST /api/v1/announcements
        await notificationsApi.createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          priority,
        });

        // Đồng bộ store local dự phòng (không gọi lại POST /announcements lần 2)
        broadcastAnnouncement(title.trim(), content.trim(), targetRole, priority, true);
        showAlert('Đã phát thông báo mới tới toàn hệ thống thành công!');
      }

      // Đóng modal và reset form
      setIsAddOpen(false);
      resetForm();

      // Tải lại danh sách thông báo và đồng bộ tức thì với chuông thông báo trên MainLayout
      await loadAnnouncements();
      useNotificationStore.getState().fetchNotifications();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { message?: string; error_code?: string };
        };
      };

      if (axiosErr.response?.data?.message) {
        showAlert(
          `Lỗi [${axiosErr.response.status || 400}]: ${axiosErr.response.data.message}`,
          'error'
        );
      } else {
        // Fallback local mock mode if offline
        if (editingItem) {
          showAlert('Đã cập nhật thông báo cục bộ (chế độ offline).');
        } else {
          broadcastAnnouncement(title.trim(), content.trim(), targetRole, priority, true);
          showAlert('Đã phát thông báo mới cục bộ (chế độ offline).');
        }
        setIsAddOpen(false);
        resetForm();
        loadAnnouncements();
        useNotificationStore.getState().fetchNotifications();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa thông báo: DELETE /api/v1/announcements/{id}
  const handleDelete = async (id: string, annTitle: string) => {
    if (!window.confirm(`Xác nhận xóa thông báo "${annTitle}" khỏi hệ thống?`)) {
      return;
    }

    try {
      await notificationsApi.deleteAnnouncement(id);
      showAlert(`Đã xóa thông báo "${annTitle}" thành công!`);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { message?: string };
        };
      };

      if (axiosErr.response?.data?.message) {
        showAlert(
          `Lỗi [${axiosErr.response.status || 400}]: ${axiosErr.response.data.message}`,
          'error'
        );
        return;
      }

      // Fallback local delete
      storeDeleteAnnouncement(id);
      showAlert(`Đã xóa thông báo "${annTitle}" (chế độ offline).`);
    }

    await loadAnnouncements();
    // Đồng bộ tức thì với chuông thông báo
    useNotificationStore.getState().fetchNotifications();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide">
            Phát Thông Báo Cuộc Thi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gửi thông điệp khẩn cấp, nhắc nhở hoặc cập nhật thời hạn tới tất cả thí sinh, giám khảo và cố vấn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              void loadAnnouncements();
            }}
            disabled={isLoading}
            className="gap-1.5"
            title="Tải lại danh sách từ server"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus size={16} />
            <span>Phát Thông Báo Mới</span>
          </Button>
        </div>
      </div>

      {/* Alert Toast */}
      {alert && (
        <div
          className={`p-3.5 rounded-[10px] text-xs flex items-center justify-between transition-all ${
            alert.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? (
              <AlertTriangle size={16} className="shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-[16px] border border-border p-12 text-center bg-card">
            <RefreshCw size={32} className="mx-auto text-primary animate-spin mb-3" />
            <p className="text-xs text-muted-foreground">Đang tải danh sách thông báo từ máy chủ...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-card">
            <Megaphone size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold tracking-tight text-foreground text-lg mb-1">
              Chưa Có Thông Báo Nào
            </h3>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
              Ban tổ chức chưa phát đi thông báo nào tới thí sinh và hội đồng. Hãy tạo thông báo mới khi có thông tin cần truyền tải.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5">
              <Plus size={14} />
              <span>Phát Thông Báo Mới</span>
            </Button>
          </div>
        ) : (
          announcements.map((ann) => {
            const prio = PRIORITY_BADGES[ann.priority] || PRIORITY_BADGES.info;
            const timeStr = ann.created_at
              ? new Date(ann.created_at).toLocaleString('vi-VN')
              : 'Vừa xong';

            return (
              <div
                key={ann.id}
                className="rounded-[16px] border border-border bg-card p-6 space-y-3 transition-all hover:border-primary/40 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Megaphone size={18} className="text-primary shrink-0" />
                    <h3 className="font-bold text-foreground text-base">{ann.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={13} />
                      <span>{timeStr}</span>
                      <Badge variant={prio.variant}>{prio.label}</Badge>
                      {ann.targetRole && (
                        <Badge variant="indigo">
                          {ann.targetRole === 'all'
                            ? 'Tất cả mọi người'
                            : ann.targetRole === 'candidates'
                            ? 'Thí sinh'
                            : ann.targetRole === 'judges'
                            ? 'Giám khảo'
                            : 'Cố vấn'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 border-l border-border pl-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ann)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Chỉnh sửa thông báo"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ann.id, ann.title)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                <div className="text-[11px] text-primary font-medium pt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>Phát bởi: {ann.sender || ann.author || 'Ban Tổ Chức (Admin)'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Broadcast / Edit Announcement */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        title={editingItem ? 'Chỉnh Sửa Thông Báo' : 'Phát Thông Báo Mới (Chỉ Admin/BTC)'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tiêu đề thông báo *"
            placeholder="Ví dụ: Gia hạn nộp Checkpoint 3 thêm 2 tiếng..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs">
                Mức độ ưu tiên *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'info' | 'warning' | 'urgent')}
                className="p-2.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none cursor-pointer"
              >
                <option value="info">🔵 Thông tin (Info - Bình thường)</option>
                <option value="warning">🟠 Cảnh báo (Warning - Quan trọng)</option>
                <option value="urgent">🔴 Khẩn cấp (Urgent - Bắt buộc đọc)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs">
                Đối tượng nhận thông báo *
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as 'all' | 'candidates' | 'judges' | 'mentors')}
                className="p-2.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none cursor-pointer"
              >
                <option value="all">Toàn bộ cuộc thi (Tất cả vai trò)</option>
                <option value="candidates">Chỉ Thí sinh</option>
                <option value="judges">Chỉ Ban Giám Khảo</option>
                <option value="mentors">Chỉ Cố Vấn</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">
              Nội dung chi tiết thông báo *
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none leading-relaxed"
              placeholder="Nhập thông tin hướng dẫn, cập nhật quy chế, lịch trình thi hoặc thông điệp khẩn cấp..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="gap-1.5">
              <Send size={15} />
              <span>{isSubmitting ? 'Đang gửi...' : editingItem ? 'Cập nhật thông báo' : 'Phát thông báo ngay'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAnnouncementsPage;
