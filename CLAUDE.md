# 鑑源網頁製作

## 專案簡介
鑑源命理平台（jianyuan.life）前端網頁開發專案。
Next.js 14 App Router + Tailwind CSS + Supabase + Stripe + Vercel 部署。

**網站版本：** v4.5.4（2026-04-09 G15 導入模式 + E2 出門訣聚焦 + G15 prompt 精簡 + OG 分享圖）
**線上網址：** https://jianyuan.life
**Vercel 專案：** fortune-reports（對應 backup901012-stack/qimen-chumenji）

## 溝通語言
- 一律使用**繁體中文**溝通、討論、說明

## 技術棧

| 層級 | 工具 |
|:---|:---|
| 框架 | Next.js 14 (App Router) |
| 樣式 | Tailwind CSS |
| 資料庫 | Supabase (PostgreSQL) |
| 付款 | Stripe |
| 部署 | Vercel |
| 地理編碼 | Nominatim (OpenStreetMap) |
| 國際化 | opencc-js (繁簡轉換) |

## 目錄結構

```
├── app/
│   ├── page.tsx              # 首頁
│   ├── layout.tsx            # 全站 Layout（Navbar、Footer）
│   ├── globals.css           # 全站樣式
│   ├── pricing/page.tsx      # 定價頁
│   ├── checkout/page.tsx     # 結帳頁（含城市搜尋+座標）
│   ├── dashboard/page.tsx    # 客戶儀表板
│   ├── admin/page.tsx        # 後台管理（ADMIN_KEY保護）
│   ├── report/[token]/       # 報告閱讀頁
│   ├── tools/bazi/           # 免費八字工具
│   ├── auth/                 # 登入/註冊/回調
│   ├── privacy/              # 隱私政策
│   ├── terms/                # 服務條款
│   └── api/
│       ├── checkout/         # Stripe 結帳 Session
│       ├── webhook/stripe/   # Stripe Webhook
│       ├── track/            # 訪客地理追蹤（CF-IPCountry）
│       ├── admin/            # 後台 API
│       ├── free-bazi/        # 免費八字 API
│       ├── generate-report/  # 報告生成 API
│       └── reports/          # 報告查詢 API
├── components/
│   ├── Navbar.tsx            # 導航列
│   ├── Tracker.tsx           # 地理追蹤 pixel
│   ├── PricingCards.tsx      # 定價卡片
│   ├── PriceTag.tsx          # 價格標籤（多幣種）
│   ├── LocaleContent.tsx     # 繁簡切換內容
│   └── LocaleSwitcher.tsx    # 繁簡切換按鈕
└── lib/
    ├── brand.ts              # 品牌常數（網站名/信箱）
    ├── i18n.ts               # 國際化（繁簡體）
    ├── currency.ts           # 幣種換算（USD/HKD/TWD/CNY）
    ├── cities.ts             # 城市搜尋+Nominatim 地理編碼
    ├── supabase.ts           # Supabase 客戶端
    └── api.ts                # 內部 API 工具函式
```

## 環境變數（Vercel 上設定）

| 變數名 | 說明 |
|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務角色金鑰 |
| `STRIPE_SECRET_KEY` | Stripe 密鑰（測試/正式） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開金鑰 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 簽名密鑰 |
| `ADMIN_KEY` | 後台管理密碼（asd566123，用 printf 設定） |
| `PYTHON_API_URL` | Python 排盤 API 位址 |

## 部署指令

```bash
# 本地開發
cd Claude-鑑源網頁製作
npm install
npm run dev    # http://localhost:3000

# 推送到 GitHub（自動觸發 Vercel 部署）
git add -A
git commit -m "說明"
git push origin main
```

**GitHub Repo：** `jianyuan-life/web`
**推送方式：** `https://jianyuan-life/web (token 存於本地).git`

## 重要設計決策

### 地理追蹤
- 使用 `CF-IPCountry` header（Cloudflare 代理後的真實國家）
- 不用 `x-forwarded-for`（會誤標 Cloudflare IP 為美國）

### 後台管理密碼
- Vercel 環境變數 `ADMIN_KEY` 必須用 `printf` 設定，**不能用 echo**（echo 會加換行符導致驗證失敗）

### 出生城市欄位
- 結帳頁有城市搜尋（Nominatim geocoding）
- lat/lng 需要傳給 Python API 做真太陽時校正（待辦）

## 環境變數完整清單（2026-04-03 全部到位）

