import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadTs(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => dependencies[name] || {}, exports);
  return exports;
}

test('Scoreboard removes hardcoded 20:00 - 15/11/2026 publication date (3a)', () => {
  const source = readFileSync(new URL('../src/pages/Scoreboard.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('20:00 - 15/11/2026'), false);
  assert.equal(source.includes('expectedResultPublishAt'), true);
  assert.equal(source.includes('Chờ Ban Tổ Chức công bố'), true);
});

test('AdminResultsPage preserves real lock/draft flags on publish toggle, separates draftScore, and surfaces load errors (1, 2, 3b, L12)', () => {
  const source = readFileSync(new URL('../src/pages/admin/AdminResultsPage.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('hasLockedEvaluations: !nextPublished'), false);
  assert.equal(source.includes('hasDraftEvaluations: nextPublished'), false);
  assert.equal(source.includes('draftScore'), true);
  assert.equal(source.includes('loadError'), true);
  assert.equal(source.includes('isStale'), true);
});

test('AdminDashboardPage and MainLayout count only open and in_progress tickets (7)', () => {
  const dashboardSource = readFileSync(new URL('../src/pages/admin/AdminDashboardPage.tsx', import.meta.url), 'utf8');
  const layoutSource = readFileSync(new URL('../src/layouts/MainLayout.tsx', import.meta.url), 'utf8');
  assert.equal(dashboardSource.includes("t.status !== 'resolved'"), false);
  assert.equal(layoutSource.includes("t.status !== 'resolved'"), false);
  assert.equal(dashboardSource.includes("t.status === 'open' || t.status === 'in_progress'"), true);
  assert.equal(layoutSource.includes("t.status === 'open' || t.status === 'in_progress'"), true);
});

test('JudgeResultsPage checks canEvaluate and evaluationBlockReason before showing evaluate button (8)', () => {
  const source = readFileSync(new URL('../src/pages/judge/JudgeResultsPage.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('canEvaluate'), true);
  assert.equal(source.includes('evaluationBlockReason'), true);
});

test('C02: checkpointAtTime preserves contest_allows_submission and submission_block_reason while keeping is_open accurate', () => {
  const { checkpointAtTime } = loadTs('../src/hooks/useLiveCheckpoints.ts');
  const start = Date.parse('2026-11-01T01:00:00Z');
  const end = start + 10000;
  const blockedCp = {
    id: 'cp-blocked',
    start_time: new Date(start).toISOString(),
    deadline: new Date(end).toISOString(),
    is_active: true,
    grace_period_seconds: 5,
    contest_allows_submission: false,
    submission_block_reason: 'Cuộc thi đang ở giai đoạn Hội đồng chấm thi độc lập — hệ thống đã khóa cổng nộp bài.',
  };
  const evaluated = checkpointAtTime(blockedCp, start + 1000);
  assert.equal(evaluated.status, 'open');
  assert.equal(evaluated.is_open, true);
  assert.equal(evaluated.can_submit, false);
});

test('C01, C06, C07, C08 & UI/Arch: contestConfigService separates pause state from phase and distinguishes judging/completed from running', () => {
  const { deriveContestRuntimeState, buildConfigPatchPayload } = loadTs(
    '../src/services/contestConfigService.ts',
    { '../api/axiosClient': { apiClient: {} } }
  );

  const running = deriveContestRuntimeState('hacking', null, false);
  assert.equal(running.isContestStarted, true);
  assert.equal(running.contestState, 'running');
  assert.equal(running.contestStateLabel, 'Cuộc thi đang diễn ra');

  const paused = deriveContestRuntimeState('hacking', null, true);
  assert.equal(paused.isContestStarted, false);
  assert.equal(paused.isPaused, true);
  assert.equal(paused.status, 'hacking');
  assert.equal(paused.contestState, 'paused');
  assert.equal(paused.contestStateLabel, 'Cuộc thi đang tạm dừng');

  const judging = deriveContestRuntimeState('judging', null, false);
  assert.equal(judging.isContestStarted, false);
  assert.equal(judging.contestState, 'judging');
  assert.equal(judging.contestStateLabel, 'Cuộc thi đang chấm điểm');

  const completed = deriveContestRuntimeState('completed', null, false);
  assert.equal(completed.isContestStarted, false);
  assert.equal(completed.contestState, 'completed');
  assert.equal(completed.contestStateLabel, 'Cuộc thi đã kết thúc');

  const patch = buildConfigPatchPayload(
    { name: 'HackFlow 2026', teamSizeEnforcementPolicy: 'strict_all' },
    { version: 4 }
  );
  assert.equal(patch.expected_version, 4);
  assert.equal(patch.teamSizeEnforcementPolicy, 'strict_all');
});

test('AdminConfigPage includes impact preview, version history, and uses is_paused on toggleContestStarted (C01, C06-C08)', () => {
  const pageSource = readFileSync(new URL('../src/pages/admin/AdminConfigPage.tsx', import.meta.url), 'utf8');
  const storeSource = readFileSync(new URL('../src/store/useMockStore.ts', import.meta.url), 'utf8');
  assert.equal(pageSource.includes('Xem Trước Tác Động (Thay Đổi Này Ảnh Hưởng Gì)'), true);
  assert.equal(pageSource.includes('Lịch Sử Phiên Bản Cấu Hình'), true);
  assert.equal(pageSource.includes('teamSizeEnforcementPolicy'), true);
  assert.equal(storeSource.includes('is_paused: true'), true);
});

test('Checkpoint completion rate counts unique approved teams (prevents 160% from version history) and flags out-of-order stage schedules', () => {
  const { getCheckpointCompletionStats, checkpointScheduleWarning } = loadTs('../src/utils/progress.ts');
  const teams = [
    { id: 't1', status: 'approved' },
    { id: 't2', status: 'approved' },
    { id: 't3', status: 'approved' },
    { id: 't4', status: 'approved' },
    { id: 't5', status: 'approved' },
    { id: 't6', status: 'rejected' },
  ];
  const duplicateVersionSubmissions = [
    { checkpointId: 'cp2', teamId: 't1', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't1', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't2', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't2', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't3', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't3', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't4', status: 'submitted' },
    { checkpointId: 'cp2', teamId: 't4', status: 'submitted' },
  ];
  const stats = getCheckpointCompletionStats('cp2', duplicateVersionSubmissions, teams);
  assert.equal(stats.approvedTeamsCount, 5);
  assert.equal(stats.completedTeamsCount, 4);
  assert.equal(stats.completionPercent, 80);

  const outOfOrder = checkpointScheduleWarning([
    { startTime: '2026-11-05T09:00:00Z', deadline: '2026-11-07T09:00:00Z', status: 'upcoming' },
    { startTime: '2026-11-01T09:00:00Z', deadline: '2026-11-10T09:00:00Z', status: 'open', isFinalCheckpoint: true },
  ]);
  assert.ok(outOfOrder);
});

test('SHA UI elements are removed across candidate, judge, and admin views while preserving API contracts', () => {
  const formSrc = readFileSync(new URL('../src/components/CheckpointSubmissionForm.tsx', import.meta.url), 'utf8');
  const tableSrc = readFileSync(new URL('../src/components/SubmissionHistoryTable.tsx', import.meta.url), 'utf8');
  const judgeSrc = readFileSync(new URL('../src/pages/JudgingWorkspace.tsx', import.meta.url), 'utf8');
  const finalSrc = readFileSync(new URL('../src/pages/candidate/CandidateFinalSubmissionPage.tsx', import.meta.url), 'utf8');
  const candCpSrc = readFileSync(new URL('../src/pages/candidate/candidateCheckpointsPage.tsx', import.meta.url), 'utf8');
  const candDashSrc = readFileSync(new URL('../src/pages/candidate/CandidateDashboardPage.tsx', import.meta.url), 'utf8');

  assert.equal(formSrc.includes('Frozen Commit SHA:'), false);
  assert.equal(tableSrc.includes('Commit SHA\n'), false);
  assert.equal(judgeSrc.includes('Commit SHA đóng băng:'), false);
  assert.equal(finalSrc.includes('Mã băm commit đóng băng an toàn'), false);
  assert.equal(candCpSrc.includes('Chặng cuối (Chốt SHA)'), false);
  assert.equal(candDashSrc.includes('SHA: {sub.commit_sha'), false);
});


