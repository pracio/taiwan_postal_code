// test-ground-truth.js — 用已知官方郵編做抽查
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
const { queryDistrict } = await import('../src/matcher.js');
import assert from 'node:assert';

async function lookup(addr) {
  const p = parseAddress(addr);
  const districts = await findDistricts(p.city, p.district);
  for (const d of districts.slice(0, 3)) {
    const hits = await queryDistrict(d.zip3, p.seg.road, p.seg);
    if (hits.length) return hits[0].zip6;
  }
  return null;
}

const TRUTH = [
  // [地址, 官方6碼]
  ['台北市中正區重慶南路一段122號', '100006'], // 總統府
  ['臺北市中正區重慶南路1段122號', '100006'], // 臺寫法
];
let pass = 0, fail = 0;
for (const [addr, want] of TRUTH) {
  const got = await lookup(addr);
  if (got === want) { pass++; console.log(`  ok ${addr} → ${got}`); }
  else { fail++; console.log(`FAIL ${addr}: got ${got}, want ${want}`); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