| 變數名 | 說明 | 狀態 |
|:---|:---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰（前端用）| ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務角色金鑰（伺服器端）| ✅ sb_secret_cRI-P... |
| `STRIPE_SECRET_KEY` | Stripe 密鑰（目前測試模式）| ✅ sk_test_... |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 簽名密鑰 | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek AI API 金鑰 | ✅ |
| `NEXT_PUBLIC_API_URL` | Python 排盤 API（Fly.io）| ✅ fortune-reports-api.fly.dev |
| `NEXT_PUBLIC_SITE_URL` | 網站 URL | ✅ https://jianyuan.life |
| `RESEND_API_KEY` | Resend 郵件 API 金鑰 | ✅ re_D7EgcneR_... |
| `ADMIN_KEY` | 後台管理密碼 | ✅ asd566123 |

**重要：所有 env var 必須用 `printf` 設定，不能用 echo（會加換行符）**

## 自動化閉環流水線（2026-04-03 完成）

```
Stripe 付款
  ↓
Webhook → paid_reports 建立記錄（status: pending）
  ↓
觸發 /api/generate-report
  ↓
Python API（Fly.io）排盤 → 15套命理系統
  ↓
DeepSeek AI 深度分析 → 生成報告內容
  ↓
回寫 Supabase（status: completed + report_result）
  ↓
Resend 寄 Email（含報告連結）← 需域名驗證完成
  ↓
客戶訪問 /report/[access_token] 查看報告
```

## Resend 郵件系統

- **API Key：** re_D7EgcneR_... （已設定）
- **發信域名：** jianyuan.life（⏳ DNS 驗證中，Tokyo 區）
- **發信地址：** reports@jianyuan.life
- **Domain 驗證：** 在 resend.com Domains 頁面確認變綠

## 待完成（優先順序）

### ✅ v4.5.0（2026-04-09）

**G15 家族藍圖改版：**
- email 驗證模式改為導入模式（跳過排盤，讀取已有人生藍圖報告）

**PDF 品質修復：**
- 報告頁 `**粗體**` 渲染修復（renderInlineMarkdown 已正確轉換為 `<strong>`）
- 多餘 `---` 橫線已在 renderInlineMarkdown 中移除（`.replace(/^---+$/gm, '')`）
- PDF 端粗體/橫線修復需部署 Fly.io Python 腳本（pdf_routes.py）

**Vercel 自動部署修復：**
- `vercel git connect` 確認 GitHub repo jianyuan-life/web 已連接
- 自動部署正常運作

**手機報告體驗檢查：**
- viewport meta tag 由 Next.js 自動處理
- 報告頁使用 `max-w-3xl mx-auto px-6` 響應式佈局
- 目錄使用 `grid-cols-1 sm:grid-cols-2` 響應式排版

### 🔴 上線前必做
1. **Stripe 切換 Live 模式**（sk_test_ → sk_live_）
2. **Resend 域名驗證**（resend.com 確認 jianyuan.life 變綠）

### ✅ 方案重整（2026-04-04 完成並上線 jianyuan.life）
方案已從11個精簡為6個：

| 代碼 | 新名稱 | 定價 |
|:---:|:---|:---:|
| C | 人生藍圖 | $89 |
| D | 心之所惑 | $39 |
| G15 | 家族藍圖 | $269起（加人 +$69）|
| R | 合否？ | $59（加人 +$19）|
| E1 | 事件出門訣 | $119 |
| E2 | 月盤出門訣 | $89 |

### ✅ v1.6 全面優化（2026-04-04 完成）

**Admin 後台修復**
- 產品銷售排行 + 最近訂單方案名稱正規化（「C 全方位十五合一」→「人生藍圖」）
- api/admin/coupons/route.ts：新建優惠碼 CRUD API（GET/POST/PATCH）
- Supabase coupons 表：已建立（含 RLS 保護）
- 優惠碼列表：適用方案顯示名稱而非代碼

**報告頁 UX 升級**
- 移除列印按鈕
- 分享改用 Web Share API（iOS/Android 原生分享），clipboard fallback
- E1/E2 隱藏綜合評分 + 各系統評分條
- TOC：修復重複顯示、修復第一項截字問題
- ### 子章節（好的地方/需注意/改善方案）渲染為彩色框，與 PDF 一致

**PDF 品質修復（scripts/pdf_routes.py）**
- 移除 ChapterDividerPage 全頁分隔（修復空白頁問題）
- 新增 _render_section_with_subsections()：### 子章節自動渲染彩色框

**命理研究部門（scripts/generate_report_pipeline.py）**
- C 方案 15 系統格式升級：格局深度解析 + 好的地方/需注意的地方/改善方案
- E2 prompt 改版：只專注命盤 × 奇門遁甲方位，移除其他系統
- C 方案加入「年度運勢提醒」章節（第17章）

