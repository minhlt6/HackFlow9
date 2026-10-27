import React, { useEffect, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { toast } from '../../store/useToastStore';
import { apiClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import {
  Settings,
  Save,
  CheckCircle2,
  EyeOff,
  Calendar,
  Users,
  Trophy,
  RotateCcw,
  Clock,
  Play,
  Pause,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Layers,
  CheckSquare,
  Scale,
  Megaphone,
} from 'lucide-react';

import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '../../components/common/UnsavedChangesDialog';
import { ConfirmDialog } from '../../components/patterns/ConfirmDialog';

export const AdminConfigPage: React.FC = () => {
  const {
    config,
    updateConfig,
    toggleBlindJudging,
    toggleResultsPublished,
    toggleContestStarted,
    resetAllMockData,
    teams,
    checkpoints,
    rubricCriteria,
    announcements,
  } = useMockStore();

  const [name, setName] = useState(config.name);
  const [currentPhase, setCurrentPhase] = useState(config.currentPhase);
  const [minTeamMembers, setMinTeamMembers] = useState(config.minTeamMembers || config.minTeamSize || 3);
  const [maxTeamMembers, setMaxTeamMembers] = useState(config.maxTeamMembers || config.maxTeamSize || 5);
  const [finalDeadline, setFinalDeadline] = useState(
    config.finalSubmissionDeadline ? config.finalSubmissionDeadline.slice(0, 16) : ''
  );
  const [alert, setAlert] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isContestToggleConfirmOpen, setIsContestToggleConfirmOpen] = useState(false);
  const [isPublishToggleConfirmOpen, setIsPublishToggleConfirmOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('/admin/config')
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data ?? res.data;
        if (data && typeof data === 'object') {
          const currCfg = useMockStore.getState().config;
          const nextName = String(data.name ?? data.eventName ?? currCfg.name);
          const nextMinTeam = Number(data.minTeamMembers ?? data.minTeamSize ?? currCfg.minTeamMembers ?? currCfg.minTeamSize ?? 3);
          const nextMaxTeam = Number(data.maxTeamMembers ?? data.maxTeamSize ?? currCfg.maxTeamMembers ?? currCfg.maxTeamSize ?? 5);
          const nextPhase = String(data.currentPhase ?? currCfg.currentPhase);
          const nextEnd = String(data.end_time ?? data.endAt ?? currCfg.finalSubmissionDeadline);
          setName(nextName);
          setMinTeamMembers(nextMinTeam);
          setMaxTeamMembers(nextMaxTeam);
          if (nextPhase) setCurrentPhase(nextPhase);
          if (nextEnd) {
            setFinalDeadline(nextEnd.slice(0, 16));
          }
          useMockStore.setState((state) => ({
            config: {
              ...state.config,
              name: nextName,
              currentPhase: nextPhase || state.config.currentPhase,
              minTeamSize: nextMinTeam,
              minTeamMembers: nextMinTeam,
              maxTeamSize: nextMaxTeam,
              maxTeamMembers: nextMaxTeam,
              finalSubmissionDeadline: nextEnd || state.config.finalSubmissionDeadline,
              blindJudging: Boolean(data.blindJudgingEnabled ?? state.config.blindJudging),
              blindJudgingMode: Boolean(data.blindJudgingEnabled ?? state.config.blindJudgingMode),
              resultsPublished: Boolean(data.is_result_published ?? data.leaderboardPublished ?? state.config.resultsPublished),
            },
          }));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const initialName = config.name;
  const initialPhase = config.currentPhase;
  const initialMinTeam = config.minTeamMembers || config.minTeamSize || 3;
  const initialMaxTeam = config.maxTeamMembers || config.maxTeamSize || 5;
  const initialDeadline = config.finalSubmissionDeadline ? config.finalSubmissionDeadline.slice(0, 16) : '';

  const isDirty =
    name !== initialName ||
    currentPhase !== initialPhase ||
    Number(minTeamMembers) !== Number(initialMinTeam) ||
    Number(maxTeamMembers) !== Number(initialMaxTeam) ||
    finalDeadline !== initialDeadline;

  const blocker = useUnsavedChangesWarning(isDirty);

  const handleSaveAndLeave = async () => {
    if (Number(minTeamMembers) > Number(maxTeamMembers)) {
      toast.error('Số lượng thành viên tối thiểu không được lớn hơn số lượng tối đa.');
      return;
    }
    try {
      await updateConfig({
        name,
        currentPhase,
        minTeamSize: Number(minTeamMembers),
        minTeamMembers: Number(minTeamMembers),
        maxTeamSize: Number(maxTeamMembers),
        maxTeamMembers: Number(maxTeamMembers),
        finalSubmissionDeadline: new Date(finalDeadline).toISOString(),
      });
      if (blocker.proceed) {
        blocker.proceed();
      }
    } catch {
      toast.error('Không thể lưu cấu hình. Vui lòng thử lại.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(minTeamMembers) > Number(maxTeamMembers)) {
      toast.error('Số lượng thành viên tối thiểu không được lớn hơn số lượng tối đa.');
      return;
    }
    try {
      await updateConfig({
        name,
        currentPhase,
        minTeamSize: Number(minTeamMembers),
        minTeamMembers: Number(minTeamMembers),
        maxTeamSize: Number(maxTeamMembers),
        maxTeamMembers: Number(maxTeamMembers),
        finalSubmissionDeadline: new Date(finalDeadline).toISOString(),
      });
      setAlert('Đã cập nhật cấu hình hệ thống Hackathon thành công!');
      setTimeout(() => setAlert(null), 3500);
    } catch {
      toast.error('Không thể lưu cấu hình. Vui lòng thử lại.');
    }
  };

  const handleResetAll = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetAll = () => {
    setIsResetConfirmOpen(false);
    resetAllMockData();
    localStorage.removeItem('hackflow-full-setup-v3');
    localStorage.removeItem('hackflow-full-setup-v2');
    localStorage.removeItem('hackflow-clean-config-v1');
    localStorage.removeItem('hackflow-mock-state-v4');
    window.location.reload();
  };

  return (
    <div className="space-y-6  w-full pb-10">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6366F1]/20 border border-[#6366F1]/40 text-primary">
              <Settings size={20} />
            </div>
            <h1
              className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
            >
              Cấu Hình Hệ Thống Cuộc Thi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Thiết lập thông số vận hành toàn diện: tên cuộc thi, số lượng thành viên, mốc thời gian và chế độ chấm thi.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <Badge variant={config.isContestStarted ? 'success' : 'warning'} className="gap-1.5 py-1 px-3">
            <span
              className={`w-2 h-2 rounded-full ${
                config.isContestStarted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{config.isContestStarted ? 'Cuộc thi đang diễn ra' : 'Cuộc thi chưa bắt đầu'}</span>
          </Badge>

          <Badge variant={config.blindJudgingMode ? 'indigo' : 'neutral'} className="py-1 px-2.5">
            Chấm ẩn danh: {config.blindJudgingMode ? 'BẬT' : 'TẮT'}
          </Badge>

          <Badge variant={config.resultsPublished ? 'success' : 'neutral'} className="py-1 px-2.5">
            Bảng điểm: {config.resultsPublished ? 'CÔNG BỐ' : 'ẨN'}
          </Badge>
        </div>
      </div>

      {alert && (
        <div className="p-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/40 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{alert}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {isDirty && (
        <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/40 text-xs sm:text-sm text-amber-700 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <span>
              Bạn đang có thay đổi cấu hình chưa được lưu. Hãy bấm nút <strong>"Lưu Cấu Hình Hackathon"</strong> bên dưới để áp dụng.
            </span>
          </div>
          <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-bold self-start sm:self-auto shrink-0 border border-amber-500/30">
            Thay đổi chưa lưu
          </span>
        </div>
      )}

      {/* Main Form Grid: Left (Primary Config) & Right (Policies & System Ops) */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN (7 cols on lg, 8 cols on xl): Core Settings
           ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Card 1: Thông Tin Chung Cuộc Thi */}
          <div className="rounded-[16px] border border-border bg-card p-6 sm:p-7 space-y-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-[10px] bg-indigo-500/10 text-primary border border-indigo-500/20">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-base sm:text-lg text-foreground">
                  Thông Tin Chung & Quy Định Đội Thi
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tên định danh cuộc thi, tiến trình giai đoạn và quy định số lượng thành viên tham gia.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Tên Cuộc Thi *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ví dụ: HackFlow AI và DeepTech Hackathon 2026"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-muted-foreground font-medium text-xs flex items-center justify-between">
                    <span>Giai đoạn hiện tại *</span>
                    <span className="text-[10px] text-primary">Đang hoạt động</span>
                  </label>
                  <select
                    value={currentPhase}
                    onChange={(e) => setCurrentPhase(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none transition-colors"
                  >
                    <option value="Đăng ký tài khoản & Lập đội">Giai đoạn 1: Đăng ký & Lập đội</option>
                    <option value="Lựa chọn đề tài & Giới hạn số lượng">Giai đoạn 2: Chọn đề tài & Khóa số lượng</option>
                    <option value="Thực thi dự án & Nộp bài các chặng">Giai đoạn 3: Thực thi & Nộp bài các chặng</option>
                    <option value="Hội đồng chấm thi độc lập">Giai đoạn 4: Hội đồng chấm thi độc lập</option>
                    <option value="Bế mạc & Công bố kết quả">Giai đoạn 5: Bế mạc & Bảng xếp hạng</option>
                  </select>
                  <span className="text-[11px] text-muted-foreground">
                    Hiển thị thông báo tiến độ trên thanh điều hướng của toàn bộ người dùng.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Input
                      label="Tối thiểu / đội (Để chọn đề tài) *"
                      type="number"
                      min={1}
                      max={maxTeamMembers}
                      value={minTeamMembers}
                      onChange={(e) => setMinTeamMembers(Number(e.target.value))}
                      required
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Đội thi phải đạt tối thiểu số lượng này mới được phép đăng ký đề tài (mặc định: 3).
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Input
                      label="Tối đa / đội *"
                      type="number"
                      min={minTeamMembers}
                      max={10}
                      value={maxTeamMembers}
                      onChange={(e) => setMaxTeamMembers(Number(e.target.value))}
                      required
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Số lượng thành viên tối đa trong một đội thi (mặc định: 5).
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <Input
                    label="Hạn chót Nộp Bài Chung Cuộc *"
                    type="datetime-local"
                    value={finalDeadline}
                    onChange={(e) => setFinalDeadline(e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Mốc thời gian khóa cổng nộp sản phẩm chính thức của giải đấu.
                  </span>
                </div>

                <div className="p-3.5 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border flex flex-col justify-between text-xs space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={15} className="text-primary" />
                    <span className="font-semibold text-foreground">Quy chế nộp bài</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Hệ thống sẽ ghi nhận commit SHA mới nhất trước mốc hạn chót này. Mọi lượt nộp sau hạn chót sẽ bị hệ thống tự động từ chối.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Điều Khiển Thời Gian & Đồng Hồ Đếm Ngược */}
          <div className="rounded-[16px] border border-border bg-card p-6 sm:p-7 space-y-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-foreground text-base sm:text-lg text-foreground">
                    Thời Gian Cuộc Thi & Đồng Hồ Đếm Ngược
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Điều khiển kích hoạt thời gian thi đấu để đồng bộ đồng hồ đếm ngược trên giao diện thí sinh.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Competition Clock Hub */}
            <div
              className={`p-5 rounded-[14px] border transition-all ${
                config.isContestStarted
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-amber-500/5 border-amber-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        config.isContestStarted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-semibold tracking-tight text-foreground text-sm sm:text-base text-foreground">
                      {config.isContestStarted
                        ? 'Cuộc Thi Đang Diễn Ra (Đang Đếm Ngược)'
                        : 'Cuộc Thi Chưa Bắt Đầu (Chế Độ Chờ)'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {config.isContestStarted
                      ? 'Đồng hồ đếm ngược đang đếm trực tiếp đến hạn chót nộp bài trên màn hình của toàn bộ thí sinh. Các chặng nộp bài đang mở tiếp nhận bài làm.'
                      : 'Hệ thống đang ở chế độ chờ. Thí sinh nhìn thấy thông báo chuẩn bị và đồng hồ chưa kích hoạt cho đến khi Ban Quản Trị phát lệnh bắt đầu.'}
                  </p>
                </div>

                <div className="shrink-0">
                  {config.isContestStarted ? (
                    <button
                      type="button"
                      onClick={() => setIsContestToggleConfirmOpen(true)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/20"
                    >
                      <Pause size={15} />
                      <span>Tạm Dừng / Dừng Cuộc Thi</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsContestToggleConfirmOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      <Play size={15} />
                      <span>Phát Lệnh Bắt Đầu Cuộc Thi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview of Countdown Timer */}
              {config.isContestStarted && (
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                  <CountdownTimer
                    targetDate={config.finalSubmissionDeadline}
                    title="Đồng hồ đếm ngược trực tiếp (Xem trước giao diện thí sinh)"
                    className="p-3 bg-muted/40 dark:bg-slate-900/60 border-border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Submit Bar */}
          <div className="rounded-[16px] border border-border bg-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={16} className="text-primary" />
              <span>Các thay đổi sẽ được áp dụng ngay trên toàn bộ giao diện sau khi lưu.</span>
            </div>
            <Button variant="primary" type="submit" size="lg" className="w-full sm:w-auto gap-2 px-8">
              <Save size={18} />
              <span>Lưu Cấu Hình Hackathon</span>
            </Button>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 cols on lg, 4 cols on xl): Policies & Danger
           ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Card 3: Chế Độ Chấm Thi & Bảng Điểm */}
          <div className="rounded-[16px] border border-border bg-card p-6 space-y-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-[10px] bg-indigo-500/10 text-primary border border-indigo-500/20">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-base text-foreground">Chế Độ Chấm & Minh Bạch</h3>
                <p className="text-xs text-muted-foreground">Quy tắc chấm độc lập và công bố thứ hạng.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggle 1: Chế Độ Chấm Ẩn Danh */}
              <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <EyeOff size={16} className={config.blindJudgingMode ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'} />
                    <span className="font-bold text-foreground text-xs">Chế Độ Chấm Ẩn Danh</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => { void toggleBlindJudging().catch(() => toast.error('Không thể lưu cấu hình. Vui lòng thử lại.')); }}
                    role="switch"
                    aria-checked={config.blindJudgingMode}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.blindJudgingMode ? 'bg-[#6366F1]' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        config.blindJudgingMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tự động mã hóa tên đội, trường học và danh tính thí sinh khỏi màn hình chấm của Giám khảo để đảm bảo tính khách quan tuyệt đối.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                  <span className="text-muted-foreground">Trạng thái hiện tại:</span>
                  <span
                    className={`font-semibold ${
                      config.blindJudgingMode ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                    }`}
                  >
                    {config.blindJudgingMode ? '● Đang bật ẩn danh' : '○ Công khai danh tính'}
                  </span>
                </div>
              </div>

              {/* Toggle 2: Công Bố Bảng Xếp Hạng */}
              <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Trophy size={16} className={config.resultsPublished ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'} />
                    <span className="font-bold text-foreground text-xs">Công Bố Bảng Xếp Hạng</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPublishToggleConfirmOpen(true)}
                    role="switch"
                    aria-checked={config.resultsPublished}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.resultsPublished ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        config.resultsPublished ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mở công khai điểm số tổng hợp và xếp thứ hạng của các đội thi trên trang Leaderboard cho toàn bộ thí sinh.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                  <span className="text-muted-foreground">Trạng thái hiện tại:</span>
                  <span
                    className={`font-semibold ${
                      config.resultsPublished ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                    }`}
                  >
                    {config.resultsPublished ? '● Đã công bố công khai' : '○ Tạm ẩn điểm'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Tổng Quan Dữ Liệu Vận Hành */}
          <div className="rounded-[16px] border border-border bg-card p-6 space-y-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-[10px] bg-indigo-500/10 text-primary border border-indigo-500/20">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-base text-foreground">Tổng Quan Dữ Liệu</h3>
                <p className="text-xs text-muted-foreground">Quy mô các thực thể trong giải đấu.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Users size={13} className="text-primary" />
                  <span>Đội thi</span>
                </div>
                <div className="font-semibold tracking-tight text-foreground text-lg text-foreground">{teams.length}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <CheckSquare size={13} className="text-emerald-700 dark:text-emerald-400" />
                  <span>Chặng nộp</span>
                </div>
                <div className="font-semibold tracking-tight text-foreground text-lg text-foreground">{checkpoints.length}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Scale size={13} className="text-amber-700 dark:text-amber-400" />
                  <span>Tiêu chí Rubric</span>
                </div>
                <div className="font-semibold tracking-tight text-foreground text-lg text-foreground">{rubricCriteria.length}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Megaphone size={13} className="text-purple-700 dark:text-purple-400" />
                  <span>Thông báo</span>
                </div>
                <div className="font-semibold tracking-tight text-foreground text-lg text-foreground">{announcements.length}</div>
              </div>
            </div>
          </div>

          {/* Card 5: Vùng Nguy Hiểm (Danger Zone) */}
          <div className="rounded-[16px] border border-rose-500/30 bg-rose-500/10 p-6 space-y-3.5 shadow-lg shadow-rose-950/20">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
              <AlertTriangle size={18} className="shrink-0" />
              <h3 className="font-semibold tracking-tight text-foreground text-base">Tải Lại Dữ Liệu</h3>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
              Xóa bộ nhớ đệm giao diện và tải lại dữ liệu cuộc thi từ máy chủ.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] border border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <RotateCcw size={15} />
              <span>Tải lại từ máy chủ</span>
            </button>
          </div>
        </div>
      </form>

      {/* Unsaved Changes Route Navigation Blocker Modal */}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.reset) blocker.reset();
        }}
        onLeave={() => {
          if (blocker.proceed) blocker.proceed();
        }}
        onSaveAndLeave={handleSaveAndLeave}
        title="Xác Nhận Rời Khỏi Cấu Hình"
        message="Bạn đang có các thông số cấu hình cuộc thi vừa thay đổi chưa được lưu. Nếu rời khỏi trang bây giờ, toàn bộ chỉnh sửa này sẽ bị hủy bỏ."
      />

      <ConfirmDialog
        open={isContestToggleConfirmOpen}
        onOpenChange={setIsContestToggleConfirmOpen}
        title={
          config.isContestStarted
            ? 'Xác nhận Tạm dừng / Dừng cuộc thi?'
            : 'Xác nhận Phát lệnh Bắt đầu cuộc thi?'
        }
        description={
          config.isContestStarted
            ? 'Đồng hồ đếm ngược trên màn hình của toàn bộ thí sinh sẽ tạm dừng và hệ thống chuyển về chế độ chờ.'
            : 'Đồng hồ đếm ngược sẽ được kích hoạt ngay lập tức trên giao diện của toàn bộ thí sinh và mở tiếp nhận bài làm các chặng.'
        }
        confirmLabel={config.isContestStarted ? 'Xác nhận tạm dừng' : 'Bắt đầu cuộc thi'}
        variant={config.isContestStarted ? 'warning' : 'primary'}
        onConfirm={async () => {
          setIsContestToggleConfirmOpen(false);
          try {
            await toggleContestStarted();
          } catch {
            toast.error('Không thể lưu cấu hình. Vui lòng thử lại.');
          }
        }}
      />

      <ConfirmDialog
        open={isPublishToggleConfirmOpen}
        onOpenChange={setIsPublishToggleConfirmOpen}
        title={
          config.resultsPublished
            ? 'Tạm ẩn Bảng xếp hạng đối với thí sinh?'
            : 'Công bố công khai Bảng xếp hạng cho toàn bộ thí sinh?'
        }
        description={
          config.resultsPublished
            ? 'Bảng xếp hạng sẽ chuyển về chế độ bảo mật. Chỉ Quản trị viên và Giám khảo mới có thể xem bảng tổng hợp.'
            : 'Toàn bộ thí sinh sẽ nhìn thấy điểm tổng kết chính thức và thứ hạng của các đội thi trên trang Leaderboard.'
        }
        confirmLabel={config.resultsPublished ? 'Xác nhận ẩn bảng điểm' : 'Xác nhận công bố'}
        variant={config.resultsPublished ? 'warning' : 'primary'}
        onConfirm={async () => {
          setIsPublishToggleConfirmOpen(false);
          try {
            await toggleResultsPublished();
          } catch {
            toast.error('Không thể lưu cấu hình. Vui lòng thử lại.');
          }
        }}
      />

      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Tải lại dữ liệu từ máy chủ & xóa bộ nhớ đệm?"
        description="Hệ thống sẽ xóa bộ nhớ đệm (localStorage) trên trình duyệt hiện tại và đồng bộ lại toàn bộ dữ liệu trực tiếp từ cơ sở dữ liệu máy chủ."
        confirmLabel="Xác nhận tải lại"
        variant="destructive"
        onConfirm={executeResetAll}
      />
    </div>
  );
};
