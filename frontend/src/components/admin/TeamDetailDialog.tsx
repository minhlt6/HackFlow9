import React from 'react';
import {
  Crown,
  GitCommit,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Edit2,
  Building2,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { EnrichedAdminTeam } from '../../api/adminTeamsApi';

export interface TeamDetailDialogProps {
  team: EnrichedAdminTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subTopicTitle: string;
  majorTopicTitle: string;
  onApprove: (team: EnrichedAdminTeam) => void;
  onReject: (team: EnrichedAdminTeam) => void;
  onEdit: (team: EnrichedAdminTeam) => void;
}

export const TeamDetailDialog: React.FC<TeamDetailDialogProps> = ({
  team,
  open,
  onOpenChange,
  subTopicTitle,
  majorTopicTitle,
  onApprove,
  onReject,
  onEdit,
}) => {
  if (!team) return null;

  const statusNormalized = team.status.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Hồ sơ Đội thi: {team.name}</DialogTitle>
            <Badge
              variant={
                statusNormalized === 'approved'
                  ? 'success'
                  : statusNormalized === 'rejected'
                  ? 'destructive'
                  : 'warning'
              }
            >
              {statusNormalized === 'approved'
                ? 'Đã phê duyệt'
                : statusNormalized === 'rejected'
                ? 'Bị từ chối'
                : 'Chờ xét duyệt'}
            </Badge>
            <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              Mã mời: {team.inviteCode}
            </span>
          </div>
          <DialogDescription>
            Đăng ký ngày {team.createdAt} • {team.university}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Rejection Warning Banner if Rejected */}
          {statusNormalized === 'rejected' && team.rejectionReason && (
            <div className="rounded-md border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <span className="font-semibold block">Lý do từ chối tại lần xét duyệt:</span>
              <p>{team.rejectionReason}</p>
              {team.lastReview?.decision === 'rejected' ? (
                <p>Xét duyệt lúc {new Date(team.lastReview.reviewed_at).toLocaleString('vi-VN')},
                  sĩ số {team.lastReview.member_count} người, quy định {team.lastReview.min_members}–{team.lastReview.max_members} người.</p>
              ) : <p>Hồ sơ cũ chưa ghi nhận thời điểm và sĩ số tại lần xét duyệt.</p>}
              <p>Sĩ số hiện tại: {team.members.length} người. Thay đổi thành viên không tự động thay đổi quyết định xét duyệt.</p>
            </div>
          )}

          {/* Metadata Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 size={13} />
                <span>Đơn vị đào tạo:</span>
              </span>
              <p className="font-semibold text-foreground">{team.university}</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Tiến độ Checkpoint:</span>
              </span>
              <p className="font-semibold text-foreground font-mono">
                {team.checkpointsCompleted} / {team.totalCheckpoints} chặng hoàn thành
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1 pt-2 border-t border-border">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BookOpen size={13} />
                <span>Đề tài đăng ký ({majorTopicTitle}):</span>
              </span>
              <p className="font-semibold text-primary dark:text-indigo-300">
                {subTopicTitle}
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1 pt-2 border-t border-border">
              <span className="text-muted-foreground">Mô tả giải pháp kỹ thuật:</span>
              <p className="text-foreground leading-relaxed">{team.description}</p>
            </div>

            {team.repoUrl && (
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <GitCommit size={14} className="text-primary shrink-0" />
                  <a
                    href={team.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-primary hover:underline truncate inline-flex items-center gap-1"
                  >
                    <span>{team.repoUrl}</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
                {team.latestCommitSha && (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    SHA: {team.latestCommitSha.slice(0, 7)}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Roster Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Danh sách thành viên ({team.members.length} người)
              </h4>
              <Badge
                variant={
                  team.members.length >= (team.minMembers ?? 3) && team.members.length <= (team.maxMembers ?? 5)
                    ? 'success'
                    : 'warning'
                }
              >
                {team.members.length >= (team.minMembers ?? 3) && team.members.length <= (team.maxMembers ?? 5)
                  ? `Đạt chuẩn ${team.minMembers ?? 3}–${team.maxMembers ?? 5} thành viên`
                  : 'Chưa đáp ứng giới hạn thành viên'}
              </Badge>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>MSSV & Đơn vị</TableHead>
                    <TableHead>Kỹ năng</TableHead>
                    <TableHead className="text-right">Vai trò</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.map((member, idx) => {
                    const isLeader =
                      member.roleInTeam === 'leader' ||
                      member.role === 'leader' ||
                      idx === 0;
                    return (
                      <TableRow key={member.userId || member.email || idx}>
                        <TableCell>
                          <div className="font-medium text-foreground text-xs">
                            {member.fullName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {member.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono text-foreground">
                            {member.studentId || '—'}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                            {member.school || member.university || team.university}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(member.skills || ['Software']).slice(0, 3).map((sk) => (
                              <span
                                key={sk}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLeader ? (
                            <Badge variant="warning" className="gap-1">
                              <Crown size={11} />
                              <span>Đội trưởng</span>
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Thành viên</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit(team);
            }}
          >
            <Edit2 size={14} />
            <span>Chỉnh sửa hồ sơ</span>
          </Button>

          {statusNormalized !== 'rejected' && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onReject(team);
              }}
            >
              <XCircle size={14} />
              <span>Từ chối đội</span>
            </Button>
          )}

          {statusNormalized !== 'approved' && (
            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={() => {
                onApprove(team);
                onOpenChange(false);
              }}
            >
              <CheckCircle2 size={14} />
              <span>Phê duyệt đội</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
