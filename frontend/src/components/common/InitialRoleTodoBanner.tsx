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
  ListTodo,
  ShieldCheck,
  GraduationCap,
  Scale,
  Award,
  Users,
  Lightbulb,
  CheckSquare,
  BookOpen,
  MessageSquare,
  UserCheck,
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
    majorTopics,
    checkpoints,
    submissions,
    pendingCandidates,
    rubricCriteria,
  } = useMockStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  const toggleManualCheck = (id: string) => {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Find candidate's team
  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const mySubmissions = submissions.filter((s) => s.teamId === myTeam?.id);

  // Define tasks based on role
  let title = '';
  let roleBadge = '';
  let roleIcon = <Sparkles size={20} className="text-[#818CF8]" />;
  let subtitle = '';

  interface TodoItem {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    actionLabel?: string;
    actionRoute?: string;
    icon?: React.ReactNode;
  }

  let items: TodoItem[] = [];

  if (role === 'candidate') {
    title = 'Nhiệm Vụ Khởi Động Cho Thí Sinh';
    roleBadge = 'Dành cho Thí sinh & Đội thi';
    roleIcon = <GraduationCap size={20} className="text-[#818CF8]" />;
    subtitle = 'Hoàn thành các bước dưới đây để sẵn sàng tham gia vòng lập trình Hackathon';

    items = [
      {
        id: 'cand-profile',
        title: '1. Cập nhật hồ sơ thí sinh',
        description: 'Bổ sung mã số sinh viên, trường đại học và kỹ năng chuyên môn của bạn.',
        isCompleted: Boolean(currentUser.studentId && currentUser.school),
        actionLabel: 'Xem hồ sơ',
        actionRoute: '/profile',
        icon: <UserCheck size={16} className="text-[#818CF8]" />,
      },
      {
        id: 'cand-team',
        title: '2. Thành lập hoặc Gia nhập đội thi',
        description: 'Tạo đội thi mới để nhận mã mời hoặc nhập mã mời của đội trưởng để vào đội.',
        isCompleted: Boolean(myTeam),
        actionLabel: myTeam ? 'Đã có đội' : 'Quản lý đội',
        actionRoute: '/teams',
        icon: <Users size={16} className="text-indigo-400" />,
      },
      {
        id: 'cand-topic',
        title: '3. Lựa chọn & Đăng ký đề tài nghiên cứu',
        description: 'Khảo sát các đề tài nhánh và đăng ký sớm trước khi hết hạn ngạch (Quota).',
        isCompleted: Boolean(myTeam?.subTopicId),
        actionLabel: myTeam?.subTopicId ? 'Đã chọn đề tài' : 'Chọn đề tài',
        actionRoute: '/topics',
        icon: <Lightbulb size={16} className="text-amber-400" />,
      },
      {
        id: 'cand-cp1',
        title: '4. Chuẩn bị & Nộp mã nguồn Chặng 01',
        description: 'Liên kết kho lưu trữ GitHub và chốt mã băm commit đóng băng an toàn đúng hạn.',
        isCompleted: mySubmissions.length > 0,
        actionLabel: mySubmissions.length > 0 ? 'Đã nộp bài' : 'Xem chặng nộp',
        actionRoute: '/checkpoints',
        icon: <CheckSquare size={16} className="text-emerald-400" />,
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
        id: 'adm-approvals',
        title: '1. Xét duyệt tài khoản thí sinh chờ duyệt',
        description: `Đối soát danh sách sinh viên đăng ký (${pendingCandidates.length} tài khoản đang chờ duyệt).`,
        isCompleted: pendingCandidates.length === 0,
        actionLabel: pendingCandidates.length > 0 ? 'Duyệt hồ sơ ngay' : 'Đã duyệt xong',
        actionRoute: '/admin/approvals',
        icon: <UserCheck size={16} className="text-amber-400" />,
      },
      {
        id: 'adm-topics',
        title: '2. Kiểm tra danh mục đề tài & Hạn ngạch (Quota)',
        description: `Kiểm tra ${majorTopics.length} lĩnh vực lớn và chỉ tiêu số lượng đội tối đa cho từng nhánh.`,
        isCompleted: majorTopics.length > 0,
        actionLabel: 'Cấu hình đề tài',
        actionRoute: '/admin/topics',
        icon: <Lightbulb size={16} className="text-indigo-400" />,
      },
      {
        id: 'adm-cps',
        title: '3. Cấu hình mốc thời gian các chặng thi',
        description: `Thiết lập thời hạn đóng cổng (Deadline) và tỷ trọng điểm cho ${checkpoints.length} chặng thi.`,
        isCompleted: checkpoints.length > 0,
        actionLabel: 'Cấu hình chặng',
        actionRoute: '/admin/checkpoints',
        icon: <CheckSquare size={16} className="text-cyan-400" />,
      },
      {
        id: 'adm-rubric',
        title: '4. Cân bằng trọng số tiêu chí chấm điểm (Rubric)',
        description: `Đảm bảo tổng trọng số đạt chính xác 100% (Hiện tại: ${totalWeight.toFixed(1)}%).`,
        isCompleted: isWeightBalanced,
        actionLabel: 'Tiêu chí chấm',
        actionRoute: '/admin/criteria',
        icon: <Scale size={16} className="text-emerald-400" />,
      },
      {
        id: 'adm-personnel',
        title: '5. Mời Hội đồng Giám khảo & Cố vấn chuyên môn',
        description: 'Kiểm tra phân công chuyên gia vào hệ thống và ghép cặp hướng dẫn các lĩnh vực.',
        isCompleted: Boolean(manualChecks['adm-personnel']),
        actionLabel: 'Quản lý nhân sự',
        actionRoute: '/admin/personnel',
        icon: <Users size={16} className="text-purple-400" />,
      },
    ];
  } else if (role === 'judge') {
    title = 'Hướng Dẫn Nghiệp Vụ Ban Giám Khảo';
    roleBadge = 'Dành cho Hội đồng Giám khảo';
    roleIcon = <Scale size={20} className="text-emerald-400" />;
    subtitle = 'Chuẩn bị quy trình đánh giá công tâm, chính xác theo khung tiêu chí Rubric';

    items = [
      {
        id: 'jdg-blind',
        title: '1. Nắm vững quy chế chấm ẩn danh',
        description: 'Hệ thống tự động mã hóa danh tính và trường học thành mã định danh đội để đảm bảo khách quan tuyệt đối.',
        isCompleted: Boolean(manualChecks['jdg-blind'] ?? true),
        icon: <ShieldCheck size={16} className="text-emerald-400" />,
      },
      {
        id: 'jdg-rubric',
        title: '2. Nghiên cứu bộ tiêu chí chấm điểm (Rubric)',
        description: 'Nắm vững 4 tiêu chuẩn chấm điểm cốt lõi và thang điểm tối đa cho từng hạng mục.',
        isCompleted: Boolean(manualChecks['jdg-rubric']),
        actionLabel: 'Xem tiêu chí',
        actionRoute: '/judge/topics',
        icon: <BookOpen size={16} className="text-indigo-400" />,
      },
      {
        id: 'jdg-assigned',
        title: '3. Kiểm tra danh sách đội thi được phân công',
        description: 'Theo dõi tiến độ nộp bài của các đội thi thuộc lĩnh vực chuyên môn bạn phụ trách.',
        isCompleted: Boolean(manualChecks['jdg-assigned']),
        actionLabel: 'Danh sách đội',
        actionRoute: '/judge/dashboard',
        icon: <Users size={16} className="text-cyan-400" />,
      },
      {
        id: 'jdg-split',
        title: '4. Làm quen với giao diện Chấm song song',
        description: 'Trải nghiệm màn hình chia đôi vừa tra cứu commit code / slide vừa nhập điểm trực tiếp.',
        isCompleted: Boolean(manualChecks['jdg-split']),
        actionLabel: 'Thử chấm song song',
        actionRoute: '/judge/split-screen',
        icon: <Award size={16} className="text-purple-400" />,
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
        title: '1. Kiểm tra thông tin & Lĩnh vực phụ trách',
        description: 'Xác nhận thông tin chuyên môn và các đề tài thuộc lĩnh vực bạn đảm nhiệm.',
        isCompleted: Boolean(manualChecks['men-scope'] ?? true),
        icon: <UserCheck size={16} className="text-cyan-400" />,
      },
      {
        id: 'men-topics',
        title: '2. Xem danh sách các đề tài & yêu cầu kỹ thuật',
        description: 'Nắm bắt các bài toán mẫu, tập dữ liệu đầu vào và các tiêu chí kỹ thuật cần đạt.',
        isCompleted: Boolean(manualChecks['men-topics']),
        actionLabel: 'Xem đề tài',
        actionRoute: '/mentor/dashboard',
        icon: <Lightbulb size={16} className="text-amber-400" />,
      },
      {
        id: 'men-tickets',
        title: '3. Sẵn sàng tiếp nhận yêu cầu hỗ trợ (Tickets)',
        description: 'Trực tiếp tiếp nhận và giải đáp thắc mắc về API, dữ liệu hoặc mô hình từ thí sinh.',
        isCompleted: Boolean(manualChecks['men-tickets']),
        actionLabel: 'Tiếp nhận hỗ trợ',
        actionRoute: '/mentor/tickets',
        icon: <MessageSquare size={16} className="text-indigo-400" />,
      },
      {
        id: 'men-progress',
        title: '4. Theo dõi tiến độ nộp bài các chặng',
        description: 'Đôn đốc các đội nộp đúng hạn chót (tuân thủ quy định RBAC không can thiệp mã nguồn nộp).',
        isCompleted: Boolean(manualChecks['men-progress']),
        actionLabel: 'Xem tiến độ chặng',
        actionRoute: '/mentor/checkpoints',
        icon: <CheckSquare size={16} className="text-emerald-400" />,
      },
    ];
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

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
              <Badge variant="indigo" className="text-[10px]">
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

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#334155]/60 transition-colors"
            title={isCollapsed ? 'Mở rộng danh sách' : 'Thu gọn'}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
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
                    ? 'bg-[#0F172A]/40 border-emerald-500/40 text-slate-300'
                    : 'bg-[#0F172A]/80 border-[#334155] hover:border-[#6366F1]/50 text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleManualCheck(item.id)}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                    title={isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} className="text-slate-500 hover:text-[#818CF8]" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className={`text-xs font-bold ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionRoute && (
                  <div className="self-end pt-1">
                    <button
                      onClick={() => navigate(item.actionRoute!)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[8px] transition-all ${
                        isDone
                          ? 'text-slate-400 hover:text-white bg-[#1E293B] border border-[#334155]'
                          : 'text-[#818CF8] hover:text-white bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/40'
                      }`}
                    >
                      <span>{item.actionLabel || 'Xem ngay'}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
