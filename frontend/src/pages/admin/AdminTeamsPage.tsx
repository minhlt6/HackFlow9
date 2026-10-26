import React, { useMemo, useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  RotateCcw,
  MoreHorizontal,
  Eye,
  Edit2,
  Copy,
  XCircle,
  Trash2,
  Crown,
  GitCommit,
  Shuffle,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from '../../components/patterns/DataTable';
import { ConfirmDialog } from '../../components/patterns/ConfirmDialog';
import {
  PermissionDeniedState,
  StatCardsSkeleton,
} from '../../components/patterns/StateViews';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { TeamFormDialog } from '../../components/admin/TeamFormDialog';
import { TeamDetailDialog } from '../../components/admin/TeamDetailDialog';
import {
  useAdminTeams,
  type AdminTeamFormValues,
} from '../../hooks/useAdminTeams';
import type { EnrichedAdminTeam } from '../../api/adminTeamsApi';
import { toast } from '../../store/useToastStore';

export const AdminTeamsPage: React.FC = () => {
  const {
    teams,
    filteredTeams,
    candidatesDirectory,
    unassignedCandidates,
    majorTopics,
    metrics,
    isLoading,
    isMutating,
    isAutoMatching,
    error,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    trackFilter,
    setTrackFilter,
    complianceFilter,
    setComplianceFilter,
    getSubTopicMeta,
    loadTeams,
    handleCreateTeam,
    handleUpdateTeam,
    handleAutoMatchTeams,
    handleApproveTeam,
    handleBulkApprove,
    handleRejectTeam,
    handleDeleteTeam,
    handleResetDemoDataset,
    handleExportCsv,
  } = useAdminTeams();

  // Dialog states
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [detailTeam, setDetailTeam] = useState<EnrichedAdminTeam | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<EnrichedAdminTeam | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrichedAdminTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedAdminTeam | null>(null);

  const activeDetailTeam = useMemo(
    () =>
      detailTeam
        ? teams.find((t) => t.id === detailTeam.id) || detailTeam
        : null,
    [detailTeam, teams],
  );

  const openCreateModal = () => {
    setEditingTeam(null);
    setIsFormOpen(true);
  };

  const openEditModal = (team: EnrichedAdminTeam) => {
    setEditingTeam(team);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (
    values: AdminTeamFormValues,
  ): Promise<boolean> => {
    if (editingTeam) {
      return handleUpdateTeam(editingTeam.id, values);
    }
    return handleCreateTeam(values);
  };

  const handleCopyInviteCode = (team: EnrichedAdminTeam) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(team.inviteCode);
    }
    toast.info(
      `Đã sao chép mã mời: ${team.inviteCode}`,
      `Đội thi: ${team.name}`,
    );
  };

  // Filter definitions for DataTable
  const tableFilters = useMemo<DataTableFilter[]>(
    () => [
      {
        id: 'status',
        label: 'Trạng thái hồ sơ',
        value: statusFilter,
        onChange: setStatusFilter,
        options: [
          { label: 'Tất cả trạng thái', value: 'all' },
          { label: 'Đã phê duyệt (Approved)', value: 'approved' },
          { label: 'Chờ xét duyệt (Pending)', value: 'pending' },
          { label: 'Bị từ chối (Rejected)', value: 'rejected' },
        ],
      },
      {
        id: 'track',
        label: 'Lĩnh vực đề tài',
        value: trackFilter,
        onChange: setTrackFilter,
        options: [
          { label: 'Tất cả lĩnh vực', value: 'all' },
          ...majorTopics.map((m) => ({
            label: m.title || m.name || m.id,
            value: m.id,
          })),
        ],
      },
      {
        id: 'compliance',
        label: 'Quy chế thành viên',
        value: complianceFilter,
        onChange: setComplianceFilter,
        options: [
          { label: 'Tất cả quy mô', value: 'all' },
          { label: 'Đạt chuẩn (3–5 thành viên)', value: 'compliant' },
          { label: 'Thiếu thành viên (< 3 người)', value: 'under_quota' },
        ],
      },
    ],
    [
      statusFilter,
      setStatusFilter,
      trackFilter,
      setTrackFilter,
      complianceFilter,
      setComplianceFilter,
      majorTopics,
    ],
  );

  // Column definitions for DataTable
  const columns = useMemo<DataTableColumn<EnrichedAdminTeam>[]>(
    () => [
      {
        id: 'name',
        header: 'Đội Thi & Mã Mời',
        sortable: true,
        sortAccessor: (row) => row.name,
        cell: (row) => (
          <div className="space-y-1 max-w-[175px] xl:max-w-[215px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDetailTeam(row)}
                title={row.name}
                className="font-semibold text-foreground hover:text-primary transition-colors text-left truncate cursor-pointer"
              >
                {row.name}
              </button>
              {row.averageScore !== null && row.averageScore !== undefined && (
                <Badge variant="indigo" className="font-mono text-[10px] px-1.5 py-0">
                  {row.averageScore.toFixed(1)} đ
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground whitespace-nowrap">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-medium text-foreground border border-border">
                {row.inviteCode}
              </span>
              {row.latestCommitSha && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <GitCommit size={11} className="text-primary shrink-0" />
                  {row.latestCommitSha.slice(0, 7)}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'leader',
        header: 'Đội Trưởng & Đơn Vị',
        sortable: true,
        sortAccessor: (row) => row.leaderName || '',
        cell: (row) => (
          <div className="space-y-0.5 max-w-[175px] xl:max-w-[215px]">
            <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
              <Crown size={13} className="text-amber-500 shrink-0" />
              <span className="truncate" title={row.leaderName}>
                {row.leaderName}
              </span>
            </div>
            <div
              className="text-xs text-muted-foreground truncate"
              title={row.university}
            >
              {row.university}
            </div>
          </div>
        ),
      },
      {
        id: 'topic',
        header: 'Đề Tài Đăng Ký',
        sortable: true,
        sortAccessor: (row) => getSubTopicMeta(row.subTopicId).subTopicTitle,
        cell: (row) => {
          const meta = getSubTopicMeta(row.subTopicId);
          return (
            <div className="space-y-0.5 max-w-[185px] xl:max-w-[235px]">
              <div
                className="font-medium text-foreground truncate"
                title={meta.subTopicTitle}
              >
                {meta.subTopicTitle}
              </div>
              <div
                className="text-[11px] text-muted-foreground truncate"
                title={meta.majorTopicTitle}
              >
                {meta.majorTopicTitle}
              </div>
            </div>
          );
        },
      },
      {
        id: 'members',
        header: 'Quy Mô & Chặng',
        align: 'center',
        sortable: true,
        sortAccessor: (row) => row.memberCount ?? row.members.length,
        className: 'whitespace-nowrap',
        cell: (row) => {
          const count = row.memberCount ?? row.members.length;
          const isCompliant = count >= 3 && count <= 5;
          return (
            <div className="inline-flex flex-col items-center gap-1 whitespace-nowrap">
              <Badge
                variant={isCompliant ? 'neutral' : 'warning'}
                className="font-mono"
              >
                {count} / 5 TV
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground">
                CP: {row.checkpointsCompleted}/{row.totalCheckpoints}
              </span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Trạng Thái',
        align: 'center',
        sortable: true,
        sortAccessor: (row) => (row.status || 'pending').toLowerCase(),
        className: 'whitespace-nowrap',
        cell: (row) => {
          const normalized = (row.status || 'pending').toLowerCase();
          return (
            <Badge
              variant={
                normalized === 'approved'
                  ? 'success'
                  : normalized === 'rejected'
                    ? 'destructive'
                    : 'warning'
              }
            >
              {normalized === 'approved'
                ? 'Đã duyệt'
                : normalized === 'rejected'
                  ? 'Bị từ chối'
                  : 'Chờ duyệt'}
            </Badge>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Ngày Tạo',
        align: 'center',
        sortable: true,
        sortAccessor: (row) => row.createdAt,
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {row.createdAt}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Thao Tác',
        align: 'right',
        headerClassName:
          'sticky right-0 z-10 bg-muted/95 backdrop-blur-xs border-l border-border/60',
        className:
          'sticky right-0 z-10 bg-card/95 group-hover:bg-muted/80 backdrop-blur-xs border-l border-border/60 whitespace-nowrap',
        cell: (row) => {
          const normalized = (row.status || 'pending').toLowerCase();
          return (
            <div className="inline-flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setDetailTeam(row)}
                aria-label={`Xem hồ sơ đội ${row.name}`}
                title="Xem chi tiết hồ sơ"
              >
                <Eye size={14} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => openEditModal(row)}
                aria-label={`Chỉnh sửa đội ${row.name}`}
                title="Chỉnh sửa thông tin"
              >
                <Edit2 size={14} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  aria-label={`Mở menu thao tác cho đội ${row.name}`}
                  title="Thêm thao tác"
                >
                  <MoreHorizontal size={15} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Đội: {row.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDetailTeam(row)}>
                    <Eye size={14} className="text-muted-foreground" />
                    <span>Xem chi tiết hồ sơ</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openEditModal(row)}>
                    <Edit2 size={14} className="text-muted-foreground" />
                    <span>Chỉnh sửa thông tin</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleCopyInviteCode(row)}>
                    <Copy size={14} className="text-muted-foreground" />
                    <span>Sao chép mã mời ({row.inviteCode})</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {normalized !== 'approved' && (
                    <DropdownMenuItem
                      onSelect={() => void handleApproveTeam(row)}
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Phê duyệt đội thi
                      </span>
                    </DropdownMenuItem>
                  )}

                  {normalized !== 'rejected' && (
                    <DropdownMenuItem onSelect={() => setRejectTarget(row)}>
                      <XCircle size={14} className="text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        Từ chối đăng ký...
                      </span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    destructive
                    onSelect={() => setDeleteTarget(row)}
                  >
                    <Trash2 size={14} />
                    <span>Xóa đội thi</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [getSubTopicMeta, handleApproveTeam],
  );

  const detailTopicMeta = useMemo(
    () => getSubTopicMeta(activeDetailTeam?.subTopicId),
    [activeDetailTeam, getSubTopicMeta],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Danh sách Đội thi & Đề tài"
        description="Kiểm duyệt tư cách hợp lệ của các đội thi, đối soát định biên thành viên (3–5 người), theo dõi kho mã nguồn GitHub và phân bổ đề tài Hackathon."
        badge={
          <Badge variant="indigo">
            {metrics.totalTeams} đội • {metrics.totalParticipants} thí sinh trong đội
            {unassignedCandidates.length > 0
              ? ` • ${unassignedCandidates.length} thí sinh lẻ`
              : ''}
          </Badge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv([])}
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={unassignedCandidates.length === 0 || isMutating}
              isLoading={isAutoMatching}
              loadingText="Đang ghép đội..."
              onClick={() => void handleAutoMatchTeams()}
              title="Tự động ghép toàn bộ thí sinh đã đăng nhập nhưng chưa có đội thành các đội 3–5 người"
            >
              <Shuffle size={15} />
              <span>
                Ghép đội ngẫu nhiên ({unassignedCandidates.length} thí sinh lẻ)
              </span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateModal}
            >
              <Plus size={15} />
              <span>Tạo đội thi mới</span>
            </Button>
          </>
        }
      />

      {/* Operational Banner for Unassigned Solo Candidates */}
      {unassignedCandidates.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Users size={15} className="text-amber-600 shrink-0" />
              <span>
                Hiện có {unassignedCandidates.length} thí sinh đã đăng nhập & được phê duyệt nhưng chưa có đội thi:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {unassignedCandidates.slice(0, 8).map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <span>{c.fullName}</span>
                  <span className="font-mono text-muted-foreground">({c.email})</span>
                </span>
              ))}
              {unassignedCandidates.length > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{unassignedCandidates.length - 8} thí sinh khác
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isAutoMatching}
              loadingText="Đang ghép..."
              onClick={() => void handleAutoMatchTeams()}
            >
              <Shuffle size={14} />
              <span>Ghép ngẫu nhiên tất cả ngay</span>
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar đồng bộ trực tiếp với CSDL */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal size={14} className="text-primary" />
          <span>
            Dữ liệu đội thi và danh bạ thí sinh đang được đồng bộ thời gian thực từ cơ sở dữ liệu hệ thống.
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => void handleResetDemoDataset()}
        >
          <RotateCcw size={12} />
          <span>Làm mới từ CSDL</span>
        </Button>
      </div>

      {/* Permission Denied State (403) */}
      {viewMode === 'permission_denied' ? (
        <PermissionDeniedState
          requiredRole="Quản trị viên Hệ thống (System Admin)"
          currentRole="Giám khảo Chấm thi (Judge — Read-only)"
          description="Tài khoản của bạn đang ở chế độ mô phỏng phân quyền hạn chế (403 Forbidden). Chỉ Quản trị viên mới có quyền phê duyệt hoặc chỉnh sửa danh sách đội thi."
          onBack={() => setViewMode('normal')}
        />
      ) : (
        <>
          {/* KPI Summary Row */}
          {isLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Tổng số Đội thi"
                value={metrics.totalTeams}
                subtitle={`${metrics.totalParticipants} sinh viên từ các trường ĐH`}
                icon={<Users size={20} />}
                iconColor="indigo"
                onClick={() => setStatusFilter('all')}
              />
              <StatCard
                title="Đội thi Đã phê duyệt"
                value={metrics.approvedCount}
                subtitle="Đủ điều kiện nộp bài Checkpoint"
                icon={<CheckCircle2 size={20} />}
                iconColor="emerald"
                onClick={() => setStatusFilter('approved')}
              />
              <StatCard
                title="Hồ sơ Chờ xét duyệt"
                value={metrics.pendingCount}
                subtitle="Cần Ban Tổ Chức kiểm tra định biên"
                icon={<Clock size={20} />}
                iconColor="amber"
                onClick={() => setStatusFilter('pending')}
              />
              <StatCard
                title="Từ chối / Thiếu thành viên"
                value={metrics.rejectedOrFlaggedCount}
                subtitle="Chưa đạt quy chế 3–5 thành viên"
                icon={<AlertTriangle size={20} />}
                iconColor="rose"
                onClick={() => setStatusFilter('rejected')}
              />
            </div>
          )}

          {/* Reusable DataTable Pattern */}
          <DataTable<EnrichedAdminTeam>
            data={filteredTeams}
            columns={columns}
            getRowId={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Tìm kiếm theo tên đội, mã mời, đội trưởng, email hoặc trường đại học..."
            searchMatcher={(row, q) => {
              const meta = getSubTopicMeta(row.subTopicId);
              return (
                row.name.toLowerCase().includes(q) ||
                row.inviteCode.toLowerCase().includes(q) ||
                (row.leaderName || '').toLowerCase().includes(q) ||
                (row.leaderEmail || '').toLowerCase().includes(q) ||
                (row.university || '').toLowerCase().includes(q) ||
                meta.subTopicTitle.toLowerCase().includes(q)
              );
            }}
            filters={tableFilters}
            onResetFilters={() => {
              setStatusFilter('all');
              setTrackFilter('all');
              setComplianceFilter('all');
            }}
            defaultSortColumnId="name"
            defaultSortDirection="asc"
            defaultPageSize={10}
            enableRowSelection
            selectedRowIds={selectedRowIds}
            onSelectionChange={setSelectedRowIds}
            bulkActions={(selectedRows, clearSelection) => (
              <>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  className="h-7 text-xs"
                  isLoading={isMutating}
                  onClick={async () => {
                    await handleBulkApprove(selectedRows);
                    clearSelection();
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>Duyệt {selectedRows.length} đội đã chọn</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleExportCsv(selectedRows)}
                >
                  <Download size={13} />
                  <span>Xuất CSV ({selectedRows.length})</span>
                </Button>
              </>
            )}
            isLoading={isLoading}
            error={error}
            onRetry={() => {
              setViewMode('normal');
              void loadTeams();
            }}
            emptyTitle="Không tìm thấy đội thi nào phù hợp"
            emptyDescription="Chưa có đội thi nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại. Hãy thử xóa bộ lọc hoặc tạo mới đội thi."
            emptyActionLabel="Tạo đội thi mới"
            onEmptyAction={openCreateModal}
          />
        </>
      )}

      {/* Create / Edit Team Dialog (react-hook-form + zod) */}
      <TeamFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingTeam={editingTeam}
        majorTopics={majorTopics}
        candidatesDirectory={candidatesDirectory}
        isSubmitting={isMutating}
        onSubmitForm={handleFormSubmit}
      />

      {/* Team Details Dialog */}
      <TeamDetailDialog
        team={activeDetailTeam}
        open={Boolean(activeDetailTeam)}
        onOpenChange={(open) => {
          if (!open) setDetailTeam(null);
        }}
        subTopicTitle={detailTopicMeta.subTopicTitle}
        majorTopicTitle={detailTopicMeta.majorTopicTitle}
        onApprove={(team) => void handleApproveTeam(team)}
        onReject={(team) => setRejectTarget(team)}
        onEdit={(team) => openEditModal(team)}
      />

      {/* Reject Team Confirmation Dialog (with mandatory reason validation) */}
      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title={`Từ chối hồ sơ đội thi "${rejectTarget?.name || ''}"`}
        description="Đội thi bị từ chối sẽ không thể khóa đề tài hoặc nộp bài tại các chặng Checkpoint cho đến khi cập nhật lại hồ sơ hợp lệ."
        confirmLabel="Xác nhận từ chối"
        variant="warning"
        isLoading={isMutating}
        requireReason
        reasonLabel="Lý do từ chối hồ sơ"
        defaultReason="Đội thi chưa đủ số lượng thành viên tối thiểu theo quy chế Hackathon (yêu cầu từ 3 đến 5 thành viên hợp lệ)."
        minReasonLength={10}
        onConfirm={async (reason) => {
          if (!rejectTarget || !reason) return;
          const ok = await handleRejectTeam(rejectTarget.id, reason);
          if (ok) setRejectTarget(null);
        }}
      />

      {/* Delete Team Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Xóa vĩnh viễn đội thi "${deleteTarget?.name || ''}"?`}
        description="Hành động này sẽ gỡ toàn bộ thông tin đăng ký, mã mời và liên kết thành viên của đội thi khỏi hệ thống. Không thể hoàn tác sau khi xóa."
        confirmLabel="Xóa đội thi"
        variant="destructive"
        isLoading={isMutating}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await handleDeleteTeam(deleteTarget);
          if (ok) setDeleteTarget(null);
        }}
      />
    </div>
  );
};
