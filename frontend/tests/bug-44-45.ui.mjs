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
    if (path === '/announcements') {
      const notices = state.announcements || [];
      if (method === 'GET') return respond({ items: notices, total: notices.length, page: 1, page_size: 100 });
    }
    if (path.startsWith('/announcements/') && method === 'PUT') {
      const item = state.announcements.find((item) => item.id === path.split('/').at(-1));
      Object.assign(item, payload);
      return respond(item);
    }
    if (path === '/topics') return respond(state.topics || []);
    if (/^\/topics\/[^/]+\/subtopics$/.test(path) && method === 'POST') {
      const parent = state.topics.find((t) => t.id === path.split('/')[2]);
      parent.subtopics.push({ ...payload, id: 'sub-audit', topic_id: parent.id, current_teams: 0, is_active: true,
        mentor_name: roster.find((m) => m.id === payload.mentor_id)?.full_name || null });
      return respond(parent, 201);
    }
    if (path.startsWith('/topics/subtopics/') && method === 'PATCH') {
      const sub = state.topics.flatMap((t) => t.subtopics).find((s) => s.id === path.split('/').at(-1));
      Object.assign(sub, payload);
      sub.mentor_name = roster.find((m) => m.id === payload.mentor_id)?.full_name || null;
      return respond(sub);
    }
    if (path === '/rubrics') {
      if (method === 'POST' && state.rubricLocked) return respond(null, 409, 'Rubric đã khóa.');
      if (state.failRubricRead) return respond(null, 500, 'Không thể tải tiêu chí');
      return respond({ criteria: state.criteria || [], is_locked: Boolean(state.rubricLocked), can_edit: !state.rubricLocked });
    }
    if (path === '/tickets' || path === '/tickets/me') return respond(state.tickets || []);
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

const lockedButtons = ['Cân Bằng Tỷ Lệ (100%)','Chia Đều','Lưu Lên Hệ Thống','Thêm Tiêu Chí'];
try {
  {
    const {context,page,state,pageErrors}=await setup('candidate');
    state.topics=[{id:'full',title:'Web3 hết chỗ',is_active:true,max_teams:1,current_teams:1,remaining_slots:0,status:'FULL',subtopics:[]},
      {id:'open',title:'Lĩnh vực còn chỗ',is_active:true,max_teams:5,current_teams:0,remaining_slots:5,status:'AVAILABLE',subtopics:[
        {id:'off',title:'Nhánh đã đóng',is_active:false,remaining_slots:2,max_teams:2,current_teams:0},
        {id:'on',title:'Nhánh đang mở',is_active:true,remaining_slots:2,max_teams:2,current_teams:0}]}];
    await page.goto(`${base}/topics`);
    await page.getByRole('button',{name:'Đề tài đã hết chỗ.',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Đề tài đã hết chỗ.',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Chọn đề tài này',exact:true}).click();
    assert.equal(await page.locator('input[value="off"]').isDisabled(),true);
    assert.equal(await page.locator('input[value="on"]').isChecked(),true);
    assert.equal(state.calls.filter(c=>c.path==='/topics/select').length,0);
    await page.reload();
    assert.equal(await page.getByRole('button',{name:'Đề tài đã hết chỗ.',exact:true}).isDisabled(),true);
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS parent full disabled, inactive branch disabled, first available branch selected');
  }
  {
    const {context,page,state,pageErrors}=await setup('candidate');
    state.topics=[{id:'future',title:'Chưa đến giờ',is_active:true,remaining_slots:5,max_teams:5,current_teams:0,status:'AVAILABLE',can_select:false,unavailable_reason:'Chưa đến thời gian đăng ký đề tài.',subtopics:[]}];
    await page.goto(`${base}/topics`);
    assert.equal(await page.getByRole('button',{name:'Chưa đến thời gian đăng ký đề tài.',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Chọn đề tài này',exact:true}).count(),0);
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS closed selection window disables available topic');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.rubricLocked=true;
    state.criteria=[{id:'locked',title:'Tiêu chí khóa',weight:1,max_score:10}];
    await page.goto(`${base}/admin/criteria`);
    await page.getByRole('status').filter({hasText:'Tiêu chí đã khóa'}).waitFor();
    for(const name of lockedButtons) assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true,name);
    await page.reload();
    await page.getByRole('status').filter({hasText:'Tiêu chí đã khóa'}).waitFor();
    assert.equal(state.calls.filter(c=>c.path==='/rubrics'&&c.method==='POST').length,0);
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS persisted rubric lock disables all mutation controls without a failed write');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.criteria=[{id:'editable',title:'Tiêu chí mở',weight:1,max_score:10}];
    await page.goto(`${base}/admin/criteria`);
    await page.getByText('Tiêu chí mở',{exact:true}).first().waitFor();
    assert.equal(await page.getByRole('button',{name:'Thêm Tiêu Chí',exact:true}).isEnabled(),true);
    await page.getByRole('button',{name:'Chia Đều',exact:true}).click();
    assert.equal(state.calls.filter(c=>c.path==='/rubrics'&&c.method==='POST').length,0);
    await page.getByRole('button',{name:'Lưu Lên Hệ Thống',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu',exact:true}).click();
    await eventually(()=>Promise.resolve(state.calls.some(c=>c.path==='/rubrics'&&c.method==='POST')),'No save');
    state.rubricLocked=true; // Another judge submits while this page remains open.
    await page.getByRole('button',{name:'Lưu Lên Hệ Thống',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Tiêu chí đã khóa'}).waitFor();
    for(const name of lockedButtons) assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true,name);
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS editable rubric saves, concurrent 409 switches to read-only');
  }
} finally {await browser.close();}
