import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  ListOrdered,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
} from 'lucide-react';

export const AdminWhitelistPage: React.FC = () => {
  const {
    whitelist,
    addWhitelistEntry,
    bulkImportWhitelist,
    toggleWhitelistActive,
    removeWhitelistEntry,
  } = useMockStore();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [singleEmail, setSingleEmail] = useState('');
  const [singleNote, setSingleNote] = useState('Sinh viên Khóa K20');
  const [bulkText, setBulkText] = useState(
    'candidate1@uet.vnu.edu.vn\ncandidate2@fpt.edu.vn\ncandidate3@hust.edu.vn',
  );
  const [alert, setAlert] = useState<string | null>(null);

  const filtered = whitelist.filter(
    (w) =>
      w.email.toLowerCase().includes(search.toLowerCase()) ||
      (w.note && w.note.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;

    addWhitelistEntry(singleEmail.trim(), singleNote.trim());
    setIsAddOpen(false);
    setSingleEmail('');
    setAlert(`Đã thêm ${singleEmail} vào Whitelist thành công!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = bulkText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (emails.length === 0) return;

    const count = bulkImportWhitelist(emails, 'Import danh sách sinh viên hợp lệ');
    setIsBulkOpen(false);
    setAlert(`Đã import thành công ${count} email mới vào Whitelist!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDelete = (id: string, email: string) => {
    if (window.confirm(`Xóa email ${email} khỏi danh sách Whitelist?`)) {
      removeWhitelistEntry(id);
    }
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
            Quản Lý Danh Sách Hợp Lệ
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
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
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Filter and Stats */}
      <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm email, ghi chú đơn vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-[#0F172A] border border-[#334155] text-white text-xs placeholder-slate-400 focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-400">
          Tổng cộng: <strong className="text-white">{whitelist.length}</strong> email trong danh sách
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Địa Chỉ Email</th>
                <th className="py-3.5 px-4">Ghi Chú Đơn Vị</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Ngày Thêm</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                    Chưa có email nào trong danh sách hợp lệ. Bấm "Thêm Email" hoặc "Nhập Danh Sách Hàng Loạt" để cấu hình.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#1E293B]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-white">{item.email}</td>
                  <td className="py-3.5 px-4 text-slate-300">{item.note || '—'}</td>
                  <td className="py-3.5 px-4 hidden sm:table-cell text-slate-400">{item.addedAt}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleWhitelistActive(item.id)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                        item.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-slate-700/50 text-slate-400 border-slate-600/40 hover:bg-slate-700'
                      }`}
                    >
                      {item.isActive ? 'Kích hoạt' : 'Tạm khóa'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id, item.email)}
                      className="p-1.5 rounded-md hover:bg-[#334155] text-rose-400 hover:text-rose-300 transition-colors"
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
          <p className="text-xs text-slate-300">
            Dán danh sách email cần thêm vào ô bên dưới, mỗi email trên một dòng (hoặc cách nhau bằng dấu phẩy):
          </p>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full p-3 font-mono text-xs rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 focus:border-[#6366F1] focus:outline-none"
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
