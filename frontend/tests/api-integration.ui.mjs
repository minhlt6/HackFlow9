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
      return respond({ criteria: state.criteria || [] });
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

try {
  {
    const {context,page,state,pageErrors}=await setup('candidate');
    state.announcements=[{id:'notice-audit',title:'Server announcement',content:'Loaded from the API pagination envelope',priority:'info',target_audience:'candidate',created_at:'2026-10-29T01:00:00Z'}];
    await page.goto(`${base}/dashboard`);
    await page.getByText('Server announcement',{exact:true}).waitFor();
    assert.equal(await page.getByText('Loaded from the API pagination envelope',{exact:true}).count(),1);
    await page.reload();
    await page.getByText('Server announcement',{exact:true}).waitFor();
    assert.deepEqual(pageErrors,[]);
    await context.close(); console.log('PASS dashboard announcements load and reload');passed++;
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.announcements=[{id:'notice-audit',title:'Judge notice',content:'Keep judge-only scope',priority:'info',target_audience:'judge',created_at:'2026-10-29T01:00:00Z'}];
    await page.goto(`${base}/admin/announcements`);
    await page.getByTitle('Chỉnh sửa thông báo',{exact:true}).click();
    const scope=page.getByRole('dialog').locator('select').last();
    assert.equal(await scope.inputValue(),'judges');
    await page.getByLabel('Tiêu đề thông báo *',{exact:true}).fill('Edited judge notice');
    await page.getByRole('button',{name:'Cập nhật thông báo',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận cập nhật',exact:true}).click();
    await eventually(()=>Promise.resolve(state.calls.some((c)=>c.path==='/announcements/notice-audit'&&c.method==='PUT')),'No announcement update');
    assert.equal(state.announcements[0].target_audience,'judge');
    await page.reload();
    await page.getByTitle('Chỉnh sửa thông báo',{exact:true}).click();
    assert.equal(await scope.inputValue(),'judges');
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS editing preserves judge audience through reload');passed++;
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.roster.push({id:'mentor-audit',full_name:'Mentor Selected',role:'mentor',email:'mentor@example.com',is_active:true});
    state.topics=[{id:'topic-audit',title:'Audit Topic',description:'Audit topic',max_teams:50,current_teams:0,is_active:true,subtopics:[]}];
    await page.goto(`${base}/admin/topics`);
    await page.getByText('Audit Topic',{exact:true}).first().waitFor();
    await page.getByRole('button',{name:'Thêm Đề Tài Nhánh',exact:true}).click();
    await page.getByLabel('Tiêu đề Đề tài nhánh *',{exact:true}).fill('Assigned subtopic');
    await page.getByLabel('Cố vấn phụ trách',{exact:true}).selectOption('mentor-audit');
    await page.getByRole('dialog').getByRole('button',{name:'Lưu Đề Tài',exact:true}).click();
    await page.getByText('Cố vấn phụ trách: Mentor Selected',{exact:true}).waitFor();
    assert.equal(state.topics[0].subtopics[0].mentor_id,'mentor-audit');
    await page.reload();
    await page.getByText('Cố vấn phụ trách: Mentor Selected',{exact:true}).waitFor();
    await page.getByTitle('Chỉnh sửa đề tài nhánh và chỉ tiêu Quota',{exact:true}).click();
    assert.equal(await page.getByLabel('Cố vấn phụ trách',{exact:true}).inputValue(),'mentor-audit');
    await page.getByLabel('Cố vấn phụ trách',{exact:true}).selectOption('');
    await page.getByRole('button',{name:'Lưu cập nhật',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu đề tài',exact:true}).click();
    await eventually(()=>Promise.resolve(state.topics[0].subtopics[0].mentor_id===null),'Mentor clear failed');
    await screenshot(page,'api-mentor-assignment.png');
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS mentor assignment create, read, clear');passed++;
  }
  {
    const {context,page,state,pageErrors}=await setup('mentor');
    state.tickets=[
      {id:'own-ticket',title:'Owned ticket',content:'Own support content',status:'in_progress',priority:'normal',category:'technical',user_id:'candidate',assigned_to:'user-1',created_at:'2026-10-29T01:00:00Z',updated_at:'2026-10-29T01:00:00Z'},
      {id:'foreign-ticket',title:'Foreign ticket',content:'Other mentor support content',status:'in_progress',priority:'normal',category:'technical',user_id:'candidate',assigned_to:'another-mentor',created_at:'2026-10-29T01:00:00Z',updated_at:'2026-10-29T01:00:00Z'},
    ];
    await page.goto(`${base}/mentor/tickets`);
    await page.getByRole('button',{name:/Tôi đang phụ trách/}).click();
    await page.getByText('Owned ticket',{exact:true}).first().waitFor();
    assert.equal(await page.getByText('Foreign ticket',{exact:true}).count(),0);
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS mentor ownership filter rejects other assignees');passed++;
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.rubricLocked=true;
    state.criteria=[{id:'criterion-audit',title:'Locked criterion',description:'Existing score must survive',max_score:10,weight:1,display_order:1}];
    await page.goto(`${base}/admin/criteria`);
    await page.getByText('Locked criterion',{exact:true}).first().waitFor();
    await page.getByRole('button',{name:'Lưu Lên Hệ Thống',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu',exact:true}).click();
    await page.getByText('Không thể sửa đổi tiêu chí vì Giám khảo đã nộp bảng điểm chấm thi. Hệ thống đã khóa Rubric.',{exact:true}).waitFor();
    const write=state.calls.find((c)=>c.path==='/rubrics'&&c.method==='POST');
    assert.equal(write.payload.allow_override,false);
    await screenshot(page,'api-rubric-locked.png');
    assert.deepEqual(pageErrors,[]);
    await context.close();console.log('PASS rubric save never enables forced override');passed++;
  }
  console.log(`${passed} API integration browser scenarios passed`);
} finally { await browser.close(); }
