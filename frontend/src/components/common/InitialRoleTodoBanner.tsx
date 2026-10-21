import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockStore } from '../../store/useMockStore';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  GraduationCap,
  Scale,
  Users,
  Lightbulb,
  BookOpen,
  UserCheck,
  FileCheck,
  HelpCircle,
  X,
} from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../ui/button';

interface InitialRoleTodoBannerProps {
  role: 'candidate' | 'admin' | 'judge' | 'mentor';
}

export const InitialRoleTodoBanner: React.FC<InitialRoleTodoBannerProps> = ({ role }) => {
  const navigate = useNavigate();
  const {
    currentUser,
    teams,
    rubricCriteria,
    openWizardAtStep,
    pledgedUsers,
    onboardingCompletedUsers,
  } = useMockStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  let title = '';
  let roleBadge = '';
  let roleIcon = <Sparkles size={18} className="text-primary" />;
  let subtitle = '';

  interface TodoItem {
    id: string;
    stepNum: number;
    title: string;
    description: string;
    isCompleted: boolean;
    actionLabel?: string;
    icon?: React.ReactNode;
  }

  let items: TodoItem[] = [];

  if (role === 'candidate') {
    title = 'Lộ trình nhiệm vụ bắt buộc cho Thí sinh';
    roleBadge = 'Bắt buộc hoàn thành';
    roleIcon = <GraduationCap size={18} className="text-primary" />;
    subtitle = 'Vui lòng hoàn thành 3 bước thiết lập ban đầu để kích hoạt toàn bộ quyền thi đấu';

    const isStep1Done = Boolean(currentUser.studentId && currentUser.school && currentUser.phone);
    const isStep2Done = Boolean(myTeam);
    const isStep3Done = Boolean(pledgedUsers[currentUser.id]);

    items = [
      {
        id: 'cand-profile',
        stepNum: 1,
        title: 'Bước 1: Cập nhật hồ sơ sinh viên',
        description: 'Bổ sung mã số sinh viên, trường đại học và kỹ năng chuyên môn của bạn.',
        isCompleted: isStep1Done,
        actionLabel: isStep1Done ? 'Đã hoàn thành' : 'Điền hồ sơ ngay',
        icon: <UserCheck size={15} className="text-primary" />,
      },
      {
        id: 'cand-team',
        stepNum: 2,
        title: 'Bước 2: Ghép đội thi đấu (Bắt buộc)',
        description: 'Tạo đội thi mới hoặc nhập mã mời (ví dụ: HF2026) để gia nhập đội.',
        isCompleted: isStep2Done,
        actionLabel: isStep2Done ? `Đã vào đội ${myTeam?.name}` : 'Ghép đội ngay',
        icon: <Users size={15} className="text-primary" />,
      },
      {
        id: 'cand-pledge',
        stepNum: 3,
        title: 'Bước 3: Quy chế & Ký cam kết liêm chính',
        description: 'Đọc thể lệ cuộc thi, cam kết bản quyền mã nguồn và chấp thuận chấm ẩn danh.',
        isCompleted: isStep3Done,
        actionLabel: isStep3Done ? 'Đã ký cam kết' : 'Ký cam kết ngay',
        icon: <FileCheck size={15} className="text-emerald-600 dark:text-emerald-400" />,
      },
    ];
  } else if (role === 'admin') {
    title = 'Nhiệm vụ Khởi tạo & Vận hành Cuộc thi';
    roleBadge = 'Dành cho Ban Quản trị';
    roleIcon = <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400" />;
    subtitle = 'Kiểm tra và chuẩn hóa các thông số kỹ thuật trước khi mở cổng nộp bài cho thí sinh';

    const totalWeight = rubricCriteria.reduce((sum, c) => sum + c.weight, 0);
    const isWeightBalanced = Math.abs(totalWeight - 100) < 0.1;

    items = [
      {
        id: 'adm-config',
        stepNum: 1,
        title: 'Bước 1: Cấu hình thông tin cuộc thi & Mốc thời gian',
        description: 'Kiểm tra tên cuộc thi, quy chế và các hạn chót đóng cổng bài nộp.',
        isCompleted: true,
        actionLabel: 'Xem cấu hình',
        icon: <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400" />,
      },
      {
        id: 'adm-rubric',
        stepNum: 2,
        title: 'Bước 2: Cân bằng trọng số tiêu chí chấm điểm (Rubric)',
        description: `Đảm bảo tổng trọng số đạt chính xác 100% (Hiện tại: ${totalWeight.toFixed(1)}%).`,
        isCompleted: isWeightBalanced,
        actionLabel: isWeightBalanced ? 'Đã cân bằng 100%' : 'Cân bằng ngay',
        icon: <Scale size={15} className="text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: 'adm-security',
        stepNum: 3,
        title: 'Bước 3: Thiết lập Chính sách Bảo mật & Chấm ẩn danh',
        description: 'Kích hoạt chế độ mã hóa danh tính thí sinh khi Ban Giám khảo chấm thi.',
        isCompleted: true,
        actionLabel: 'Kiểm tra bảo mật',
        icon: <ShieldCheck size={15} className="text-primary" />,
      },
    ];
  } else if (role === 'judge') {
    title = 'Hướng dẫn Nghiệp vụ Ban Giám khảo';
    roleBadge = 'Dành cho Hội đồng Giám khảo';
    roleIcon = <Scale size={18} className="text-emerald-600 dark:text-emerald-400" />;
    subtitle = 'Chuẩn bị quy trình đánh giá công tâm, chính xác theo khung tiêu chí Rubric';

    const isJudgePledged = Boolean(pledgedUsers[currentUser.id]);

    items = [
      {
        id: 'jdg-credentials',
        stepNum: 1,
        title: 'Bước 1: Xác nhận hồ sơ chuyên gia & Đơn vị công tác',
        description: 'Kiểm tra thông tin học hàm, học vị và đơn vị công tác của chuyên gia.',
        isCompleted: true,
        actionLabel: 'Xem hồ sơ',
        icon: <GraduationCap size={15} className="text-sky-600 dark:text-sky-400" />,
      },
      {
        id: 'jdg-nda',
        stepNum: 2,
        title: 'Bước 2: Ký cam kết liêm chính & Tránh xung đột lợi ích',
        description: 'Bảo mật ý tưởng dự án và cam kết từ chối chấm đội có học viên quen biết.',
        isCompleted: isJudgePledged,
        actionLabel: isJudgePledged ? 'Đã ký cam kết' : 'Ký cam kết ngay',
        icon: <FileCheck size={15} className="text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: 'jdg-rubric',
        stepNum: 3,
        title: 'Bước 3: Nắm vững Rubric & Giao diện chấm 2 màn hình',
        description: 'Làm quen màn hình đối chiếu mã nguồn GitHub, video demo và bảng điểm.',
        isCompleted: true,
        actionLabel: 'Xem hướng dẫn',
        icon: <BookOpen size={15} className="text-primary" />,
      },
    ];
  } else if (role === 'mentor') {
    title = 'Hướng dẫn dành cho Cố vấn Chuyên môn';
    roleBadge = 'Dành cho Cố vấn chuyên môn';
    roleIcon = <GraduationCap size={18} className="text-sky-600 dark:text-sky-400" />;
    subtitle = 'Đồng hành và hỗ trợ giải đáp kỹ thuật cho các đội thi trong suốt cuộc thi';

    items = [
      {
        id: 'men-scope',
        stepNum: 1,
        title: 'Bước 1: Xác nhận lĩnh vực công nghệ cố vấn',
        description: 'Kiểm tra lĩnh vực chuyên môn hỗ trợ và các đề tài thuộc lĩnh vực phụ trách.',
        isCompleted: true,
        actionLabel: 'Xem lĩnh vực',
        icon: <UserCheck size={15} className="text-sky-600 dark:text-sky-400" />,
      },
      {
        id: 'men-sla',
        stepNum: 2,
        title: 'Bước 2: Quy tắc ứng xử & Cam kết thời gian phản hồi',
        description: 'Tiếp nhận vé hỗ trợ trong 30 phút và tuân thủ nguyên tắc định hướng kỹ thuật.',
        isCompleted: true,
        actionLabel: 'Xem quy chế',
        icon: <HelpCircle size={15} className="text-primary" />,
      },
    ];
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);
  const isAllMandatoryDone = completedCount === items.length;
  const isAllDone = !!onboardingCompletedUsers[currentUser.id] || isAllMandatoryDone;
  const firstUnfinished = items.find((i) => !i.isCompleted) || items[0];

  if (isAllDone && !isExpanded) {
    if (isDismissed) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-card border border-border shadow-xs transition-all">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {title}
              </span>
              <Badge variant="success">
                Đã hoàn tất ({completedCount}/{items.length})
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Các bước thiết lập ban đầu đã hoàn tất. Lộ trình được thu gọn để tối ưu không gian làm việc.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsExpanded(true)}
          >
            <span>Xem chi tiết lộ trình</span>
            <ChevronDown size={13} />
          </Button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Ẩn thông báo này"
            aria-label="Ẩn thông báo này"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            {roleIcon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {title}
              </h3>
              <Badge variant={isAllDone ? 'success' : 'warning'}>
                {roleBadge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-xs font-medium text-muted-foreground">
              Tiến độ:{' '}
              <span className="text-foreground font-mono font-semibold">
                {completedCount}/{items.length}
              </span>
            </span>
            <div className="w-28 sm:w-36 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Button
            type="button"
            variant={isAllDone ? 'outline' : 'primary'}
            size="sm"
            onClick={() => openWizardAtStep(firstUnfinished.stepNum)}
          >
            <span>{isAllDone ? 'Xem lại thiết lập' : `Làm Bước ${firstUnfinished.stepNum}`}</span>
            <ArrowRight size={14} />
          </Button>

          {isAllDone ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              title="Thu gọn và ẩn lộ trình"
            >
              <span>Thu gọn</span>
              <ChevronUp size={14} />
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={isCollapsed ? 'Mở rộng danh sách' : 'Thu gọn'}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Body: Checklist Items */}
      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {items.map((item) => {
            const isDone = item.isCompleted;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                  isDone
                    ? 'bg-muted/30 border-border text-muted-foreground'
                    : 'bg-card border-primary/30 text-foreground'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle size={16} className="text-amber-500" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="text-xs font-semibold text-foreground">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="self-end pt-1">
                  <Button
                    type="button"
                    variant={isDone ? 'outline' : 'primary'}
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => openWizardAtStep(item.stepNum)}
                  >
                    <span>{item.actionLabel || 'Thực hiện bước này'}</span>
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {role === 'candidate' && (
        <div className="mt-3.5 p-3 rounded-md bg-muted/50 border border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lightbulb size={15} className="text-amber-500 shrink-0" />
            <span>
              <strong className="text-foreground">Đăng ký đề tài thi đấu:</strong> Đội của bạn có thể thảo luận và đăng ký đề tài bất cứ lúc nào tại mục{' '}
              <button
                type="button"
                onClick={() => navigate('/topics')}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Chọn đề tài
              </button>{' '}
              trước hạn chót.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
