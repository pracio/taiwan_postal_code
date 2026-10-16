// app.js — popup 主流程：輸入 → parse → 定位 zip3 → 比對區間 → 渲染
import { parseAddress } from './normalize.js';
import { findDistricts, dataStats } from './data.js';
import { queryDistrict, queryDistrictFuzzy, suggestRoads } from './matcher.js';

const $ = (id) => document.getElementById(id);
const input = $('address');
const results = $('results');
const statusEl = $('status');
const emptyHint = $('empty-hint');

function setStatus(msg) {
  statusEl.hidden = !msg;
  statusEl.textContent = msg || '';
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1500);
}

async function copyZip(zip6) {
  try {
    await navigator.clipboard.writeText(zip6);
    toast(`已複製 ${zip6}`);
  } catch {
    toast(zip6);
  }
}

function render(hits, parsed) {
  results.hidden = hits.length === 0;
  results.innerHTML = '';
  for (const h of hits.slice(0, 12)) {
    const card = document.createElement('div');
    card.className = 'result-card';

    const zip = document.createElement('div');
    zip.className = 'zip';
    zip.textContent = h.zip6;

    const meta = document.createElement('div');
    meta.className = 'result-meta';

    const addr = document.createElement('div');
    addr.className = 'result-addr';
    addr.textContent = `${parsed.city}${parsed.district}${h.road}`;

    const why = document.createElement('div');
    why.className = 'result-why' + (h.exact ? ' ok' : '');
    why.textContent = (h.exact ? '✓ ' : '≈ ') + h.why;

    meta.append(addr, why);
    card.append(zip, meta);
    card.addEventListener('click', () => copyZip(h.zip6));
    results.appendChild(card);
  }
  if (hits.length > 12) {
    setStatus(`另有 ${hits.length - 12} 筆近似結果，輸入更完整地址可精確查詢`);
  }
}

let searchSeq = 0;
async function search() {
  const raw = input.value.trim();
  $('clear').hidden = !raw;
  emptyHint.hidden = !!raw;
  if (raw.length < 2) {
    setStatus('');
    render([], {});
    return;
  }
  const seq = ++searchSeq;
  const parsed = parseAddress(raw);
  try {
    const districts = await findDistricts(parsed.city, parsed.district);
    if (seq !== searchSeq) return;
    if (districts.length === 0) {
      setStatus('找不到對應的縣市或鄉鎮市區，請確認地址');
      render([], parsed);
      return;
    }

    const allHits = [];
    const limit = 6; // 最多試 6 個行政區，避免卡頓
    for (const d of districts.slice(0, limit)) {
      let road = parsed.seg.road;
      // 使用者沒打路名時，用建議清單第一位（退化為全區查詢）
      if (!road) {
        const sug = await suggestRoads(d.zip3, '');
        if (sug.length === 0) continue;
      }
      let hits = await queryDistrict(d.zip3, road, parsed.seg);
      // 精確比對落空 → 模糊路名後備（打「中山北」也能命中「中山北路1段」、錯字容錯）
      let fuzzy = false;
      if (hits.length === 0 && road && road.length >= 2) {
        hits = await queryDistrictFuzzy(d.zip3, road, parsed.seg, 5);
        fuzzy = hits.length > 0;
      }
      for (const h of hits) allHits.push({ ...h, _district: d, _fuzzy: fuzzy });
    }
    if (seq !== searchSeq) return;

    if (allHits.length === 0) {
      // 退化：只比對行政區，給 3 碼
      const seen = new Set();
      const three = [];
      for (const d of districts) {
        if (seen.has(d.zip3)) continue;
        seen.add(d.zip3);
        three.push({
          zip6: d.zip3 + '000',
          road: d.district,
          why: `${d.city}${d.district}（行政區 3 碼，輸入路名可查到 6 碼）`,
          exact: false,
        });
      }
      setStatus('查無精確 6 碼，以下為行政區 3 碼');
      render(three, parsed);
      return;
    }
    setStatus('');
    render(allHits, parsed);
  } catch (err) {
    if (seq !== searchSeq) return;
    setStatus(`查詢失敗：${err.message}`);
  }
}

// 事件
let debTimer = null;
input.addEventListener('input', () => {
  clearTimeout(debTimer);
  debTimer = setTimeout(search, 200);
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { clearTimeout(debTimer); search(); }
});
$('clear').addEventListener('click', () => {
  input.value = '';
  input.focus();
  search();
});
$('github').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs?.create?.({ url: e.currentTarget.href }) ?? window.open(e.currentTarget.href, '_blank');
});

// 範例可點
for (const li of emptyHint.querySelectorAll('li')) {
  li.addEventListener('click', () => {
    input.value = li.textContent;
    search();
  });
}

// init
dataStats().then((s) => {
  $('db-info').textContent = `資料：中華郵政 3+3（${s.cities} 縣市 / ${s.districts} 鄉鎮市區）· 點結果可複製`;
});
input.focus();
