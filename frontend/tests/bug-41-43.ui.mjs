// Mocked browser contracts; SQL writes and authorization are covered by backend tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel:'chrome',headless:true});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4179';

async function setup(role, failTickets=false) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const user={id:'user-1',email:`${role}@example.com`,role,fullName:'Test User',approvalStatus:'approved'};
  await context.addInitScript(({user})=>{
    localStorage.setItem('token','ui-test-token');
    localStorage.setItem('auth-storage',JSON.stringify({state:{user,token:'ui-test-token',isAuthenticated:true},version:0}));
  },{user});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const cps=['submitted','evaluated',null,'sha_verification_failed'].map((status,i)=>({
    id:`cp-${i}`,title:`Chặng kiểm tra ${i+1}`,start_time:i===2?'2099-01-01T00:00:00Z':'2020-01-01T00:00:00Z',
    deadline:'2099-02-01T00:00:00Z',is_active:true,status:i===2?'upcoming':'open',is_final_checkpoint:i===3,
    latest_submission:status?{id:`sub-${i}`,checkpoint_id:`cp-${i}`,team_id:'team-1',status,submitted_at:'2026-10-29T00:00:00Z'}:null,
  }));
  const tickets=[{id:'waiting',title:'Ticket chưa nhận',status:'open',assigned_to:null},
    {id:'owned',title:'Ticket đang xử lý',status:'in_progress',assigned_to:'user-1'},
    {id:'other',title:'Ticket người khác',status:'in_progress',assigned_to:'someone-else'}]
    .map(t=>({...t,content:'Nội dung yêu cầu hỗ trợ',priority:'normal',category:'technical',created_at:'2026-10-29T00:00:00Z',user_id:'candidate'}));
  await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname.split('/api/v1')[1];
    const data=path==='/checkpoints'?cps:path==='/submissions'?cps.flatMap(c=>c.latest_submission?[c.latest_submission]:[]):
      path==='/tickets'?tickets:path==='/auth/me'?{...user,full_name:user.fullName,approval_status:'approved',onboarding_completed:true,pledged:true}:
      path==='/rubrics'?{criteria:[]}:path==='/announcements'?{items:[],total:0}:
      path==='/config'?{name:'Demo',minTeamMembers:3,maxTeamMembers:5}:[];
    const status=failTickets&&path==='/tickets'?401:200;
    await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:status===200,data,message:status===401?'Phiên đăng nhập hết hạn':'OK'})});
  });
  return {page,context,errors};
}
try {
  {
    const {page,context,errors}=await setup('candidate');
    await page.goto(base+'/dashboard');
    await page.getByText('2/4',{exact:true}).waitFor();
    await page.getByText('Chờ BTC xác minh SHA',{exact:true}).waitFor();
    await page.getByText('Chưa mở',{exact:true}).waitFor();
    await page.reload();
    await page.getByText('2/4',{exact:true}).waitFor();
    await page.goto(base+'/checkpoints');
    await page.getByText(/Đã hoàn thành 2\/4 chặng/).waitFor();
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS checkpoint progress 2/4, pending SHA, reload and details agree');
  }
  {
    const {page,context,errors}=await setup('mentor');
    await page.goto(base+'/mentor/dashboard');
    await page.getByText('Ticket chưa nhận',{exact:true}).waitFor();
    assert.equal(await page.getByText('Ticket đang xử lý',{exact:true}).count(),0);
    assert.equal(await page.getByText('Ticket người khác',{exact:true}).count(),0);
    await page.getByText('Tickets Chờ Tiếp Nhận',{exact:true}).click();
    await page.getByText('Ticket chưa nhận',{exact:true}).first().waitFor();
    assert.equal(await page.getByText('Ticket đang xử lý',{exact:true}).count(),0);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS dashboard waiting queue agrees with ticket page');
  }
  {
    const {page,context}=await setup('mentor',true);
    await page.goto(base+'/mentor/tickets');
    // An expired session must either redirect to login or display the API failure.
    await page.waitForFunction(()=>location.pathname==='/login'||document.body.textContent.includes('Phiên đăng nhập hết hạn'));
    assert.equal(await page.getByText('Ticket chưa nhận',{exact:true}).count(),0);
    await context.close();
    console.log('PASS unauthorized request never falls back to a stale queue');
  }
} finally {await browser.close();}
