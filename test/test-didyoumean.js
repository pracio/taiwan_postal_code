// test-didyoumean.js — 「你是不是想找」端到端：建議產生 + 點擊重組
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
const { queryDistrict, bestFuzzyRoad } = await import('../src/matcher.js');
import assert from 'node:assert';

// 與 app.js 相同的尾段抽取邏輯（抽出測）
function tailAfterRoad(raw, road) {
  if (!road) return '';
  const i = raw.indexOf(road);
  if (i < 0) {
    const m = raw.match(/[路街道](?:\d+段)?((?:\d+巷)?(?:\d+弄)?(?:\d+(?:之\d+)?號?)?(?:\d+樓)?.*)$/);
    return m ? m[1] : '';
  }
  return raw.slice(i + road.length);
}

async function analyze(addr) {
  const parsed = parseAddress(addr);
  const districts = await findDistricts(parsed.city, parsed.district);
  const d = districts[0];
  const exact = await queryDistrict(d.zip3, parsed.seg.road, parsed.seg);
  if (exact.length) return { suggest: null, parsed, d };
  const cand = await bestFuzzyRoad(d.zip3, parsed.seg.road);
  const suggest = cand && cand.similarity < 95
    ? { city: d.city, district: d.district, road: cand.road, sim: cand.similarity }
    : null;
  const rawRest = parsed.raw.slice((parsed.city + parsed.district).length);
  const tail = tailAfterRoad(rawRest, parsed.seg.road);
  const rebuilt = suggest ? `${suggest.city}${suggest.district}${suggest.road}${tail}` : null;
  return { suggest, parsed, d, tail, rebuilt };
}

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

await t('錯字「中上北路12號」→ 建議中山北路，重組保留12號', async () => {
  const r = await analyze('台北市中正區中上北路12號');
  assert.ok(r.suggest, 'should suggest');
  assert.ok(r.suggest.road.startsWith('中山北路'), `got ${r.suggest.road}`);
  assert.ok(r.tail.includes('12'), `tail=${r.tail}`);
  // 重組後應可精確查詢
  const p2 = parseAddress(r.rebuilt);
  const d2 = await findDistricts(p2.city, p2.district);
  const hits = await queryDistrict(d2[0].zip3, p2.seg.road, p2.seg);
  assert.ok(hits.length > 0, 'rebuilt query should hit exactly');
  console.log(`      → ${r.rebuilt} → ${hits[0].zip6}`);
});

await t('錯字「新升南路5號」→ 建議新生南路1段，保留5號', async () => {
  const r = await analyze('台北市大安區新升南路5號');
  assert.ok(r.suggest, 'should suggest');
  assert.ok(r.suggest.road.startsWith('新生南路'), `got ${r.suggest.road}`);
  assert.ok(r.tail.includes('5'), `tail=${r.tail}`);
});

await t('純前綴「中山北」→ 不建議（sim=100 前綴層）', async () => {
  const r = await analyze('台北市中正區中山北路');
  // 前綴層 sim=100 → 不顯示建議（它不是錯字，就是打短了）
  assert.equal(r.suggest, null);
});

await t('精確輸入不觸發建議（總統府）', async () => {
  const r = await analyze('台北市中正區重慶南路一段122號');
  assert.equal(r.suggest, null);
});

await t('巷弄號一併保留「中上北路95巷3號5樓」', async () => {
  const r = await analyze('台北市中正區中上北路95巷3號5樓');
  assert.ok(r.suggest, 'should suggest');
  assert.ok(r.tail.includes('95') && r.tail.includes('3'), `tail=${r.tail}`);
  if (r.rebuilt) {
    const p2 = parseAddress(r.rebuilt);
    assert.equal(p2.seg.lane, 95);
    assert.equal(p2.seg.number, 3);
    assert.equal(p2.seg.floor, 5);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
