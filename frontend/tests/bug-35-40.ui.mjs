// Run against Vite: TEST_BASE_URL=http://127.0.0.1:4179 node tests/bug-35-40.ui.mjs
// Browser APIs are mocked here; SQL persistence is covered by backend/tests/test_bug_35_40.py.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4179';
let passed = 0;
async function screenshot(page, name) {
  if (!process.env.TEST_SCREENSHOT_DIR) return;
  mkdirSync(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(process.env.TEST_SCREENSHOT_DIR, name), fullPage: true });
}

async function setup(role = 'admin', timezoneId = 'Asia/Ho_Chi_Minh') {
  const context = await browser.newContext({ timezoneId, viewport: { width: 1440, height: 1000 } });
  const user = { id: 'user-1', email: `${role}@example.com`, role, fullName: 'Test User', approvalStatus: 'approved' };
  await context.addInitScript(({ user }) => {
    if (!localStorage.getItem('auth-storage')) {
      localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'ui-test-token', isAuthenticated: true }, version: 0 }));
      localStorage.setItem('token', 'ui-test-token');
    }
  }, { user });
  const config = { id: 'config-1', name: 'UI Competition', currentPhase: 'Thực thi dự án & Nộp bài các chặng', status: 'hacking',
    minTeamSize: 2, minTeamMembers: 2, maxTeamSize: 6, maxTeamMembers: 6,
    end_time: '2026-12-31T11:00:37.123Z', is_result_published: false, blindJudgingEnabled: true };
  const members = [0, 1, 2].map((i) => ({ id: `membership-${i}`, user_id: i === 0 ? user.id : `member-${i}`,
    full_name: i === 0 ? 'Test User' : `Member ${i}`, email: i === 0 ? user.email : `member${i}@example.com`,
    role: i === 0 ? 'leader' : 'member', joined_at: '2026-10-01T00:00:00Z', skills: ['React'] }));
  const team = { id: 'team-1', team_name: 'UI Team', invite_code: 'UITEST', status: 'VALID', approval_status: 'approved',
    member_count: 3, min_members: 2, max_members: 6, is_locked: false, leader_id: user.id, members };
  const roster = [];
  const calls = [];
  const state = { config, team, roster, calls, failConfig: false, failCreate: false, failRemoval: true, failSkills: true };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split('/api/v1')[1];
    const method = request.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    let payload;
    try { payload = request.postDataJSON(); } catch { /* no body */ }
    calls.push({ method, path, payload });
    const respond = (data, status = 200, message = 'OK') => route.fulfill({ status, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ success: status < 400, data, message }) });
    if (path === '/config' || path === '/admin/config') {
      if (method === 'PATCH') {
        if (state.failConfig) return respond(null, 500, 'Không thể lưu cấu hình thử nghiệm.');
        Object.assign(config, payload);
      }
      return respond(config);
    }
    if (path === '/auth/me') return respond({ ...user, full_name: user.fullName, approval_status: 'approved', onboarding_completed: true, pledged: true });
    if (path === '/admin/personnel') {
      if (method === 'POST') {
        if (state.failCreate) return respond(null, 409, 'Email này đã tồn tại trong hệ thống.');
        const item = { ...payload, id: `expert-${roster.length + 1}`, assigned_team_ids: [] };
        roster.push(item); return respond(item, 201);
      }
      return respond(roster);
    }
    if (path.startsWith('/admin/personnel/') && method === 'DELETE') {
      roster.splice(roster.findIndex((item) => item.id === path.split('/').at(-1)), 1);
      return respond({ deleted_id: path.split('/').at(-1) });
    }
    if (path === '/teams/me') return respond(team);
    if (path === '/teams') return respond([team]);
    if (path === '/admin/teams') return respond(state.adminTeams || [team]);
    if (/^\/admin\/teams\/[^/]+\/reject$/.test(path) && method === 'PATCH') {
      const target = state.adminTeams.find((t) => t.id === path.split('/')[3]);
      target.status = target.approval_status = 'rejected';
      target.rejection_reason = payload.reason;
      target.last_review = { decision: 'rejected', reason: payload.reason, reviewed_at: '2026-10-28T08:00:00Z',
        reviewed_by: user.id, member_count: target.members.length, min_members: target.min_members, max_members: target.max_members };
      return respond(target);
    }
    if (path.startsWith('/teams/members/') && method === 'DELETE') {
      if (state.failRemoval) return respond(null, 409, 'Đội đang tham gia dự thi và cần duy trì số lượng thành viên tối thiểu.');
      team.members = team.members.filter((m) => m.user_id !== path.split('/').at(-1));
      team.member_count = team.members.length;
      return respond(team);
    }
    if (path.endsWith('/skills') && method === 'PATCH') return respond(null, 500, 'Không thể lưu chuyên môn thử nghiệm.');
    return respond([]);
  });
  return { context, page, state, pageErrors };
}

