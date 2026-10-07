import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  CheckSquare,
  GitBranch,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCode,
  ShieldCheck,
  Globe,
  Video,
  Presentation,
  FileText,
  Palette,
  File,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import type { Checkpoint, SubmissionFieldConfig, SubmissionFieldType } from '../../types';

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

export const CandidateCheckpointsPage: React.FC = () => {
  const {
    currentUser,
    teams,
    checkpoints,
    submissions,
    submitCheckpoint,
    openWizardAtStep,
    config,
  } = useMockStore();

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '0 phút';
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours} giờ ${rem} phút` : `${hours} giờ`;
  };

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  const [selectedCpId, setSelectedCpId] = useState<string | null>(null);

  // Form states
  const [formRepoUrl, setFormRepoUrl] = useState('');
  const [formDemoUrl, setFormDemoUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formSlideUrl, setFormSlideUrl] = useState('');
  const [formFigmaUrl, setFormFigmaUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCustomFields, setFormCustomFields] = useState<Record<string, string>>({});
  const [confirmLock, setConfirmLock] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ sha: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const teamSubmissions = submissions.filter((s) => s.teamId === myTeam?.id);

  const handleOpenSubmit = (cpId: string) => {
    setSelectedCpId(cpId);
    setSubmitResult(null);
    setConfirmLock(false);
    setValidationError(null);

    const existing = teamSubmissions.find((s) => s.checkpointId === cpId);
    if (existing) {
      setFormRepoUrl(existing.repoUrl || '');
      setFormDemoUrl(existing.demoUrl || '');
      setFormVideoUrl(existing.videoUrl || '');
      setFormSlideUrl(existing.slideUrl || '');
      setFormFigmaUrl(existing.figmaUrl || '');
      setFormDescription(existing.description || '');
      setFormCustomFields(existing.customFields || {});
    } else {
      setFormRepoUrl('https://github.com/cybersamurai-team/medical-rag-core');
      setFormDemoUrl('https://rag-demo.cybersamurai.team');
      setFormVideoUrl('https://youtube.com/watch?v=demo-hackflow-2026');
      setFormSlideUrl('https://docs.google.com/presentation/d/pitch-deck-2026');
      setFormFigmaUrl('');
      setFormDescription('Hoàn thành các tiêu chuẩn kỹ thuật chặng theo đúng thể lệ của Ban Tổ Chức.');
      setFormCustomFields({});
    }
  };

  const selectedCheckpoint = checkpoints.find((c) => c.id === selectedCpId);
  const activeFields =
    selectedCheckpoint?.submissionFields && selectedCheckpoint.submissionFields.length > 0
      ? selectedCheckpoint.submissionFields
      : DEFAULT_SUBMISSION_FIELDS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !selectedCpId) return;
    setValidationError(null);

    // Validate required fields
    for (const field of activeFields) {
      if (field.required) {
        if (field.type === 'repoUrl' && !formRepoUrl.trim()) {
          setValidationError(`Vui lòng điền link ${field.label}.`);
          return;
        }
        if (field.type === 'demoUrl' && !formDemoUrl.trim()) {
          setValidationError(`Vui lòng điền link ${field.label}.`);
          return;
        }
        if (field.type === 'videoUrl' && !formVideoUrl.trim()) {
          setValidationError(`Vui lòng điền link ${field.label}.`);
          return;
        }
        if (field.type === 'slideUrl' && !formSlideUrl.trim()) {
          setValidationError(`Vui lòng điền link ${field.label}.`);
          return;
        }
        if (field.type === 'figmaUrl' && !formFigmaUrl.trim()) {
          setValidationError(`Vui lòng điền link ${field.label}.`);
          return;
        }
        if (field.type === 'description' && !formDescription.trim()) {
          setValidationError(`Vui lòng nhập nội dung ${field.label}.`);
          return;
        }
        if (field.type === 'custom' && !formCustomFields[field.id]?.trim()) {
          setValidationError(`Vui lòng điền thông tin: ${field.label}.`);
          return;
        }
      }
    }

    const payload = {
      repoUrl: formRepoUrl.trim(),
      demoUrl: formDemoUrl.trim(),
      videoUrl: formVideoUrl.trim(),
      slideUrl: formSlideUrl.trim(),
      figmaUrl: formFigmaUrl.trim(),
      description: formDescription.trim(),
      customFields: formCustomFields,
    };

    const res = submitCheckpoint(selectedCpId, myTeam.id, payload);
    if (res.success) {
      setSubmitResult({ sha: res.commitSha });
    }
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Tiến Độ Các Chặng Nộp Bài
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Các mốc kiểm tra tiến độ bắt buộc. Bạn cần nộp đầy đủ các hạng mục được BTC yêu cầu (mã nguồn GitHub, slide, liên kết demo và tài liệu trực tuyến).
        </p>
      </div>

      {/* Warning when candidate has no team */}
      {!myTeam && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">Bạn chưa gia nhập đội thi</h4>
              <p className="text-xs text-slate-300">
                Để nộp bài các chặng, bạn bắt buộc phải tạo đội mới hoặc nhập mã mời của đội trưởng để tham gia đội.
              </p>
            </div>
          </div>
          <button
            onClick={() => openWizardAtStep(2)}
            className="px-4 py-2 rounded-[8px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
          >
            Ghép đội thi ngay
          </button>
        </div>
      )}

      {/* Checkpoints Cards List */}
      <div className="space-y-5">
        {checkpoints.map((cp, idx) => {
          const submission = teamSubmissions.find((s) => s.checkpointId === cp.id);
          const isSubmitted = Boolean(submission);
          const isOverdue = new Date(cp.deadline).getTime() < new Date().getTime() && !isSubmitted;
          const subFields =
            cp.submissionFields && cp.submissionFields.length > 0
              ? cp.submissionFields
              : DEFAULT_SUBMISSION_FIELDS;

          return (
            <div
              key={cp.id}
              className={`rounded-[16px] border p-6 transition-all ${
                isSubmitted
                  ? 'bg-[#1E293B] border-emerald-500/40 shadow-sm'
                  : 'bg-[#1E293B] border-[#334155]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left CP Info */}
                <div className="space-y-3.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <h3 className="font-['Righteous'] text-xl text-white tracking-wide">
                      {cp.title}
                    </h3>
                    <Badge variant={isSubmitted ? 'success' : isOverdue ? 'danger' : 'warning'}>
                      {isSubmitted
                        ? 'Đã nộp bài'
                        : isOverdue
                        ? 'Đã quá hạn'
                        : 'Đang mở nộp bài'}
                    </Badge>
                    <Badge variant="indigo">
                      Thời lượng: {cp.durationMinutes || 180} phút ({formatDuration(cp.durationMinutes || 180)})
                    </Badge>
                    <Badge variant="indigo">Trọng số {cp.weight || 20}%</Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                    {cp.description}
                  </p>

                  {/* Hạng mục yêu cầu nộp bài của chặng này */}
                  <div className="p-3.5 rounded-[12px] bg-[#0F172A]/70 border border-[#334155]/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-200 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <ListChecks size={14} className="text-[#818CF8]" />
                        <span>Hạng mục BTC yêu cầu nộp ({subFields.length}):</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {subFields.map((field) => (
                        <div
                          key={field.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs border ${
                            field.required
                              ? 'bg-[#1E293B] border-amber-500/40 text-amber-200'
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

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[#818CF8]" />
                      <span>Thời lượng làm bài:</span>
                      <span className="font-semibold text-white">
                        {cp.durationMinutes || 180} phút ({formatDuration(cp.durationMinutes || 180)})
                      </span>
                    </div>

                    <span>•</span>

                    {config.isContestStarted ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Hạn nộp chính thức: {new Date(cp.deadline).toLocaleString('vi-VN')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <span>Cuộc thi chưa bắt đầu (Thời hạn sẽ bắt đầu tính khi BTC phát lệnh)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action / Submitted Card */}
                <div className="flex flex-col sm:items-end justify-center gap-3 shrink-0 w-full lg:w-auto">
                  {isSubmitted && submission ? (
                    <div className="p-4 rounded-[12px] bg-[#0F172A] border border-emerald-500/30 text-xs space-y-2.5 w-full sm:min-w-[280px] lg:max-w-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle2 size={15} />
                          <span>Đã nộp bài chặng này</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">
                          SHA: {submission.commitSha.slice(0, 8)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Thời gian nộp: {new Date(submission.submittedAt).toLocaleTimeString('vi-VN')} ngày {new Date(submission.submittedAt).toLocaleDateString('vi-VN')}
                      </div>

                      {/* Display Submitted Deliverables */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {submission.repoUrl && (
                          <a
                            href={submission.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#1E293B] border border-[#334155] text-[#818CF8] hover:text-white text-xs hover:border-[#6366F1] transition-colors"
                          >
                            <GitBranch size={11} />
                            <span>GitHub Repo</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {submission.demoUrl && (
                          <a
                            href={submission.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#1E293B] border border-[#334155] text-emerald-400 hover:text-white text-xs hover:border-emerald-500 transition-colors"
                          >
                            <Globe size={11} />
                            <span>Live Demo</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {submission.slideUrl && (
                          <a
                            href={submission.slideUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#1E293B] border border-[#334155] text-amber-300 hover:text-white text-xs hover:border-amber-500 transition-colors"
                          >
                            <Presentation size={11} />
                            <span>Slide Deck</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {submission.videoUrl && (
                          <a
                            href={submission.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#1E293B] border border-[#334155] text-rose-300 hover:text-white text-xs hover:border-rose-500 transition-colors"
                          >
                            <Video size={11} />
                            <span>Video Demo</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {submission.figmaUrl && (
                          <a
                            href={submission.figmaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#1E293B] border border-[#334155] text-purple-300 hover:text-white text-xs hover:border-purple-500 transition-colors"
                          >
                            <Palette size={11} />
                            <span>Figma</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      {/* Description Text */}
                      {submission.description && (
                        <p className="text-[11px] text-slate-300 italic line-clamp-2 bg-[#1E293B]/60 p-2 rounded border border-[#334155]/40">
                          "{submission.description}"
                        </p>
                      )}

                      {/* Re-submit Button */}
                      {!isOverdue && (
                        <div className="pt-1 border-t border-[#334155]/60 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenSubmit(cp.id)}
                            className="text-xs text-[#818CF8] hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw size={12} />
                            <span>Cập nhật / Nộp lại bài</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant={isOverdue ? 'secondary' : 'primary'}
                      disabled={isOverdue}
                      onClick={() => {
                        if (!myTeam) {
                          openWizardAtStep(2);
                        } else {
                          handleOpenSubmit(cp.id);
                        }
                      }}
                      className="gap-2"
                    >
                      <UploadCloud size={16} />
                      <span>
                        {isOverdue
                          ? 'Đã đóng cổng nộp'
                          : !myTeam
                          ? 'Ghép đội để nộp bài'
                          : 'Nộp bài Checkpoint này'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Modal */}
      <Modal
        isOpen={Boolean(selectedCpId)}
        onClose={() => setSelectedCpId(null)}
        title={`Nộp Bài: ${selectedCheckpoint?.title || ''}`}
        maxWidth="2xl"
      >
        {submitResult ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="font-['Righteous'] text-xl text-white">Nộp Bài Thành Công!</h4>
              <p className="text-xs text-slate-300">
                Hệ thống đã khóa các hạng mục bài nộp và ghi nhận mã Commit SHA bảo mật cho đội <strong>{myTeam?.name}</strong>.
              </p>
            </div>

            <div className="p-3 rounded-[10px] bg-[#0F172A] border border-emerald-500/40 font-mono text-xs text-emerald-300">
              Mã Commit SHA: {submitResult.sha}
            </div>

            <Button
              variant="primary"
              onClick={() => setSelectedCpId(null)}
              className="w-full mt-4"
            >
              Hoàn tất
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 font-['Roboto']">
            {validationError && (
              <div className="p-3 rounded-[10px] bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertTriangle size={14} />
                <span>Quy định nộp bài chặng:</span>
              </div>
              <p className="leading-relaxed">
                Vui lòng điền đúng và đủ các thông tin theo yêu cầu của BTC. Đối với kho mã nguồn, hãy đảm bảo repository đã để Public hoặc cấp quyền truy cập cho GitHub của BGK.
              </p>
            </div>

            {/* Dynamic Input Fields based on Checkpoint Configuration */}
            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              {activeFields.map((field) => {
                if (field.type === 'repoUrl') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <Input
                        label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                        placeholder={field.placeholder || 'https://github.com/organization/project-repo'}
                        value={formRepoUrl}
                        onChange={(e) => setFormRepoUrl(e.target.value)}
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === 'demoUrl') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <Input
                        label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                        placeholder={field.placeholder || 'https://your-demo-app.vercel.app'}
                        value={formDemoUrl}
                        onChange={(e) => setFormDemoUrl(e.target.value)}
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === 'videoUrl') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <Input
                        label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                        placeholder={field.placeholder || 'https://youtube.com/watch?v=... hoặc link Google Drive'}
                        value={formVideoUrl}
                        onChange={(e) => setFormVideoUrl(e.target.value)}
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === 'slideUrl') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <Input
                        label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                        placeholder={field.placeholder || 'https://docs.google.com/presentation/d/...'}
                        value={formSlideUrl}
                        onChange={(e) => setFormSlideUrl(e.target.value)}
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === 'figmaUrl') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <Input
                        label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                        placeholder={field.placeholder || 'https://www.figma.com/design/...'}
                        value={formFigmaUrl}
                        onChange={(e) => setFormFigmaUrl(e.target.value)}
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === 'description') {
                  return (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <label className="text-slate-300 font-medium text-xs">
                        {field.label} {field.required ? '*' : '(Tùy chọn)'}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={field.placeholder || 'Mô tả nội dung thực hiện trong chặng này...'}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
                        required={field.required}
                      />
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}
                    </div>
                  );
                }

                // Custom Field
                return (
                  <div key={field.id} className="space-y-1">
                    <Input
                      label={`${field.label} ${field.required ? '*' : '(Tùy chọn)'}`}
                      placeholder={field.placeholder || 'Nhập thông tin theo yêu cầu...'}
                      value={formCustomFields[field.id] || ''}
                      onChange={(e) =>
                        setFormCustomFields({
                          ...formCustomFields,
                          [field.id]: e.target.value,
                        })
                      }
                      required={field.required}
                    />
                    {field.description && (
                      <p className="text-[11px] text-slate-400">{field.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <label className="flex items-start gap-2.5 pt-2 text-xs text-slate-300 cursor-pointer select-none border-t border-[#334155]/60">
              <input
                type="checkbox"
                checked={confirmLock}
                onChange={(e) => setConfirmLock(e.target.checked)}
                className="mt-0.5 rounded border-[#334155] bg-[#0F172A] text-[#6366F1] focus:ring-[#6366F1]"
                required
              />
              <span>
                Tôi xác nhận thông tin và các liên kết nộp bài này đại diện cho toàn bộ đội thi{' '}
                <strong className="text-white">{myTeam?.name}</strong>.
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]">
              <Button variant="ghost" type="button" onClick={() => setSelectedCpId(null)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" disabled={!confirmLock}>
                Xác nhận nộp bài
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
