// test-matcher.js — Node 下測試區間比對（載真實 zipkit 資料）
import { rangeMatches } from '../src/matcher.js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert';

const ranges = JSON.parse(readFileSync(new URL('../data/zip-ranges/100.json', import.meta.url), 'utf8')).ranges;

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

// 找三元街的區間做測試
const sanyuan = ranges.filter((r) => r.road === '三元街');
t('三元街有區間資料', () => assert.ok(sanyuan.length >= 2));

// odd segment 1-147
const oddLow = sanyuan.find((r) => r.even === 1 && r.numStart === 1 && r.numEnd === 147);
const oddHigh = sanyuan.find((r) => r.even === 1 && r.numStart === 149);
const evenAll = sanyuan.find((r) => r.even === 2 && r.numStart === 2);

t('找到三元街單雙號區間', () => {
  assert.ok(oddLow, 'odd 1-147');
  assert.ok(oddHigh, 'odd 149+');
  assert.ok(evenAll, 'even 2+');
});

t('三元街5號→低段單號', () => {
  assert.ok(rangeMatches(oddLow, { lane: 0, alley: 0, number: 5, floor: 0 }));
  assert.ok(!rangeMatches(oddHigh, { lane: 0, alley: 0, number: 5, floor: 0 }));
});
t('三元街200號→雙號 172-9998', () => {
  const evenHigh = sanyuan.find((r) => r.even === 2 && r.numStart === 172);
  assert.ok(evenHigh, 'even 172+ range');
  assert.ok(rangeMatches(evenHigh, { lane: 0, alley: 0, number: 200, floor: 0 }));
});
t('巷約束：中華路2段303-305巷（lane1 表上限）', () => {
  const laneR = ranges.find((r) => r.road === '中華路2段' && r.lane === 303 && r.lane1 === 305);
  assert.ok(laneR, 'lane 303-305 range exists');
  assert.ok(rangeMatches(laneR, { lane: 303, alley: 0, number: 5, floor: 0 }));
  assert.ok(rangeMatches(laneR, { lane: 305, alley: 0, number: 5, floor: 0 }));
  assert.ok(!rangeMatches(laneR, { lane: 307, alley: 0, number: 5, floor: 0 }));
});
t('樓層約束：牯嶺街95巷1-7號1樓', () => {
  const fl = ranges.find((r) => r.road === '牯嶺街' && r.floorStart === 1);
  assert.ok(fl, 'floor range exists');
  assert.ok(rangeMatches(fl, { lane: 95, alley: 0, number: 3, floor: 1 }));
  assert.ok(!rangeMatches(fl, { lane: 95, alley: 0, number: 3, floor: 5 }));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