async function eventually(check, message) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

try {
  for (const [zone, expectedLocal] of [['Asia/Ho_Chi_Minh', '2026-12-31T18:00'], ['UTC', '2026-12-31T11:00']]) {
    const { context, page, state, pageErrors } = await setup('admin', zone);
    await page.goto(`${base}/admin/config`);
    const save = page.getByRole('button', { name: 'Lưu Cấu Hình Hackathon', exact: true });
    await eventually(() => save.isEnabled(), 'Config did not load');
    assert.equal(await page.locator('input[type="datetime-local"]').inputValue(), expectedLocal);
    await save.click();
    await page.getByText('Đã cập nhật cấu hình hệ thống Hackathon thành công!', { exact: true }).waitFor();
    assert.equal(state.config.end_time, '2026-12-31T11:00:37.123Z');
    if (zone === 'Asia/Ho_Chi_Minh') await screenshot(page, 'config-saved.png');
    assert.equal(await page.getByText('Bạn đang có thay đổi cấu hình chưa được lưu', { exact: false }).count(), 0);
    const beforeUnload = await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })));
    assert.equal(beforeUnload, false);
    const nameInput = page.getByLabel('Tên cuộc thi', { exact: false });
    await nameInput.fill('Saved and leave');
    // Navigate through the sidebar to exercise the blocked-navigation dialog.
    await page.locator('a[href="/admin/personnel"]').first().click();
    await page.getByRole('button', { name: 'Lưu & Rời đi', exact: true }).click();
    await page.waitForURL('**/admin/personnel');
    assert.equal(state.config.name, 'Saved and leave');
    await page.goto(`${base}/admin/config`);
    await eventually(() => save.isEnabled(), 'Config did not reload');
    state.failConfig = true;
    await nameInput.fill('Unsaved edit');
    await save.click();
    await page.getByRole('button',{name:'Xác nhận lưu cấu hình',exact:true}).click();
    await eventually(() => save.isEnabled(), 'Failed save did not release button');
    assert.equal(state.config.name, 'Saved and leave');
    assert.equal(await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true }))), true);
    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`PASS config save, leave, error, timezone ${zone}`); passed++;
  }

  {
    const { context, page, state, pageErrors } = await setup();
    await page.goto(`${base}/admin/personnel`);
    await page.getByRole('button', { name: 'Tạo Tài Khoản Chuyên Gia', exact: true }).click();
    await page.getByLabel('Họ và tên chuyên gia *', { exact: true }).fill('Expert Test');
    await page.getByLabel('Địa chỉ Email *', { exact: true }).fill('expert@example.com');
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.getByText('Đã tạo tài khoản giám khảo expert@example.com.', { exact: true }).waitFor();
    assert.equal(state.roster.length, 1);
    await screenshot(page, 'personnel-created.png');
    assert.equal(await page.getByText('Gửi thư mời', { exact: true }).count(), 0);
    await page.reload();
    await page.getByRole('heading', { name: 'Expert Test', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tạo Tài Khoản Chuyên Gia', exact: true }).click();
    await page.getByLabel('Họ và tên chuyên gia *', { exact: true }).fill('Duplicate');
    await page.getByLabel('Địa chỉ Email *', { exact: true }).fill('EXPERT@example.com');
    const writes = state.calls.filter((c) => c.path === '/admin/personnel' && c.method === 'POST').length;
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.getByText('Email này đã tồn tại trong danh sách chuyên gia.', { exact: true }).waitFor();
    assert.equal(state.calls.filter((c) => c.path === '/admin/personnel' && c.method === 'POST').length, writes);
    state.failCreate = true;
    await page.getByLabel('Địa chỉ Email *', { exact: true }).fill('already-in-db@example.com');
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.getByText('Email này đã tồn tại trong hệ thống.', { exact: true }).waitFor();
    assert.equal(state.roster.length, 1);
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByRole('button', { name: 'Cố Vấn Chuyên Môn (0)', exact: true }).click();
    state.failCreate = false;
    await page.getByRole('button', { name: 'Tạo Tài Khoản Chuyên Gia', exact: true }).click();
    await page.getByLabel('Họ và tên chuyên gia *', { exact: true }).fill('Mentor Test');
    await page.getByLabel('Địa chỉ Email *', { exact: true }).fill('mentor-test@example.com');
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.getByText('Đã tạo tài khoản cố vấn mentor-test@example.com.', { exact: true }).waitFor();
    assert.equal(state.roster.length, 2);
    await page.getByTitle('Xóa cố vấn', { exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
    await page.getByText('Đã xóa tài khoản Mentor Test.', { exact: true }).waitFor();
    assert.equal(state.roster.length, 1);
    await page.reload();
    await page.getByRole('button', { name: 'Cố Vấn Chuyên Môn (0)', exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await context.close(); console.log('PASS account create, reload, duplicates, server failure, wording'); passed++;
  }

  {
    const { context, page, state, pageErrors } = await setup('candidate');
    await page.goto(`${base}/dashboard`);
    await page.getByText('3/6 thành viên • Mã: UITEST', { exact: true }).waitFor();
    await page.locator('a[href="/teams"]').first().click();
    await page.getByText('3/6 Thành viên (Tối thiểu 2)', { exact: true }).waitFor();
    await page.getByTitle('Mời thành viên rời khỏi đội', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Xác nhận mời rời đội', exact: true }).click();
    await page.getByText('Đội đang tham gia dự thi và cần duy trì số lượng thành viên tối thiểu.', { exact: true }).waitFor();
    assert.equal(await page.getByText('3/6 Thành viên (Tối thiểu 2)', { exact: true }).count(), 1);
    await page.reload();
    await page.getByText('3/6 Thành viên (Tối thiểu 2)', { exact: true }).waitFor();
    await page.getByTitle('Cập nhật chuyên môn thành viên', { exact: true }).first().click();
    await page.getByPlaceholder('Ví dụ: Backend, FastAPI, AI Security, React...').fill('Unsaved Skill');
    await page.getByRole('button', { name: 'Lưu chuyên môn', exact: true }).click();
    await page.getByText('Không thể lưu chuyên môn thử nghiệm.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(await page.getByText('Unsaved Skill', { exact: true }).count(), 0);
    state.failRemoval = false;
    await page.getByTitle('Mời thành viên rời khỏi đội', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Xác nhận mời rời đội', exact: true }).click();
    await page.getByText('2/6 Thành viên (Tối thiểu 2)', { exact: true }).waitFor();
    await screenshot(page, 'team-after-removal.png');
    await page.locator('a[href="/dashboard"]').first().click();
    await page.getByText('2/6 thành viên • Mã: UITEST', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await context.close(); console.log('PASS dashboard/team count, removal rejection, reload'); passed++;
  }
  {
    const { context, page, state, pageErrors } = await setup();
    state.adminTeams = [
      { ...structuredClone(state.team), id: 'team-a', team_name: 'Team Alpha', status: 'pending' },
      { ...structuredClone(state.team), id: 'team-b', team_name: 'Team Beta', status: 'pending' },
    ];
    await page.goto(`${base}/admin/teams`);
    await page.getByRole('button', { name: 'Mở menu thao tác cho đội Team Alpha', exact: true }).click();
    await page.getByText('Từ chối đăng ký...', { exact: true }).click();
    const reason = page.getByLabel('Lý do từ chối / đình chỉ đội thi', { exact: false });
    assert.equal(await reason.inputValue(), '');
    await reason.fill('Lý do chỉ dành cho Alpha');
    await page.getByRole('button', { name: 'Hủy bỏ', exact: true }).click();
    await page.getByRole('button', { name: 'Mở menu thao tác cho đội Team Beta', exact: true }).click();
    await page.getByText('Từ chối đăng ký...', { exact: true }).click();
    assert.equal(await reason.inputValue(), '');
    await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
    assert.equal(state.calls.filter((c) => c.path.endsWith('/reject') && c.method === 'PATCH').length, 0);
    await reason.fill('Hồ sơ chưa có giấy xác nhận hợp lệ');
    await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
    await eventually(() => page.getByRole('button', { name: 'Xem hồ sơ đội Team Beta', exact: true }).isVisible(), 'Review did not finish');
    await page.getByRole('button', { name: 'Xem hồ sơ đội Team Beta', exact: true }).click();
    await page.getByText('Lý do từ chối tại lần xét duyệt:', { exact: true }).waitFor();
    await page.getByText('Hồ sơ chưa có giấy xác nhận hợp lệ', { exact: true }).waitFor();
    await screenshot(page, 'team-review-history.png');
    assert.deepEqual(pageErrors, []);
    await context.close(); console.log('PASS rejection dialog default, reset, validation, review snapshot'); passed++;
  }
  console.log(`${passed} browser scenarios passed`);
} finally {
  await browser.close();
}
