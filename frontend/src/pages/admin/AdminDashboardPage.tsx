import React, { useEffect, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { axiosClient } from '../../api/axiosClient';
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
  EyeOff,
  Eye,
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
    toggleBlindJudging,
    toggleResultsPublished,
    toggleContestStarted,
  } = useMockStore();

  const navigate = useNavigate();
  const [backendPendingCount, setBackendPendingCount] = useState<number | null>(null);
  const [backendWhitelistCount, setBackendWhitelistCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    axiosClient
      .get<{ data?: Array<{ email: string }> }>('/admin/candidates/pending')
      .then((res) => {
        const list = res.data?.data;
        if (active && Array.isArray(list)) {
          const mockExtra = pendingCandidates.filter(
            (m) => !list.some((r) => r.email.toLowerCase() === m.email.toLowerCase()),
          ).length;
          setBackendPendingCount(list.length + mockExtra);
        }
      })
      .catch(() => {
        // Fallback to mock count
      });

    axiosClient
      .get<{ data?: Array<{ email: string }> }>('/admin/whitelist?include_inactive=true')
      .then((res) => {
        const list = res.data?.data;
        if (active && Array.isArray(list)) {
          const mockExtra = whitelist.filter(
            (m) => !list.some((r) => r.email.toLowerCase() === m.email.toLowerCase()),
          ).length;
          setBackendWhitelistCount(list.length + mockExtra);
        }
      })
      .catch(() => {
        // Fallback to mock count
      });

    return () => {
      active = false;
    };
  }, [pendingCandidates, whitelist]);

  const totalPendingCount = backendPendingCount ?? pendingCandidates.length;
  const totalWhitelistCount = backendWhitelistCount ?? whitelist.length;
  const approvedTeamsCount = teams.filter(
    (t) => t.status.toLowerCase() === 'approved',
  ).length;
  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tổng quan Cuộc thi: ${config.name}`}
        description="Theo dõi tình trạng xác thực tài khoản OAuth, tiến độ nộp bài các chặng Checkpoint, xử lý hỗ trợ kỹ thuật và điều phối chế độ chấm ẩn danh."
        badge={<Badge variant="indigo">HackFlow Core v2.4</Badge>}
        actions={
          <>
            <Button
              type="button"
              variant={config.isContestStarted ? 'outline' : 'success'}
              size="sm"
              onClick={() => {
                toggleContestStarted();
                toast.info(
                  config.isContestStarted
                    ? 'Đã tạm dừng đồng hồ đếm ngược cuộc thi'
                    : 'Đã kích hoạt đồng hồ đếm ngược cuộc thi',
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
              variant={config.blindJudgingMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                toggleBlindJudging();
                toast.info(
                  config.blindJudgingMode
                    ? 'Đã tắt chế độ chấm ẩn danh'
                    : 'Đã bật chế độ chấm ẩn danh (Blind Judging)',
                );
              }}
            >
              {config.blindJudgingMode ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>
                {config.blindJudgingMode
                  ? 'Chấm ẩn danh: ĐANG BẬT'
                  : 'Bật chấm ẩn danh'}
              </span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                toggleResultsPublished();
                toast.success(
                  config.resultsPublished
                    ? 'Đã chuyển bảng xếp hạng về chế độ bảo mật'
                    : 'Đã công bố bảng xếp hạng toàn cuộc thi',
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
                  <span className="font-mono font-medium text-foreground">15/11/2026 23:59</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Chế độ chấm ẩn danh:</span>
                  <Badge variant={config.blindJudgingMode ? 'warning' : 'neutral'}>
                    {config.blindJudgingMode ? 'ĐANG KÍCH HOẠT' : 'TẮT'}
                  </Badge>
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
    </div>
  );
};
