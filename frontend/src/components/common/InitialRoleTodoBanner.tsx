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

  // Find candidate's team
  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  // Define tasks based on role
  let title = '';
  let roleBadge = '';
  let roleIcon = <Sparkles size={20} className="text-[#818CF8]" />;
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
    title = 'Lộ Trình Nhiệm Vụ Bắt Buộc Cho Thí Sinh';
    roleBadge = 'Bắt buộc hoàn thành';
    roleIcon = <GraduationCap size={20} className="text-[#818CF8]" />;
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
        icon: <UserCheck size={16} className="text-[#818CF8]" />,
      },
      {
        id: 'cand-team',
        stepNum: 2,
        title: 'Bước 2: Ghép đội thi đấu (Bắt buộc)',
        description: 'Tạo đội thi mới hoặc nhập mã mời (ví dụ: HF2026) để gia nhập đội.',
        isCompleted: isStep2Done,
        actionLabel: isStep2Done ? `Đã vào đội ${myTeam?.name}` : 'Ghép đội ngay',
        icon: <Users size={16} className="text-indigo-400" />,
      },
      {
        id: 'cand-pledge',
        stepNum: 3,
        title: 'Bước 3: Quy chế & Ký cam kết liêm chính',
        description: 'Đọc thể lệ cuộc thi, cam kết bản quyền mã nguồn và chấp thuận chấm ẩn danh.',
        isCompleted: isStep3Done,
        actionLabel: isStep3Done ? 'Đã ký cam kết' : 'Ký cam kết ngay',
        icon: <FileCheck size={16} className="text-emerald-400" />,
      },
    ];
  } else if (role === 'admin') {
    title = 'Nhiệm Vụ Khởi Tạo & Vận Hành Cuộc Thi';
    roleBadge = 'Dành cho Ban Quản trị';
    roleIcon = <ShieldCheck size={20} className="text-amber-400" />;
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
        icon: <ShieldCheck size={16} className="text-amber-400" />,
      },
      {
        id: 'adm-rubric',
        stepNum: 2,
        title: 'Bước 2: Cân bằng trọng số tiêu chí chấm điểm (Rubric)',
        description: `Đảm bảo tổng trọng số đạt chính xác 100% (Hiện tại: ${totalWeight.toFixed(1)}%).`,
        isCompleted: isWeightBalanced,
        actionLabel: isWeightBalanced ? 'Đã cân bằng 100%' : 'Cân bằng ngay',
        icon: <Scale size={16} className="text-emerald-400" />,
      },
      {
        id: 'adm-security',
        stepNum: 3,
        title: 'Bước 3: Thiết lập Chính sách Bảo mật & Chấm ẩn danh',
        description: 'Kích hoạt chế độ mã hóa danh tính thí sinh khi Ban Giám khảo chấm thi.',
        isCompleted: true,
        actionLabel: 'Kiểm tra bảo mật',
        icon: <ShieldCheck size={16} className="text-indigo-400" />,
      },
    ];
  } else if (role === 'judge') {
    title = 'Hướng Dẫn Nghiệp Vụ Ban Giám Khảo';
    roleBadge = 'Dành cho Hội đồng Giám khảo';
    roleIcon = <Scale size={20} className="text-emerald-400" />;
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
        icon: <GraduationCap size={16} className="text-cyan-400" />,
      },
      {
        id: 'jdg-nda',
        stepNum: 2,
        title: 'Bước 2: Ký cam kết liêm chính & Tránh xung đột lợi ích',
        description: 'Bảo mật ý tưởng dự án và cam kết từ chối chấm đội có học viên quen biết.',
        isCompleted: isJudgePledged,
        actionLabel: isJudgePledged ? 'Đã ký cam kết' : 'Ký cam kết ngay',
        icon: <FileCheck size={16} className="text-emerald-400" />,
      },
      {
        id: 'jdg-rubric',
        stepNum: 3,
        title: 'Bước 3: Nắm vững Rubric & Giao diện chấm 2 màn hình',
        description: 'Làm quen màn hình đối chiếu mã nguồn GitHub, video demo và bảng điểm.',
        isCompleted: true,
        actionLabel: 'Xem hướng dẫn',
        icon: <BookOpen size={16} className="text-purple-400" />,
      },
    ];
  } else if (role === 'mentor') {
    title = 'Hướng Dẫn Dành Cho Cố Vấn Chuyên Môn';
    roleBadge = 'Dành cho Cố vấn chuyên môn';
    roleIcon = <GraduationCap size={20} className="text-cyan-400" />;
    subtitle = 'Đồng hành và hỗ trợ giải đáp kỹ thuật cho các đội thi trong suốt cuộc thi';

    items = [
      {
        id: 'men-scope',
        stepNum: 1,
        title: 'Bước 1: Xác nhận lĩnh vực công nghệ cố vấn',
        description: 'Kiểm tra lĩnh vực chuyên môn hỗ trợ và các đề tài thuộc lĩnh vực phụ trách.',
        isCompleted: true,
        actionLabel: 'Xem lĩnh vực',
        icon: <UserCheck size={16} className="text-cyan-400" />,
      },
      {
        id: 'men-sla',
        stepNum: 2,
        title: 'Bước 2: Quy tắc ứng xử & Cam kết thời gian phản hồi',
        description: 'Tiếp nhận vé hỗ trợ trong 30 phút và tuân thủ nguyên tắc định hướng kỹ thuật.',
        isCompleted: true,
        actionLabel: 'Xem quy chế',
        icon: <HelpCircle size={16} className="text-indigo-400" />,
      },
    ];
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  const isAllMandatoryDone = completedCount === items.length;

  const isAllDone = !!onboardingCompletedUsers[currentUser.id] || isAllMandatoryDone;

  // Find first unfinished mandatory step
  const firstUnfinished = items.find((i) => !i.isCompleted) || items[0];

  // Khi đã hoàn thành toàn bộ lộ trình nhiệm vụ, mặc định ẩn đi (hiển thị thanh trạng thái thu gọn)
  if (isAllDone && !isExpanded) {
    if (isDismissed) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-[14px] bg-[#1E293B]/70 border border-emerald-500/25 shadow-lg backdrop-blur-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {title}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 size={10} />
                Đã hoàn tất ({completedCount}/{items.length})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bạn đã hoàn thành các bước thiết lập ban đầu. Lộ trình được mặc định thu gọn để tối ưu không gian làm việc.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(true)}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#818CF8] hover:text-white bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Xem chi tiết lộ trình</span>
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-white hover:bg-[#334155] transition-colors cursor-pointer"
            title="Ẩn thông báo này"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[#6366F1]/40 bg-gradient-to-br from-[#1E293B] via-[#1E293B]/95 to-[#162033] p-5 lg:p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#6366F1]/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#334155]/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30">
            {roleIcon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-['Righteous'] text-lg sm:text-xl text-white tracking-wide">
                {title}
              </h3>
              <Badge variant={isAllDone ? 'success' : 'warning'} className="text-[10px]">
                {roleBadge}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-200">
              Tiến độ: <span className="text-[#818CF8] font-bold">{completedCount}/{items.length}</span>
            </span>
            <div className="w-28 sm:w-36 h-2 rounded-full bg-[#0F172A] border border-[#334155] overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-[#6366F1] to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Primary Action Button to Open Wizard */}
          <button
            onClick={() => openWizardAtStep(firstUnfinished.stepNum)}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              isAllDone
                ? 'bg-[#1E293B] hover:bg-[#334155] text-emerald-400 border border-emerald-500/40'
                : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[#6366F1]/25 ring-2 ring-[#6366F1]/30 animate-pulse'
            }`}
          >
            <span>{isAllDone ? 'Xem lại thiết lập' : `Làm Bước ${firstUnfinished.stepNum}`}</span>
            <ArrowRight size={14} />
          </button>

          {isAllDone ? (
            <button
              onClick={() => setIsExpanded(false)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#0F172A] border border-[#334155] hover:border-slate-500 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Thu gọn và ẩn lộ trình"
            >
              <span>Thu gọn</span>
              <ChevronUp size={14} />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#334155]/60 transition-colors"
              title={isCollapsed ? 'Mở rộng danh sách' : 'Thu gọn'}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Body: Checklist Items */}
      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
          {items.map((item) => {
            const isDone = item.isCompleted;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-[12px] border transition-all flex flex-col justify-between gap-3 ${
                  isDone
                    ? 'bg-[#0F172A]/40 border-emerald-500/30 text-slate-300'
                    : 'bg-[#0F172A]/80 border-[#334155] hover:border-[#6366F1]/50 text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} className="text-amber-400 animate-pulse" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className={`text-xs font-bold ${isDone ? 'text-emerald-300' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="self-end pt-1">
                  <button
                    onClick={() => openWizardAtStep(item.stepNum)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                      isDone
                        ? 'text-slate-400 hover:text-white bg-[#1E293B] border border-[#334155]'
                        : 'text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/30'
                    }`}
                  >
                    <span>{item.actionLabel || 'Thực hiện bước này'}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {role === 'candidate' && (
        <div className="mt-3.5 p-3 rounded-[10px] bg-[#0F172A]/70 border border-[#334155]/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Đăng ký đề tài thi đấu:</strong> Đội của bạn có thể thảo luận và đăng ký đề tài bất cứ lúc nào tại mục{' '}
              <button
                onClick={() => navigate('/topics')}
                className="text-[#818CF8] hover:text-white font-semibold underline cursor-pointer"
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
