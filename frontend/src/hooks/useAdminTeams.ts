import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  adminTeamsApi,
  type AdminTeamUpsertPayload,
} from '../api/adminTeamsApi';
import type { EnrichedAdminTeam } from '../mocks/adminTeamsMockData';
import { useMockStore } from '../store/useMockStore';
import { toast } from '../store/useToastStore';

export type AdminTeamsViewMode =
  | 'normal'
  | 'loading'
  | 'error'
  | 'empty'
  | 'permission_denied';

export const adminTeamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên đội thi phải có tối thiểu 2 ký tự.')
    .max(60, 'Tên đội thi không được vượt quá 60 ký tự.'),
  inviteCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9-]{4,12}$/,
      'Mã mời phải bao gồm 4–12 ký tự chữ cái hoặc chữ số (VD: HF2026).',
    ),
  leaderName: z
    .string()
    .trim()
    .min(2, 'Vui lòng nhập họ và tên đội trưởng (tối thiểu 2 ký tự).')
    .max(60, 'Họ tên đội trưởng tối đa 60 ký tự.'),
  leaderEmail: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ email của đội trưởng.')
    .refine(
      (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Địa chỉ email không đúng định dạng hợp lệ (VD: leader@university.edu.vn).',
    ),
  university: z
    .string()
    .trim()
    .min(2, 'Vui lòng nhập tên trường đại học hoặc đơn vị.')
    .max(100, 'Tên đơn vị tối đa 100 ký tự.'),
  majorTopicId: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn lĩnh vực đề tài lớn.'),
  subTopicId: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn đề tài nhánh đăng ký.'),
  memberCount: z
    .number()
    .int('Số lượng thành viên phải là số nguyên.')
    .min(1, 'Số lượng thành viên tối thiểu là 1 người.')
    .max(5, 'Theo quy chế Hackathon, mỗi đội không được vượt quá 5 thành viên.'),
  repoUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || val.startsWith('https://github.com/') || val.startsWith('http://github.com/'),
      'Đường dẫn kho mã nguồn phải bắt đầu bằng https://github.com/',
    ),
  description: z
    .string()
    .trim()
    .min(5, 'Mô tả giải pháp kỹ thuật phải có tối thiểu 5 ký tự.')
    .max(500, 'Mô tả giải pháp không vượt quá 500 ký tự.'),
});

export type AdminTeamFormValues = z.infer<typeof adminTeamFormSchema>;

