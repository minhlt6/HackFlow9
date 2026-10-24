import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { topicsApi } from '../../api/topicsApi';
import type { MajorTopic, SubTopic } from '../../types';

export const AdminTopicsPage: React.FC = () => {
  const { majorTopics, addMajorTopic, deleteMajorTopic, addSubTopic, updateSubTopicQuota } =
    useMockStore();

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, duration);
  };

  const mapTopics = (data: Array<{
    id: string;
    title: string;
    description?: string | null;
    subtopics?: Array<{
      id: string;
      title: string;
      description?: string | null;
      max_teams: number;
      current_teams: number;
      is_active: boolean;
    }>;
  }>): MajorTopic[] => {
    return data.map((t) => {
      const subTopics: SubTopic[] = (t.subtopics || []).map((s) => ({
        id: String(s.id),
        majorTopicId: String(t.id),
        title: s.title,
        description: s.description || '',
        quota: s.max_teams,
        maxTeamsQuota: s.max_teams,
        registeredTeamsCount: s.current_teams,
        currentTeams: s.current_teams,
        status: s.is_active ? 'OPEN' : 'CLOSED',
      }));

      return {
        id: String(t.id),
        title: t.title,
        description: t.description || '',
        subTopics,
      };
    });
  };

  // Fetch real topics from backend API
  const fetchTopics = useCallback(async () => {
    try {
      const data = await topicsApi.getTopics();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = mapTopics(data);
        useMockStore.setState({ majorTopics: mapped });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          showAlert(err.response.data?.message || 'Không thể tải danh sách đề tài từ máy chủ.', 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    topicsApi
      .getTopics()
      .then((data) => {
        if (!ignore && Array.isArray(data) && data.length > 0) {
          const mapped = mapTopics(data);
          useMockStore.setState({ majorTopics: mapped });
        }
      })
      .catch((err: unknown) => {
        if (!ignore && axios.isAxiosError(err) && err.response) {
          showAlert(err.response.data?.message || 'Không thể tải danh sách đề tài từ máy chủ.', 'error');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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

  // Edit Subtopic / Quota Modal
  const [editingSubTopic, setEditingSubTopic] = useState<{
    id: string;
    title: string;
    description: string;
    quota: number;
  } | null>(null);
  const [editSubTitle, setEditSubTitle] = useState('');
  const [editSubDesc, setEditSubDesc] = useState('');
  const [newQuotaValue, setNewQuotaValue] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMajor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!majorTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await topicsApi.createTopic({
        title: majorTitle.trim(),
        description: majorDescription.trim() || undefined,
      });
      await fetchTopics();
      showAlert(`Đã thêm lĩnh vực đề tài lớn "${majorTitle}" thành công lên máy chủ!`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          addMajorTopic(majorTitle.trim(), majorDescription.trim());
          showAlert(`Đã thêm lĩnh vực đề tài lớn "${majorTitle}" vào bộ nhớ cục bộ (ngoại tuyến).`, 'info');
        } else {
          showAlert(err.response.data?.message || 'Có lỗi xảy ra khi tạo lĩnh vực đề tài.', 'error');
          setIsSubmitting(false);
          return;
        }
      } else {
        addMajorTopic(majorTitle.trim(), majorDescription.trim());
      }
    } finally {
      setIsSubmitting(false);
    }

    setIsAddMajorOpen(false);
    setMajorTitle('');
    setMajorDescription('');
  };

  const handleDeleteMajor = async (id: string, name?: string) => {
    const displayName = name || 'lĩnh vực này';
    if (window.confirm(`Bạn có chắc muốn xóa lĩnh vực "${displayName}" cùng toàn bộ đề tài nhánh?`)) {
      try {
        await topicsApi.deleteTopic(id);
        await fetchTopics();
        showAlert(`Đã xóa lĩnh vực "${displayName}".`, 'success');
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (!err.response) {
            deleteMajorTopic(id);
            showAlert(`Đã xóa lĩnh vực "${displayName}" trong bộ nhớ cục bộ.`, 'info');
          } else {
            showAlert(err.response.data?.message || 'Có lỗi xảy ra khi xóa đề tài.', 'error');
          }
        } else {
          deleteMajorTopic(id);
        }
      }
    }
  };

  const handleAddSubTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMajorId) return;

    setIsSubmitting(true);
    try {
      await topicsApi.createSubtopic(selectedMajorId, {
        title: title.trim(),
        description: description.trim() || undefined,
        max_teams: quota,
      });
      await fetchTopics();
      showAlert(`Đã thêm đề tài nhánh mới "${title}" thành công lên máy chủ!`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          addSubTopic(selectedMajorId, {
            title: title.trim(),
            description: description.trim(),
            quota,
            mentorName: mentorName.trim(),
          });
          showAlert(`Đã thêm đề tài nhánh mới "${title}" vào bộ nhớ cục bộ.`, 'info');
        } else {
          showAlert(err.response.data?.message || 'Có lỗi xảy ra khi tạo đề tài con.', 'error');
          setIsSubmitting(false);
          return;
        }
      } else {
        addSubTopic(selectedMajorId, {
          title: title.trim(),
          description: description.trim(),
          quota,
          mentorName: mentorName.trim(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }

    setIsAddOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubTopic) return;

    setIsSubmitting(true);
    try {
      await topicsApi.updateSubtopic(editingSubTopic.id, {
        title: editSubTitle.trim() || editingSubTopic.title,
        description: editSubDesc.trim() || undefined,
        max_teams: newQuotaValue,
      });
      await fetchTopics();
      showAlert('Đã cập nhật đề tài nhánh và chỉ tiêu Quota thành công lên máy chủ!', 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          updateSubTopicQuota(editingSubTopic.id, newQuotaValue);
          showAlert('Đã cập nhật chỉ tiêu Quota trong bộ nhớ cục bộ.', 'info');
        } else {
          showAlert(err.response.data?.message || 'Có lỗi xảy ra khi cập nhật hạn ngạch quota.', 'error');
          setIsSubmitting(false);
          return;
        }
      } else {
        updateSubTopicQuota(editingSubTopic.id, newQuotaValue);
      }
    } finally {
      setIsSubmitting(false);
    }

    setEditingSubTopic(null);
  };

  const handleDeleteSubTopic = async (subId: string, subTitle: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đề tài nhánh "${subTitle}"?`)) {
      return;
    }
    try {
      await topicsApi.deleteSubtopic(subId);
      await fetchTopics();
      showAlert(`Đã xóa đề tài nhánh "${subTitle}".`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        showAlert(err.response.data.message, 'error');
      } else {
        showAlert('Không thể xóa đề tài nhánh.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide">
            Quản Lý Đề Tài và Hạn Ngạch Đội
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Thiết lập danh mục lĩnh vực đề tài lớn, đề tài nhánh và giới hạn số lượng đội thi đăng ký tối đa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              void fetchTopics();
            }}
            disabled={loading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Tải lại danh sách đề tài từ máy chủ Backend"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </Button>

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
        <div
          className={`p-3.5 rounded-[10px] border text-xs sm:text-sm flex items-center justify-between shadow-lg animate-in fade-in ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : alert.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : alert.type === 'error' ? (
              <AlertCircle size={16} className="shrink-0" />
            ) : (
              <Sparkles size={16} className="shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="hover:underline text-xs cursor-pointer ml-3 shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Major Topics List */}
      <div className="space-y-6">
        {loading && majorTopics.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-card p-10 text-center space-y-3">
            <Loader2 size={32} className="mx-auto text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Đang tải danh sách đề tài và quota từ máy chủ...</p>
          </div>
        ) : majorTopics.length === 0 ? (
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
                    <h2 className="font-semibold tracking-tight text-foreground text-xl">
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

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingSubTopic({
                                  id: sub.id,
                                  title: sub.title,
                                  description: sub.description || '',
                                  quota: maxQuota,
                                });
                                setEditSubTitle(sub.title);
                                setEditSubDesc(sub.description || '');
                                setNewQuotaValue(maxQuota);
                              }}
                              className="!py-1 !px-2.5 text-xs gap-1"
                              title="Chỉnh sửa đề tài nhánh và chỉ tiêu Quota"
                            >
                              <Edit2 size={12} />
                              <span>Chỉnh sửa / Quota</span>
                            </Button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSubTopic(sub.id, sub.title)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Xóa đề tài nhánh"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
            <Button variant="ghost" type="button" onClick={() => setIsAddMajorOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Lĩnh Vực'}</span>
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
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Đề Tài'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit SubTopic & Quota */}
      <Modal
        isOpen={Boolean(editingSubTopic)}
        onClose={() => setEditingSubTopic(null)}
        title="Chỉnh Sửa Đề Tài Nhánh & Hạn Ngạch (Quota)"
      >
        <form onSubmit={handleSaveQuota} className="space-y-4">
          <Input
            label="Tiêu đề Đề tài nhánh *"
            value={editSubTitle}
            onChange={(e) => setEditSubTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả chi tiết bài toán</label>
            <textarea
              rows={3}
              value={editSubDesc}
              onChange={(e) => setEditSubDesc(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Mô tả yêu cầu kỹ thuật..."
            />
          </div>

          <Input
            label="Chỉ tiêu số đội tối đa (Quota) *"
            type="number"
            min={1}
            max={20}
            value={newQuotaValue}
            onChange={(e) => setNewQuotaValue(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingSubTopic(null)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang cập nhật...' : 'Lưu cập nhật'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
