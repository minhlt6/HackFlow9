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
    if (path === '/checkpoints') return respond((state.checkpoints || []).map(cp=>({...cp,server_time:new Date(state.now || Date.now()).toISOString()})));
    if (path === '/submissions') return respond(state.progress || []);
    if (path === '/evaluations/submissions') return respond({submissions:state.judgeRows || []});
    if (path === '/admin/candidates/directory' || path === '/admin/candidates/unassigned') return respond(state.candidates || []);
    if (path === '/topics/cancellation-policy') return respond({can_cancel_topic:state.cancelAllowed===true,reason:state.cancelAllowed?null:'Đã qua giai đoạn chọn đề tài; vui lòng liên hệ Ban tổ chức.'});
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
    const now=Date.now();state.now=now;
    await page.clock.install({time:now});
    state.checkpoints=[{id:'cp-live',title:'Chặng 3 — Chưa mở',start_time:new Date(now+60000).toISOString(),deadline:new Date(now+120000).toISOString(),is_active:true,grace_period_seconds:5,status:'upcoming',can_submit:false}];
    await page.goto(`${base}/checkpoints`);
    await page.getByText('Sắp diễn ra',{exact:true}).first().waitFor();
    const input=page.locator('input[type="url"]').first();
    assert.equal(await input.isDisabled(),true);
    state.now=now+61000;await page.clock.fastForward(61000);
    await page.getByText('Đang mở nộp bài',{exact:true}).first().waitFor();
    await eventually(()=>input.isEnabled(),'Form remained locked after opening');
    state.now=now+131000;await page.clock.fastForward(70000);
    await page.getByText('Đã đóng',{exact:true}).first().waitFor();
    assert.equal(await input.isDisabled(),true);
    assert.equal(await page.getByText('Chặng 3 — Chưa mở',{exact:true}).count(),0);
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS live server time updates badge and form through open/closed boundaries');
  }
  {
    const {context,page,state,pageErrors}=await setup('candidate');
    state.team.topic_id='topic-locked';state.team.subtopic_id='sub-locked';
    state.topics=[{id:'topic-locked',title:'Đề tài đã chốt',is_active:true,status:'AVAILABLE',remaining_slots:2,max_teams:5,current_teams:3,subtopics:[]}];
    await page.goto(`${base}/topics`);
    await page.getByText(/Đã qua giai đoạn chọn đề tài/).first().waitFor();
    const cancel=page.getByRole('button',{name:/Hủy.*đề tài/});
    assert.ok(await cancel.count()>0);
    for(const button of await cancel.all()) assert.equal(await button.isDisabled(),true);
    assert.equal(state.calls.filter(c=>c.path==='/topics/cancel').length,0);
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS cancellation policy disables selected topic controls without writes');
  }
  {
    const {context,page,state,pageErrors}=await setup('judge');
    state.criteria=[{id:'quality',title:'Quality',max_score:10,weight:1}];
    state.judgeRows=[{review_id:'review-no-final',submission_id:null,can_evaluate:false,evaluation_block_reason:'Đội chưa có bài nộp chung kết.',anonymous_team_code:'Team #DEMO',topic_title:'Assigned topic',evaluation_status:'submitted',my_total_score:90,my_evaluations:[],checkpoint_submissions:[1,2,3].map(i=>({id:`progress-${i}`,checkpoint_id:`cp-${i}`,checkpoint_title:`Bài tiến độ ${i}`,status:i===3?'pending_sha_freeze':'submitted',submitted_at:'2026-11-01T01:00:00Z',repo_url:'https://github.com/test/progress'}))}];
    await page.goto(`${base}/judge/split-screen`);
    await page.getByRole('button',{name:'Checkpoints (3)',exact:true}).click();
    for(const i of [1,2,3]) await page.getByText(`Bài tiến độ ${i}`,{exact:true}).waitFor();
    await page.getByText('Đang đóng băng SHA',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Lưu Bản Nháp',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:/Khóa Bảng Điểm/}).isDisabled(),true);
    assert.equal(state.calls.filter(c=>c.path==='/evaluations'&&c.method==='POST').length,0);
    await page.reload();await page.getByRole('button',{name:'Checkpoints (3)',exact:true}).waitFor();
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS judge sees three real progress entries but cannot grade a missing final');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.candidates=[{id:'inactive',fullName:'Tài khoản Ngừng Hoạt Động',full_name:'Tài khoản Ngừng Hoạt Động',email:'inactive@example.com',hasTeam:false,has_team:false,approval_status:'approved',is_active:false}];
    await page.goto(`${base}/admin/teams`);
    const match=page.getByRole('button',{name:/Ghép đội ngẫu nhiên \(0 thí sinh lẻ\)/});
    await match.waitFor();assert.equal(await match.isDisabled(),true);
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS inactive-only matching pool leaves the auto-match button disabled');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    await page.goto(`${base}/admin/teams`);
    await page.getByRole('button',{name:'Tạo đội thi mới',exact:true}).click();
    const code=page.locator('#team-form-code');
    await code.fill('ABCDEFGHIJKLMNO');
    assert.equal(await code.inputValue(),'ABCDEFGHIJKLMNO');
    assert.equal(await code.getAttribute('maxlength'),'16');
    await page.getByRole('dialog').getByText(/Mã mời \(6–16 ký tự/).waitFor();
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS admin invite input preserves a 15-character legacy code');
  }
} finally {await browser.close();}
