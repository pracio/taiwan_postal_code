// test-fuzzy-e2e.js — 模糊後備端到端
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const DATA = join(dirname(fileURLToPath(import.meta.url)), '../data');
globalThis.fetch = async (relPath) => {
  const p = join(DATA, relPath.replace(/^\.\.\/data\//, ''));
  try { return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(p, 'utf8')) }; }
  catch { return { ok: false, status: 404 }; }
};
const { parseAddress } = await import('../src/normalize.js');
const { findDistricts } = await import('../src/data.js');
const { queryDistrict, queryDistrictFuzzy } = await import('../src/matcher.js');
import assert from 'node:assert';

async function lookupFuzzy(addr) {
  const p = parseAddress(addr);
  const districts = await findDistricts(p.city, p.district);
  for (const d of districts.slice(0, 3)) {
    const exact = await queryDistrict(d.zip3, p.seg.road, p.seg);
    if (exact.length) return { hits: exact, fuzzy: false };
    const f = await queryDistrictFuzzy(d.zip3, p.seg.road, p.seg, 5);
    if (f.length) return { hits: f, fuzzy: true };
  }
  return { hits: [], fuzzy: false };
}

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

await t('前綴「台北市中正區中山北7號」→ 模糊命中中山北路/南路系', async () => {
  const { hits, fuzzy } = await lookupFuzzy('台北市中正區中山北7號');
  assert.ok(fuzzy, 'should use fuzzy path');
  assert.ok(hits.length > 0);
  console.log(`      → ${hits[0].zip6} ${hits[0].road} (sim=${hits[0].similarity})`);
});
await t('錯字「台北市中正區中上北路」→ 召回中山北路', async () => {
  const { hits, fuzzy } = await lookupFuzzy('台北市中正區中上北路12號');
  assert.ok(hits.length > 0);
  assert.ok(hits.some(h => h.road.startsWith('中山北路')), `got ${hits.map(h=>h.road)}`);
  console.log(`      → ${hits[0].zip6} ${hits[0].road}`);
});
await t('精確路名不受影響（總統府）', async () => {
  const { hits, fuzzy } = await lookupFuzzy('台北市中正區重慶南路一段122號');
  assert.ok(!fuzzy);
  assert.equal(hits[0].zip6, '100006');
});
await t('效能：模糊查詢 < 50ms', async () => {
  const t0 = performance.now();
  await lookupFuzzy('台北市大安區仁愛西路100號');
  const ms = performance.now() - t0;
  assert.ok(ms < 50, `${ms.toFixed(1)}ms`);
  console.log(`      → ${ms.toFixed(1)}ms`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
