import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { CountdownTimer } from '../components/CountdownTimer';
import { CheckpointSubmissionForm } from '../components/CheckpointSubmissionForm';
import { SubmissionHistoryTable } from '../components/SubmissionHistoryTable';
import type { CheckpointStatus, SubmissionStatus, Submission } from '../types/checkpoint';

export const UIPreviewPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shortTimerEndTime, setShortTimerEndTime] = useState<string>(() =>
    new Date(Date.now() + 15 * 1000).toISOString()
  );

  const [sampleTwoDaysEndTime] = useState<string>(() =>
    new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600 + 12 * 60 + 59) * 1000).toISOString()
  );

  const [isPreviewFinal, setIsPreviewFinal] = useState<boolean>(true);
  const [previewRole, setPreviewRole] = useState<'TEAM_LEADER' | 'MEMBER'>('TEAM_LEADER');
  const [previewWindowStatus, setPreviewWindowStatus] = useState<CheckpointStatus>('open');
  const [previewSubState, setPreviewSubState] = useState<'none' | SubmissionStatus>('none');
  const [previewGraceApplied, setPreviewGraceApplied] = useState<boolean>(false);
  const [previewStartTime] = useState(() => new Date().toISOString());
  const [previewDeadline] = useState(() => new Date(Date.now() + 86400000).toISOString());
  const [sampleTwoMinutesAgoTime] = useState(() =>
    new Date(Date.now() - 2 * 60 * 1000).toISOString()
  );

  const canSubmit = previewWindowStatus === 'open' || previewWindowStatus === 'grace_period';

  const previewCheckpoint = {
    id: isPreviewFinal ? 'preview-cp-final' : 'preview-cp-intermediate',
    title: isPreviewFinal
      ? 'Checkpoint 3: MVP Hoàn chỉnh & Video Pitch Deck (Chặng cuối)'
      : 'Checkpoint 2: Báo cáo Kiến trúc & Prototype (Chặng tiến độ)',
    description: isPreviewFinal
      ? 'Chặng chốt sản phẩm: Bắt buộc GitHub repo và hệ thống sẽ đóng băng Commit SHA.'
      : 'Chặng tiến độ: Render theo submission_fields, ẩn ô GitHub repo và không đóng băng commit.',
    start_time: previewStartTime,
    deadline: previewDeadline,
    is_active: previewWindowStatus !== 'closed',
    is_final_checkpoint: isPreviewFinal,
    grace_period_seconds: 5,
    status: previewWindowStatus,
    is_open: canSubmit,
    can_submit: canSubmit,
    submission_fields: isPreviewFinal
      ? [
          {
            field_key: 'repo_url',
            field_label: 'GitHub Repository URL',
            required: true,
            apply_sha_freeze: true,
          },
          {
            field_key: 'demo_url',
            field_label: 'Link Live Demo / Video Pitch Deck',
            required: false,
            apply_sha_freeze: false,
          },
        ]
      : [
          {
            field_key: 'demo_url',
            field_label: 'Link Báo cáo tiến độ / Prototype Figma',
            required: true,
            apply_sha_freeze: false,
          },
          {
            field_key: 'presentation_pdf',
            field_label: 'Slide thuyết trình tiến độ (PDF / Google Slides)',
            required: false,
            apply_sha_freeze: false,
          },
        ],
  };

  const previewSubmission: Submission | null =
    previewSubState === 'none'
      ? null
      : {
          id: 'preview-sub-01',
          checkpoint_id: previewCheckpoint.id,
          team_id: 'team-01',
          repo_url: isPreviewFinal ? 'https://github.com/cyber-samurai/hackflow-mvp' : null,
          demo_url: 'https://hackflow-demo.vercel.app',
          commit_sha:
            isPreviewFinal &&
            (previewSubState === 'submitted' || previewSubState === 'evaluated')
              ? 'a1b2c3d4e5f678901234567890abcdef12345678'
              : null,
          status: previewSubState,
          grace_period_applied: previewGraceApplied,
          submitted_at: new Date().toISOString(),
          note: 'Bản nộp thử nghiệm trên trang Preview UI',
        };

  const handleResetShortTimer = () => {
    setShortTimerEndTime(new Date(Date.now() + 15 * 1000).toISOString());
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="border-b border-[#1E293B] pb-4">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #EDEDED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Preview UI Atoms
          </h1>
        </div>

        {/* 1. Đồng hồ đếm ngược */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-4">
          <h2 className="text-base font-semibold text-white">Đồng hồ đếm ngược</h2>

          {/* Trường hợp nhiều ngày */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-medium">Thời gian còn lại nộp bài chặng 1:</p>
            <div>
              <CountdownTimer endTime={sampleTwoDaysEndTime} />
            </div>
          </div>

          {/* Trường hợp sắp hết giờ */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300 font-medium">Đếm ngược thử nghiệm (15 giây):</p>
              <Button size="sm" variant="secondary" onClick={handleResetShortTimer}>
                Đếm lại 15s
              </Button>
            </div>
            <div>
              <CountdownTimer endTime={shortTimerEndTime} />
            </div>
          </div>

          {/* Trường hợp đã hết hạn */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-medium">Hạn chót đã qua:</p>
            <div>
              <CountdownTimer endTime="2020-01-01T00:00:00.000Z" />
            </div>
          </div>
        </div>

        {/* 2. Thao tác */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">Thao tác</h2>
          <div className="flex gap-3 items-center flex-wrap">
            <Button variant="primary">Xác nhận</Button>
            <Button variant="secondary">Hủy bỏ</Button>
            <Button variant="danger">Xóa đội</Button>
            <Button
              variant="primary"
              isLoading={isLoading}
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 2000);
              }}
            >
              Đang tải
            </Button>
          </div>
        </div>

        {/* 3. Nhập thông tin */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-4">
          <h2 className="text-base font-semibold text-white">Nhập thông tin</h2>
          <Input label="Tên đội thi" placeholder="Nhập tên đội..." />
          <Input
            label="Mã mời"
            placeholder="Nhập mã mời tham gia đội..."
            helperText="Mã mời gồm 6 ký tự do đội trưởng cung cấp"
          />
        </div>

        {/* 4. Trạng thái */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">Trạng thái</h2>
          <div className="flex gap-2.5 flex-wrap">
            <Badge variant="indigo">Đang diễn ra</Badge>
            <Badge variant="pending">Chờ duyệt</Badge>
            <Badge variant="approved">Đã duyệt</Badge>
            <Badge variant="danger">Đã kết thúc</Badge>
          </div>
        </div>

        {/* 5. Hộp thoại tương tác */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">5. Hộp thoại tương tác</h2>
          <Button onClick={() => setIsModalOpen(true)}>Mở hộp thoại tạo đội thi</Button>
        </div>

        {/* Modal Component */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo đội thi mới">
          <div className="space-y-4">
            <Input label="Tên đội" placeholder="Nhập tên đội của bạn..." />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>

        {/* 6. Form nộp bài Checkpoint (HF-30 & SRS HF-23) */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#334155] pb-3 gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                6. Form nộp bài Checkpoint (HF-30 & SRS HF-23)
              </h2>
              <p className="text-xs text-slate-400">
                Kiểm thử nhanh loại chặng, quyền Đội trưởng/Thành viên, trạng thái cổng thời gian và trạng thái bài nộp.
              </p>
            </div>
            <a
              href="/preview-checkpoints"
              className="text-xs text-[#818CF8] hover:underline shrink-0"
            >
              Mở trang Checkpoint đầy đủ &rarr;
            </a>
          </div>

          {/* Điều khiển Test nhanh các tiêu chí feedback (Chỉ đặt tại UIPreviewPage) */}
          <div className="space-y-2.5 p-3 bg-[#1E293B]/70 rounded-lg border border-[#334155] text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Loại chặng:</span>
                <button
                  type="button"
                  onClick={() => setIsPreviewFinal(false)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    !isPreviewFinal
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  Chặng tiến độ (Ẩn Repo)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewFinal(true)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    isPreviewFinal
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  Chặng cuối (Freeze SHA)
                </button>
              </div>

              <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Quyền hạn:</span>
                <button
                  type="button"
                  onClick={() => setPreviewRole('TEAM_LEADER')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    previewRole === 'TEAM_LEADER'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  Đội trưởng (TEAM_LEADER)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRole('MEMBER')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    previewRole === 'MEMBER'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  Thành viên (MEMBER)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-700/60">
              <span className="text-slate-400 font-medium">Trạng thái cổng:</span>
              {(['open', 'grace_period', 'upcoming', 'closed'] as CheckpointStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPreviewWindowStatus(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    previewWindowStatus === st
                      ? 'bg-[#6366F1] text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-700/60">
              <span className="text-slate-400 font-medium">Trạng thái bài nộp:</span>
              {(
                [
                  'none',
                  'submitted',
                  'pending_sha_freeze',
                  'sha_verification_failed',
                  'evaluated',
                  'invalid',
                ] as const
              ).map((subSt) => (
                <button
                  key={subSt}
                  type="button"
                  onClick={() => setPreviewSubState(subSt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    previewSubState === subSt
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white'
                  }`}
                >
                  {subSt}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPreviewGraceApplied((prev) => !prev)}
                className={`ml-auto px-2 py-0.5 rounded text-[11px] transition-colors ${
                  previewGraceApplied
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-[#0F172A] text-slate-400 hover:text-white'
                }`}
              >
                grace_period_applied: {String(previewGraceApplied)}
              </button>
            </div>
          </div>

          <CheckpointSubmissionForm
            key={`${previewCheckpoint.id}-${previewRole}-${previewWindowStatus}-${previewSubState}-${previewGraceApplied}`}
            checkpoint={previewCheckpoint}
            currentSubmission={previewSubmission}
            userRole={previewRole}
            isLeader={previewRole === 'TEAM_LEADER'}
          />
        </div>

        {/* 7. Bảng hiển thị lịch sử nộp bài (HF-31) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                7. Bảng hiển thị lịch sử nộp bài (HF-31)
              </h2>
              <p className="text-xs text-slate-400">
                Demo tích hợp API GET /submissions, rút gọn Commit SHA 7 ký tự (mở GitHub commit link) và định dạng nhãn thời gian ("2 phút trước", "12/10/2026 15:30").
              </p>
            </div>
          </div>

          <SubmissionHistoryTable
            submissions={[
              {
                id: 'preview-sub-v3',
                checkpoint_id: previewCheckpoint.id,
                team_id: 'team-01',
                repo_url: 'https://github.com/cyber-samurai/hackflow-mvp',
                demo_url: 'https://hackflow-demo.vercel.app',
                commit_sha: 'a1b2c3d4e5f678901234567890abcdef12345678', // SHA 40 ký tự
                status: 'submitted',
                grace_period_applied: true,
                submitted_at: sampleTwoMinutesAgoTime, // "2 phút trước"
                note: 'Bản nộp hoàn thiện MVP với Live Demo và tài liệu kiểm thử',
              },
              {
                id: 'preview-sub-v2',
                checkpoint_id: previewCheckpoint.id,
                team_id: 'team-01',
                repo_url: 'https://github.com/cyber-samurai/hackflow-mvp',
                demo_url: 'https://figma.com/@cybersamurai/hackflow',
                commit_sha: '9f8e7d6c5b4a3210fedcba9876543210abcdef12', // SHA 40 ký tự
                status: 'evaluated',
                grace_period_applied: false,
                submitted_at: '2026-10-12T15:30:00.000Z', // "12/10/2026 15:30"
                feedback: 'Sản phẩm hoàn thiện tốt, đáp ứng 100% tiêu chí đề bài. Điểm: 9.5/10',
                note: 'Bản nộp thử nghiệm đợt 2',
              },
              {
                id: 'preview-sub-v1',
                checkpoint_id: previewCheckpoint.id,
                team_id: 'team-01',
                repo_url: 'https://github.com/cyber-samurai/hackflow-mvp',
                demo_url: null,
                commit_sha: null,
                status: 'sha_verification_failed',
                grace_period_applied: false,
                submitted_at: '2026-10-10T10:15:00.000Z',
                note: 'Bản nộp ban đầu',
              },
            ]}
            checkpointTitle={previewCheckpoint.title}
            isFinalCheckpoint={true}
          />
        </div>
      </div>
    </div>
  );
};