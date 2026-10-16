// data.js — 資料載入層：base.json（縣市/鄉鎮/zip3）→ roads/{zip3}.json → zip-ranges/{zip3}.json
// 全部離線，fetch 相對路徑（popup 內 = 擴充套件包內）。

let basePromise = null;

export function loadBase() {
  if (!basePromise) {
    basePromise = fetch('../data/base.json').then((r) => {
      if (!r.ok) throw new Error(`base.json ${r.status}`);
      return r.json();
    });
  }
  return basePromise;
}

export async function loadRoads(zip3) {
  const r = await fetch(`../data/roads/${zip3}.json`);
  if (!r.ok) throw new Error(`roads/${zip3} ${r.status}`);
  return (await r.json()).roads; // [{name, en}]
}

export async function loadZipRanges(zip3) {
  const r = await fetch(`../data/zip-ranges/${zip3}.json`);
  if (!r.ok) throw new Error(`zip-ranges/${zip3} ${r.status}`);
  return (await r.json()).ranges; // [{road, zip6, even, lane, ..., numStart, ...}]
}

/**
 * 依輸入的 city/district 名稱找出候選 zip3。
 * 容錯：使用者可能打「台北」vs 資料「臺北市」、「台中」vs「臺中市」。
 * 回傳 [{city, district, zip3}]，依名稱相似度排序。
 */
export async function findDistricts(cityName, districtName) {
  const base = await loadBase();
  const norm = (s) => (s || '').replace(/^台/, '臺').replace(/[市縣]$/, '');
  const wantCity = norm(cityName);
  const wantDist = norm(districtName).replace(/[區鄉鎮市]$/, '');

  const hits = [];
  for (const city of base.cities) {
    const cn = norm(city.name);
    const cityOk = !wantCity || cn.startsWith(wantCity) || wantCity.startsWith(cn.slice(0, wantCity.length));
    for (const d of city.districts) {
      const dn = d.name.replace(/[區鄉鎮市]$/, '');
      const distOk = !wantDist || dn.startsWith(wantDist) || wantDist.startsWith(dn);
      if (cityOk && distOk) {
        hits.push({ city: city.name, district: d.name, zip3: d.zip3 });
      }
    }
  }
  // 沒指定行政區時放寬：只要 city 對
  if (hits.length === 0 && wantCity) {
    for (const city of base.cities) {
      const cn = norm(city.name);
      if (cn.startsWith(wantCity) || wantCity.startsWith(cn.slice(0, 2))) {
        for (const d of city.districts) hits.push({ city: city.name, district: d.name, zip3: d.zip3 });
      }
    }
  }
  return hits;
}

/** 全部郵遞區號筆數（顯示在 footer） */
export async function dataStats() {
  const base = await loadBase();
  const districts = base.cities.reduce((n, c) => n + c.districts.length, 0);
  return { cities: base.cities.length, districts };
}
