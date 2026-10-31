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
    if (path === '/admin/candidates/pending') return respond(state.pending || []);
    if (path === '/admin/candidates/approve-all') {
      if (state.failApproval) return respond(null, 500, 'Không thể lưu phê duyệt');
      const ids=payload.candidate_ids;
      const approved=(state.pending || []).filter(c=>ids.includes(c.id));
      state.pending=(state.pending || []).filter(c=>!ids.includes(c.id));
      return respond({approved_ids:approved.map(c=>c.id),approved_count:approved.length,skipped_count:ids.length-approved.length},200,`Đã duyệt ${approved.length} tài khoản`);
    }
    if (/^\/admin\/candidates\/[^/]+\/approval$/.test(path)) {
      if (state.failApproval) return respond(null, 500, 'Không thể lưu phê duyệt');
      state.pending=state.pending.filter(c=>c.id!==path.split('/')[3]);
      return respond({});
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

function pending() {return [1,2,3].map(i=>({id:`candidate-${i}`,email:`student${i}@example.com`,full_name:`Student ${i}`}));}
const writes=(state,path)=>state.calls.filter(c=>c.path===path&&c.method==='POST');
try {
  {
    const {context,page,state,pageErrors}=await setup();state.pending=pending();
    await page.goto(`${base}/admin/approvals`);
    await page.getByRole('button',{name:'Duyệt tất cả (3)',exact:true}).waitFor();
    await page.getByPlaceholder('Tìm theo tên, email, GitHub username...').fill('Student 1');
    await page.getByRole('button',{name:'Duyệt tất cả (3)',exact:true}).click();
    await page.getByRole('alertdialog').waitFor();
    assert.equal(writes(state,'/admin/candidates/approve-all').length,0);
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    assert.equal(state.pending.length,3);
    await page.getByRole('button',{name:'Duyệt tất cả (3)',exact:true}).click();
    state.pending.push({id:'new-arrival',email:'new@example.com',full_name:'New Arrival'});
    await page.getByRole('button',{name:'Xác nhận duyệt 3 tài khoản',exact:true}).click();
    await eventually(()=>Promise.resolve(state.pending.length===1),'Snapshot not applied');
    assert.deepEqual(writes(state,'/admin/candidates/approve-all')[0].payload.candidate_ids,['candidate-1','candidate-2','candidate-3']);
    assert.equal(state.pending[0].id,'new-arrival');
    await page.reload();
    await page.getByRole('button',{name:'Duyệt tất cả (1)',exact:true}).waitFor();
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS approve-all cancel, full scope despite search, frozen snapshot, reload');
  }
  {
    const {context,page,state,pageErrors}=await setup();state.pending=pending();
    await page.goto(`${base}/admin/approvals`);
    await page.getByRole('button',{name:'Duyệt',exact:true}).first().click();
    await page.getByRole('alertdialog').waitFor();
    assert.equal(writes(state,'/admin/candidates/candidate-1/approval').length,0);
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    await page.getByRole('button',{name:'Duyệt',exact:true}).first().click();
    await page.getByRole('button',{name:'Xác nhận duyệt',exact:true}).click();
    await eventually(()=>Promise.resolve(state.pending.length===2),'Single approval not saved');
    assert.equal(writes(state,'/admin/candidates/candidate-1/approval').length,1);
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS single approval needs explicit confirmation');
  }
  {
    const {context,page,state,pageErrors}=await setup();state.pending=pending();state.failApproval=true;
    await page.goto(`${base}/admin/approvals`);
    await page.getByRole('button',{name:'Duyệt tất cả (3)',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận duyệt 3 tài khoản',exact:true}).click();
    await page.getByText(/Không thể duyệt tất cả tài khoản/).waitFor();
    assert.equal(state.pending.length,3);
    assert.equal(await page.getByRole('button',{name:'Duyệt tất cả (3)',exact:true}).isEnabled(),true);
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS failed bulk approval keeps pending rows and allows retry');
  }
  {
    const {context,page,state,pageErrors}=await setup();state.criteria=[{id:'quality',title:'Quality',weight:1,max_score:10}];
    await page.goto(`${base}/admin/criteria`);
    await page.getByText('Quality',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Chia Đều',exact:true}).click();
    assert.equal(writes(state,'/rubrics').length,0);
    const reads=state.calls.filter(c=>c.path==='/rubrics'&&c.method==='GET').length;
    await page.getByRole('button',{name:'Làm mới',exact:true}).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    assert.equal(state.calls.filter(c=>c.path==='/rubrics'&&c.method==='GET').length,reads);
    await page.getByRole('button',{name:'Lưu Lên Hệ Thống',exact:true}).click();
    await page.getByRole('alertdialog').waitFor();
    assert.equal(writes(state,'/rubrics').length,0);
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    assert.equal(writes(state,'/rubrics').length,0);
    await page.getByRole('button',{name:'Lưu Lên Hệ Thống',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu',exact:true}).click();
    await eventually(()=>Promise.resolve(writes(state,'/rubrics').length===1),'Rubric not saved');
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS weights preview has no write, cancel has no write, confirmed save writes once');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    await page.goto(`${base}/admin/config`);
    // The event is a real form save; cancellation must leave the server fixture unchanged.
    await page.getByRole('button',{name:'Lưu Cấu Hình Hackathon',exact:true}).waitFor();
    const input=page.locator('input[type="text"]').first();
    await input.fill('Confirmed competition');
    await page.getByRole('button',{name:'Lưu Cấu Hình Hackathon',exact:true}).click();
    await page.getByRole('alertdialog').waitFor();
    assert.equal(state.calls.filter(c=>c.path==='/admin/config'&&c.method==='PATCH').length,0);
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    assert.equal(state.config.name,'UI Competition');
    await page.getByRole('button',{name:'Lưu Cấu Hình Hackathon',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận lưu cấu hình',exact:true}).click();
    await eventually(()=>Promise.resolve(state.config.name==='Confirmed competition'),'Config not saved');
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS configuration cancellation preserves server state and confirmed save applies');
  }
  {
    const {context,page,state,pageErrors}=await setup();
    state.team.status=state.team.approval_status='pending';state.adminTeams=[state.team];
    await page.goto(`${base}/admin/teams`);
    await page.getByRole('button',{name:'Mở menu thao tác cho đội UI Team',exact:true}).click();
    await page.getByText('Phê duyệt đội thi',{exact:true}).click();
    await page.getByRole('alertdialog').waitFor();
    assert.equal(state.calls.filter(c=>c.path.includes('/approve')&&c.method==='POST').length,0);
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
    assert.equal(state.team.approval_status,'pending');
    assert.deepEqual(pageErrors,[]);await context.close();console.log('PASS single team approval cancelled before write');
  }
} finally {await browser.close();}
