import { useActionConfirmation } from '../../hooks/useActionConfirmation';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/patterns/ConfirmDialog';
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
  Globe,
  Video,
  Presentation,
  FileText,
  Palette,
  File,
  X,
  ListChecks,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import type { Checkpoint, SubmissionFieldConfig, SubmissionFieldType } from '../../types';
import { getCheckpointCompletionStats, checkpointScheduleWarning } from '../../utils/progress';
import { CountdownTimer } from '../../components/CountdownTimer';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '../../components/common/UnsavedChangesDialog';
import {
  checkpointApi,
  type CheckpointCreatePayload,
  type CheckpointUpdatePayload,
} from '../../api/checkpointApi';

const DEFAULT_SUBMISSION_FIELDS: SubmissionFieldConfig[] = [
  {
    id: 'f-repo',
    type: 'repoUrl',
    label: 'GitHub Repository URL',
    placeholder: 'https://github.com/organization/project-repo',
    required: true,
    description: 'Kho mã nguồn dự án (Public hoặc cấp quyền cho BTC)',
  },
  {
    id: 'f-demo',
    type: 'demoUrl',
    label: 'Live Demo URL / Trang chạy thử nghiệm',
    placeholder: 'https://app.yourproject.com',
    required: false,
    description: 'Đường dẫn sản phẩm chạy trực tiếp',
  },
  {
    id: 'f-slide',
    type: 'slideUrl',
    label: 'Slide Thuyết Trình / Pitch Deck',
    placeholder: 'https://docs.google.com/presentation/d/...',
    required: false,
    description: 'Slide trình bày (Canva/Google Slides)',
  },
  {
    id: 'f-desc',
    type: 'description',
    label: 'Báo Cáo Tóm Tắt Kỹ Thuật & Giải Pháp',
    placeholder: 'Mô tả ngắn gọn nội dung đã làm được trong chặng này...',
    required: true,
    description: 'Giải trình tóm tắt các tính năng và công nghệ',
  },
];

let fieldIdCounter = 100;

const PRESET_TEMPLATES: {
  type: SubmissionFieldType;
  label: string;
  defaultLabel: string;
  placeholder: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    type: 'repoUrl',
    label: 'Kho GitHub',
    defaultLabel: 'GitHub Repository URL',
    placeholder: 'https://github.com/organization/project-repo',
    description: 'Kho mã nguồn dự án (Public hoặc cấp quyền cho BTC)',
    icon: GitBranch,
  },
  {
    type: 'demoUrl',
    label: 'Live Demo URL',
    defaultLabel: 'Đường dẫn Live Demo Sản phẩm',
    placeholder: 'https://app.yourproject.com',
    description: 'Đường dẫn web hoặc môi trường chạy thực tế',
    icon: Globe,
  },
  {
    type: 'videoUrl',
    label: 'Video Demo',
    defaultLabel: 'Video Demo Thuyết Trình (YouTube / Drive)',
    placeholder: 'https://youtube.com/watch?v=... hoặc link Drive',
    description: 'Video quay màn hình hoạt động sản phẩm (< 5 phút)',
    icon: Video,
  },
  {
    type: 'slideUrl',
    label: 'Slide Pitch Deck',
    defaultLabel: 'Slide Thuyết Trình / Pitch Deck',
    placeholder: 'https://docs.google.com/presentation/d/...',
    description: 'Slide trình bày giải pháp và kiến trúc (Canva / Slides)',
    icon: Presentation,
  },
  {
    type: 'figmaUrl',
    label: 'Link Figma',
    defaultLabel: 'Link Thiết kế Figma / Sơ đồ Kiến trúc',
    placeholder: 'https://www.figma.com/design/...',
    description: 'Bản thiết kế giao diện UI/UX hoặc sơ đồ luồng',
    icon: Palette,
  },
  {
    type: 'description',
    label: 'Báo cáo Text',
    defaultLabel: 'Báo Cáo Tóm Tắt Kỹ Thuật & Giải Pháp',
    placeholder: 'Mô tả giải pháp, kiến trúc công nghệ và tiến độ...',
    description: 'Thí sinh nhập giải trình trực tiếp vào form',
    icon: FileText,
  },
  {
    type: 'custom',
    label: 'Trường tùy chỉnh',
    defaultLabel: 'Thông tin bổ sung (Link / Text)',
    placeholder: 'Nhập thông tin theo yêu cầu...',
    description: 'Trường thông tin hoặc liên kết tài liệu trực tuyến do BTC quy định',
    icon: Plus,
  },
];

const getFieldIcon = (type: SubmissionFieldType) => {
  switch (type) {
    case 'repoUrl':
      return <GitBranch size={13} className="text-primary" />;
    case 'demoUrl':
      return <Globe size={13} className="text-emerald-700 dark:text-emerald-400" />;
    case 'videoUrl':
      return <Video size={13} className="text-rose-700 dark:text-rose-400" />;
    case 'slideUrl':
      return <Presentation size={13} className="text-amber-700 dark:text-amber-400" />;
    case 'figmaUrl':
      return <Palette size={13} className="text-purple-700 dark:text-purple-400" />;
    case 'description':
      return <FileText size={13} className="text-blue-400" />;
    default:
      return <File size={13} className="text-muted-foreground" />;
  }
};

const getFieldReadableName = (type: SubmissionFieldType) => {
  switch (type) {
    case 'repoUrl':
      return 'Kho GitHub';
    case 'demoUrl':
      return 'Live Demo';
    case 'videoUrl':
      return 'Video Demo';
    case 'slideUrl':
      return 'Slide Pitch Deck';
    case 'figmaUrl':
      return 'Thiết kế Figma';
    case 'description':
      return 'Báo cáo Text';
    case 'custom':
      return 'Trường tùy chỉnh';
    default:
      return type;
  }
};

interface SubmissionFieldsEditorProps {
  fields: SubmissionFieldConfig[];
  onChangeFields: (fields: SubmissionFieldConfig[]) => void;
  requirements: string[];
  onChangeRequirements: (reqs: string[]) => void;
  reqInput: string;
  onChangeReqInput: (val: string) => void;
  onAddReq: () => void;
}

