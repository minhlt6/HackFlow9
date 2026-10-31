import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(() => dependencies, exports);
  return exports;
}
const { isCompletedSubmission, isUnassignedTicket } = load('../src/utils/progress.ts');
test('completion excludes pending SHA, invalid, missing and unknown states', () => {
  assert.equal(['submitted', 'evaluated', undefined, 'pending_sha_freeze'].filter(isCompletedSubmission).length, 2);
  for (const status of ['sha_verification_failed', 'invalid', 'draft', '', null]) assert.equal(isCompletedSubmission(status), false);
  assert.equal(isCompletedSubmission('SUBMITTED'), true);
  assert.equal(isCompletedSubmission('late'), true);
  const { getSubmissionStatusMeta } = load('../src/types/checkpoint.ts');
  assert.equal(getSubmissionStatusMeta('unknown', true).badgeVariant, 'neutral');
});
test('waiting queue means open AND unassigned', () => {
  assert.equal(isUnassignedTicket({status:'open'}), true);
  assert.equal(isUnassignedTicket({status:'open',assignedMentorId:'other'}), false);
  assert.equal(isUnassignedTicket({status:'in_progress'}), false);
});
test('ticket adapter follows skip/limit through more than 100 records', async () => {
  const skips=[];
  const { ticketService } = load('../src/services/ticketService.ts', {axiosClient:{get:async (_path, {params})=>{
    skips.push(params.skip);
    return {data:{data:Array.from({length:params.skip===0?100:1},(_,i)=>({id:`ticket-${params.skip+i}`}))}};
  }}});
  assert.equal((await ticketService.getAllTickets()).data.length,101);
  assert.deepEqual(skips,[0,100]);
});
test('ticket adapter propagates 401 and rejects repeated/invalid pages', async () => {
  const unauthorized = load('../src/services/ticketService.ts', {axiosClient:{get:async()=>{throw Object.assign(new Error('Unauthorized'),{status:401});}}});
  await assert.rejects(unauthorized.ticketService.getAllTickets(), /Unauthorized/);
  const repeated = load('../src/services/ticketService.ts', {axiosClient:{get:async()=>({data:{data:Array.from({length:100},()=>({id:'same'}))}})}});
  await assert.rejects(repeated.ticketService.getAllTickets(), /không đồng bộ/);
});
