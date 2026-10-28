import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/configForm.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { toLocalDateTime, configDeadlineToISO } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

for (const [zone, local] of [['Asia/Ho_Chi_Minh', '2026-12-31T18:00'], ['UTC', '2026-12-31T11:00']]) {
  test(`deadline round trip preserves the instant and seconds in ${zone}`, () => {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    try {
      const saved = '2026-12-31T11:00:37.123Z';
      assert.equal(toLocalDateTime(saved), local);
      const result = configDeadlineToISO(local, saved);
      assert.equal(result, saved);
      assert.equal(toLocalDateTime(result), local);
      const edited = local.replace(':00', ':15');
      assert.equal(toLocalDateTime(configDeadlineToISO(edited, saved)), edited);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}

test('empty or invalid deadlines cannot produce a successful save', () => {
  assert.equal(toLocalDateTime('invalid'), '');
  assert.throws(() => configDeadlineToISO('', ''));
  assert.throws(() => configDeadlineToISO('invalid', ''));
});
