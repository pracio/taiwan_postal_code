// test-module-load.js — 用 DOM shim 載入所有模組，抓「頂層 ReferenceError」
// 修 v2.2.0 的 input 未定義迴歸（ESM 頂層錯誤 = 整個 popup 無反應且難察覺）
const el = () => ({
  addEventListener() {}, after() {}, append() {}, remove() {}, focus() {},
  querySelectorAll: () => [], hidden: false,
});
global.document = {
  getElementById: el,
  createElement: () => ({ addEventListener() {}, append() {}, appendChild() {}, classList: { add() {}, remove() {} }, style: {} }),
  querySelector: () => null,
  body: { appendChild() {} },
};
global.window = { open() {} };
global.chrome = {};
global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ cities: [], ranges: [], roads: [] }) });

const mods = ['../src/normalize.js', '../src/data.js', '../src/fuzzy.js', '../src/matcher.js', '../src/app.js'];
for (const m of mods) {
  try {
    await import(m);
    console.log(`  ok ${m}`);
  } catch (e) {
    console.log(`FAIL ${m}: ${e.message}`);
    process.exit(1);
  }
}
console.log('\nall modules load cleanly');