### ✅ v1.5 心理框架×報告頁升級（2026-04-04 完成）

**報告頁 UX 升級（app/report/[token]/page.tsx）**
- PDF 下載按鈕：有 pdf_url 時顯示真實下載連結（修復 disabled 狀態）
- 快速目錄：章節 > 5 個時自動顯示，grid 兩欄，錨點導航
- 章節錨點：每節加 id="sec-{i}" 便於跳轉
- 複製報告連結按鈕（Clipboard API）
- 列印樣式（@media print）
- 章節編號（01/02...）和金色左側豎條視覺設計

**心理陪伴語言框架 v2.0（generate_report_pipeline.py）**
- 七大深度觸動技術（Mirror Moments/正常化/依附理論/UPR/脆弱性/生命回顧/情緒前置）
- C 方案「命格總覽」：鏡像時刻開場+意義重建+力量宣告
- 所有方案「寫給你的話」：各自專屬觸動框架

### ✅ v1.4 產品功能完整版（2026-04-04 完成）

**PDF 報告系統**
- Python API `/api/generate-pdf` — ReportLab 白底品牌 PDF（白底/深藍/金色）
- 封面、目錄、15系統評分橫條圖、全文、彩色區塊框（綠/橙/藍）
- 字型：WQY Zen Hei（TrueType，Fly.io 相容）
- Next.js 接收 base64 → Supabase Storage `reports/` bucket
- 報告頁和儀表板均顯示「下載 PDF」按鈕

**出門訣 Top5 吉時**
- E1/E2 prompt 輸出 JSON：rank/title/date/time_start/time_end/direction/reason
- 報告頁金銀銅排名卡片 + Google Calendar 一鍵新增（純 URL，無需 API key）

**進度條升級**
- 四階段指示器：排盤運算→命理解析→AI深度分析→整合報告
- 閃光金色動畫、方案專屬時間估算、剩餘分鐘顯示

**AI Prompt 全面升級（心理陪伴語言框架）**
- 所有6個方案 prompt 改為「答案型」報告，融入心理陪伴語氣
- C：10章節 6000-10000字；D：3000-5000字；R：雙人分析；G15：家族動力學
- E1/E2：奇門排盤邏輯＋命格驗證＋白話說明
- max_tokens: 4000 → 8000

**月盤出門訣計算說明**
- 定價/結帳頁說明：30天×12時辰=360個奇門局，套入命格驗證吉位
- 時間說明：報告30分鐘/人，出門訣40分鐘以上

### 🟡 功能完善（下次做）
3. **方案專屬結帳表單** — D 問題描述欄、R 第二人資料、G15 多人資料、E1 事件日期（checkout/page.tsx）
4. **birthCity lat/lng 傳 Python API** — 真太陽時校正，坐標已抓到但還沒傳（checkout → generate-report → Fly.io）
5. **Stripe metadata 500字元限制** — 出生資料太長會截斷，改為先存 Supabase 再用 record_id 傳給 Stripe
6. **儀表板自動刷新** — 報告完成後自動顯示報告連結（目前需手動 F5）

### 🟢 未來優化（下次做）
7. **退款按鈕** — Admin 後台加 Stripe Refund API（app/admin/page.tsx + /api/admin/refund/route.ts）
8. **Google Analytics** — 追蹤用戶行為漏斗（layout.tsx 加 GA script）
9. **PDF 附件加入 Email** — Resend 寄信時把 PDF base64 附上
10. **模型升級評估** — 評估 Claude API 是否比 DeepSeek V3 更適合生成報告
11. **優惠碼 Stripe 折扣整合** — 目前優惠碼已存 Supabase，但 Stripe checkout 還沒套用折扣金額
12. **PDF 模板藝術部門重設計** — 白底+鑑源品牌色+圖表多元化（待藝術部門接手）

## v1.3 更新紀錄（2026-04-03）

| 修改項目 | 檔案 | 說明 |
|:---|:---|:---|
| 自動化閉環完成 | webhook/generate-report | 付款→排盤→AI→Email全自動 |
| Resend 郵件接入 | generate-report | Email 含報告連結+出門訣行銷 |
| 報告閱讀頁 | report/[token]/page.tsx | 無需登入，access_token 存取 |
| 國曆/農曆切換 | checkout/page.tsx | 與免費工具一致，含閏月選項 |
| 方案全名顯示 | dashboard/page.tsx | 方案C→全方位十五合一 |
| 等待文案優化 | dashboard/report頁 | 強調40-60分鐘專業分析 |
| 模擬進度條 | ReportProgress.tsx | 15系統逐一點亮，依方案顯示正確數量 |
| TypeScript 修復 | webhook/stripe | insertData 作用域錯誤 |
| Service Role Key | generate-report | 伺服器端改用 secret key |

