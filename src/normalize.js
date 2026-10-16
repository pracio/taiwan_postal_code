// normalize.js — 地址正規化：繁簡、全形、中文數字、臺/台
//
// 輸入可能是隨手打的地址，輸出結構化的查詢意圖：
//   { city, district, road, lane, alley, number, floor }
// 全部為數字或正規化字串，供 zip3 定位與區間比對用。

const CN_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const UNIT = { 十: 10, 百: 100, 千: 1000 };

/** 中文數字 → 阿拉伯數字。支援 一二三 / 十五 / 二十三 / 一百零五 等常見寫法 */
export function cnNumberToInt(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0, current = 0;
  for (const ch of s) {
    if (ch in CN_DIGITS) {
      current = CN_DIGITS[ch];
    } else if (ch in UNIT) {
      const unit = UNIT[ch];
      total += (current === 0 ? 1 : current) * unit;
      current = 0;
    } else {
      return NaN; // 不是純數字
    }
  }
  return total + current;
}

/** 全形 → 半形；路名臺/台雙寫由 matcher 容錯（資料用臺，使用者常打台） */
function basicNormalize(s) {
  return s
    .replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\uFF0C\u3001]/g, ',')
    .replace(/\s+/g, '');
}

/** 「2」or「二」後面接的單位 → 段/巷/弄 號 樓 */
/** 解析 ...路[N段][N巷][N弄][N之M號][N樓] */
function parseSegments(s) {
  // 統一：中文數字轉阿拉伯（只在「數字+單位」語境）
  s = s.replace(/([零一二兩三四五六七八九十百千]+)(?=[段巷弄號樓])/g, (m) => String(cnNumberToInt(m)));
  const seg = {
    road: '', section: 0, lane: 0, alley: 0, number: 0, sub: 0, floor: 0, trail: '',
  };

  // 依序切：...路/街/道 [N段] [N巷] [N弄] [N之M號] [N樓] [其餘]
  const m = s.match(
    /^(.*?[路街道])?(?:(\d+)段)?(?:(\d+)巷)?(?:(\d+)弄)?(?:(\d+)(?:之(\d+))?號?)?(?:(\d+)樓)?(.*)$/,
  );
  if (m) {
    seg.road = m[1] || '';
    seg.section = m[2] ? parseInt(m[2], 10) : 0; // 「段」：資料中路名自帶「X段」
    seg.lane = m[3] ? parseInt(m[3], 10) : 0;
    seg.alley = m[4] ? parseInt(m[4], 10) : 0;
    seg.number = m[5] ? parseInt(m[5], 10) : 0;
    seg.sub = m[6] ? parseInt(m[6], 10) : 0;
    seg.floor = m[7] ? parseInt(m[7], 10) : 0;
    seg.trail = m[8] || '';
    // 資料庫路名含「N段」（如 八德路1段），把它併回路名
    if (seg.section > 0) {
      seg.road += `${seg.section}段`;
    }
    // 路名可能還吃掉了巷弄前的字，例如「凱達格蘭大道」無段。若 road 結尾不是路街道，保留 trail
    if (seg.trail && !seg.road) {
      seg.road = seg.trail;
      seg.trail = '';
    }
  }
  return seg;
}

/**
 * 主入口：地址字串 → { city, district, seg }
 * city/district 是去除「市縣區鄉鎮」後的比對字串（如 台北/中正）。
 */
export function parseAddress(raw) {
  const s = basicNormalize(raw);
  const cityMatch = s.match(/^(.{1,3}?[市縣])/);
  const city = cityMatch ? cityMatch[1] : '';
  const districtMatch = s.match(/[市縣](.{1,4}?[區鄉鎮市])/);
  const district = districtMatch ? districtMatch[1] : '';
  const rest = city && district
    ? s.slice(city.length + district.length)
    : s;
  const seg = parseSegments(rest);
  return { raw: s, city, district, seg };
}

/** 比對用：把路名正規化（去「之N」、統一連字） */
export function normalizeRoadName(name) {
  return name.replace(/\s+/g, '');
}