export function useAdminTeams() {
  const {
    teams: storeTeams,
    majorTopics,
    approveTeamRegistration,
    rejectTeamRegistration,
    syncFromBackend,
  } = useMockStore();

  const [teams, setTeams] = useState<EnrichedAdminTeam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AdminTeamsViewMode>('normal');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminTeamsApi.getAllTeams(storeTeams);
      setTeams(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối máy chủ quản lý đội thi.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [storeTeams]);

  useEffect(() => {
    let active = true;
    adminTeamsApi
      .getAllTeams(storeTeams)
      .then((result) => {
        if (active) {
          setTeams(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Không thể kết nối máy chủ quản lý đội thi.';
          setError(msg);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [storeTeams]);

  const getSubTopicMeta = useCallback(
    (subTopicId?: string) => {
      if (!subTopicId) {
        return {
          subTopicTitle: 'Chưa đăng ký đề tài',
          majorTopicTitle: 'Chưa phân nhóm',
          majorTopicId: '',
        };
      }
      for (const major of majorTopics) {
        const sub = major.subTopics.find((s) => s.id === subTopicId);
        if (sub) {
          return {
            subTopicTitle: sub.title,
            majorTopicTitle: major.title || major.name || 'Lĩnh vực chuyên môn',
            majorTopicId: major.id,
          };
        }
        if (major.id === subTopicId) {
          return {
            subTopicTitle: major.subTopics[0]?.title || major.title || major.name || 'Đề tài chính',
            majorTopicTitle: major.title || major.name || 'Lĩnh vực chuyên môn',
            majorTopicId: major.id,
          };
        }
      }
      return {
        subTopicTitle: 'Chưa đăng ký đề tài',
        majorTopicTitle: 'Chưa phân nhóm',
        majorTopicId: '',
      };
    },
    [majorTopics],
  );

  // Filtered dataset according to dropdown filters
  const filteredTeams = useMemo(() => {
    if (viewMode === 'empty') return [];

    return teams.filter((team) => {
      const normalizedStatus = (team.status || 'pending').toLowerCase();
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) {
        return false;
      }

      if (trackFilter !== 'all') {
        const resolvedMajorId =
          team.majorTopicId || getSubTopicMeta(team.subTopicId).majorTopicId;
        if (resolvedMajorId !== trackFilter) {
          return false;
        }
      }

      const count = team.memberCount ?? team.members.length;
      if (complianceFilter === 'compliant' && (count < 3 || count > 5)) {
        return false;
      }
      if (complianceFilter === 'under_quota' && count >= 3) {
        return false;
      }

      return true;
    });
  }, [teams, viewMode, statusFilter, trackFilter, complianceFilter, getSubTopicMeta]);

  // Summary KPIs
  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    const approvedCount = teams.filter(
      (t) => (t.status || 'pending').toLowerCase() === 'approved',
    ).length;
    const pendingCount = teams.filter(
      (t) => (t.status || 'pending').toLowerCase() === 'pending',
    ).length;
    const rejectedOrFlaggedCount = teams.filter(
      (t) =>
        (t.status || 'pending').toLowerCase() === 'rejected' ||
        (t.memberCount ?? t.members.length) < 3,
    ).length;
    const totalParticipants = teams.reduce(
      (sum, t) => sum + (t.memberCount ?? t.members.length),
      0,
    );

    return {
      totalTeams,
      approvedCount,
      pendingCount,
      rejectedOrFlaggedCount,
      totalParticipants,
    };
  }, [teams]);

  // Actions
  const handleCreateTeam = async (
    values: AdminTeamFormValues,
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const payload: AdminTeamUpsertPayload = {
        ...values,
        inviteCode: values.inviteCode.toUpperCase(),
      };
      const created = await adminTeamsApi.createTeam(payload);
      setTeams((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      void syncFromBackend?.();
      toast.success(
        `Đã khởi tạo đội thi "${created.name}"`,
        `Mã mời: ${created.inviteCode} • Đội trưởng: ${created.leaderName}`,
      );
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể tạo đội thi mới.';
      toast.error('Không thể tạo đội thi', msg);
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateTeam = async (
    teamId: string,
    values: AdminTeamFormValues,
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const payload: AdminTeamUpsertPayload = {
        ...values,
        inviteCode: values.inviteCode.toUpperCase(),
      };
      const updated = await adminTeamsApi.updateTeam(teamId, payload);
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      void syncFromBackend?.();
      toast.success(
        `Đã cập nhật hồ sơ đội "${updated.name}"`,
        'Thông tin đội trưởng, quy mô thành viên và đề tài đã được lưu.',
      );
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể cập nhật đội thi.';
      toast.error('Cập nhật thất bại', msg);
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleApproveTeam = async (team: EnrichedAdminTeam): Promise<void> => {
    setIsMutating(true);
    try {
      const updated = await adminTeamsApi.approveTeam(team.id);
      approveTeamRegistration(team.id);
      setTeams((prev) => prev.map((t) => (t.id === team.id ? updated : t)));
      void syncFromBackend?.();
      toast.success(
        `Đã phê duyệt đội thi "${team.name}"`,
        'Đội thi đã đủ điều kiện nộp bài các chặng Checkpoint.',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi phê duyệt đội thi.';
      toast.error('Phê duyệt thất bại', msg);
    } finally {
      setIsMutating(false);
    }
  };

  const handleBulkApprove = async (
    selectedTeams: EnrichedAdminTeam[],
  ): Promise<void> => {
    if (selectedTeams.length === 0) return;
    setIsMutating(true);
    try {
      const ids = selectedTeams.map((t) => t.id);
      const updatedList = await adminTeamsApi.bulkApproveTeams(ids);
      ids.forEach((id) => approveTeamRegistration(id));
      setTeams(updatedList);
      void syncFromBackend?.();
      toast.success(
        `Đã phê duyệt hàng loạt ${ids.length} đội thi`,
        'Trạng thái các đội đã chọn được chuyển sang Đã duyệt.',
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể phê duyệt hàng loạt.';
      toast.error('Thao tác thất bại', msg);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRejectTeam = async (
    teamId: string,
    reason: string,
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const updated = await adminTeamsApi.rejectTeam(teamId, reason);
      rejectTeamRegistration(teamId, reason);
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      void syncFromBackend?.();
      toast.warning(
        `Đã từ chối đăng ký đội "${updated.name}"`,
        `Lý do: ${reason}`,
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể từ chối đội thi.';
      toast.error('Từ chối thất bại', msg);
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTeam = async (team: EnrichedAdminTeam): Promise<boolean> => {
    setIsMutating(true);
    try {
      await adminTeamsApi.deleteTeam(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      void syncFromBackend?.();
      toast.info(
        `Đã xóa đội thi "${team.name}"`,
        'Bản ghi đăng ký đã được gỡ khỏi danh sách cuộc thi.',
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa đội thi.';
      toast.error('Xóa thất bại', msg);
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleResetDemoDataset = async () => {
    setIsLoading(true);
    try {
      const fresh = await adminTeamsApi.resetMockTeams();
      setTeams(fresh);
      setViewMode('normal');
      setSearchQuery('');
      setStatusFilter('all');
      setTrackFilter('all');
      setComplianceFilter('all');
      void syncFromBackend?.();
      toast.info(
        `Đã đồng bộ lại dữ liệu (${fresh.length} đội thi)`,
        'Danh sách đội thi đã được tải mới từ máy chủ.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = (rowsToExport: EnrichedAdminTeam[]) => {
    const target = rowsToExport.length > 0 ? rowsToExport : filteredTeams;
    if (typeof window !== 'undefined' && target.length > 0) {
      const escapeCsv = (val: string | number | undefined) => {
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      };
      const headers = [
        'Mã đội',
        'Tên đội thi',
        'Mã mời',
        'Đội trưởng',
        'Email đội trưởng',
        'Đơn vị',
        'Đề tài đăng ký',
        'Số thành viên',
        'Trạng thái',
        'Ngày tạo',
      ];
      const lines = target.map((row) => {
        const meta = getSubTopicMeta(row.subTopicId);
        return [
          escapeCsv(row.id),
          escapeCsv(row.name),
          escapeCsv(row.inviteCode),
          escapeCsv(row.leaderName),
          escapeCsv(row.leaderEmail),
          escapeCsv(row.university),
          escapeCsv(meta.subTopicTitle),
          escapeCsv(row.memberCount ?? row.members.length),
          escapeCsv(row.status),
          escapeCsv(row.createdAt),
        ].join(',');
      });
      const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'HackFlow_Teams_Roster_2026.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Đã xuất báo cáo CSV (${target.length} đội thi)`,
      'Tệp HackFlow_Teams_Roster_2026.csv đã sẵn sàng tải xuống.',
    );
  };

  return {
    teams,
    filteredTeams,
    majorTopics,
    metrics,
    isLoading: isLoading || viewMode === 'loading',
    isMutating,
    error:
      viewMode === 'error'
        ? 'Không thể kết nối tới dịch vụ quản lý đội thi (HTTP 500 Internal Server Error — PostgreSQL Connection Pool Timeout).'
        : error,
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
    handleApproveTeam,
    handleBulkApprove,
    handleRejectTeam,
    handleDeleteTeam,
    handleResetDemoDataset,
    handleExportCsv,
  };
}
