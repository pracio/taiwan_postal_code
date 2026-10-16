// test-normalize.js — Node 下單元測試 parseAddress（不依賴瀏覽器）
import { parseAddress, cnNumberToInt } from '../src/normalize.js';
import assert from 'node:assert';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

// cnNumberToInt
t('cn 一', () => assert.equal(cnNumberToInt('一'), 1));
t('cn 十五', () => assert.equal(cnNumberToInt('十五'), 15));
t('cn 二十三', () => assert.equal(cnNumberToInt('二十三'), 23));
t('cn 一百零五', () => assert.equal(cnNumberToInt('一百零五'), 105));
t('cn arabic', () => assert.equal(cnNumberToInt('88'), 88));

// parseAddress
t('simple city+district+road+num', () => {
  const p = parseAddress('台北市中正區中山南路7號');
  assert.equal(p.city, '台北市');
  assert.equal(p.district, '中正區');
  assert.equal(p.seg.road, '中山南路');
  assert.equal(p.seg.number, 7);
});
t('臺保留原樣（資料為臺）', () => {
  const p = parseAddress('臺北市大安區仁愛路四段300號');
  assert.ok(p.city === '臺北市' || p.city === '台北市');
  assert.equal(p.seg.road, '仁愛路4段');
  assert.equal(p.seg.number, 300);
});
t('巷弄', () => {
  const p = parseAddress('新竹縣竹東鎮東寧路三段80巷5弄12號');
  assert.equal(p.seg.road, '東寧路3段');
  assert.equal(p.seg.lane, 80);
  assert.equal(p.seg.alley, 5);
  assert.equal(p.seg.number, 12);
});
t('no number', () => {
  const p = parseAddress('台北市中正區凱達格蘭大道');
  assert.equal(p.seg.road, '凱達格蘭大道');
  assert.equal(p.seg.number, 0);
});
t('之號', () => {
  const p = parseAddress('台北市中正區公園路15之2號');
  assert.equal(p.seg.number, 15);
  assert.equal(p.seg.sub, 2);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
