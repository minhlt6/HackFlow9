import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../src/utils/topicAvailability.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
new Function('exports',compiled)(exports);
const {topicUnavailableReason}=exports;
const available={is_active:true,remaining_slots:2,subtopics:[]};
test('closed windows, parent capacity and inactive branches are not selectable',()=>{
  assert.equal(topicUnavailableReason(available),null);
  assert.ok(topicUnavailableReason({...available,can_select:false,unavailable_reason:'Chưa mở'}));
  assert.ok(topicUnavailableReason({...available,remaining_slots:0}));
  assert.ok(topicUnavailableReason(available,{is_active:false,remaining_slots:2}));
  assert.ok(topicUnavailableReason(available,{is_active:true,remaining_slots:0}));
});
test('a parent with no selectable branches is blocked without blocking a valid sibling',()=>{
  const inactive={id:'off',is_active:false,remaining_slots:2};
  const active={id:'on',is_active:true,remaining_slots:2};
  assert.ok(topicUnavailableReason({...available,subtopics:[inactive]}));
  const parent={...available,subtopics:[inactive,active]};
  assert.equal(topicUnavailableReason(parent),null);
  assert.equal(topicUnavailableReason(parent,active),null);
  assert.ok(topicUnavailableReason(parent,inactive));
});
test('closed-selection API errors retain the actual server explanation',()=>{
  const output=ts.transpileModule(readFileSync(new URL('../src/api/topicsApi.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const api={};
  new Function('require','exports',output)(()=>({axiosClient:{}}),api);
  assert.equal(api.extractApiErrorMessage({response:{status:409,data:{error_code:'TOPIC_SELECTION_CLOSED',message:'Đề tài nhánh đang ngừng hoạt động.'}}},'Default'),'Đề tài nhánh đang ngừng hoạt động.');
});
