import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {z} from 'zod';

function load(path, dependencies={}) {
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  new Function('require','exports',compiled)((name)=>dependencies[name] || {},exports);
  return exports;
}
const {checkpointAtTime}=load('../src/hooks/useLiveCheckpoints.ts');
test('legacy schedules are flagged without silently changing deadlines',()=>{
  const {checkpointScheduleWarning}=load('../src/utils/progress.ts');
  const items=[{deadline:'2026-11-03T00:00:00Z'},{deadline:'2026-11-02T00:00:00Z',is_final_checkpoint:true}];
  assert.ok(checkpointScheduleWarning(items));
  assert.equal(items[1].deadline,'2026-11-02T00:00:00Z');
  assert.equal(checkpointScheduleWarning([{deadline:'2026-11-02T00:00:00Z'},{deadline:'2026-11-03T00:00:00Z',is_final_checkpoint:true}]),null);
});
test('checkpoint state changes at open, deadline, grace and closed without a stale badge',()=>{
  const start=Date.parse('2026-11-01T01:00:00Z'), end=start+10000;
  const cp={id:'cp',start_time:new Date(start).toISOString(),deadline:new Date(end).toISOString(),is_active:true,grace_period_seconds:5};
  for(const [now,status,allowed] of [[start-1,'upcoming',false],[start,'open',true],[end,'open',true],[end+1,'grace_period',true],[end+5000,'grace_period',true],[end+5001,'closed',false]]) {
    const actual=checkpointAtTime(cp,now);assert.equal(actual.status,status);assert.equal(actual.can_submit,allowed);
  }
  assert.equal(checkpointAtTime({...cp,is_active:false},start).can_submit,false);
  assert.equal(checkpointAtTime({...cp,availability_error:'Offline'},start).can_submit,false);
});
test('checkpoint API neutralizes only known legacy demo titles and preserves server timing',async()=>{
  const cp={id:'future',title:'Chặng 3 — Chưa mở',status:'open',can_submit:true,server_time:'2026-11-01T01:00:00Z'};
  const {checkpointApi}=load('../src/api/checkpointApi.ts',{'./axiosClient':{axiosClient:{get:async()=>({data:{data:[cp]}})}}});
  const result=(await checkpointApi.getCheckpoints())[0];
  assert.equal(result.title,'Chặng 3 — Tích hợp và kiểm thử');
  assert.equal(result.status,'open');assert.equal(result.server_time,cp.server_time);
});
test('cancellation policy fails closed when the backend response is unavailable',async()=>{
  const {topicsApi}=load('../src/api/topicsApi.ts',{'./axiosClient':{axiosClient:{get:async()=>({data:{data:[]}})}}});
  await assert.rejects(topicsApi.getCancellationPolicy());
});
test('admin schema preserves long and legacy invite codes without accepting malformed new text',()=>{
  const {adminTeamFormSchema}=load('../src/hooks/useAdminTeams.ts',{'zod':{z}});
  const schema=adminTeamFormSchema.shape.inviteCode;
  for(const code of ['ABC123','DEMOBLOCK','DEMOBUILDERS','ABCDEFGHIJKLMNO','ABCDEFGHIJKLMNOP','OLD4']) assert.equal(schema.parse(code),code);
  for(const code of ['ABC','A'.repeat(17),'BAD CODE']) assert.equal(schema.safeParse(code).success,false);
});
