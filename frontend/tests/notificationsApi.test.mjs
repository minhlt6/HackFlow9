import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadApi(client) {
  const source = readFileSync(new URL('../src/api/notificationsApi.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(() => ({ axiosClient: client }), exports);
  return exports;
}

test('audiences survive list/create/update responses with the same adapter', async () => {
  const item = { id: 'notice-1', target_audience: 'judge', title: 'Judge only' };
  const { notificationsApi } = loadApi({
    get: async () => ({ data: { data: { items: [item], total: 1, page: 1 } } }),
    post: async () => ({ data: { data: item } }),
    put: async () => ({ data: { data: item } }),
  });
  assert.equal((await notificationsApi.listAnnouncements()).items[0].targetRole, 'judges');
  assert.equal((await notificationsApi.createAnnouncement({})).targetRole, 'judges');
  assert.equal((await notificationsApi.updateAnnouncement('notice-1', {})).targetRole, 'judges');
});

test('dashboard loading follows every page instead of discarding the pagination envelope', async () => {
  const pages = [];
  const { notificationsApi } = loadApi({ get: async (_url, options) => {
    const page = options.params.page;
    pages.push(page);
    const items = page === 1
      ? Array.from({ length: 100 }, (_, i) => ({ id: `notice-${i}`, target_audience: 'candidate' }))
      : [{ id: 'notice-100', target_audience: 'candidate' }];
    return { data: { data: { items, total: 101 } } };
  } });
  const result = await notificationsApi.listAllAnnouncements();
  assert.equal(result.length, 101);
  assert.equal(result.at(-1).targetRole, 'candidates');
  assert.deepEqual(pages, [1, 2]);
});

test('invalid or incomplete page responses fail explicitly', async () => {
  const invalid = loadApi({ get: async () => ({ data: { data: [] } }) }).notificationsApi;
  await assert.rejects(invalid.listAnnouncements());
  const repeated = loadApi({ get: async () => ({ data: { data: { items: [], total: 2 } } }) }).notificationsApi;
  await assert.rejects(repeated.listAllAnnouncements());
});
