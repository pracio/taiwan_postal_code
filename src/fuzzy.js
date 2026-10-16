// fuzzy.js — 路名模糊比對：前綴 > 子序列(連續性加權) > 有界編輯距離
// 字典只有該區的路名（數百條），O(n·L²) 足夠快，無需外部庫。

function lev(a, b, max = 2) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[n];
}

function subsequenceRuns(query, road) {
  let i = 0, runs = 0, prev = -2;
  for (let j = 0; j < road.length && i < query.length; j++) {
    if (road[j] === query[i]) {
      if (j !== prev + 1) runs++;
      prev = j; i++;
    }
  }
  return i === query.length ? runs : null;
}

/** 「中山北路1段」→「中山北」（去段號與路/街/道尾） */
export function coreName(name) {
  return (name || '').replace(/\d+段$/, '').replace(/[路街道]$/, '');
}

const canon = (s) => (s || '').replace(/臺/g, '台');

/**
 * 回傳 0–100 相似分；0 表不比對。
 * 層級：完整前綴 100 > 含於路名 90 > 核心名前綴 95/85 > 子序列 50–70 > 編輯距離≤2 20–45
 */
export function similarity(query, road) {
  const q = canon(query), r = canon(road);
  if (!q) return 0;
  const qi = r.indexOf(q);
  if (qi === 0) return 100;
  if (qi > 0) return 90;
  const qc = coreName(q), rc = coreName(r);
  if (qc && rc) {
    const ci = rc.indexOf(qc);
    if (ci === 0) return 95;
    if (ci > 0) return 85;
    const runs = subsequenceRuns(qc, rc);
    if (runs !== null) return Math.max(50, 70 - runs * 5);
    const d = lev(qc, rc, 2);
    if (d <= 2) return Math.max(20, 45 - d * 12);
  }
  return 0;
}

/** 路名清單中取出 top-N（分數 > 0，同分保原序） */
export function fuzzyTop(roads, query, n = 5) {
  const scored = [];
  for (let i = 0; i < roads.length; i++) {
    const s = similarity(query, roads[i]);
    if (s > 0) scored.push([i, s]);
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return scored.slice(0, n);
}
