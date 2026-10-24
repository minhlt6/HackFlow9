import React from 'react';
import {
  Inbox,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  RotateCcw,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        {icon ?? <Inbox size={20} />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              <RotateCcw size={13} />
              <span>{secondaryActionLabel}</span>
            </Button>
          )}
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              <span>{actionLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Không thể tải dữ liệu',
  message,
  errorCode = 'ERR_API_500',
  onRetry,
  retryLabel = 'Thử tải lại',
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/5 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertTriangle size={20} />
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {errorCode && (
          <Badge variant="destructive" className="font-mono text-[10px]">
            {errorCode}
          </Badge>
        )}
      </div>
      <p className="mt-1.5 max-w-lg text-xs text-muted-foreground leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw size={13} />
            <span>{retryLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export interface PermissionDeniedStateProps {
  title?: string;
  description?: string;
  currentRole?: string;
  requiredRole?: string;
  attemptedResource?: string;
  onSwitchToAuthorizedRole?: () => void;
  onBack?: () => void;
  className?: string;
}

export const PermissionDeniedState: React.FC<PermissionDeniedStateProps> = ({
  title = '403 Forbidden — Không đủ quyền truy cập',
  description = 'Tài khoản hiện tại của bạn không có quyền thực hiện thao tác quản trị trên phân hệ này. Vui lòng liên hệ Ban Tổ Chức hoặc chuyển sang tài khoản Quản trị viên.',
  currentRole = 'candidate',
  requiredRole = 'admin',
  attemptedResource = 'Quản lý & Phê duyệt Đội thi (/admin/teams)',
  onSwitchToAuthorizedRole,
  onBack,
  className,
}) => {
  return (
    <Card
      role="alert"
      className={cn(
        'mx-auto max-w-2xl border-amber-500/35 bg-card p-6 sm:p-8',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-3 flex-1 min-w-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive" className="font-mono">
                HTTP 403 RBAC
              </Badge>
              <span className="text-xs text-muted-foreground">
                Kiểm soát truy cập theo vai trò
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Lock size={13} />
                <span>Tài nguyên yêu cầu:</span>
              </span>
              <span className="font-mono font-medium text-foreground truncate">
                {attemptedResource}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <span className="text-muted-foreground">Vai trò hiện tại:</span>
              <Badge variant="warning" className="uppercase font-mono">
                {currentRole}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Quyền hạn bắt buộc:</span>
              <Badge variant="indigo" className="uppercase font-mono">
                {requiredRole}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </Button>
            )}
            {onSwitchToAuthorizedRole && (
              <Button
                variant="primary"
                size="sm"
                onClick={onSwitchToAuthorizedRole}
              >
                <span>Khôi phục quyền Quản trị viên (Admin)</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 6,
  rows = 5,
}) => {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải dữ liệu bảng"
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <TableHead key={colIdx}>
                <Skeleton className="h-3.5 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: columns }).map((__, colIdx) => (
                <TableCell key={colIdx}>
                  <div className="space-y-1.5">
                    <Skeleton
                      className={cn(
                        'h-4',
                        colIdx === 0
                          ? 'w-36'
                          : colIdx === columns - 1
                          ? 'w-16 ml-auto'
                          : 'w-28',
                      )}
                    />
                    {colIdx < 2 && <Skeleton className="h-3 w-20" />}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const StatCardsSkeleton: React.FC<{ count?: number }> = ({
  count = 4,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
};
