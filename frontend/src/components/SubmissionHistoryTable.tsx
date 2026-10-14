import React, { useMemo, useState, useEffect } from 'react';
import {
  History,
  GitCommit,
  Globe,
  ExternalLink,
  Clock,
  RefreshCw,
  FileText,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { Badge } from './Badge';
import {
  type Submission,
  formatCommitSha,
  getCommitUrl,
  formatSubmissionTime,
  getSubmissionStatusMeta,
} from '../types/checkpoint';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export interface SubmissionHistoryTableProps {
  submissions: Submission[];
  isLoading?: boolean;
  errorMessage?: string | null;
  checkpointTitle?: string;
  isFinalCheckpoint?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const SubmissionHistoryTable: React.FC<SubmissionHistoryTableProps> = ({
  submissions,
  isLoading = false,
  errorMessage = null,
  checkpointTitle,
  isFinalCheckpoint = false,
  onRefresh,
  className = '',
}) => {
  // Tự động làm mới nhãn thời gian tương đối mỗi 30 giây (HF-31 Review Lỗi 4)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Sắp xếp danh sách nộp bài theo thời gian submitted_at giảm dần (Mới nhất lên đầu) (HF-31 Review Lỗi 2)
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const timeA = new Date(a.submitted_at).getTime() || 0;
      const timeB = new Date(b.submitted_at).getTime() || 0;
      return timeB - timeA;
    });
  }, [submissions]);

  return (
    <div
      className={`rounded-[16px] bg-[#0F172A] border border-[#334155] shadow-xl overflow-hidden ${className}`}
    >
      {/* Header của bảng lịch sử nộp bài */}
      <div className="p-4 sm:p-5 border-b border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/80">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
            <History size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Lịch sử nộp bài
              </h3>
              {!isLoading && !errorMessage && (
                <Badge variant="indigo" size="sm">
                  {sortedSubmissions.length} lần nộp
                </Badge>
              )}
            </div>
            {checkpointTitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                Chặng: <span className="text-slate-300 font-medium">{checkpointTitle}</span>
              </p>
            )}
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#1E293B] hover:bg-[#334155] border border-[#334155] transition-colors disabled:opacity-50"
            title="Làm mới lịch sử nộp bài"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#818CF8]' : ''} />
            <span>Tải lại</span>
          </button>
        )}
      </div>

      {/* Trạng thái Loading */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-[#818CF8]" />
          <p className="text-xs">Đang tải lịch sử các lần nộp bài...</p>
        </div>
      ) : errorMessage ? (
        /* Trạng thái Lỗi API thật kèm nút Thử lại (HF-31 Review Lỗi 1) */
        <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle size={26} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-300">
              Không thể tải lịch sử nộp bài
            </p>
            <p className="text-xs text-rose-200/80 max-w-md">{errorMessage}</p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] transition-colors"
            >
              <RefreshCw size={12} />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      ) : sortedSubmissions.length === 0 ? (
        /* Trạng thái Rỗng (Chưa có bài nộp nào) */
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="p-3 rounded-full bg-[#1E293B] text-slate-500 border border-[#334155]">
            <Inbox size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">
              Chưa có lượt nộp bài nào cho chặng thi này
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Đội trưởng có thể gửi link sản phẩm, báo cáo tiến độ hoặc tài liệu demo ở biểu mẫu nộp bài phía trên.
            </p>
          </div>
        </div>
      ) : (
        /* Bảng hiển thị danh sách bài nộp */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#334155] bg-[#0A0F1D] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th scope="col" className="py-3 px-4 w-14">
                  #
                </th>
                <th scope="col" className="py-3 px-4 min-w-[160px]">
                  Thời gian nộp
                </th>
                <th scope="col" className="py-3 px-4 min-w-[140px]">
                  Commit SHA
                </th>
                <th scope="col" className="py-3 px-4 min-w-[180px]">
                  Tài nguyên nộp
                </th>
                <th scope="col" className="py-3 px-4 min-w-[130px]">
                  Trạng thái
                </th>
                <th scope="col" className="py-3 px-4 min-w-[180px]">
                  Ghi chú & Đánh giá
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60">
              {sortedSubmissions.map((sub, index) => {
                const isLatest = index === 0;
                // Phiên bản tăng dần theo thứ tự thời gian: bản cũ nhất là v1, bản mới nhất là vN
                const versionNumber = sortedSubmissions.length - index;
                const timeInfo = formatSubmissionTime(sub.submitted_at);
                const statusMeta = getSubmissionStatusMeta(sub.status, isFinalCheckpoint);
                const shortSha = formatCommitSha(sub.commit_sha);
                const commitUrl = getCommitUrl(sub.repo_url, sub.commit_sha);

                return (
                  <tr
                    key={sub.id || `sub-${index}`}
                    className={`hover:bg-[#1E293B]/40 transition-colors ${
                      isLatest ? 'bg-[#1E293B]/15' : ''
                    }`}
                  >
                    {/* Cột 1: Phiên bản nộp (v1, v2...) & Nhãn Mới nhất */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">v{versionNumber}</span>
                        {isLatest && (
                          <Badge variant="indigo" size="sm" className="text-[10px] px-1.5 py-0">
                            Mới nhất
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Cột 2: Thời gian nộp (HF-31 AC-3) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-100 text-xs flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-400 shrink-0" />
                          <span>{timeInfo.relative}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {timeInfo.absolute}
                        </span>
                        {sub.grace_period_applied && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-medium mt-0.5">
                            <ShieldCheck size={11} className="shrink-0" />
                            <span>Ân hạn mạng (Grace Period)</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 3: Commit SHA (HF-31 AC-2 & Review Lỗi 3) */}
                    <td className="py-3.5 px-4">
                      {sub.commit_sha ? (
                        commitUrl ? (
                          <a
                            href={commitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Xem commit ${sub.commit_sha} trên GitHub (Click để mở tab mới)`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-[8px] bg-[#0A0F1D] hover:bg-[#1E293B] text-indigo-300 hover:text-white border border-[#334155] hover:border-[#6366F1] transition-all group shadow-sm"
                          >
                            <GitCommit size={13} className="text-emerald-400 shrink-0" />
                            <span className="font-semibold">{shortSha}</span>
                            <ExternalLink
                              size={11}
                              className="text-slate-400 group-hover:text-indigo-300 transition-colors"
                            />
                          </a>
                        ) : (
                          <span
                            title={sub.commit_sha}
                            className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-[8px] bg-[#0A0F1D] text-indigo-300 border border-[#334155]"
                          >
                            <GitCommit size={13} className="text-emerald-400 shrink-0" />
                            <span className="font-semibold">{shortSha}</span>
                          </span>
                        )
                      ) : statusMeta.normalizedStatus === 'pending_sha_freeze' ? (
                        <span className="inline-flex items-center gap-1 text-indigo-300 text-[11px] font-medium">
                          <RefreshCw size={11} className="animate-spin text-indigo-400 shrink-0" />
                          <span>Đang lấy SHA...</span>
                        </span>
                      ) : statusMeta.normalizedStatus === 'sha_verification_failed' ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 text-[11px] font-medium">
                          <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                          <span>Chờ xác minh</span>
                        </span>
                      ) : isFinalCheckpoint ? (
                        <span className="text-slate-500 font-mono text-xs italic">
                          - (Chưa có SHA)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs italic">
                          - (Chặng tiến độ)
                        </span>
                      )}
                    </td>

                    {/* Cột 4: Tài nguyên nộp (Repo, Demo URL & Các link từ submission_data - Review Lỗi 3) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        {sub.repo_url && (
                          <a
                            href={sub.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-slate-200 hover:text-indigo-300 transition-colors truncate max-w-[200px]"
                            title={`GitHub Repo: ${sub.repo_url}`}
                          >
                            <GithubIcon size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{sub.repo_url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={10} className="shrink-0 text-slate-500" />
                          </a>
                        )}

                        {sub.demo_url && (
                          <a
                            href={sub.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition-colors truncate max-w-[200px]"
                            title={`Demo / Báo cáo: ${sub.demo_url}`}
                          >
                            <Globe size={13} className="shrink-0 text-cyan-400" />
                            <span className="truncate">{sub.demo_url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={10} className="shrink-0 text-slate-500" />
                          </a>
                        )}

                        {/* Các link động cấu hình từ sub.submission_data */}
                        {sub.submission_data &&
                          Object.entries(sub.submission_data).map(([key, val]) => {
                            if (!val || typeof val !== 'string') return null;
                            if (val === sub.repo_url || val === sub.demo_url) return null;
                            const isUrl = /^https?:\/\/.+/i.test(val);
                            if (!isUrl) return null;

                            const label = key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase());

                            return (
                              <a
                                key={key}
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 transition-colors truncate max-w-[200px]"
                                title={`${label}: ${val}`}
                              >
                                <Globe size={13} className="shrink-0 text-indigo-400" />
                                <span className="truncate">{label}: {val.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink size={10} className="shrink-0 text-slate-500" />
                              </a>
                            );
                          })}

                        {!sub.repo_url && !sub.demo_url && !sub.submission_data && (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </div>
                    </td>

                    {/* Cột 5: Trạng thái bài nộp (Badge SRS HF-23) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={statusMeta.badgeVariant} size="sm">
                          {statusMeta.badgeLabel}
                        </Badge>
                        {sub.grace_period_applied && (
                          <Badge variant="warning" size="sm" className="text-[10px] px-1.5 py-0">
                            Grace Period
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Ghi chú & Đánh giá/Feedback */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[240px]">
                        {sub.note && (
                          <p className="text-slate-300 text-xs line-clamp-2 italic flex items-start gap-1">
                            <FileText size={12} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{sub.note}</span>
                          </p>
                        )}

                        {sub.feedback ? (
                          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-1">
                            <MessageSquare size={11} className="shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{sub.feedback}</span>
                          </div>
                        ) : (
                          !sub.note && <span className="text-slate-500 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SubmissionHistoryTable;
