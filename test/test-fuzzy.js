// test-fuzzy.js — 模糊路名比對測試
import { similarity, fuzzyTop, coreName } from '../src/fuzzy.js';
import assert from 'node:assert';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ok ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); }
}

// coreName
t('coreName 去段', () => assert.equal(coreName('中山北路1段'), '中山北'));
t('coreName 無段', () => assert.equal(coreName('中崙路'), '中崙'));
t('coreName 街', () => assert.equal(coreName('金山街'), '金山'));

// similarity 分層
t('完整前綴=100', () => assert.equal(similarity('中山北路1段', '中山北路1段'), 100));
t('前綴=100', () => assert.ok(similarity('中山北', '中山北路1段') === 100));
t('中段含於=90', () => assert.ok(similarity('山北', '中山北路1段') === 90));
t('核心前綴', () => assert.ok(similarity('中山', '中山北路1段') > 80));
t('中段連續命中 山北路→中山北路1段=90', () => {
  assert.equal(similarity('山北路', '中山北路1段'), 90);
});
t('真正子序列 中北路→中山北路1段', () => {
  const s = similarity('中北路', '中山北路1段');
  assert.ok(s >= 50 && s < 90, `got ${s}`);
});
t('錯字 中上北路→中山北路1段(編輯距離1)', () => {
  const s = similarity('中上北路', '中山北路1段');
  assert.ok(s > 0 && s < 50, `got ${s}`);
});
t('錯字 新升南路→新生南路1段', () => {
  const s = similarity('新升南路', '新生南路1段');
  assert.ok(s > 0, `got ${s}`);
});
t('臺台容錯', () => assert.equal(similarity('台灣大學', '臺灣大學'), 100));
t('完全無關=0', () => assert.equal(similarity('南京東路', '八德路4段'), 0));

// fuzzyTop 排序
const roads = ['中山北路1段', '中山北路2段', '中山南路', '內湖路1段', '成功路2段', '中崙路'];
t('top1: 中山北→中山北路1段', () => {
  const top = fuzzyTop(roads, '中山北', 3);
  assert.equal(roads[top[0][0]], '中山北路1段');
  assert.equal(roads[top[1][0]], '中山北路2段');
});
t('top: 成功→成功路2段', () => {
  const top = fuzzyTop(roads, '成功', 1);
  assert.equal(roads[top[0][0]], '成功路2段');
});
t('無關路名回空', () => {
  const top = fuzzyTop(roads, '南京東路', 3);
  assert.equal(top.length, 0);
});
t('錯字仍可召回', () => {
  const top = fuzzyTop(roads, '中上北路', 3);
  assert.ok(top.length > 0);
  assert.equal(roads[top[0][0]], '中山北路1段');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
