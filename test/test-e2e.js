// test-e2e.js — 端到端：parseAddress → findDistricts → queryDistrict（Node + 真實資料）
// 模擬瀏覽器 fetch：把 ../data/ 映到 file:// 讀取
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '../data');

globalThis.fetch = async (relPath) => {
  const p = join(DATA, relPath.replace(/^\.\.\/data\//, ''));
  try {
    const text = readFileSync(p, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(text) };
  } catch (e) {
    return { ok: false, status: 404 };
  }
};

const { parseAddress } = await import('../src/normalize.js');
const { findDistricts } = await import('../src/data.js');
const { queryDistrict } = await import('../src/matcher.js');
import assert from 'node:assert';

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

const CASES = [
  // [地址, 期望zip6 前綴（可null=只要有結果）, 期望zip3]
  ['台北市中正區中山南路7號', '100', '100'],   // 總統府
  ['台北市中正區凱達格蘭大道2號', '100', '100'],
  ['台北市大安區仁愛路4段300號', '106', '106'],
  ['台中市西屯區台灣大道三段99號', '407', '407'],
  ['高雄市左營區重和路87號', '813', '813'],
];

for (const [addr, wantPrefix] of CASES) {
  await t(addr, async () => {
    const p = parseAddress(addr);
    assert.ok(p.city && p.district, `parse failed: ${JSON.stringify(p)}`);
    const districts = await findDistricts(p.city, p.district);
    assert.ok(districts.length > 0, 'no district');
    let found = null;
    for (const d of districts.slice(0, 3)) {
      const hits = await queryDistrict(d.zip3, p.seg.road, p.seg);
      if (hits.length) { found = hits[0]; break; }
    }
    assert.ok(found, 'no hit');
    console.log(`      → ${found.zip6} (${found.why})`);
    if (wantPrefix) assert.ok(found.zip6.startsWith(wantPrefix), `want ${wantPrefix}*, got ${found.zip6}`);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
