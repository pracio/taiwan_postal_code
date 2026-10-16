# 郵查 3+3 (Taiwan Postal Code)

台灣 3+3 郵遞區號快速查詢 Chrome 擴充套件（離線）。

## 特色

- **3+3 六碼郵遞區號**：依中華郵政投遞區間規則精確比對（單雙號、巷弄、號起訖、樓層）
- **離線查詢**：資料內建，不需網路
- **容錯輸入**：支援中文數字（一段→1段）、全形數字、臺/台、街/路
- **點擊複製**：查詢結果點一下即複製郵遞區號
- **深色模式**：跟隨系統

## 安裝（開發者模式）

1. 下載本 repo（Code → Download ZIP → 解壓）
2. Chrome 開啟 `chrome://extensions/`
3. 右上角開啟「開發人員模式」
4. 「載入未封裝項目」→ 選擇本資料夾

## 資料

- 來源：[中華郵政 3+3 郵遞區號](https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306)
  經 [ronload/zipkit](https://github.com/ronload/zipkit)（MIT）ETL 轉為靜態 JSON
- 22 縣市 / 371 鄉鎮市區 / 42,553 路街 / 77,462 投遞區間
- 授權：政府資料開放授權條款-第1版

## 架構

```
manifest.json      Manifest V3
src/
  popup.html/css   UI
  app.js           主流程（防抖即時查詢）
  normalize.js     地址解析（中文數字/全形/臺台）
  data.js          分層載入：base → roads/{zip3} → zip-ranges/{zip3}
  matcher.js       投遞區間比對（specificity 排序）
data/
  base.json        縣市/鄉鎮/zip3 索引 (24K)
  roads/           各區路街中英名（按需載入）
  zip-ranges/      各區郵遞區間規則（按需載入）
test/              Node 單元 + 端到端測試
```

測試：`node test/test-normalize.js && node test/test-matcher.js && node test/test-e2e.js && node test/test-ground-truth.js`

## 作者

Poan Shen · [2013 年初版](https://github.com/pracio/taiwan_postal_code/tree/8d6b1ee)（3+2 時代）
