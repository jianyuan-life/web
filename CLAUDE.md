# 鑑源網頁製作

## 專案簡介
鑑源命理平台（jianyuan.life）前端網頁開發專案。
Next.js 14 App Router + Tailwind CSS + Supabase + Stripe + Vercel 部署。

**網站版本：** v1.2（2026-04-03 SEO+修復更新）
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

## 待完成（高優先）

1. **方案專屬表單**（D/R/G15/G3/E1 各有不同欄位需求）
2. **birthCity lat/lng 傳給 Python API**（真太陽時校正）
3. **Stripe metadata 500字元限制**（改用 Supabase 暫存）
4. **Stripe 切換 Live 模式**（上線前必做）
5. **報告閱讀頁** `report/[token]` 完整實作
6. **客戶儀表板** 完整實作

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

## 注意事項
- 修改後自動 commit + push GitHub（Vercel 會自動部署）
- .env.local 含真實金鑰，不推到 GitHub（已加入 .gitignore）
- 所有金額顯示需支援多幣種（USD/HKD/TWD/CNY）
