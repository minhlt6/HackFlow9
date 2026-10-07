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
  Globe,
  Video,
  Presentation,
  FileText,
  Palette,
  File,
  X,
  ListChecks,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import type { Checkpoint, SubmissionFieldConfig, SubmissionFieldType } from '../../types';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '../../components/common/UnsavedChangesDialog';

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

const PRESET_TEMPLATES: {
  type: SubmissionFieldType;
  label: string;
  defaultLabel: string;
  placeholder: string;
  description: string;
  icon: any;
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
      return <GitBranch size={13} className="text-indigo-400" />;
    case 'demoUrl':
      return <Globe size={13} className="text-emerald-400" />;
    case 'videoUrl':
      return <Video size={13} className="text-rose-400" />;
    case 'slideUrl':
      return <Presentation size={13} className="text-amber-400" />;
    case 'figmaUrl':
      return <Palette size={13} className="text-purple-400" />;
    case 'description':
      return <FileText size={13} className="text-blue-400" />;
    default:
      return <File size={13} className="text-slate-400" />;
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
      id: `f-${preset.type}-${Date.now()}`,
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
    <div className="space-y-4 pt-3 border-t border-[#334155]/80">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-[#818CF8]" />
          <h4 className="font-['Righteous'] text-sm text-white tracking-wide">
            Cấu Hình Yêu Cầu Nộp Bài Cho Thí Sinh
          </h4>
        </div>
        <p className="text-[11px] text-slate-400">
          Quy định các liên kết (URL) và trường thông tin mà thí sinh bắt buộc / khuyến nghị nộp tại chặng này.
        </p>
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-1.5 p-3 rounded-[12px] bg-[#0F172A] border border-[#334155]">
        <span className="text-[11px] font-semibold text-slate-300">
          Thêm nhanh hạng mục nộp bài:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.type}
                type="button"
                onClick={() => handleAddField(tmpl)}
                className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[#1E293B] hover:bg-[#334155] text-slate-200 hover:text-white border border-[#334155] hover:border-[#6366F1]/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon size={12} className="text-[#818CF8]" />
                <span>+ {tmpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of Configured Fields */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">
            Danh sách hạng mục bài nộp ({fields.length}):
          </span>
          <span>Thí sinh sẽ điền theo form này khi nộp bài</span>
        </div>

        {fields.length === 0 ? (
          <div className="p-4 rounded-[10px] bg-[#0F172A]/50 border border-dashed border-[#334155] text-center text-xs text-slate-400">
            Chưa có hạng mục nào. Bấm nút phía trên để thêm trường nộp bài.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E293B] text-[10px] font-mono text-slate-400">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      {getFieldIcon(field.type)}
                      <span className="text-slate-400 text-[11px]">[{field.type}]</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          handleUpdateField(field.id, { required: e.target.checked })
                        }
                        className="rounded border-[#334155] bg-[#1E293B] text-amber-500 focus:ring-amber-500"
                      />
                      <span
                        className={
                          field.required
                            ? 'text-amber-300 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {field.required ? 'Bắt buộc nộp' : 'Tùy chọn'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-[#1E293B] transition-colors"
                      title="Xóa trường này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) =>
                      handleUpdateField(field.id, { label: e.target.value })
                    }
                    placeholder="Tên nhãn hiển thị"
                    className="p-2 rounded-[8px] bg-[#1E293B] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={field.description || ''}
                    onChange={(e) =>
                      handleUpdateField(field.id, { description: e.target.value })
                    }
                    placeholder="Hướng dẫn / Gợi ý điền cho thí sinh"
                    className="p-2 rounded-[8px] bg-[#1E293B] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist / Criteria Section */}
      <div className="space-y-2 pt-2 border-t border-[#334155]/60">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-400" />
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
            placeholder="Ví dụ: Báo cáo định dạng PDF tối đa 15 trang..."
            className="flex-1 p-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
          />
          <button
            type="button"
            onClick={onAddReq}
            className="px-3 py-1.5 rounded-[8px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            + Thêm
          </button>
        </div>

        {requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {requirements.map((req, rIdx) => (
              <span
                key={rIdx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs bg-[#0F172A] border border-[#334155] text-slate-200"
              >
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReq(rIdx)}
                  className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
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
  const [editRequirements, setEditRequirements] = useState<string[]>([]);
  const [editSubmissionFields, setEditSubmissionFields] = useState<SubmissionFieldConfig[]>([]);
  const [editReqInput, setEditReqInput] = useState('');
  const [alert, setAlert] = useState<string | null>(null);

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

  const handleOpenAdd = () => {
    setIsAddOpen(true);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setInsertPosition('end');
    setNewRequirements([
      'Sơ đồ kiến trúc & đặc tả kỹ thuật',
      'Kho mã nguồn cập nhật trên GitHub',
    ]);
    setNewSubmissionFields([...DEFAULT_SUBMISSION_FIELDS]);
    setNewReqInput('');
  };

  const handleCloseAdd = () => {
    if (isAddDirty && !window.confirm('Bạn có nội dung chặng nộp chưa lưu. Bạn có chắc muốn đóng và hủy bỏ?')) {
      return;
    }
    setIsAddOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setNewRequirements([]);
    setNewSubmissionFields([]);
  };

  const handleCloseEdit = () => {
    if (isEditDirty && !window.confirm('Bạn có thay đổi chưa lưu cho chặng này. Bạn có chắc muốn đóng và hủy bỏ?')) {
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
    setEditWeight(cp.weight || 25);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;

    updateCheckpoint(editingCp.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      durationMinutes: Number(editDurationMinutes),
      weight: Number(editWeight),
      requirements: editRequirements,
      submissionFields: editSubmissionFields,
    });

    setEditingCp(null);
    setAlert(`Đã cập nhật chặng nộp "${editTitle}" thành công!`);
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
        requirements: newRequirements,
        submissionFields: newSubmissionFields,
        deadline: new Date(Date.now() + Number(newDurationMinutes) * 60 * 1000).toISOString(),
      },
      insertIndex,
    );

    setIsAddOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewDurationMinutes(180);
    setNewWeight(25);
    setNewRequirements([]);
    setNewSubmissionFields([]);
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

          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
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

                {/* Hạng mục yêu cầu nộp bài của thí sinh */}
                <div className="p-3.5 rounded-[12px] bg-[#0F172A]/70 border border-[#334155]/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <ListChecks size={14} className="text-[#818CF8]" />
                      <span>Hạng mục nộp bài yêu cầu cho Thí sinh:</span>
                      <span className="text-slate-400 font-normal">
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
                            ? 'bg-[#1E293B] border-amber-500/40 text-amber-200 shadow-sm'
                            : 'bg-[#1E293B]/60 border-[#334155] text-slate-300'
                        }`}
                      >
                        {getFieldIcon(field.type)}
                        <span className="font-medium">{field.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            field.required
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700/60 text-slate-400'
                          }`}
                        >
                          {field.required ? 'Bắt buộc' : 'Tùy chọn'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {cp.requirements && cp.requirements.length > 0 && (
                    <div className="pt-2 border-t border-[#334155]/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span className="font-medium text-slate-300">Tiêu chí kiểm duyệt:</span>
                      {cp.requirements.map((req, rIdx) => (
                        <span key={rIdx} className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span>{req}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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
        onClose={handleCloseAdd}
        title="Thêm Chặng Nộp Mới & Cấu Hình Yêu Cầu Bài Nộp"
        maxWidth="2xl"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]">
            <Button variant="ghost" type="button" onClick={handleCloseAdd}>
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
        onClose={handleCloseEdit}
        title={`Chỉnh Sửa Chặng & Cấu Hình Yêu Cầu: ${editingCp?.title || ''}`}
        maxWidth="2xl"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]">
            <Button variant="ghost" type="button" onClick={handleCloseEdit}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu Thay Đổi
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
    </div>
  );
};