## v1.2 更新紀錄（2026-04-03）

| 修改項目 | 檔案 | 說明 |
|:---|:---|:---|
| Footer 信箱 | `app/layout.tsx` | 改為 `support@jianyuan.life` |
| 出生城市欄位 | `app/checkout/page.tsx` | 加城市搜尋+lat/lng |
| birthData 存入 Stripe | `app/api/checkout/route.ts` | metadata['birth_data'] 修復 |
| 方案定義修正 | `app/checkout/page.tsx` | 11方案+正確價格 |
| 首頁規則數字 | `app/page.tsx` | 21,247 → 34,458 |
| 首頁方案數量 | `app/page.tsx` | 8種 → 11種 |
| E3 開放時間 | `app/pricing/page.tsx` | 改為「2027年1月開放」 |
| SEO meta tags | 各頁 | title+description |
| 後台國家中文化 | `app/admin/page.tsx` | PAGE_NAMES + 30+國 COUNTRY_NAMES |
| 地理追蹤修正 | `app/api/track/route.ts` | 改讀 CF-IPCountry |

## 部署守則（TypeScript Build 守門機制）

### 為什麼需要這個機制
過去曾發生連續 12 個 commit 含有 TypeScript 錯誤但靜默通過的問題。為避免再次發生，所有程式碼推送前必須通過型別檢查。

### 部署前必須執行
```bash
npm run pre-deploy
```
此指令會依序執行：
1. `npm run type-check` — TypeScript 型別檢查（`tsc --noEmit`）
2. `npm run build` — Next.js 完整建置

**兩步都通過才能推送到 GitHub。**

### 快速定位 TypeScript 錯誤
```bash
# 只跑型別檢查（不建置，速度較快）
npm run type-check

# 輸出範例：
# app/api/checkout/route.ts(42,5): error TS2345: Argument of type 'string' is not assignable...
# 格式：檔案路徑(行號,欄號): 錯誤說明
```

### 常見 TS 錯誤修復方式
| 錯誤碼 | 說明 | 修復方式 |
|:---|:---|:---|
| TS2345 | 型別不匹配 | 檢查函式參數型別，加上正確的型別斷言或修正傳入值 |
| TS2322 | 賦值型別錯誤 | 檢查變數宣告的型別與實際值是否一致 |
| TS7006 | 隱式 any | 為參數加上明確型別註解 |
| TS2304 | 找不到名稱 | 檢查 import 是否遺漏 |
| TS18046 | 可能為 undefined | 加上 null check 或用 `!` / `??` 處理 |

### CI 自動檢查
每次 push 到 main 或發起 PR，GitHub Actions 會自動執行 `npm run type-check`。若失敗會阻擋合併。
設定檔：`.github/workflows/type-check.yml`

### 開發流程總結
```
寫程式碼 → npm run type-check → 修復錯誤 → npm run pre-deploy → git push
```

## 注意事項
- 修改後自動 commit + push GitHub（Vercel 會自動部署）
- .env.local 含真實金鑰，不推到 GitHub（已加入 .gitignore）
- 所有金額顯示需支援多幣種（USD/HKD/TWD/CNY）

---

## 可用工具（2026-04-07）

以下工具已安裝在本機，本部門可直接調用：

| 工具 | 用途 | 使用場景 |
|:---|:---|:---|
| **Vercel CLI** | 部署鑑源網站、查看日誌、管理環境變數 | `vercel deploy`、`vercel env pull` |
| **VS Code** | 編輯 Next.js/React 程式碼 | 日常開發 |
| **Postman** | 測試 API（報告生成、Stripe webhook） | API 除錯 |
| **ngrok** | 本機暴露公網，測試 Stripe webhook 回調 | 不用每次部署就能測 webhook |
| **DBeaver** | 連接 Supabase 資料庫，查看訂單與報告狀態 | 資料庫視覺化管理 |
| **Docker** | 本機模擬 Fly.io 環境測試 Python API | 環境一致性 |
| **GitHub CLI** | 終端機管理 PR/Issue | `gh pr create`、`gh issue list` |
| **Figma** | 查看設計稿，設計轉程式碼 | UI 實作 |
| **7-Zip** | 壓縮/解壓縮 | 檔案管理 |
