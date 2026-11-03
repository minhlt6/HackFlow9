import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