const SubmissionFieldsEditor: React.FC<SubmissionFieldsEditorProps> = ({
  fields,
  onChangeFields,
  requirements,
  onChangeRequirements,
  reqInput,
  onChangeReqInput,
  onAddReq,
}) => {
  const handleAddField = (preset: typeof PRESET_TEMPLATES[0]) => {
    const newField: SubmissionFieldConfig = {
      id: `f-${preset.type}-${++fieldIdCounter}`,
      type: preset.type,
      label: preset.defaultLabel,
      placeholder: preset.placeholder,
      required: preset.type === 'repoUrl' || preset.type === 'description',
      description: preset.description,
    };
    onChangeFields([...fields, newField]);
  };

  const handleUpdateField = (id: string, updates: Partial<SubmissionFieldConfig>) => {
    onChangeFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleRemoveField = (id: string) => {
    onChangeFields(fields.filter((f) => f.id !== id));
  };

  const handleRemoveReq = (idx: number) => {
    onChangeRequirements(requirements.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-primary" />
          <h4 className="font-semibold tracking-tight text-foreground text-sm tracking-wide">
            Cấu Hình Yêu Cầu Nộp Bài Cho Thí Sinh
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Quy định các liên kết (URL) và trường thông tin mà thí sinh bắt buộc / khuyến nghị nộp tại chặng này.
        </p>
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-2 p-3.5 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Thêm nhanh hạng mục nộp bài:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.type}
                type="button"
                onClick={() => handleAddField(tmpl)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium bg-card hover:bg-accent text-foreground border border-border hover:border-[#6366F1]/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Icon size={13} className="text-primary" />
                <span>+ {tmpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of Configured Fields */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Danh sách hạng mục bài nộp ({fields.length}):
          </span>
          <span className="text-[11px] text-muted-foreground">Thí sinh sẽ điền theo form này khi nộp bài</span>
        </div>

        {fields.length === 0 ? (
          <div className="p-4 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-dashed border-border text-center text-xs text-muted-foreground">
            Chưa có hạng mục nào. Bấm các nút phía trên để thêm trường nộp bài.
          </div>
        ) : (
          <div className="space-y-2.5">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="p-3.5 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2.5 text-xs transition-colors hover:border-[#6366F1]/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[10px] font-mono text-primary font-bold border border-border">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      {getFieldIcon(field.type)}
                      <span className="text-foreground font-semibold text-xs">
                        {getFieldReadableName(field.type)}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">({field.type})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          handleUpdateField(field.id, { required: e.target.checked })
                        }
                        className="rounded border-border bg-card text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span
                        className={
                          field.required
                            ? 'text-amber-700 dark:text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 text-[11px]'
                            : 'text-muted-foreground text-[11px]'
                        }
                      >
                        {field.required ? 'Bắt buộc nộp' : 'Tùy chọn'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Xóa trường này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                  <div className="md:col-span-5 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Tên nhãn hiển thị:</span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        handleUpdateField(field.id, { label: e.target.value })
                      }
                      placeholder="Tên nhãn hiển thị"
                      className="w-full p-2.5 rounded-[8px] bg-card border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-7 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Gợi ý / Hướng dẫn điền cho thí sinh:</span>
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) =>
                        handleUpdateField(field.id, { description: e.target.value })
                      }
                      placeholder="Hướng dẫn / Gợi ý điền cho thí sinh"
                      className="w-full p-2.5 rounded-[8px] bg-card border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist / Criteria Section */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-400" />
          <span>Tiêu chí kiểm duyệt & Checklist bài nộp:</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={reqInput}
            onChange={(e) => onChangeReqInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddReq();
              }
            }}
            placeholder="Ví dụ: Báo cáo đặc tả kiến trúc tối thiểu 5 trang, có sơ đồ C4 model..."
            className="flex-1 p-2.5 rounded-[8px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
          />
          <button
            type="button"
            onClick={onAddReq}
            className="px-3.5 py-2 rounded-[8px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
          >
            + Thêm
          </button>
        </div>

        {requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {requirements.map((req, rIdx) => (
              <span
                key={rIdx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground"
              >
                <CheckCircle2 size={12} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReq(rIdx)}
                  className="text-muted-foreground hover:text-rose-400 ml-0.5 cursor-pointer"
                  title="Xóa tiêu chí này"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface RawFieldConfig {
  field_key?: string;
  field_label?: string;
  label?: string;
  required?: boolean;
  apply_sha_freeze?: boolean;
  description?: string;
}

interface RawCheckpoint {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  start_time?: string;
  deadline?: string;
  requirements?: string | string[];
  weight?: number;
  is_active?: boolean;
  is_final_checkpoint?: boolean;
  status?: string;
  submission_fields?: RawFieldConfig[];
}

export const AdminCheckpointsPage: React.FC = () => {
  const { confirm, confirmationDialog } = useActionConfirmation();
  const {
    config,
    checkpoints,
    submissions,
    teams,
  } = useMockStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const isProgressFocused = searchParams.get('view') === 'progress';
  const [expandedCpId, setExpandedCpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteCpTarget, setDeleteCpTarget] = useState<{ id: string; title: string } | null>(null);
  const [discardTarget, setDiscardTarget] = useState<'add' | 'edit' | null>(null);

  const [editingCp, setEditingCp] = useState<Checkpoint | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState(180);
  const [editWeight, setEditWeight] = useState(25);
  const [editRequirements, setEditRequirements] = useState<string[]>([]);
  const [editSubmissionFields, setEditSubmissionFields] = useState<SubmissionFieldConfig[]>([]);
  const [editReqInput, setEditReqInput] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 5000) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, duration);
  };

  const mapCheckpoints = (data: RawCheckpoint[]): Checkpoint[] => {
    return data.map((cp, index: number) => {
      let reqs: string[] = [];
      if (Array.isArray(cp.requirements)) {
        reqs = cp.requirements;
      } else if (typeof cp.requirements === 'string') {
        reqs = cp.requirements.split('\n').map((s: string) => s.trim()).filter(Boolean);
      }

      const start = cp.start_time ? new Date(cp.start_time).getTime() : Date.now();
      const end = cp.deadline ? new Date(cp.deadline).getTime() : start + 180 * 60 * 1000;
      const durationMinutes = Math.max(15, Math.round((end - start) / (60 * 1000))) || 180;

      let fields: SubmissionFieldConfig[] = DEFAULT_SUBMISSION_FIELDS;
      if (Array.isArray(cp.submission_fields) && cp.submission_fields.length > 0) {
        fields = cp.submission_fields.map((f, fIdx: number) => ({
          id: f.field_key || `f-${fIdx}`,
          type: (f.apply_sha_freeze || f.field_key === 'repo_url')
            ? 'repoUrl'
            : f.field_key === 'demo_url'
            ? 'demoUrl'
            : f.field_key === 'presentation_pdf' || f.field_key === 'slide_url'
            ? 'slideUrl'
            : 'description',
          label: f.field_label || f.label || 'Hạng mục nộp',
          placeholder: '',
          required: Boolean(f.required),
          description: f.description || '',
        }));
      }

      return {
        id: String(cp.id || `cp-${index + 1}`),
        title: cp.title || cp.name || `Checkpoint ${index + 1}`,
        description: cp.description || '',
        durationMinutes,
        weight: cp.weight ?? 0,
        requirements: reqs.length > 0 ? reqs : ['Kho mã nguồn GitHub', 'Tài liệu kiến trúc hệ thống'],
        submissionFields: fields,
        deadline: cp.deadline || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        startTime: cp.start_time || new Date().toISOString(),
        status:
          (cp.status as 'upcoming' | 'open' | 'grace_period' | 'late' | 'closed') ||
          (cp.is_active ? 'open' : 'closed'),
        isFinalCheckpoint: Boolean(cp.is_final_checkpoint),
      };
    });
  };

  // Fetch Checkpoints from Backend
  const loadCheckpoints = useCallback(async () => {
    try {
      void useMockStore.getState().syncFromBackend?.();
      const data = await checkpointApi.getCheckpoints();
      if (Array.isArray(data)) {
        const mapped = mapCheckpoints(data as RawCheckpoint[]);
        useMockStore.setState({ checkpoints: mapped });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          showAlert(err.response?.data?.message || 'Không thể tải danh sách chặng nộp từ máy chủ.', 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void useMockStore.getState().syncFromBackend?.();
    checkpointApi
      .getCheckpoints()
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          const mapped = mapCheckpoints(data as RawCheckpoint[]);
          useMockStore.setState({ checkpoints: mapped });
        }
      })
      .catch((err: unknown) => {
        if (!ignore && axios.isAxiosError(err) && err.response) {
          showAlert(err.response?.data?.message || 'Không thể tải danh sách chặng nộp từ máy chủ.', 'error');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (isProgressFocused && checkpoints.length > 0) {
      const timer = window.setTimeout(() => {
        document
          .getElementById('admin-checkpoint-progress-matrix')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [isProgressFocused, checkpoints.length]);

  // New Checkpoint modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState(180);
  const [newWeight, setNewWeight] = useState(25);
  const [newRequirements, setNewRequirements] = useState<string[]>([]);
  const [newSubmissionFields, setNewSubmissionFields] = useState<SubmissionFieldConfig[]>([]);
  const [newReqInput, setNewReqInput] = useState('');
  const [insertPosition, setInsertPosition] = useState<string>('end');

  const isAddDirty = isAddOpen && (
    newTitle.trim() !== '' ||
    newDescription.trim() !== '' ||
    newRequirements.length > 0 ||
    newSubmissionFields.length > 0
  );
  const isEditDirty = Boolean(editingCp) && (
    editTitle !== (editingCp?.title || editingCp?.name || '') ||
    editDescription !== (editingCp?.description || '') ||
    editDurationMinutes !== (editingCp?.durationMinutes || 180) ||
    editWeight !== (editingCp?.weight || 25) ||
    JSON.stringify(editRequirements) !== JSON.stringify(editingCp?.requirements || []) ||
    JSON.stringify(editSubmissionFields) !== JSON.stringify(editingCp?.submissionFields || [])
  );
  const isDirty = isAddDirty || isEditDirty;

  const blocker = useUnsavedChangesWarning(isDirty);

  const finalCheckpointIndex = checkpoints.findIndex((cp) => Boolean(cp.isFinalCheckpoint));

  const handleOpenAdd = () => {
    setAlert(null);
    setIsAddOpen(true);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setInsertPosition(finalCheckpointIndex >= 0 ? String(finalCheckpointIndex) : 'end');
    setNewRequirements([
      'Sơ đồ kiến trúc & đặc tả kỹ thuật',
      'Kho mã nguồn cập nhật trên GitHub',
    ]);
    setNewSubmissionFields([...DEFAULT_SUBMISSION_FIELDS]);
    setNewReqInput('');
  };

  const forceCloseAdd = () => {
    setIsAddOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setNewRequirements([]);
    setNewSubmissionFields([]);
  };

  const handleCloseAdd = () => {
    if (isAddDirty) {
      setDiscardTarget('add');
      return;
    }
    forceCloseAdd();
  };

  const handleCloseEdit = () => {
    if (isEditDirty) {
      setDiscardTarget('edit');
      return;
    }
    setEditingCp(null);
  };

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
    setEditWeight(cp.weight ?? 0);
    setEditRequirements(
      cp.requirements && cp.requirements.length > 0
        ? [...cp.requirements]
        : ['Sơ đồ kiến trúc & đặc tả kỹ thuật', 'Kho mã nguồn cập nhật trên GitHub']
    );
    setEditSubmissionFields(
      cp.submissionFields && cp.submissionFields.length > 0
        ? cp.submissionFields.map((f) => ({ ...f }))
        : DEFAULT_SUBMISSION_FIELDS.map((f) => ({ ...f }))
    );
    setEditReqInput('');
  };

  const isReorderLocked =
    Boolean(config.isContestStarted) ||
    checkpoints.some((cp) => cp.status === 'open' || cp.status === 'closed');

  const persistOrder = async (ordered: typeof checkpoints) => {
    if (isReorderLocked) {
      showAlert('Chỉ được phép điều chỉnh thứ tự các chặng khi cuộc thi chưa bắt đầu.', 'error');
      return;
    }
    if (!await confirm({title: 'Thay đổi thứ tự các chặng?', description: ordered.map((cp, index) => `${index + 1}. ${cp.title || cp.name}`).join(' → '), confirmLabel: 'Xác nhận thứ tự'})) return;
    setSubmitting(true);
    try {
      const progressCps = ordered.filter((cp) => !cp.isFinalCheckpoint);
      const needsTimelineSync = progressCps.some((cp, idx) => {
        if (idx === 0) return false;
        const prevD = new Date(progressCps[idx - 1].deadline).getTime();
        const currD = new Date(cp.deadline).getTime();
        return Number.isFinite(prevD) && Number.isFinite(currD) && prevD > currD;
      });

      const syncedTimelines = new Map<string, { start_time: string; deadline: string }>();
      if (needsTimelineSync && progressCps.length > 1) {
        const validStarts = progressCps
          .map((cp) => (cp.startTime ? new Date(cp.startTime).getTime() : NaN))
          .filter(Number.isFinite);
        if (validStarts.length > 0) {
          let cursorMs = Math.min(...validStarts);

          for (const cp of progressCps) {
            const oldStart = cp.startTime ? new Date(cp.startTime).getTime() : NaN;
            const oldEnd = cp.deadline ? new Date(cp.deadline).getTime() : NaN;
            const inferredMin =
              Number.isFinite(oldStart) && Number.isFinite(oldEnd) && oldEnd > oldStart
                ? Math.round((oldEnd - oldStart) / 60000)
                : 60;
            const durMin = Math.max(5, Number(cp.durationMinutes) || inferredMin);
            const nextStartIso = new Date(cursorMs).toISOString();
            cursorMs += durMin * 60 * 1000;
            const nextDeadlineIso = new Date(cursorMs).toISOString();
            syncedTimelines.set(cp.id, { start_time: nextStartIso, deadline: nextDeadlineIso });
          }
        }
      }

      for (let index = 0; index < ordered.length; index += 1) {
        const cp = ordered[index];
        const timeline = syncedTimelines.get(cp.id);
        await checkpointApi.updateCheckpoint(cp.id, {
          display_order: index + 1,
          ...(timeline ?? {}),
        });
      }
      await loadCheckpoints();
      showAlert('Đã lưu thứ tự và đồng bộ mốc thời gian các chặng.', 'success');
    } catch {
      await loadCheckpoints();
      showAlert('Không thể lưu đầy đủ thứ tự các chặng. Đã tải lại dữ liệu máy chủ.', 'error');
    } finally { setSubmitting(false); }
  };
  const reorderCheckpoints = (from: number, to: number) => {
    if (isReorderLocked) {
      showAlert('Chỉ được phép điều chỉnh thứ tự các chặng khi cuộc thi chưa bắt đầu.', 'error');
      return;
    }
    if (checkpoints[from]?.isFinalCheckpoint || checkpoints[to]?.isFinalCheckpoint) {
      showAlert('Chặng chung kết luôn cố định ở vị trí cuối cùng.', 'error');
      return;
    }
    const ordered = [...checkpoints];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    void persistOrder(ordered);
  };
  const sortCheckpointsByDeadline = () => {
    if (isReorderLocked) {
      showAlert('Chỉ được phép sắp xếp lại thứ tự các chặng khi cuộc thi chưa bắt đầu.', 'error');
      return;
    }
    const sorted = [...checkpoints].sort((a, b) => {
      if (a.isFinalCheckpoint && !b.isFinalCheckpoint) return 1;
      if (!a.isFinalCheckpoint && b.isFinalCheckpoint) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    void persistOrder(sorted);
  };

  const totalWeight = checkpoints.reduce((sum, cp) => sum + Number(cp.weight ?? 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;

    const editingIndex = checkpoints.findIndex((c) => c.id === editingCp.id);
    const baseStartMs = editingCp.startTime ? new Date(editingCp.startTime).getTime() : Date.now();
    let startMs = Number.isFinite(baseStartMs) ? baseStartMs : Date.now();
    if (editingIndex > 0) {
      const prevDeadlineRaw = checkpoints[editingIndex - 1]?.deadline;
      const prevDeadlineMs = prevDeadlineRaw ? new Date(prevDeadlineRaw).getTime() : NaN;
      if (
        Number.isFinite(prevDeadlineMs) &&
        (editingCp.status === 'upcoming' || startMs < prevDeadlineMs)
      ) {
        startMs = prevDeadlineMs;
      }
    }
    const deadlineDate = new Date(startMs + Number(editDurationMinutes) * 60 * 1000);
    const oldDeadlineMs = editingCp.deadline ? new Date(editingCp.deadline).getTime() : 0;

    // BUG 56: Chặng đang diễn ra (open) hoặc đã qua (closed) chỉ cho phép gia hạn thêm thời lượng, không cho thu ngắn
    if (
      editingCp.status !== 'upcoming' &&
      (Number(editDurationMinutes) < (editingCp.durationMinutes || 15) ||
        (Number.isFinite(oldDeadlineMs) && deadlineDate.getTime() < oldDeadlineMs - 1000))
    ) {
      showAlert(
        'Chặng nộp bài đang diễn ra hoặc đã qua chỉ được phép gia hạn thêm thời gian, không được thu ngắn thời lượng gây thiệt hại cho thí sinh.',
        'error'
      );
      return;
    }

    const otherFinalCp = checkpoints.find((c) => Boolean(c.isFinalCheckpoint) && c.id !== editingCp.id);
    const effectiveIsFinal =
      Boolean(editingCp.isFinalCheckpoint) ||
      (!otherFinalCp && editSubmissionFields.some((f) => f.type === 'repoUrl' && f.required));

    // Tự động tính toán dây chuyền (Auto-Cascade) mốc start_time & deadline của toàn bộ các chặng phía sau theo đúng thời lượng từng chặng
    const cascadedAfter: Array<{ id: string; title: string; start_time: string; deadline: string }> = [];
    if (editingIndex >= 0) {
      let cursorEndMs = deadlineDate.getTime();
      for (let idx = editingIndex + 1; idx < checkpoints.length; idx += 1) {
        const nextCp = checkpoints[idx];
        const nextDurMin = Math.max(15, Number(nextCp.durationMinutes) || 180);
        const nextStartMs = cursorEndMs;
        const nextEndMs = nextStartMs + nextDurMin * 60 * 1000;
        cascadedAfter.push({
          id: nextCp.id,
          title: nextCp.title || nextCp.name || `Chặng ${idx + 1}`,
          start_time: new Date(nextStartMs).toISOString(),
          deadline: new Date(nextEndMs).toISOString(),
        });
        cursorEndMs = nextEndMs;
      }
    }

    const cascadeSummary =
      cascadedAfter.length > 0
        ? ` Các chặng kế tiếp (${cascadedAfter.map((c) => c.title).join(', ')}) sẽ tự động cập nhật nối tiếp theo thời lượng đã cấu hình.`
        : '';

    if (
      !(await confirm({
        title: 'Lưu thay đổi chặng nộp bài?',
        description: `Chặng: ${editingCp.title} → ${editTitle.trim()}. Trọng số: ${editingCp.weight ?? 0}% → ${editWeight}%. Mở cổng: ${new Date(startMs).toLocaleString('vi-VN')} → Hạn mới: ${deadlineDate.toLocaleString('vi-VN')} (thời lượng ${editDurationMinutes} phút).${cascadeSummary}`,
        confirmLabel: 'Xác nhận lưu chặng',
      }))
    )
      return;

    setSubmitting(true);
    try {
      let freezeAssigned = false;
      const payload: CheckpointUpdatePayload = {
        title: editTitle.trim(),
        weight: Number(editWeight),
        description: editDescription.trim() || undefined,
        start_time: new Date(startMs).toISOString(),
        deadline: deadlineDate.toISOString(),
        requirements: editRequirements.join('\n'),
        is_final_checkpoint: effectiveIsFinal,
        submission_fields: editSubmissionFields.map((f) => {
          const shouldFreeze = effectiveIsFinal && f.type === 'repoUrl' && !freezeAssigned;
          if (shouldFreeze) freezeAssigned = true;
          return {
            field_key: f.type === 'repoUrl' ? 'repo_url' : f.type === 'demoUrl' ? 'demo_url' : f.id,
            field_label: f.label,
            required: f.required,
            apply_sha_freeze: shouldFreeze,
          };
        }),
      };

      const isExtended = !Number.isFinite(oldDeadlineMs) || deadlineDate.getTime() >= oldDeadlineMs;
      if (isExtended && cascadedAfter.length > 0) {
        // Khi tăng thời lượng: cập nhật từ Chặng cuối lùi về trước để luôn thỏa mãn ràng buộc tuần tự trên Backend
        for (let i = cascadedAfter.length - 1; i >= 0; i -= 1) {
          const item = cascadedAfter[i];
          await checkpointApi.updateCheckpoint(item.id, {
            start_time: item.start_time,
            deadline: item.deadline,
          });
        }
        await checkpointApi.updateCheckpoint(editingCp.id, payload);
      } else {
        // Khi thu ngắn thời lượng của chặng upcoming: cập nhật chặng hiện tại trước rồi kéo các chặng sau lên nối tiếp
        await checkpointApi.updateCheckpoint(editingCp.id, payload);
        for (let i = 0; i < cascadedAfter.length; i += 1) {
          const item = cascadedAfter[i];
          await checkpointApi.updateCheckpoint(item.id, {
            start_time: item.start_time,
            deadline: item.deadline,
          });
        }
      }
      await loadCheckpoints();
      setEditingCp(null);
      showAlert(`Đã cập nhật chặng nộp "${editTitle}" và tự động đồng bộ lịch trình nối tiếp thành công!`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật chặng nộp bài.';
        showAlert(msg, 'error');
      } else {
        showAlert('Đã xảy ra lỗi không xác định khi cập nhật.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showAlert('Vui lòng nhập tiêu đề chặng nộp bài.', 'error');
      return;
    }
    if (
      finalCheckpointIndex >= 0 &&
      (insertPosition === 'end' || Number(insertPosition) > finalCheckpointIndex)
    ) {
      showAlert(
        'Không thể chèn chặng nộp mới vào sau Chặng Chung Kết đã khóa. Vui lòng chọn vị trí trước Chặng Chung Kết.',
        'error'
      );
      return;
    }

    const hasExistingFinal = finalCheckpointIndex >= 0;
    const isFinal =
      !hasExistingFinal &&
      newSubmissionFields.some((f) => f.type === 'repoUrl' && f.required);

    const targetIndex =
      insertPosition === 'end'
        ? hasExistingFinal
          ? finalCheckpointIndex
          : checkpoints.length
        : Math.min(
            Number(insertPosition),
            hasExistingFinal ? finalCheckpointIndex : checkpoints.length
          );

    const prevCp = targetIndex > 0 ? checkpoints[targetIndex - 1] : undefined;
    const prevDeadlineMs = prevCp?.deadline ? new Date(prevCp.deadline).getTime() : NaN;
    const startMs = Number.isFinite(prevDeadlineMs) ? Math.max(Date.now(), prevDeadlineMs) : Date.now();
    const startDate = new Date(startMs);
    const deadlineDate = new Date(startMs + Number(newDurationMinutes) * 60 * 1000);

    // Tự động tính toán dây chuyền (Auto-Cascade) các chặng đứng sau vị trí chèn mới theo đúng thời lượng từng chặng
    const cascadedAfterInsert: Array<{ id: string; display_order: number; start_time: string; deadline: string }> = [];
    if (targetIndex < checkpoints.length) {
      let cursorEndMs = deadlineDate.getTime();
      for (let idx = targetIndex; idx < checkpoints.length; idx += 1) {
        const nextCp = checkpoints[idx];
        const nextDurMin = Math.max(15, Number(nextCp.durationMinutes) || 180);
        const nextStartMs = cursorEndMs;
        const nextEndMs = nextStartMs + nextDurMin * 60 * 1000;
        cascadedAfterInsert.push({
          id: nextCp.id,
          display_order: idx + 2,
          start_time: new Date(nextStartMs).toISOString(),
          deadline: new Date(nextEndMs).toISOString(),
        });
        cursorEndMs = nextEndMs;
      }
    }

    setSubmitting(true);
    try {
      let freezeAssigned = false;

      if (cascadedAfterInsert.length > 0) {
        for (let i = cascadedAfterInsert.length - 1; i >= 0; i -= 1) {
          const item = cascadedAfterInsert[i];
          await checkpointApi.updateCheckpoint(item.id, {
            display_order: item.display_order,
            start_time: item.start_time,
            deadline: item.deadline,
          });
        }
      }

      const payload: CheckpointCreatePayload = {
        title: newTitle.trim(),
        weight: Number(newWeight),
        display_order: targetIndex + 1,
        description: newDescription.trim() || undefined,
        start_time: startDate.toISOString(),
        deadline: deadlineDate.toISOString(),
        requirements: newRequirements.join('\n'),
        is_active: true,
        is_final_checkpoint: isFinal,
        grace_period_seconds: 5,
        submission_fields: newSubmissionFields.map((f) => {
          const shouldFreeze = isFinal && f.type === 'repoUrl' && !freezeAssigned;
          if (shouldFreeze) freezeAssigned = true;
          return {
            field_key: f.type === 'repoUrl' ? 'repo_url' : f.type === 'demoUrl' ? 'demo_url' : f.id,
            field_label: f.label,
            required: f.required,
            apply_sha_freeze: shouldFreeze,
          };
        }),
      };

      await checkpointApi.createCheckpoint(payload);
      await loadCheckpoints();

      setIsAddOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewDurationMinutes(180);
      setNewWeight(25);
      setNewRequirements([]);
      setNewSubmissionFields([]);
      setInsertPosition(finalCheckpointIndex >= 0 ? String(finalCheckpointIndex) : 'end');
      showAlert(`Đã tạo chặng nộp "${newTitle}" thành công lên máy chủ!`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo chặng nộp bài.';
        showAlert(msg, 'error');
      } else {
        showAlert('Đã xảy ra lỗi không xác định khi tạo chặng nộp.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, title?: string) => {
    setDeleteCpTarget({ id, title: title || 'chặng nộp này' });
  };

  const executeDeleteCp = async () => {
    if (!deleteCpTarget) return;
    const { id, title: displayTitle } = deleteCpTarget;
    try {
      await checkpointApi.deleteCheckpoint(id);
      await loadCheckpoints();
      showAlert(`Đã xóa chặng nộp "${displayTitle}".`, 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        showAlert(err.response?.data?.message || 'Không thể xóa chặng nộp.', 'error');
      } else {
        showAlert('Có lỗi xảy ra khi xóa chặng nộp.', 'error');
      }
    } finally {
      setDeleteCpTarget(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {confirmationDialog}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6366F1]/20 border border-[#6366F1]/40 text-primary">
              <CheckSquare size={20} />
            </div>
            <h1 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide">
              Cấu Hình Chặng Nộp và Thời Lượng
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý các mốc nộp bài bắt buộc, thời lượng làm bài (tính theo số phút) và trọng số điểm chung cuộc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              void loadCheckpoints();
            }}
            disabled={loading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Tải lại danh sách chặng nộp từ Backend"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </Button>

          <Badge variant={config.isContestStarted ? 'success' : 'warning'} className="gap-1.5 py-1 px-3">
            <span
              className={`w-2 h-2 rounded-full ${
                config.isContestStarted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{config.isContestStarted ? 'Cuộc thi đang diễn ra' : 'Cuộc thi chưa bắt đầu'}</span>
          </Badge>

          <Badge variant="indigo">{checkpoints.length} Chặng nộp</Badge>
          {checkpoints.length > 0 && (
            <Badge variant={totalWeight === 100 ? 'success' : 'warning'}>
              Tổng trọng số: {totalWeight}%
            </Badge>
          )}

          {checkpoints.length > 1 && (
            <Button
              variant="secondary"
              disabled={submitting || isReorderLocked}
              onClick={() => {
                sortCheckpointsByDeadline();
              }}
              className="gap-2 text-xs"
              title={
                isReorderLocked
                  ? 'Chỉ được phép sắp xếp lại thứ tự chặng khi cuộc thi chưa bắt đầu'
                  : 'Tự động sắp xếp các chặng theo thời hạn deadline từ sớm đến muộn'
              }
            >
              <ArrowUpDown size={14} />
              <span>Sắp xếp theo Deadline</span>
            </Button>
          )}

          <Button
            variant={isProgressFocused ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              if (isProgressFocused) {
                setSearchParams({});
              } else {
                setSearchParams({ view: 'progress' });
                setTimeout(() => {
                  document
                    .getElementById('admin-checkpoint-progress-matrix')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 80);
              }
            }}
            className="gap-1.5 text-xs"
          >
            <Users size={14} />
            <span>{isProgressFocused ? 'Đang xem Ma trận Tiến độ' : 'Ma trận Tiến độ Đội thi'}</span>
          </Button>

          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
            <Plus size={16} />
            <span>Thêm Chặng Nộp Mới</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div
          role="alert"
          className={`p-3.5 rounded-[10px] border text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in fade-in ${
            isAddOpen || Boolean(editingCp)
              ? 'fixed top-5 right-5 z-[100] max-w-lg bg-card'
              : ''
          } ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
              : alert.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400'
              : 'bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-400'
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

      {/* Cảnh báo nếu lịch mở/đóng giữa các chặng chưa đồng bộ tuần tự */}
      {checkpointScheduleWarning(checkpoints) && (
        <div
          role="alert"
          className="p-3.5 rounded-[10px] border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-2"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{checkpointScheduleWarning(checkpoints)}</span>
        </div>
      )}

      {/* Checkpoints Cards */}
      <div className="space-y-4">
        {loading && checkpoints.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-card p-10 text-center space-y-3">
            <Loader2 size={32} className="mx-auto text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Đang tải danh sách các mốc Checkpoint từ máy chủ...</p>
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-card p-10 text-center space-y-3">
            <CheckSquare size={36} className="mx-auto text-muted-foreground" />
            <h3 className="font-bold text-foreground text-base">Chưa có chặng nộp bài nào</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Hệ thống hiện đang ở trạng thái sạch. Hãy bấm nút "Thêm Chặng Nộp Mới" để thiết lập các mốc nộp bài cho cuộc thi.
            </p>
            <Button variant="primary" onClick={handleOpenAdd} className="gap-2 mt-2">
              <Plus size={16} />
              <span>Tạo Chặng Nộp Đầu Tiên</span>
            </Button>
          </div>
        ) : (
          checkpoints.map((cp, idx) => {
            const cpSubmissions = submissions.filter((s) => s.checkpointId === cp.id);
            const { completedTeamsCount, approvedTeamsCount, completionPercent } =
              getCheckpointCompletionStats(cp.id, submissions, teams, cp.status);
            const duration = cp.durationMinutes || 180;

            return (
              <div
                key={cp.id}
                className="rounded-[16px] border border-border bg-card p-6 space-y-4 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    {/* Order & Re-ordering buttons */}
                    <div className="flex items-center gap-0.5 bg-muted/40 dark:bg-slate-900/60 border border-border rounded-[8px] p-0.5 shadow-sm">
                      <button
                        type="button"
                        disabled={submitting || isReorderLocked || Boolean(cp.isFinalCheckpoint) || idx === 0}
                        onClick={() => {
                          reorderCheckpoints(idx, idx - 1);
                        }}
                        className="p-1 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title={
                          isReorderLocked
                            ? 'Chỉ được phép điều chỉnh thứ tự chặng khi cuộc thi chưa bắt đầu'
                            : cp.isFinalCheckpoint
                            ? 'Chặng chung kết luôn cố định ở vị trí cuối cùng'
                            : idx === 0
                            ? 'Đã ở vị trí đầu tiên'
                            : `Di chuyển lên vị trí #${idx}`
                        }
                      >
                        <ArrowUp size={14} />
                      </button>
                      <div className="flex h-7 px-2 items-center justify-center text-primary font-bold text-xs font-mono">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        disabled={
                          submitting ||
                          isReorderLocked ||
                          Boolean(cp.isFinalCheckpoint) ||
                          idx === checkpoints.length - 1 ||
                          Boolean(checkpoints[idx + 1]?.isFinalCheckpoint)
                        }
                        onClick={() => {
                          reorderCheckpoints(idx, idx + 1);
                        }}
                        className="p-1 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title={
                          isReorderLocked
                            ? 'Chỉ được phép điều chỉnh thứ tự chặng khi cuộc thi chưa bắt đầu'
                            : cp.isFinalCheckpoint
                            ? 'Chặng chung kết luôn cố định ở vị trí cuối cùng'
                            : checkpoints[idx + 1]?.isFinalCheckpoint
                            ? 'Không thể di chuyển xuống sau Chặng chung kết'
                            : idx === checkpoints.length - 1
                            ? 'Đã ở vị trí cuối cùng'
                            : `Di chuyển xuống vị trí #${idx + 2}`
                        }
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <h3 className="font-semibold tracking-tight text-foreground text-lg sm:text-xl">{cp.title}</h3>
                    {cp.status === 'open' || cp.status === 'grace_period' ? (
                      <Badge variant="success">
                        {config.isPaused ? 'Đang tạm dừng đếm ngược' : 'Đang mở nộp bài'}
                      </Badge>
                    ) : cp.status === 'upcoming' ? (
                      <Badge variant="indigo">Chưa mở</Badge>
                    ) : cp.status === 'late' ? (
                      <Badge variant="warning">Đang mở nộp muộn</Badge>
                    ) : (
                      <Badge variant="neutral">Đã đóng</Badge>
                    )}
                    {cp.isFinalCheckpoint && (
                      <Badge variant="danger">Chặng chung kết</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {cp.status === 'open' && (
                      <CountdownTimer
                        endTime={cp.deadline}
                        isPaused={Boolean(config.isPaused)}
                      />
                    )}
                    <Badge variant="indigo" className="gap-1.5 py-1 px-3">
                      <Clock size={12} />
                      <span>{duration} phút ({formatDuration(duration)})</span>
                    </Badge>
                    <Badge variant="indigo">Trọng số {cp.weight ?? 0}%</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(cp)}
                      disabled={submitting}
                      className="gap-1.5"
                      title={
                        cp.status === 'upcoming'
                          ? 'Cấu hình thời lượng và yêu cầu chặng (chặng chưa mở được tăng/giảm thời lượng tự do)'
                          : 'Gia hạn thêm thời lượng hoặc cập nhật yêu cầu chặng'
                      }
                    >
                      <Edit2 size={13} />
                      <span>Cấu hình</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(cp.id, cp.title)}
                      disabled={
                        submitting ||
                        Boolean(cp.isFinalCheckpoint) ||
                        cp.status === 'closed' ||
                        cp.status === 'late' ||
                        cp.status === 'open' ||
                        cp.status === 'grace_period' ||
                        cpSubmissions.length > 0
                      }
                      className="gap-1.5"
                      title={
                        cp.isFinalCheckpoint
                          ? 'Không thể xóa Chặng chung kết'
                          : cp.status === 'closed' || cp.status === 'late'
                          ? 'Không thể xóa chặng đã qua thời hạn'
                          : cp.status === 'open' || cp.status === 'grace_period'
                          ? 'Không thể xóa chặng đang mở nộp bài'
                          : cpSubmissions.length > 0
                          ? 'Không thể xóa chặng đã có bài nộp của đội thi'
                          : 'Xóa chặng này'
                      }
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  {cp.description}
                </p>

                {/* Hạng mục yêu cầu nộp bài của thí sinh */}
                <div className="p-3.5 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ListChecks size={14} className="text-primary" />
                      <span>Hạng mục nộp bài yêu cầu cho Thí sinh:</span>
                      <span className="text-muted-foreground font-normal">
                        ({(cp.submissionFields && cp.submissionFields.length > 0 ? cp.submissionFields : DEFAULT_SUBMISSION_FIELDS).length} hạng mục)
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(cp.submissionFields && cp.submissionFields.length > 0 ? cp.submissionFields : DEFAULT_SUBMISSION_FIELDS).map((field) => (
                      <div
                        key={field.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs border ${
                          field.required
                            ? 'bg-card border-amber-500/40 text-amber-700 dark:text-amber-400 shadow-sm'
                            : 'bg-card border-border text-muted-foreground'
                        }`}
                      >
                        {getFieldIcon(field.type)}
                        <span className="font-medium">{field.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            field.required
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {field.required ? 'Bắt buộc' : 'Tùy chọn'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {cp.requirements && cp.requirements.length > 0 && (
                    <div className="pt-2 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-muted-foreground">Tiêu chí kiểm duyệt:</span>
                      {cp.requirements.map((req, rIdx) => (
                        <span key={rIdx} className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-700 dark:text-emerald-400" />
                          <span>{req}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      <span>Thời lượng chặng:</span>
                      <span className="font-semibold text-foreground">
                        {duration} phút ({formatDuration(duration)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>•</span>
                      {cp.status === 'open' || cp.status === 'grace_period' ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>
                            Đang mở nộp bài • Hạn chót: {new Date(cp.deadline).toLocaleTimeString('vi-VN')} {new Date(cp.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : cp.status === 'upcoming' ? (
                        <div className="flex items-center gap-1.5 text-primary font-medium">
                          <span>
                            Chưa mở • Mở cổng: {cp.startTime ? `${new Date(cp.startTime).toLocaleTimeString('vi-VN')} ${new Date(cp.startTime).toLocaleDateString('vi-VN')}` : 'Sắp tới'} → Hạn chót: {new Date(cp.deadline).toLocaleTimeString('vi-VN')} {new Date(cp.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : cp.status === 'late' ? (
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>
                            Đang mở nộp muộn (Gắn cờ Nộp muộn) • Hạn chuẩn đã qua: {new Date(cp.deadline).toLocaleTimeString('vi-VN')} {new Date(cp.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <span>
                            Đã đóng cổng nộp • Kết thúc: {new Date(cp.deadline).toLocaleTimeString('vi-VN')} {new Date(cp.deadline).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} className="text-emerald-700 dark:text-emerald-400" />
                      <span>Tỷ lệ hoàn thành:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {completedTeamsCount} / {approvedTeamsCount} đội ({completionPercent}%)
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCpId((prev) => (prev === cp.id ? null : cp.id))}
                      className="text-xs py-1 px-2.5 h-auto gap-1.5"
                    >
                      <Users size={12} />
                      <span>{expandedCpId === cp.id ? 'Ẩn danh sách đội' : 'Xem tiến độ các đội'}</span>
                    </Button>
                  </div>
                </div>

                {expandedCpId === cp.id && (
                  <div className="pt-3 border-t border-border space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Users size={14} className="text-primary" />
                        <span>Danh sách trạng thái nộp bài của các đội ở {cp.title}:</span>
                      </span>
                      <span className="text-muted-foreground">
                        {completedTeamsCount}/{approvedTeamsCount} đội đã nộp
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-[10px] border border-border bg-muted/30">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-card border-b border-border text-muted-foreground uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Đội thi & Đội trưởng</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                            <th className="py-2.5 px-3">Thời gian nộp</th>
                            <th className="py-2.5 px-3">Tài nguyên & Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {teams
                            .filter((t) => t.status.toLowerCase() === 'approved')
                            .map((team) => {
                              const sub =
                                cp.status === 'upcoming'
                                  ? undefined
                                  : cpSubmissions.find((s) => s.teamId === team.id);
                              const isLateSub = Boolean(
                                sub &&
                                  (sub.isAfterDeadline ||
                                    String(sub.status || '').toLowerCase() === 'late')
                              );
                              return (
                                <tr key={team.id} className="hover:bg-accent/50">
                                  <td className="py-2.5 px-3 font-medium text-foreground">
                                    <div>{team.name}</div>
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                      {team.leaderName || '—'}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {sub ? (
                                      isLateSub ? (
                                        <Badge variant="warning" size="sm">
                                          Đã nộp (Nộp muộn)
                                        </Badge>
                                      ) : (
                                        <Badge variant="success" size="sm">
                                          Đã nộp đúng hạn
                                        </Badge>
                                      )
                                    ) : cp.status === 'upcoming' ? (
                                      <Badge variant="indigo" size="sm">
                                        Chưa mở
                                      </Badge>
                                    ) : cp.status === 'late' ? (
                                      <Badge variant="warning" size="sm">
                                        Quá hạn (Chưa nộp)
                                      </Badge>
                                    ) : (
                                      <Badge variant="neutral" size="sm">
                                        Chưa nộp
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                    {sub?.submittedAt
                                      ? new Date(sub.submittedAt).toLocaleString('vi-VN')
                                      : '—'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {sub ? (
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {sub.repoUrl && (
                                            <a
                                              href={sub.repoUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                            >
                                              <GitBranch size={11} />
                                              <span>Repo</span>
                                              <ExternalLink size={10} />
                                            </a>
                                          )}
                                          {sub.demoUrl && (
                                            <a
                                              href={sub.demoUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-sky-700 dark:text-cyan-400 hover:underline font-medium"
                                            >
                                              <Globe size={11} />
                                              <span>Tài liệu / Demo</span>
                                              <ExternalLink size={10} />
                                            </a>
                                          )}
                                        </div>
                                        {sub.description && (
                                          <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                                            "{sub.description}"
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ma Trận Tiến Độ Nộp Bài Của Các Đội Thi (Admin Overview) */}
      {checkpoints.length > 0 && (
        <div
          id="admin-checkpoint-progress-matrix"
          className={`rounded-[16px] border p-6 space-y-4 shadow-lg ${
            isProgressFocused
              ? 'border-[#6366F1] bg-card ring-1 ring-[#6366F1]/40'
              : 'border-border bg-card'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h3 className="font-semibold tracking-tight text-foreground text-lg flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span>Ma Trận Tiến Độ Nộp Bài Các Chặng Theo Đội Thi</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Theo dõi trực quan đội nào đã nộp đúng hạn, đội nào nộp muộn (gắn cờ Nộp muộn) hoặc chưa nộp ở từng chặng.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success">Đúng hạn</Badge>
              <Badge variant="warning">Nộp muộn / Quá hạn</Badge>
              <Badge variant="indigo">Chưa mở</Badge>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tên Đội Thi</th>
                  {checkpoints.map((cp, idx) => (
                    <th key={cp.id} className="py-3.5 px-4 text-center">
                      <div>CP #{idx + 1}</div>
                      <div className="text-[10px] font-normal text-muted-foreground normal-case truncate max-w-[140px] mx-auto">
                        {cp.title}
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right">Tổng Tiến Độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {teams
                  .filter((t) => t.status.toLowerCase() === 'approved')
                  .map((team) => {
                    const teamSubs = submissions.filter((s) => s.teamId === team.id);
                    const completedCount = checkpoints.filter(
                      (cp) =>
                        cp.status !== 'upcoming' &&
                        teamSubs.some((s) => s.checkpointId === cp.id)
                    ).length;
                    const totalCount = checkpoints.length;

                    return (
                      <tr key={team.id} className="hover:bg-accent transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          {team.name}
                          <span className="text-[11px] text-muted-foreground block font-normal">
                            {team.leaderName || '—'}
                          </span>
                        </td>

                        {checkpoints.map((cp) => {
                          const matchedSub =
                            cp.status === 'upcoming'
                              ? undefined
                              : teamSubs.find((s) => s.checkpointId === cp.id);
                          const isDone = Boolean(matchedSub);
                          const isLateSub = Boolean(
                            matchedSub &&
                              (matchedSub.isAfterDeadline ||
                                String(matchedSub.status || '').toLowerCase() === 'late')
                          );
                          return (
                            <td key={cp.id} className="py-3.5 px-4 text-center align-middle">
                              {isDone && matchedSub ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  {isLateSub ? (
                                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-xs bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                      <Clock size={12} />
                                      <span>Đã nộp (Nộp muộn)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                      <CheckCircle2 size={12} />
                                      <span>Đã nộp</span>
                                    </span>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px]">
                                    {matchedSub.repoUrl && (
                                      <a
                                        href={matchedSub.repoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                                      >
                                        <span>Repo</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    )}
                                    {matchedSub.demoUrl && (
                                      <a
                                        href={matchedSub.demoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        <span>Demo</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ) : cp.status === 'upcoming' ? (
                                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                  <Clock size={12} />
                                  <span>Chưa mở</span>
                                </span>
                              ) : cp.status === 'late' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium text-xs">
                                  <Clock size={12} />
                                  <span>Quá hạn (Chưa nộp)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                  <Clock size={12} />
                                  <span>Chưa nộp</span>
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-4 text-right">
                          <Badge
                            variant={
                              totalCount > 0 && completedCount === totalCount
                                ? 'success'
                                : completedCount > 0
                                ? 'indigo'
                                : 'neutral'
                            }
                          >
                            {completedCount}/{totalCount} chặng
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={handleCloseAdd}
        title="Thêm Chặng Nộp Mới & Cấu Hình Yêu Cầu Bài Nộp"
        maxWidth="4xl"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          {alert && alert.type === 'error' && (
            <div
              role="alert"
              className="p-3 rounded-[10px] border bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
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
          {/* Top Row: Title & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8">
              <Input
                label="Tiêu đề chặng nộp *"
                placeholder="Ví dụ: Chặng 1: Nộp Báo cáo Khảo sát & Thiết kế"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                label="Trọng số (% điểm tổng) *"
                type="number"
                min={5}
                max={100}
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả yêu cầu chặng *</label>
            <textarea
              rows={2}
              placeholder="Yêu cầu các đội hoàn thiện Repo GitHub, nộp tài liệu kiến trúc..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          {/* Middle Row: Duration & Position side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Duration in Minutes with Quick Presets */}
            <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <label className="text-foreground font-bold text-xs flex items-center gap-1.5">
                    <Clock size={15} className="text-primary" />
                    <span>Thời lượng nộp bài (Số phút) *</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    ⏱️ {newDurationMinutes}p = {formatDuration(newDurationMinutes)}
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
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] text-muted-foreground">Chọn nhanh các mốc:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {durationPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNewDurationMinutes(preset.value)}
                        className={`px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors cursor-pointer border ${
                          newDurationMinutes === preset.value
                            ? 'bg-[#6366F1] text-white border-[#6366F1]'
                            : 'bg-card text-muted-foreground border-border hover:border-slate-400 hover:text-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
                💡 Hạn chót đóng cổng sẽ tự động tính đúng <strong>{newDurationMinutes} phút</strong> kể từ khi Admin phát lệnh bắt đầu.
              </p>
            </div>

            {/* Position Selector */}
            <div className="flex flex-col justify-between p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3">
              <div>
                <label className="text-foreground font-bold text-xs flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-primary" />
                  <span>Vị trí chèn chặng nộp *</span>
                </label>
                <select
                  value={insertPosition}
                  onChange={(e) => setInsertPosition(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] bg-card border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="end" disabled={finalCheckpointIndex >= 0}>
                    Chèn vào cuối cùng{' '}
                    {finalCheckpointIndex >= 0
                      ? '(Đã khóa — Không thể chèn sau Chặng Chung Kết)'
                      : '(Mặc định)'}
                  </option>
                  <option value="0">Chèn lên đầu tiên (Trước Chặng 1)</option>
                  {checkpoints.map((cp, idx) => {
                    const isAfterFinal =
                      Boolean(cp.isFinalCheckpoint) ||
                      (finalCheckpointIndex >= 0 && idx >= finalCheckpointIndex);
                    return (
                      <option
                        key={cp.id}
                        value={String(idx + 1)}
                        disabled={isAfterFinal}
                      >
                        Chèn vào sau Chặng {idx + 1}: {cp.title || cp.name}
                        {isAfterFinal
                          ? ' (Đã khóa — Chặng Chung Kết)'
                          : idx === 0 && checkpoints.length > 1
                          ? ' (ở giữa Chặng 1 và Chặng 2)'
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
                💡 <strong>Cách chèn vào giữa:</strong> Chọn <em>"Chèn vào sau Chặng 1"</em> để đặt vào vị trí số 2, các chặng sau sẽ tự động dời thứ tự.
              </p>
            </div>
          </div>

          {/* Submission Requirements Editor */}
          <SubmissionFieldsEditor
            fields={newSubmissionFields}
            onChangeFields={setNewSubmissionFields}
            requirements={newRequirements}
            onChangeRequirements={setNewRequirements}
            reqInput={newReqInput}
            onChangeReqInput={setNewReqInput}
            onAddReq={() => {
              if (!newReqInput.trim()) return;
              setNewRequirements([...newRequirements, newReqInput.trim()]);
              setNewReqInput('');
            }}
          />

          {/* Sticky Modal Action Buttons */}
          <div className="sticky bottom-0 bg-card backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 border-t border-border flex justify-end gap-3 z-10 rounded-b-[16px]">
            <Button variant="ghost" type="button" onClick={handleCloseAdd} disabled={submitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{submitting ? 'Đang tạo...' : 'Tạo Chặng Nộp'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingCp)}
        onClose={handleCloseEdit}
        title={`Chỉnh Sửa Chặng & Cấu Hình Yêu Cầu: ${editingCp?.title || ''}`}
        maxWidth="4xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {alert && alert.type === 'error' && (
            <div
              role="alert"
              className="p-3 rounded-[10px] border bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
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
          {/* Top Row: Title & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8">
              <Input
                label="Tiêu đề chặng nộp *"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                label="Trọng số đánh giá (% tổng điểm) *"
                type="number"
                min={5}
                max={100}
                value={editWeight}
                onChange={(e) => setEditWeight(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả yêu cầu chặng *</label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          {/* Duration in Minutes with Quick Presets */}
          <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-foreground font-bold text-xs flex items-center gap-1.5">
                <Clock size={15} className="text-primary" />
                <span>Thời lượng nộp bài (Điền số phút) *</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ⏱️ {editDurationMinutes} phút = {formatDuration(editDurationMinutes)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4">
                <Input
                  type="number"
                  min={editingCp?.status === 'upcoming' ? 15 : Math.max(15, editingCp?.durationMinutes || 15)}
                  max={10080}
                  step={15}
                  value={editDurationMinutes}
                  onChange={(e) => {
                    const minAllowed =
                      editingCp?.status === 'upcoming'
                        ? 15
                        : Math.max(15, editingCp?.durationMinutes || 15);
                    setEditDurationMinutes(Math.max(minAllowed, Number(e.target.value)));
                  }}
                  required
                />
              </div>
              <div className="sm:col-span-8">
                <div className="flex flex-wrap gap-1.5">
                  {durationPresets.map((preset) => {
                    const isBelowCurrentForActive =
                      editingCp?.status !== 'upcoming' &&
                      preset.value < (editingCp?.durationMinutes || 15);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        disabled={isBelowCurrentForActive}
                        onClick={() => setEditDurationMinutes(preset.value)}
                        className={`px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors border ${
                          isBelowCurrentForActive
                            ? 'bg-muted/20 text-muted-foreground/40 border-border/50 cursor-not-allowed'
                            : editDurationMinutes === preset.value
                            ? 'bg-[#6366F1] text-white border-[#6366F1] cursor-pointer'
                            : 'bg-card text-muted-foreground border-border hover:border-slate-400 hover:text-foreground cursor-pointer'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border">
              {editingCp?.status === 'upcoming' ? (
                <>
                  💡 <strong>Chặng chưa mở:</strong> Bạn có thể tự do tăng hoặc giảm thời lượng. Hệ thống sẽ <strong>tự động cấu hình lại lịch trình nối tiếp</strong> cho chặng này và toàn bộ các chặng phía sau.
                </>
              ) : (
                <>
                  💡 <strong>Chặng đang diễn ra / đã qua:</strong> Chỉ cho phép giữ nguyên hoặc <strong>gia hạn thêm thời lượng</strong> (tối thiểu {editingCp?.durationMinutes || 15} phút) để bảo vệ quyền lợi thí sinh. Các chặng phía sau sẽ tự động dời nối tiếp.
                </>
              )}
            </p>
          </div>

          {/* Submission Requirements Editor */}
          <SubmissionFieldsEditor
            fields={editSubmissionFields}
            onChangeFields={setEditSubmissionFields}
            requirements={editRequirements}
            onChangeRequirements={setEditRequirements}
            reqInput={editReqInput}
            onChangeReqInput={setEditReqInput}
            onAddReq={() => {
              if (!editReqInput.trim()) return;
              setEditRequirements([...editRequirements, editReqInput.trim()]);
              setEditReqInput('');
            }}
          />

          {/* Sticky Modal Action Buttons */}
          <div className="sticky bottom-0 bg-card backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 border-t border-border flex justify-end gap-3 z-10 rounded-b-[16px]">
            <Button variant="ghost" type="button" onClick={handleCloseEdit} disabled={submitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Route Navigation Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.reset) blocker.reset();
        }}
        onLeave={() => {
          if (blocker.proceed) blocker.proceed();
        }}
        title="Xác Nhận Rời Khỏi Trang"
        message="Bạn đang có thay đổi chặng nộp bài chưa được lưu. Nếu rời đi bây giờ, mọi nội dung vừa nhập sẽ bị hủy bỏ."
      />

      <ConfirmDialog
        open={Boolean(deleteCpTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteCpTarget(null);
        }}
        title={`Xóa / Vô hiệu hóa chặng nộp "${deleteCpTarget?.title || ''}"?`}
        description="Chặng nộp này sẽ bị vô hiệu hóa khỏi danh sách các mốc nộp bài của thí sinh. Vui lòng xác nhận trước khi thực hiện."
        confirmLabel="Xác nhận xóa chặng"
        variant="destructive"
        onConfirm={executeDeleteCp}
      />

      <ConfirmDialog
        open={Boolean(discardTarget)}
        onOpenChange={(open) => {
          if (!open) setDiscardTarget(null);
        }}
        title="Hủy bỏ thay đổi chưa lưu?"
        description="Bạn có nội dung cấu hình chặng nộp bài chưa được lưu. Nếu đóng cửa sổ này, toàn bộ nội dung vừa nhập sẽ bị hủy bỏ."
        confirmLabel="Đóng & Hủy thay đổi"
        variant="warning"
        onConfirm={() => {
          if (discardTarget === 'add') forceCloseAdd();
          if (discardTarget === 'edit') setEditingCp(null);
          setDiscardTarget(null);
        }}
      />
    </div>
  );
};
