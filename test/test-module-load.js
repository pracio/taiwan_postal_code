// test-module-load.js — 用 DOM shim 載入所有模組，抓「頂層 ReferenceError」
// 修 v2.2.0 的 input 未定義迴歸（ESM 頂層錯誤 = 整個 popup 無反應且難察覺）
// v2.2.2 加強：記錄 shim 元素設定的屬性，斷言渲染文字非 undefined——
// 抓 v2.2.1 的 didYouMean.label（欄位不存在 → 按鈕空白）這類「顯示 undefined/空字串」錯誤。
const created = [];
const el = () => ({
  addEventListener() {}, after() {}, append(...nodes) {}, remove() {}, focus() {},
  querySelectorAll: () => [], hidden: false,
  appendChild() {},
});
global.document = {
  getElementById: el,
  createElement: () => {
    const e = {
      addEventListener() {}, append() {}, appendChild() {},
      classList: { add() {}, remove() {} }, style: {},
      _text: '',
    };
    Object.defineProperty(e, 'textContent', {
      get() { return this._text; },
      set(v) {
        this._text = v;
        if (String(v).includes('undefined')) {
          console.log(`FAIL: textContent set to undefined-containing value: "${v}"`);
          process.exit(1);
        }
      },
    });
    created.push(e);
    return e;
  },
  getElementById: el,
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
