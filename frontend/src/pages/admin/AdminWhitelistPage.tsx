import React, { useCallback, useEffect, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { axiosClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import type { WhitelistEntry } from '../../types';
import {
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface BackendWhitelistItem {
  id: string;
  email: string;
  is_active: boolean;
  note?: string | null;
  created_at?: string | null;
}

export const AdminWhitelistPage: React.FC = () => {
  const {
    whitelist,
    addWhitelistEntry,
    bulkImportWhitelist,
    toggleWhitelistActive,
    removeWhitelistEntry,
  } = useMockStore();

  const [backendWhitelist, setBackendWhitelist] = useState<WhitelistEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [singleEmail, setSingleEmail] = useState('');
  const [singleNote, setSingleNote] = useState('Sinh viên Khóa K20');
  const [bulkText, setBulkText] = useState(
    'candidate1@uet.vnu.edu.vn\ncandidate2@fpt.edu.vn\ncandidate3@hust.edu.vn',
  );
  const [alert, setAlert] = useState<string | null>(null);

  const fetchBackendWhitelist = useCallback(async () => {
    try {
      const res = await axiosClient.get<{ data?: BackendWhitelistItem[] }>(
        '/admin/whitelist?include_inactive=true',
      );
      const list = res.data?.data;
      if (Array.isArray(list)) {
        setBackendWhitelist(
          list.map((w) => ({
            id: w.id,
            email: w.email,
            note: w.note || undefined,
            isActive: w.is_active,
            addedAt: w.created_at ? w.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          })),
        );
      }
    } catch {
      // Fallback to mock whitelist
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBackendWhitelist();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBackendWhitelist]);

  const combinedWhitelist: WhitelistEntry[] = [
    ...backendWhitelist,
    ...whitelist.filter(
      (mockItem) =>
        !backendWhitelist.some((realItem) => realItem.email.toLowerCase() === mockItem.email.toLowerCase()),
    ),
  ];

  const filtered = combinedWhitelist.filter(
    (w) =>
      w.email.toLowerCase().includes(search.toLowerCase()) ||
      (w.note && w.note.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = singleEmail.trim();
    const noteClean = singleNote.trim();
    if (!emailClean) return;

    addWhitelistEntry(emailClean, noteClean);
    setIsAddOpen(false);
    setSingleEmail('');
    try {
      await axiosClient.post('/admin/whitelist', {
        email: emailClean,
        note: noteClean || undefined,
      });
      await fetchBackendWhitelist();
    } catch {
      // Ignore if offline
    }
    setAlert(`Đã thêm ${emailClean} vào Whitelist thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = bulkText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (emails.length === 0) return;

    const count = bulkImportWhitelist(emails, 'Import danh sách sinh viên hợp lệ');
    setIsBulkOpen(false);
    try {
      await axiosClient.post('/admin/whitelist/bulk', {
        emails,
        note: 'Import danh sách sinh viên hợp lệ',
      });
      await fetchBackendWhitelist();
    } catch {
      // Ignore if offline
    }
    setAlert(`Đã import thành công ${count || emails.length} email mới vào Whitelist!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleToggleActive = async (item: WhitelistEntry) => {
    const emailLower = item.email.toLowerCase();
    toggleWhitelistActive(item.id, item.email);
    setBackendWhitelist((prev) =>
      prev.map((w) =>
        w.id === item.id || w.email.toLowerCase() === emailLower
          ? { ...w, isActive: !w.isActive }
          : w,
      ),
    );
    try {
      if (item.isActive) {
        await axiosClient.delete(`/admin/whitelist/${encodeURIComponent(item.id)}`, {
          params: { email: item.email },
        });
      } else {
        await axiosClient.patch(
          `/admin/whitelist/${encodeURIComponent(item.id)}/reactivate`,
          undefined,
          { params: { email: item.email } },
        );
      }
    } catch {
      // Ignore if mock-only
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (window.confirm(`Xóa email ${email} khỏi danh sách Whitelist?`)) {
      const emailLower = email.toLowerCase();
      removeWhitelistEntry(id, email);
      setBackendWhitelist((prev) =>
        prev.filter((w) => w.id !== id && w.email.toLowerCase() !== emailLower),
      );
      try {
        await axiosClient.delete(`/admin/whitelist/${encodeURIComponent(id)}`, {
          params: { permanent: true, email },
        });
      } catch {
        // Ignore if mock-only
      }
      setAlert(`Đã xóa ${email} khỏi danh sách Whitelist thành công!`);
      setTimeout(() => setAlert(null), 3000);
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
            Quản Lý Danh Sách Hợp Lệ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Chỉ những email nằm trong danh sách hợp lệ mới được kích hoạt tài khoản chính thức sau khi đăng nhập qua GitHub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsBulkOpen(true)} className="gap-2">
            <Upload size={16} />
            <span>Nhập Danh Sách Hàng Loạt</span>
          </Button>
          <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus size={16} />
            <span>Thêm Email</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Filter and Stats */}
      <div className="rounded-[14px] border border-border bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm email, ghi chú đơn vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Tổng cộng: <strong className="text-foreground">{combinedWhitelist.length}</strong> email trong danh sách
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Địa Chỉ Email</th>
                <th className="py-3.5 px-4">Ghi Chú Đơn Vị</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Ngày Thêm</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs italic">
                    Chưa có email nào trong danh sách hợp lệ. Bấm "Thêm Email" hoặc "Nhập Danh Sách Hàng Loạt" để cấu hình.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                <tr key={item.id} className="hover:bg-accent transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-foreground">{item.email}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{item.note || '—'}</td>
                  <td className="py-3.5 px-4 hidden sm:table-cell text-muted-foreground">{item.addedAt}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => void handleToggleActive(item)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                        item.isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {item.isActive ? 'Kích hoạt' : 'Tạm khóa'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id, item.email)}
                      className="p-1.5 rounded-md hover:bg-accent text-rose-700 dark:text-rose-400 hover:text-rose-300 transition-colors"
                      title="Xóa khỏi Whitelist"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Single Email */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm Email Hợp Lệ">
        <form onSubmit={handleAddSingle} className="space-y-4">
          <Input
            label="Địa chỉ Email *"
            type="email"
            placeholder="student@university.edu.vn"
            value={singleEmail}
            onChange={(e) => setSingleEmail(e.target.value)}
            required
          />

          <Input
            label="Ghi chú (Trường, Khóa học...)"
            placeholder="Ví dụ: Sinh viên Bách Khoa Khoa CNTT"
            value={singleNote}
            onChange={(e) => setSingleNote(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu vào danh sách
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bulk Import */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Nhập Danh Sách Hàng Loạt"
        maxWidth="lg"
      >
        <form onSubmit={handleBulkImport} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Dán danh sách email cần thêm vào ô bên dưới, mỗi email trên một dòng (hoặc cách nhau bằng dấu phẩy):
          </p>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full p-3 font-mono text-xs rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground focus:border-[#6366F1] focus:outline-none"
            placeholder="email1@domain.edu.vn&#10;email2@domain.edu.vn"
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsBulkOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Bắt đầu Import
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
