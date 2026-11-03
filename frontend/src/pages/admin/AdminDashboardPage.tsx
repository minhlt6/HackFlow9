import React, { useEffect } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { useActionConfirmation } from '../../hooks/useActionConfirmation';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { InitialRoleTodoBanner } from '../../components/common/InitialRoleTodoBanner';
import { toast } from '../../store/useToastStore';
import {
  Users,
  ShieldCheck,
  CheckSquare,
  HelpCircle,
  Trophy,
  Settings,
  Play,
  Pause,
  ArrowUpRight,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const {
    teams,
    whitelist,
    pendingCandidates,
    submissions,
    tickets,
    config,
    toggleResultsPublished,
    toggleContestStarted,
  } = useMockStore();
  const { confirm, confirmationDialog } = useActionConfirmation();

  const navigate = useNavigate();

  useEffect(() => {
    void useMockStore.getState().syncFromBackend?.();
  }, []);

  const totalPendingCount = pendingCandidates.length;
  const totalWhitelistCount = whitelist.length;
  const approvedTeamsCount = teams.filter(
    (t) => t.status.toLowerCase() === 'approved',
  ).length;
  const openTicketsCount = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress',
  ).length;

  const formattedFinalDeadline = React.useMemo(() => {
    if (!config.finalSubmissionDeadline) return '15/11/2026 23:59';
    const d = new Date(config.finalSubmissionDeadline);
    if (Number.isNaN(d.getTime())) return '15/11/2026 23:59';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [config.finalSubmissionDeadline]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tổng quan Cuộc thi: ${config.name}`}
        description="Theo dõi tình trạng xác thực tài khoản OAuth, tiến độ nộp bài các chặng Checkpoint, xử lý hỗ trợ kỹ thuật và công bố kết quả cuộc thi."
        badge={<Badge variant="indigo">HackFlow Core v2.4</Badge>}
        actions={
          <>
            <Button
              type="button"
              variant={config.isContestStarted ? 'outline' : 'success'}
              size="sm"
              onClick={async () => {
                const accepted = await confirm({
                  title: config.isContestStarted
                    ? 'Tạm dừng cuộc thi?'
                    : 'Bắt đầu cuộc thi?',
                  description: config.isContestStarted
                    ? 'Tạm dừng bộ đếm thời gian sẽ đóng băng trạng thái chạy của cuộc thi trên giao diện thí sinh.'
                    : 'Kích hoạt cuộc thi sẽ bắt đầu tính giờ các mốc Checkpoint và cho phép các đội thi nộp bài.',
                  confirmLabel: config.isContestStarted
                    ? 'Tạm dừng ngay'
                    : 'Bắt đầu ngay',
                  variant: config.isContestStarted ? 'warning' : 'primary',
                });
                if (!accepted) return;
                void toggleContestStarted().catch(() =>
                  toast.error('Không thể lưu thay đổi. Vui lòng thử lại.'),
                );
              }}
            >
              {config.isContestStarted ? <Pause size={15} /> : <Play size={15} />}
              <span>
                {config.isContestStarted
                  ? 'Đang chạy đếm ngược (Tạm dừng)'
                  : 'Bắt đầu cuộc thi'}
              </span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={async () => {
                const accepted = await confirm({
                  title: config.resultsPublished
                    ? 'Ẩn bảng xếp hạng?'
                    : 'Công bố bảng xếp hạng chính thức?',
                  description: config.resultsPublished
                    ? 'Bảng xếp hạng sẽ chuyển về chế độ bảo mật và ẩn khỏi giao diện thí sinh.'
                    : 'Toàn bộ thí sinh và khách truy cập sẽ xem được điểm số và thứ hạng chung cuộc.',
                  confirmLabel: config.resultsPublished
                    ? 'Ẩn kết quả'
                    : 'Công bố ngay',
                  variant: config.resultsPublished ? 'warning' : 'primary',
                });
                if (!accepted) return;
                void toggleResultsPublished().catch(() =>
                  toast.error('Không thể lưu thay đổi. Vui lòng thử lại.'),
                );
              }}
            >
              <Trophy size={15} />
              <span>
                {config.resultsPublished
                  ? 'Ẩn kết quả cuộc thi'
                  : 'Công bố bảng xếp hạng'}
              </span>
            </Button>
          </>
        }
      />

      {/* Checklist nhiệm vụ thiết lập ban đầu cho Ban Quản Trị */}
      <InitialRoleTodoBanner role="admin" />

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tài khoản chờ xét duyệt"
          value={totalPendingCount}
          subtitle="Sinh viên đăng ký cần phê duyệt"
          icon={<ShieldCheck size={20} />}
          iconColor="amber"
          onClick={() => navigate('/admin/approvals')}
        />

        <StatCard
          title="Tổng số Đội thi"
          value={`${approvedTeamsCount} / ${teams.length}`}
          subtitle={`${approvedTeamsCount} đội đã phê duyệt hợp lệ`}
          icon={<Users size={20} />}
          iconColor="indigo"
          onClick={() => navigate('/admin/teams')}
        />

        <StatCard
          title="Bài nộp các chặng"
          value={submissions.length}
          subtitle="Tổng số Commit SHA đã chốt"
          icon={<CheckSquare size={20} />}
          iconColor="emerald"
          onClick={() => navigate('/admin/checkpoints')}
        />

        <StatCard
          title="Yêu cầu hỗ trợ đang mở"
          value={openTicketsCount}
          subtitle="Cần Cố vấn chuyên môn hỗ trợ"
          icon={<HelpCircle size={20} />}
          iconColor="rose"
          onClick={() => navigate('/mentor/tickets')}
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Management Shortcuts */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Phân hệ Vận hành Trọng tâm</CardTitle>
              <CardDescription>
                Truy cập nhanh các tác vụ quản trị thiết yếu trong suốt thời gian diễn ra Hackathon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => navigate('/admin/teams')}
                  className="group rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors inline-flex items-center gap-1">
                      Quản lý Đội thi & Đề tài
                      <ArrowUpRight size={14} className="opacity-60" />
                    </span>
                    <Badge variant="indigo">{teams.length} đội</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Phê duyệt tư cách đội thi, đối soát định biên 3–5 thành viên và theo dõi đề tài đăng ký.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/approvals')}
                  className="group rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors inline-flex items-center gap-1">
                      Duyệt Tài khoản OAuth
                      <ArrowUpRight size={14} className="opacity-60" />
                    </span>
                    <Badge variant="warning">{totalPendingCount} chờ</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Đối soát sinh viên đăng nhập GitHub với danh sách Whitelist trường đại học.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/whitelist')}
                  className="group rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors inline-flex items-center gap-1">
                      Danh mục Whitelist
                      <ArrowUpRight size={14} className="opacity-60" />
                    </span>
                    <Badge variant="info">{totalWhitelistCount} email</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Import danh sách sinh viên hợp lệ qua CSV hoặc biểu mẫu trực tiếp.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/results')}
                  className="group rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors inline-flex items-center gap-1">
                      Tổng hợp & Bảng điểm
                      <ArrowUpRight size={14} className="opacity-60" />
                    </span>
                    <Badge variant={config.resultsPublished ? 'success' : 'neutral'}>
                      {config.resultsPublished ? 'Đã công bố' : 'Bảo mật'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tính toán điểm số có trọng số theo Rubric và xuất biên bản kết quả cuộc thi.
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline & Announcements */}
        <div className="lg:col-span-4">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Giai đoạn Hiện tại</CardTitle>
                <Badge variant="indigo">{config.currentPhase}</Badge>
              </div>
              <CardDescription>
                Mốc thời gian vận hành hệ thống Hackathon.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mở đăng ký:</span>
                  <span className="font-mono font-medium text-foreground">10/10/2026</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Khóa chọn đề tài:</span>
                  <span className="font-mono font-medium text-foreground">20/10/2026</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Hạn nộp chung cuộc:</span>
                  <span className="font-mono font-medium text-foreground">{formattedFinalDeadline}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/config')}
                className="w-full"
              >
                <Settings size={14} />
                <span>Chỉnh sửa cấu hình Hackathon</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {confirmationDialog}
    </div>
  );
};
