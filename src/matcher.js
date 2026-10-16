// matcher.js — 郵遞區號區間比對
//
// 資料模型（每個 zip3 一份 ranges）：
//   { road, zip6, even, lane, lane1, alley, alley1,
//     numStart, numStart1, numEnd, numEnd1, floorStart, floorEnd }
//   even: 0=不限 1=單號 2=雙號
//   lane/alley = 0 表不限（整條路）；numEnd=0 表「至路底」
//   numStart1/numEnd1：之N 的 N（含 15之2 起 / 至 143之3）

import { loadZipRanges, loadRoads } from './data.js';

const PINYIN_TOL = 0; // 預留

/** 判斷 number 是否符合 even 約束 */
function evenOk(even, num) {
  if (even === 0 || num === 0) return true;
  if (even === 1) return num % 2 === 1;
  return num % 2 === 0;
}

/**
 * 單條 range 是否命中 seg。
 * seg: { lane, alley, number, floor }
 */
export function rangeMatches(range, seg) {
  // 巷
  if (range.lane !== 0) {
    if (seg.lane < range.lane) return false;
    if (range.lane1 !== 0 && seg.lane > range.lane1) return false;
  } else if (seg.lane !== 0 && rangeHasLaneScope(range)) {
    // 此 range 針對特定巷，使用者沒給巷 → 視為不命中（除非有全路 range）
  }

  // 弄
  if (range.alley !== 0) {
    if (seg.alley < range.alley) return false;
    if (range.alley1 !== 0 && seg.alley > range.alley1) return false;
  } else if (seg.alley !== 0 && range.lane !== 0 && range.alley === 0) {
    // 巷之下所有弄 → 命中（之後的單號判斷照走）
  }

  // 號
  if (seg.number > 0) {
    if (!evenOk(range.even, seg.number)) return false;
    if (range.numStart !== 0 && seg.number < range.numStart) return false;
    if (range.numEnd !== 0 && range.numEnd !== 9998 && range.numEnd !== 9999 && seg.number > range.numEnd) return false;
    if (range.numEnd === 9998 || range.numEnd === 9999) {
      // 「至路底」：numStart 之後全部
    }
    if (range.numStart1 !== 0 && seg.number === range.numStart && (seg.sub || 0) < range.numStart1) return false;
    if (range.numEnd1 !== 0 && seg.number === range.numEnd && (seg.sub || 0) > range.numEnd1) return false;
  }

  // 樓（僅少數資料有）
  if (seg.floor > 0) {
    if (range.floorStart !== 0 && seg.floor < range.floorStart) return false;
    if (range.floorEnd !== 0 && seg.floor > range.floorEnd) return false;
  }
  return true;
}

function rangeHasLaneScope(range) {
  return false; // 資料中 lane=0 表全路，不存在「排他」語境，保留以利閱讀
}

/**
 * 在一個 zip3 內查詢。
 * 回傳 [{zip6, road, why}]，按「條件越具體越準」排序。
 * 排序原則：單/雙號區間 > 無奇偶限制的兜底區間（資料中 even=0 的「N–路底」
 * 是「以上全部」的 fallback，精確度低於 even 區間）。
 */
export async function queryDistrict(zip3, roadName, seg) {
  const ranges = await loadZipRanges(zip3);
  const target = stripRoad(roadName);
  const hits = [];
  for (const r of ranges) {
    if (!roadFuzzyEq(stripRoad(r.road), target)) continue;
    if (!rangeMatches(r, seg)) continue;
    hits.push({
      zip6: r.zip6,
      road: r.road,
      why: describeWhy(r, seg),
      exact: isExact(r, seg),
      _specificity: specificity(r, seg),
    });
  }
  hits.sort((a, b) => (b._specificity - a._specificity) || (scoreHit(b) - scoreHit(a)));
  return hits;
}

/** even 有約束 > 有號碼上下限 > 只有下限（至路底） */
function specificity(r, seg) {
  let s = 0;
  if (r.even !== 0 && seg.number > 0) s += 4;
  if (r.numStart !== 0 && r.numEnd !== 0) s += 3;
  else if (r.numStart !== 0 && r.numEnd === 0) s += 1; // N–路底 fallback
  if (r.lane !== 0) s += 2; // 巷級區間比全路具體
  if (r.alley !== 0) s += 1;
  return s;
}

function scoreHit(h) {
  return h.exact ? 2 : 1;
}

function isExact(range, seg) {
  return seg.number > 0 && (range.numStart !== 0 || range.numEnd !== 0 || range.even !== 0);
}

function stripRoad(name) {
  return (name || '').replace(/街路/g, '路'); // 預留
}

/** 臺/台、街/路 容錯比對 */
function roadFuzzyEq(a, b) {
  if (a === b) return true;
  const canon = (s) => (s || '').replace(/臺/g, '台').replace(/街路/g, '路');
  return canon(a) === canon(b);
}

function describeWhy(r, seg) {
  const parts = [r.road];
  if (r.lane) parts.push(`${r.lane}${r.lane1 ? `–${r.lane1}` : ''}巷`);
  if (r.alley) parts.push(`${r.alley}${r.alley1 ? `–${r.alley1}` : ''}弄`);
  if (r.numStart || r.numEnd) {
    const s = r.numStart || '';
    const e = r.numEnd ? r.numEnd : '路底';
    const s1 = r.numStart1 ? `之${r.numStart1}` : '';
    const e1 = r.numEnd1 ? `之${r.numEnd1}` : '';
    parts.push(`${s}${s1}–${e}${e1}號`);
  }
  if (r.even === 1) parts.push('單號');
  if (r.even === 2) parts.push('雙號');
  return parts.join(' ');
}

/**
 * 模糊搜路名：回傳該 zip3 內所有以 target 為前綴（或包含）的路名。
 */
export async function suggestRoads(zip3, target) {
  const roads = await loadRoads(zip3);
  const t = (target || '').trim();
  if (!t) return roads.slice(0, 20).map((r) => r.name);
  const lower = t;
  const starts = [], contains = [];
  for (const r of roads) {
    if (r.name.startsWith(lower)) starts.push(r.name);
    else if (r.name.includes(lower)) contains.push(r.name);
  }
  return [...starts, ...contains].slice(0, 20);
}
